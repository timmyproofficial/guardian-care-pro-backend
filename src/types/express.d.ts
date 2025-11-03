/**
 * Type definitions for Express.js extending the Request interface
 * to include authenticated user information and other custom properties.
 */

import type { IUser } from '../models/user.model';

declare global {
  namespace Express {
    /**
     * Extends the Request interface to include the authenticated user
     */
    interface Request {
      /**
       * The authenticated user object attached by the auth middleware
       */
      user?: IUser;
      
      /**
       * Additional file information when using file upload middleware
       */
      file?: any;
      files?: any;
    }
  }
}

export {};