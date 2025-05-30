/**
 * Express app setup and configuration
 * Entry point for the API application
 */

import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import httpStatus from 'http-status';
import config from './config/env';
import routes from './routes';
import { errorConverter, errorHandler, notFoundHandler } from './middlewares/error.middleware';
// import logger from './utils/logger';

/**
 * Create and configure Express app
 */
const app: Express = express();

const allowedOrigins = ['http://localhost:3000', 'http://localhost:8080'];

// Set security headers
app.use(helmet());

// Parse JSON request body
app.use(express.json({ limit: '5mb' }));

// Parse URL-encoded request body
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Sanitize request data to prevent MongoDB injection
app.use(mongoSanitize());

// Enable gzip compression
app.use(compression());

// Parse cookies - important for storing auth tokens in cookies
app.use(cookieParser());

// Enable CORS with credentials support
// app.use(cors({
//   origin: config.corsOrigin || '*',
//   credentials: true, // Important for cookies to work with cross-origin requests
// }));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // if using cookies/auth headers
}));

app.options('*', cors({
  origin: allowedOrigins,
  credentials: true,
}));


// Request logging in development
if (config.env !== 'production') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(httpStatus.OK).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: config.env,
  });
});

// API routes
app.use(config.apiPrefix, routes);

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Convert error to ApiError
app.use(errorConverter);

// Error handling middleware
app.use(errorHandler);

export default app;