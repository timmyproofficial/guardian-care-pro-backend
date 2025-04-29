/**
 * Logger utility for application-wide logging
 * Uses winston for multi-level logging with various transports
 */

import winston from 'winston';
import config from '../config/env';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define transports based on environment
const transports = [];

// Always log to console
transports.push(
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length 
          ? JSON.stringify(meta, null, 2) 
          : '';
        return `${timestamp} [${level}]: ${message} ${metaStr}`;
      })
    ),
  })
);

// In production, also log to file
if (config.env === 'production') {
  transports.push(
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: config.logLevel || 'info',
  format: logFormat,
  defaultMeta: { service: 'guardian-care-pro-api' },
  transports,
});

export default logger;