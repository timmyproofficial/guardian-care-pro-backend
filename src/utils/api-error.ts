/**
 * Custom API Error class for handling application-specific errors
 * with status codes and error messages.
 */

class ApiError extends Error {
    /**
     * HTTP status code for the error
     */
    statusCode: number;
    
    /**
     * Flag indicating if the error is operational (vs programming error)
     */
    isOperational: boolean;
    
    /**
     * Optional stack trace
     */
    stack?: string;
    
    /**
     * Constructor for ApiError
     * 
     * @param statusCode - HTTP status code for the error
     * @param message - Error message
     * @param isOperational - Flag for operational errors (true) vs programmer errors (false)
     * @param stack - Optional stack trace
     */
    constructor(
      statusCode: number,
      message: string,
      isOperational = true,
      stack = ''
    ) {
      super(message);
      this.statusCode = statusCode;
      this.isOperational = isOperational;
      
      if (stack) {
        this.stack = stack;
      } else {
        Error.captureStackTrace(this, this.constructor);
      }
    }
  }
  
  export default ApiError;