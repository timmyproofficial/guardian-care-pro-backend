/**
 * Server entry point
 * Initializes database connection and starts the HTTP server
 */

import mongoose from 'mongoose';
import http from 'http';
import app from './app';
import config from './config/env';
import logger from './utils/logger';

/**
 * Normalize port value
 */
const normalizePort = (val: string | number): number => {
  const port = parseInt(val as string, 10);
  
  if (isNaN(port)) {
    return 5000; // Default port
  }
  
  if (port >= 0) {
    return port;
  }
  
  return 5000;
};

/**
 * Connect to MongoDB
 */
const connectToDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongoose.url);
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error('Failed to connect to MongoDB', error);
    process.exit(1);
  }
};

/**
 * Handle server errors
 */
const onError = (error: NodeJS.ErrnoException): void => {
  if (error.syscall !== 'listen') {
    throw error;
  }
  
  const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;
  
  // Handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      logger.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
};

/**
 * Log server listening event
 */
const onListening = (): void => {
  const addr = server.address();
  const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr?.port}`;
  logger.info(`Server listening on ${bind} in ${config.env} mode`);
};

// Set port
const port = normalizePort(config.port);
app.set('port', port);

// Create HTTP server
const server = http.createServer(app);

// Set up event listeners
server.on('error', onError);
server.on('listening', onListening);

// Start server
const startServer = async (): Promise<void> => {
  await connectToDatabase();
  server.listen(port);
};

// Handle unexpected errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection:', error);
  process.exit(1);
});

// Start the server
startServer()
  .catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });

// For testing purposes
export default server;