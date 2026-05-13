const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const apiV1Routes = require('./routes/v1');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// Security headers
app.use(helmet({
	crossOriginResourcePolicy: false, // Allow cross-origin images
}));

// Serve static files from public/uploads folder
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// CORS
const corsOrigin = process.env.CORS_ORIGIN;
app.use(cors({
	origin: corsOrigin ? corsOrigin.split(',').map(s => s.trim()) : false,
	credentials: true,
}));

// Response compression
app.use(compression());

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser (for reading httpOnly cookies)
app.use(cookieParser());

// Logging
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 1000, // limit each IP to 100 requests per window
	standardHeaders: true,
	legacyHeaders: false,
});
app.use(limiter);

// Swagger/OpenAPI docs - prefer pre-generated JSON to avoid runtime parsing
const swaggerJsonPath = path.join(__dirname, 'swagger.json');
let swaggerSpec;
if (fs.existsSync(swaggerJsonPath)) {
	swaggerSpec = require('./swagger.json');
} else {
	// Fallback: generate at runtime (may trigger deprecation from dependencies)
	const swaggerOptions = {
		definition: {
			openapi: '3.0.0',
			info: {
				title: 'Sumatif API',
				version: '1.0.0',
				description: 'API documentation for Sumatif backend',
			},
		},
		apis: ['./src/routes/v1/*.js', './src/modules/**/controller.js'],
	};

	swaggerSpec = swaggerJsdoc(swaggerOptions);
}

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API routes
app.use('/api/v1', apiV1Routes);

// 404 + error handlers
app.use(notFound);
app.use(errorHandler);

module.exports = app;
