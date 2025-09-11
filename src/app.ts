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
import { getSocketServer } from './services/socket.server';
// import logger from './utils/logger';

/**
 * Create and configure Express app
 */
const app: Express = express();

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:8080',
  'https://guardian-pro-webapp.vercel.app',
  'https://support24.vercel.app'
];

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
  exposedHeaders: ['Authorization'], // Expose Authorization header to frontend
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'] // Allow Authorization header
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
    authMethod: 'Authorization Header'
  });
});

// Add to your app.ts or routes
app.get('/socket-health', (_req, res) => {
  const socketServer = getSocketServer();
  
  res.json({
      status: 'running',
      connectedUsers: socketServer?.getConnectedUsersCount() || 0,
      timestamp: new Date().toISOString()
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