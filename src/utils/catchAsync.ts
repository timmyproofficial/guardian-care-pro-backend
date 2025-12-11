/**
 * Catch Async Utility
 * Wraps async route handlers to automatically catch errors and pass to next()
 */

import { Request, Response, NextFunction } from 'express';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

/**
 * Wraps an async function to catch any errors and pass them to the error handler
 * @param fn - Async function to wrap
 * @returns Wrapped function that catches errors
 */
const catchAsync = (fn: AsyncHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default catchAsync;

