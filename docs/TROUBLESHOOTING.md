# 🆘 Troubleshooting Guide

Solusi cepat untuk masalah umum saat development.

## 🚨 Server Issues

### Server won't start / Port already in use
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solusi:**
```bash
# Find process using port 3000
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# Atau gunakan port berbeda
PORT=3001 npm run dev
```

---

### "Cannot find module" errors
```
Error: Cannot find module 'express'
```

**Solusi:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Atau update semua packages
npm update
```

---

### Nodemon not reloading changes
```bash
# Restart nodemon
# Tekan Ctrl+C dan jalankan lagi
npm run dev

# Atau gunakan hard restart
pkill -f nodemon
npm run dev
```

---

## 🗄️ Database Issues

### "Access denied for user 'db_sekolah'@'localhost'"
Password database salah.

**Solusi:**
```bash
# Check password di .env
cat .env | grep DB_PASSWORD

# Reset password database
mysql -u root -p
ALTER USER 'db_sekolah'@'localhost' IDENTIFIED BY '123';
FLUSH PRIVILEGES;
EXIT;

# Atau update di .env
nano .env
# DB_PASSWORD=new_password
```

---

### "Unknown database 'db_sekolah'"
Database belum dibuat.

**Solusi:**
```bash
mysql -u root -p

# Create database and user
CREATE DATABASE db_sekolah;
CREATE USER 'db_sekolah'@'localhost' IDENTIFIED BY '123';
GRANT ALL PRIVILEGES ON db_sekolah.* TO 'db_sekolah'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Run migrations
npm run migrate
```

---

### "ER_NOT_SUPPORTED_AUTH_PLUGIN"
MySQL 8.0+ authentication issue.

**Solusi:**
```bash
mysql -u root -p

# Fix authentication
ALTER USER 'db_sekolah'@'localhost' IDENTIFIED WITH mysql_native_password BY '123';
FLUSH PRIVILEGES;
EXIT;

# Test connection
mysql -u db_sekolah -p db_sekolah -e "SELECT 1"
```

---

### MySQL service not running
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**Solusi:**
```bash
# macOS (Homebrew)
brew services start mysql
brew services list  # Verify

# Linux (Ubuntu/Debian)
sudo service mysql start
sudo service mysql status

# Windows
net start MySQL80

# Docker
docker run -d -p 3306:3306 \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=db_sekolah \
  -e MYSQL_USER=db_sekolah \
  -e MYSQL_PASSWORD=123 \
  mysql:8.0
```

---

### Migration errors / Locked database
```
Error: database is locked
```

**Solusi:**
```bash
# Check migrations status
mysql -u db_sekolah -p db_sekolah -e "SELECT * FROM schema_migrations"

# Remove corrupted migration
mysql -u db_sekolah -p db_sekolah \
  -e "DELETE FROM schema_migrations WHERE migration_name='20260422_create_sekolah.sql'"

# Rerun migrations
npm run migrate

# Jika stuck, gunakan recovery script
node scripts/skip-migration.js 20260422_create_sekolah.sql
npm run migrate
```

---

## 🔐 Environment Variables Issues

### "JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set"
JWT secrets tidak dikonfigurasi.

**Solusi:**
```bash
# Copy template
cp .env.example .env

# Edit .env dan set secrets
nano .env

# Atau generate secrets
openssl rand -base64 32

# Restart server
npm run dev
```

---

### "JWT_ACCESS_SECRET: Too short for production"
Secret terlalu pendek untuk production.

**Solusi:**
```bash
# Generate secure secret (min 32 chars)
openssl rand -base64 32
# Output: example/output/ABCDef123456...

# Copy ke .env
JWT_ACCESS_SECRET=ABCDef123456...
JWT_REFRESH_SECRET=ABCDef123456...

# Verify
echo $JWT_ACCESS_SECRET | wc -c  # Should be > 32
```

---

### "CORS_ORIGIN: Unsafe value for production"
CORS setting tidak aman untuk production.

**Solusi:**
```bash
# Update .env
CORS_ORIGIN=https://yourdomain.com

# Multiple origins
CORS_ORIGIN=https://app.yourdomain.com,https://api.yourdomain.com

# Jangan gunakan di production
CORS_ORIGIN=*
CORS_ORIGIN=http://localhost:5173
```

---

## 🔑 Authentication Issues

### "Token tidak ditemukan"
User belum login atau token tidak dikirim.

**Solusi:**
```bash
# 1. Login terlebih dahulu
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"username":"admin","password":"password"}'

# 2. Gunakan cookie di request selanjutnya
curl http://localhost:3000/api/v1/sekolah -b cookies.txt

# 3. Atau kirim token di header
TOKEN="eyJhbGc..."
curl http://localhost:3000/api/v1/sekolah \
  -H "Authorization: Bearer $TOKEN"
```

---

### "Token sudah kadaluarsa"
Access token sudah expired.

**Solusi:**
```bash
# Refresh token untuk mendapat access token baru
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -b cookies.txt

# Atau login lagi
curl -X POST http://localhost:3000/api/v1/auth/login \
  -d '{"username":"admin","password":"password"}'
```

---

### "Anda tidak memiliki akses"
User tidak memiliki permission untuk action.

**Solusi:**
```bash
# Verify user role
curl http://localhost:3000/api/v1/me -b cookies.txt

