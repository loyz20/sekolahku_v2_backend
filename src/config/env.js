/**
 * Environment Variables Validation
 * This module validates all required environment variables on startup.
 * Fails fast with helpful error messages if anything is misconfigured.
 */

const requiredEnvVars = [
  { name: 'PORT', type: 'port', default: '3000' },
  { name: 'DB_HOST', type: 'string', required: true },
  { name: 'DB_PORT', type: 'port', required: true },
  { name: 'DB_USER', type: 'string', required: true },
  { name: 'DB_PASSWORD', type: 'string', required: true },
  { name: 'DB_NAME', type: 'string', required: true },
  { name: 'DB_CONNECTION_LIMIT', type: 'number', default: '10' },
  { name: 'JWT_ACCESS_SECRET', type: 'string', required: true },
  { name: 'JWT_REFRESH_SECRET', type: 'string', required: true },
  { name: 'JWT_ACCESS_EXPIRES_IN', type: 'string', default: '15m' },
  { name: 'JWT_REFRESH_EXPIRES_IN', type: 'string', default: '7d' },
  { name: 'CORS_ORIGIN', type: 'string', required: true },
  { name: 'NODE_ENV', type: 'enum:development,staging,production', default: 'development' },
  { name: 'GEMINI_API_KEY', type: 'string', required: false }, // Optional
];

function validateEnv() {
  const errors = [];
  const warnings = [];

  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar.name];

    // Check if required
    if (envVar.required && (!value || value.trim() === '')) {
      errors.push(`❌ ${envVar.name}: Required but not set`);
      continue;
    }

    // If not set, use default
    if (!value) {
      if (envVar.default) {
        process.env[envVar.name] = envVar.default;
        warnings.push(`⚠️  ${envVar.name}: Using default value: ${envVar.default}`);
      }
      continue;
    }

    // Check for placeholder values
    if (value.includes('change-this') || value.includes('your-') || value.includes('xxx')) {
      errors.push(`❌ ${envVar.name}: Still contains placeholder value: "${value}". Please set a real value.`);
      continue;
    }

    // Type validation
    if (envVar.type === 'port') {
      const portNum = parseInt(value);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        errors.push(`❌ ${envVar.name}: Invalid port number: ${value} (must be 1-65535)`);
      }
    } else if (envVar.type === 'number') {
      if (isNaN(parseInt(value))) {
        errors.push(`❌ ${envVar.name}: Invalid number: ${value}`);
      }
    } else if (envVar.type.startsWith('enum:')) {
      const allowedValues = envVar.type.split(':')[1].split(',');
      if (!allowedValues.includes(value)) {
        errors.push(`❌ ${envVar.name}: Invalid value: ${value} (allowed: ${allowedValues.join(', ')})`);
      }
    }
  }

  // Additional security checks
  if (process.env.NODE_ENV === 'production') {
    if (process.env.JWT_ACCESS_SECRET.length < 32) {
      errors.push(`❌ JWT_ACCESS_SECRET: Too short for production (minimum 32 characters)`);
    }
    if (process.env.JWT_REFRESH_SECRET.length < 32) {
      errors.push(`❌ JWT_REFRESH_SECRET: Too short for production (minimum 32 characters)`);
    }
    if (process.env.CORS_ORIGIN === 'http://localhost:5173' || process.env.CORS_ORIGIN === '*') {
      errors.push(`❌ CORS_ORIGIN: Unsafe value for production: ${process.env.CORS_ORIGIN}`);
    }
  }

  // Print results
  if (warnings.length > 0) {
    console.log('\n📋 Environment Validation Warnings:');
    warnings.forEach(w => console.log(`   ${w}`));
  }

  if (errors.length > 0) {
    console.error('\n🚨 Environment Validation Errors:');
    errors.forEach(e => console.error(`   ${e}`));
    console.error('\n📖 For setup instructions, see SETUP.md\n');
    process.exit(1);
  }

  console.log('\n✅ Environment variables validated successfully\n');
}

module.exports = {
  validateEnv,
};
