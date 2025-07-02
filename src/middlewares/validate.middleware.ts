/**
 * Validation middleware using Joi
 * Validates request data against predefined schemas
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import httpStatus from 'http-status';
import ApiError from '../utils/api-error';

/**
 * Options for request validation
 */
interface ValidationOptions {
  /** Whether to abort early on first error */
  abortEarly?: boolean;
}

/**
 * Locations to pick data from in the request object
 */
type ValidateLocation = 'body' | 'query' | 'params';

/**
 * Creates a validation middleware using the given schema
 * 
 * @param schema - Joi validation schema
 * @param location - Where to pick data from (body, query, params)
 * @param options - Validation options
 * @returns Express middleware function
 */
const validate = (
  schema: Joi.Schema,
  location: ValidateLocation = 'body',
  options: ValidationOptions = { abortEarly: false }
) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const data = req[location];
      
      // Use validateAsync to handle external validation rules
      const value = await schema.validateAsync(data, options);
      
      // Replace request data with validated data
      req[location] = value;
      return next();
    } catch (error) {
      if (error instanceof Joi.ValidationError) {
        const errorMessage = error.details
          .map((detail) => detail.message)
          .join(', ');
        return next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
      }
      
      // Handle external validation errors
      const errorMessage = error instanceof Error ? error.message : 'Validation error';
      return next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
    }
  };
};

export default validate;