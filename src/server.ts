/**
 * Server entry point with WebSocket integration
 * Initializes database connection, HTTP server, and WebSocket server
 */

import mongoose from 'mongoose';
import http from 'http';
import app from './app';
import config from './config/env';
import logger from './utils/logger';
import scheduler from './services/scheduler.service';
import { initializeSocketServer } from './services/socket.server';

/**
 * Normalize port value
 */
const normalizePort = (val: string | number): number => {
  const port = parseInt(val as string, 10);
  
  if (isNaN(port)) {
    return 3000; // Default port
  }
  
  if (port >= 0) {
    return port;
  }
  
  return 3000;
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
  logger.info(`HTTP Server listening on ${bind} in ${config.env} mode`);
  logger.info('WebSocket Server initialized and ready for connections');
};

// Set port
const port = normalizePort(config.port);
app.set('port', port);

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
initializeSocketServer(server);

// Set up event listeners
server.on('error', onError);
server.on('listening', onListening);

// Start server
const startServer = async (): Promise<void> => {
  await connectToDatabase();

  // Initialize scheduler service
  try {
    await scheduler.initialize();
    logger.info('Scheduler service initialized successfully');
  } catch (error) {
    logger.error('Error initializing scheduler service:', error);
  }
  
  server.listen(port, () => {
    logger.info('='.repeat(50));
    logger.info('🚀 Guardian Care Pro API Server Started');
    logger.info('='.repeat(50));
    logger.info(`📡 HTTP Server: http://localhost:${port}`);
    logger.info(`🔌 WebSocket Server: ws://localhost:${port}`);
    logger.info('🗄️  Database: Connected to MongoDB');
    logger.info('🌍 Environment: ${config.env}');
    logger.info('📅 Batch Scheduler: Initialized and running');
    logger.info('💬 Chat System: Enabled with real-time messaging');
    logger.info('='.repeat(50));
  });
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

// Graceful shutdown
// process.on('SIGTERM', () => {
//   logger.info('SIGTERM signal received: closing HTTP server');
//   server.close(() => {
//     logger.info('HTTP server closed');
//     mongoose.connection.close(false, () => {
//       logger.info('MongoDB connection closed');
//       process.exit(0);
//     });
//   });
// });

process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');

  // Stop all scheduled jobs
  try {
    scheduler.stopAllJobs();
    logger.info('Scheduler jobs stopped successfully');
  } catch (error) {
    logger.error('Error stopping scheduler jobs:', error);
  }

  server.close(async () => {
    logger.info('HTTP server closed');
    try {
      await mongoose.connection.close(false); // false = do not force close
      logger.info('MongoDB connection closed');
      process.exit(0);
    } catch (err) {
      logger.error('Error closing MongoDB connection', err);
      process.exit(1);
    }
  });
});


// process.on('SIGINT', () => {
//   logger.info('SIGINT signal received: closing HTTP server');
//   server.close(() => {
//     logger.info('HTTP server closed');
//     mongoose.connection.close(false, () => {
//       logger.info('MongoDB connection closed');
//       process.exit(0);
//     });
//   });
// });

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    mongoose.connection.close(false).then(() => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    }).catch(err => {
      logger.error('Error closing MongoDB connection', err);
      process.exit(1);
    });
  });
});


// Start the server
startServer()
  .catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });

// For testing purposes
export default server;