/**
 * Authentication routes
 */

import express from 'express';
import { authController } from '../controllers/auth.controller';
import validate from '../middlewares/validate.middleware';
import { authValidation } from '../utils/validation';

const router = express.Router();

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post(
  '/register',
  validate(authValidation.register),
  authController.register
);

/**
 * @route POST /api/auth/login
 * @desc Login with email and password
 * @access Public
 */
router.post(
  '/login',
  validate(authValidation.login),
  authController.login
);

/**
 * @route POST /api/auth/refresh-token
 * @desc Refresh authentication tokens
 * @access Public
 */
router.post(
  '/refresh-token',
  // No validate middleware for refreshToken as we get token from cookie now
  authController.refreshToken
);

/**
 * @route POST /api/auth/logout
 * @desc Logout and invalidate refresh token
 * @access Public
 */
router.post(
  '/logout',
  // No validate middleware for refreshToken as we get token from cookie now
  authController.logout
);

/**
 * @route POST /api/auth/forgot-password
 * @desc Send password reset email
 * @access Public
 */
router.post(
  '/forgot-password',
  validate(authValidation.forgotPassword),
  authController.forgotPassword
);

/**
 * @route POST /api/auth/reset-password
 * @desc Reset password using token
 * @access Public
 */
router.post(
  '/reset-password',
  validate(authValidation.resetPassword),
  authController.resetPassword
);

/**
 * @route POST /api/auth/verify-email
 * @desc Verify email address
 * @access Public
 */
router.post(
  '/verify-email',
  validate(authValidation.verifyEmail),
  authController.verifyEmail
);

/**
 * @route POST /api/auth/resend-verification
 * @desc Resend verification code to email
 * @access Public
 */
router.post(
  '/resend-verification',
  validate(authValidation.resendVerification),
  authController.resendVerification
);

export default router;