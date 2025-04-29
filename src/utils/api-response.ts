/**
 * API response formatter
 * Provides consistent response structure for API endpoints
 */

import httpStatus from 'http-status';

/**
 * API Response data interface
 */
interface ApiResponseData {
  [key: string]: any;
}

/**
 * API Response interface
 */
interface ApiResponse {
  success: boolean;
  code: number;
  message?: string;
  data?: ApiResponseData;
  error?: string | null;
}

/**
 * Create a success response
 * 
 * @param data - Response data
 * @param message - Success message
 * @param code - HTTP status code
 * @returns Formatted success response
 */
export const successResponse = (
  data: ApiResponseData = {}, 
  message = 'Success', 
  code = httpStatus.OK
): ApiResponse => {
  return {
    success: true,
    code,
    message,
    data,
    error: null,
  };
};

/**
 * Create an error response
 * 
 * @param error - Error message
 * @param code - HTTP status code
 * @param data - Optional extra data
 * @returns Formatted error response
 */
export const errorResponse = (
  error: string, 
  code: number = httpStatus.BAD_REQUEST, 
  data: ApiResponseData = {}
): ApiResponse => {
  return {
    success: false,
    code,
    error,
    data,
  };
};