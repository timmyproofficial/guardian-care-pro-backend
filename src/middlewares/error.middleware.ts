/**
 * Error handling middleware for Express.js
 * Centralizes error handling logic for the application
 */

import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import mongoose from 'mongoose';
import config from '../config/env';
import logger from '../utils/logger';
import ApiError from '../utils/api-error';
import { errorResponse } from '../utils/api-response';

/**
 * Convert various error types to ApiError
 */
export const errorConverter = (
  err: any,
  _req: Request,
  _res: Response,
  next: NextFunction
): void => {
  let error = err;
  
  // If error is not an instance of ApiError, convert it
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 
      (error instanceof mongoose.Error ? httpStatus.BAD_REQUEST : httpStatus.INTERNAL_SERVER_ERROR);
    const message = error.message || httpStatus[statusCode as keyof typeof httpStatus];
    error = new ApiError(statusCode, message, false, err.stack);
  }
  
  next(error);
};

/**
 * Handle API errors and send appropriate response
 */
export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const { statusCode, message } = err;
  
  // Handle stack trace based on environment
  const response = errorResponse(
    message,
    statusCode,
    config.env === 'development' ? { stack: err.stack } : {}
  );
  
  // Log error
  if (statusCode >= 500) {
    logger.error(`Error: ${err.message}`, { error: err, path: req.path });
  } else {
    logger.warn(`Client error: ${err.message}`, { path: req.path, statusCode });
  }
  
  res.status(statusCode).send(response);
};

/**
 * Handle 404 not found errors
 */
export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const error = new ApiError(httpStatus.NOT_FOUND, `Resource not found at ${req.originalUrl}`);
  next(error);
};