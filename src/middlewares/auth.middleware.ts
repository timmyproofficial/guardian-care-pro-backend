/**
 * Authentication middleware for securing API routes
 * Verifies JWT tokens from Authorization header and attaches user to request object
 */

import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import jwt from 'jsonwebtoken';
import config from '../config/env';
import { UserRole } from '../types/user.types';
import { userService } from '../services/user.service';
import ApiError from '../utils/api-error';
import { IUser } from '@/models/user.model';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

/**
 * Interface for JWT payload with user ID and role
 */
interface JwtPayload {
  sub: string; // User ID
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Extract token from Authorization header
 */
const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) {
    return null;
  }

  // Support both "Bearer <token>" and just "<token>" formats
  const parts = authHeader.split(' ');
  
  if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
    return parts[1];
  }
  
  // Fallback: treat the entire header as token (for backward compatibility)
  if (parts.length === 1) {
    return parts[0];
  }
  
  return null;
};

/**
 * Middleware to authenticate users by verifying JWT token from Authorization header
 * Attaches user object to request if authentication is successful
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      throw new ApiError(
        httpStatus.UNAUTHORIZED, 
        'Access token required. Please include Authorization header with Bearer token.');
    }
    
    // Verify token
    const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;
    
    // Get user from database
    const user = await userService.getUserById(payload.sub);
    
    if (!user) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'User not found');
    }
    
    // Attach user to request object
    req.user = user;
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired token'));
    } else {
      next(error);
    }
  }
};

/**
 * Middleware to authorize specific user roles
 * 
 * @param requiredRoles - Array of roles allowed to access the route
 */
export const authorize = (requiredRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate'));
    }
    
    if (!requiredRoles.includes(req.user.role)) {
      return next(
        new ApiError(
          httpStatus.FORBIDDEN,
          'You do not have permission to perform this action'
        )
      );
    }
    
    next();
  };
};