# Expected response
{
  "id": "user-id",
  "username": "admin",
  "role": "super_admin",  // Check this
  "sekolah_id": "..."
}

# Login dengan user yang tepat jika role salah
curl -X POST http://localhost:3000/api/v1/auth/login \
  -d '{"username":"admin","password":"password"}'
```

---

## ✅ Validation Issues

### "nama: Nama wajib diisi"
Field yang required tidak diisi.

**Solusi:**
```bash
# Include field di request
curl -X POST http://localhost:3000/api/v1/sekolah \
  -d '{
    "nama": "SMA Negeri 1",
    "kota": "Jakarta"
  }'
```

---

### "email: Format email tidak valid"
Email format salah.

**Solusi:**
```bash
# Gunakan format email yang valid
# ❌ SALAH: user@localhost
# ✅ BENAR: user@domain.com

curl -X POST http://localhost:3000/api/v1/users \
  -d '{
    "email": "user@domain.com",
    ...
  }'
```

---

## 🌐 Frontend Issues

### CORS error di browser
```
Access to XMLHttpRequest ... has been blocked by CORS policy
```

**Solusi:**
```bash
# Update .env untuk URL frontend
CORS_ORIGIN=http://localhost:5173  # Vite dev server
# atau
CORS_ORIGIN=http://localhost:3000  # Production

# Restart backend
npm run dev

# Frontend harus hit http://localhost:3000 (bukan 127.0.0.1)
```

---

### Cookie tidak tersimpan
```
Token tidak ditemukan (padahal sudah login)
```

**Solusi:**
```javascript
// Frontend - pastikan fetch dengan credentials
fetch('/api/v1/login', {
  method: 'POST',
  credentials: 'include',  // ← PENTING
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password }),
});

// Verifikasi di DevTools
// Application > Cookies > localhost:3000
// Harus ada: access_token, refresh_token
```

---

## 🧪 Testing Issues

### Tests tidak jalan
```
Error: Cannot find test files
```

**Solusi:**
```bash
# Install test dependencies
npm install --save-dev jest supertest

# Buat test file
mkdir -p __tests__
echo "test('dummy', () => {});" > __tests__/dummy.test.js

# Run tests
npm test
```

---

### Database state inconsistent di tests
Reset database antara tests.

**Solusi:**
```javascript
// test-setup.js
beforeEach(async () => {
  await pool.query('TRUNCATE TABLE sekolah');
  await pool.query('TRUNCATE TABLE ptk');
});

afterAll(async () => {
  await pool.end();
});
```

---

## 📊 Performance Issues

### Server slow / Memory leak
```bash
# Monitor resource usage
top  # macOS/Linux
tasklist  # Windows

# Check event listener counts
node --expose-gc src/server.js

# Memory profiling
node --prof src/server.js
node --prof-process isolate-*.log > profile.txt
```

**Solusi:**
- Pastikan connection pool besar cukup
- Cek query yang slow
- Monitor memory usage di production

---

### Query timeout
```
Error: Query timeout (ms)
```

**Solusi:**
```bash
# Increase connection timeout di .env
DB_CONNECTION_LIMIT=20

# Check slow queries
mysql -u db_sekolah -p db_sekolah
SET GLOBAL slow_query_log = 'ON';
SELECT * FROM mysql.slow_log;

# Optimize query
EXPLAIN SELECT * FROM sekolah;
CREATE INDEX idx_sekolah_name ON sekolah(nama);
```

---

## 🔍 Debugging Tips

### Enable verbose logging
```bash
# Full debug
DEBUG=* npm run dev

# Specific module
DEBUG=express:* npm run dev
DEBUG=mysql:* npm run dev
```

---

### Add console logs (temporary)
```javascript
// Before request handler
console.log('📥 Request:', req.method, req.path);
console.log('📦 Body:', req.body);

// After database query
console.log('📊 Result:', result);
```

---

### Use curl for testing
```bash
# Test endpoint
curl -X GET http://localhost:3000/api/v1/sekolah \
  -H "Authorization: Bearer $TOKEN" \
  -v  # Verbose

# Save response to file
curl http://localhost:3000/api/v1/sekolah > response.json

# Pretty print
curl http://localhost:3000/api/v1/sekolah | jq '.'
```

---

## 📞 Still having issues?

1. **Check logs**
   ```bash
   # Terminal output saat server running
   npm run dev  # Lihat error messages
   ```

2. **Check database**
   ```bash
   mysql -u db_sekolah -p db_sekolah
   SHOW TABLES;
   SELECT * FROM sekolah LIMIT 1;
   ```

3. **Create GitHub issue**
   - Include error message lengkap
   - Include .env (tanpa secrets)
   - Include steps to reproduce

4. **Contact support**
   - Email: dev@sekolahku.local
   - Slack: #backend-support

---

## 🆘 Emergency Recovery

### Reset everything dan restart
```bash
# Stop server
Ctrl+C

# Clean node modules
rm -rf node_modules package-lock.json

# Clean database
mysql -u root -p
DROP DATABASE db_sekolah;
CREATE DATABASE db_sekolah;
GRANT ALL ON db_sekolah.* TO 'db_sekolah'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Reinstall & setup
npm install
npm run setup
npm run migrate
npm run dev
```

Happy debugging! 🎉
