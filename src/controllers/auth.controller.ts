/**
 * Authentication controller
 * Handles HTTP requests related to authentication
 */

import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import User from '../models/user.model';
import { authService } from '../services/auth.service';
import { successResponse } from '../utils/api-response';
import config from '../config/env';

export const authController = {
  /**
   * Register a new user
   * @route POST /api/auth/register
   */
  register: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await authService.register(req.body);
      const tokens = await authService.generateAuthTokens(user);
      
      // Set HTTP-only cookies for tokens
      res.cookie('accessToken', tokens.access.token, {
        httpOnly: config.env === 'production',
        secure: config.env === 'production',
        // sameSite: 'strict',
        sameSite: config.env === 'production' ? 'none' : 'lax',
        expires: tokens.access.expires
      });
      
      res.cookie('refreshToken', tokens.refresh.token, {
        httpOnly: config.env === 'production', 
        secure: config.env === 'production',
        // sameSite: 'strict',
        sameSite: config.env === 'production' ? 'none' : 'lax',
        expires: tokens.refresh.expires,
        path: '/api/v1/auth/refresh-token' // Restrict to refresh endpoint
      });
      
      // Return user data and indication that verification is needed
      res.status(httpStatus.CREATED).json(
        successResponse(
          { 
            user, 
            verificationRequired: true, 
            userId: user._id, 
            access: tokens.access?.token,
            refresh: tokens.refresh?.token
          }, 
          'User registered successfully. Please verify your email address using the code sent to your email.'
        )
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * Login using email and password
   * @route POST /api/auth/login
   */
  login: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const { user, tokens } = await authService.login(email, password);
      
      // Set HTTP-only cookies for tokens
      res.cookie('accessToken', tokens.access.token, {
        httpOnly: config.env === 'production',
        secure: config.env === 'production',
        // sameSite: 'strict',
        sameSite: config.env === 'production' ? 'none' : 'lax',
        expires: tokens.access.expires
      });
      
      res.cookie('refreshToken', tokens.refresh.token, {
        httpOnly: config.env === 'production', 
        secure: config.env === 'production',
        // sameSite: 'strict',
        sameSite: config.env === 'production' ? 'none' : 'lax',
        expires: tokens.refresh.expires,
        path: '/api/v1/auth/refresh-token' // Restrict to refresh endpoint
      });
      
      res.json(successResponse({ 
        user, 
        access: tokens.access?.token, 
        refresh: tokens.refresh?.token 
      }, 'Login successful'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Refresh the authentication tokens
   * @route POST /api/auth/refresh-token
   */
  refreshToken: async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get refresh token from cookie instead of request body
      const refreshToken = req.cookies.refreshToken;
      
      if (!refreshToken) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          successResponse({}, 'Refresh token not found')
        );
      }
      
      const tokens = await authService.refreshAuth(refreshToken);
      
      // Set new cookies
      res.cookie('accessToken', tokens.access.token, {
        httpOnly: config.env === 'production',
        secure: config.env === 'production',
        // sameSite: 'strict',
        sameSite: config.env === 'production' ? 'none' : 'lax',
        expires: tokens.access.expires
      });
      
      res.cookie('refreshToken', tokens.refresh.token, {
        httpOnly: config.env === 'production', 
        secure: config.env === 'production',
        // sameSite: 'strict',
        sameSite: config.env === 'production' ? 'none' : 'lax',
        expires: tokens.refresh.expires,
        path: '/api/v1/auth/refresh-token'
      });
      
      return res.json(successResponse({}, 'Token refreshed successfully'));
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Logout and invalidate refresh token
   * @route POST /api/auth/logout
   */
  logout: async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get refresh token from cookie
      const refreshToken = req.cookies.refreshToken;
      
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
      
      // Clear cookies
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh-token' });
      
      res.json(successResponse({}, 'Logged out successfully'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Forgot password
   * @route POST /api/auth/forgot-password
   */
  forgotPassword: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.sendPasswordResetEmail(req.body.email);
      
      // Find user by email to get user ID (needed for OTP verification)
      // We don't reveal if the email exists or not in the response for security
      const user = await User.findOne({ email: req.body.email });
      const userId = user ? user._id : null;
      
      res.json(
        successResponse(
          { userId }, 
          'If your email is registered, you will receive a password reset code.'
        )
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * Reset password using OTP code
   * @route POST /api/auth/reset-password
   */
  resetPassword: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.resetPasswordWithOTP(req.body.userId, req.body.otpCode, req.body.password);
      res.json(successResponse({}, 'Password reset successful'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Verify email with OTP code
   * @route POST /api/auth/verify-email
   */
  verifyEmail: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await authService.verifyEmailWithOTP(req.body.userId, req.body.otpCode);
      res.json(successResponse({ user }, 'Email verified successfully'));
    } catch (error) {
      next(error);
    }
  }, 

/**
 * Resend email verification code
 * @route POST /api/auth/resend-verification
 */
resendVerification: async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const { userId } = await authService.resendVerificationOTP(email);
    
    res.json(
      successResponse(
        { userId },
        'Verification code has been sent to your email address.'
      )
    );
  } catch (error) {
    next(error);
  }
}
};

