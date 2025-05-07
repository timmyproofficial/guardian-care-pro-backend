/**
 * Authentication service
 * Handles user authentication, registration, and token management
 */

import jwt from 'jsonwebtoken';
// import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import httpStatus from 'http-status';
// import mongoose from 'mongoose';
import moment from 'moment';
import config from '../config/env';
import { TokenType } from '../models/token.model';
import Token, { IToken } from '../models/token.model';
import User, { IUser } from '../models/user.model';
import Admin from '../models/admin.model';
import Participant from '../models/participant.model';
import Guardian from '../models/guardian.model';
import Worker from '../models/worker.model';
// import Coordinator from '../models/coordinator.model';
import { UserRole, UserStatus, UserRegistrationInput } from '../types/user.types';
import { organizationService } from './organization.service';
import { emailService } from './email.service';
import ApiError from '../utils/api-error';
import logger from '../utils/logger';

/**
 * Interface for auth tokens
 */
interface Tokens {
  access: {
    token: string;
    expires: Date;
  };
  refresh: {
    token: string;
    expires: Date;
  };
}

/**
 * Generate JWT token
 */
const generateToken = (
  userId: string,
  role: UserRole,
  expires: Date,
  secret: string = config.jwt.secret
): string => {
  const payload = {
    sub: userId,
    role,
    iat: Date.now() / 1000,
    exp: expires.getTime() / 1000,
  };
  return jwt.sign(payload, secret);
};

/**
 * Save token to database
 */
const saveToken = async (
  token: string,
  userId: string,
  expires: Date,
  type: TokenType,
  blacklisted: boolean = false,
  otpCode?: string
): Promise<IToken> => {
  const tokenDoc = await Token.create({
    token,
    userId,
    expires,
    type,
    blacklisted,
    otpCode,
  });
  return tokenDoc;
};

/**
 * Generate and save OTP code for email verification
 */
const generateEmailVerificationOTP = async (userId: string): Promise<string> => {
  try {
    // Generate a random 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Create a unique token identifier
    const tokenId = crypto.randomBytes(32).toString('hex');
    
    // Set expiration time (10 minutes)
    const expires = moment().add(10, 'minutes').toDate();
    
    // Save token with OTP code to database
    await saveToken(
      tokenId,
      userId,
      expires,
      TokenType.OTP_EMAIL_VERIFY,
      false,
      otpCode
    );
    
    return otpCode;
  } catch (error) {
    logger.error('Error generating email verification OTP:', error);
    throw error;
  }
};

/**
 * Verify email using OTP code
 */
const verifyEmailWithOTP = async (userId: string, otpCode: string): Promise<IUser> => {
  try {
    // Find token with matching OTP code and user ID
    const tokenDoc = await Token.findOne({
      userId,
      otpCode,
      type: TokenType.OTP_EMAIL_VERIFY,
      blacklisted: false,
    });
    
    if (!tokenDoc) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Invalid or expired verification code');
    }
    
    // Check if token is expired
    if (moment(tokenDoc.expires).isBefore()) {
      await Token.deleteOne({ _id: tokenDoc._id });
      throw new ApiError(httpStatus.BAD_REQUEST, 'Verification code has expired');
    }
    
    // Find and update user
    const user = await User.findOneAndUpdate(
      { _id: tokenDoc.userId },
      { isEmailVerified: true },
      { new: true }
    );
    
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }
    
    // Remove used token
    await Token.deleteOne({ _id: tokenDoc._id });
    
    return user;
  } catch (error) {
    logger.error('Error verifying email with OTP:', error);
    throw error;
  }
};

/**
 * Resend email verification OTP
 */
const resendVerificationOTP = async (email: string): Promise<{ userId: string }> => {
  try {
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }
    
    // Check if email is already verified
    if (user.isEmailVerified) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Email is already verified');
    }
    
    // Generate new OTP code for email verification
    const otpCode = await generateEmailVerificationOTP(user._id.toString());
    
    // Send verification email with OTP
    await emailService.sendVerificationOTP(user.email, user.firstName, otpCode);
    
    return { userId: user._id.toString() };
  } catch (error) {
    logger.error('Error resending verification OTP:', error);
    throw error;
  }
};

/**
 * Generate and save OTP code for password reset
 */
const generatePasswordResetOTP = async (userId: string): Promise<string> => {
  try {
    // Generate a random 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Create a unique token identifier
    const tokenId = crypto.randomBytes(32).toString('hex');
    
    // Set expiration time (10 minutes)
    const expires = moment().add(10, 'minutes').toDate();
    
    // Save token with OTP code to database
    await saveToken(
      tokenId,
      userId,
      expires,
      TokenType.OTP_PASSWORD_RESET,
      false,
      otpCode
    );
    
    return otpCode;
  } catch (error) {
    logger.error('Error generating password reset OTP:', error);
    throw error;
  }
};

/**
 * Reset password using OTP code
 */
const resetPasswordWithOTP = async (userId: string, otpCode: string, newPassword: string): Promise<void> => {
  try {
    // Find token with matching OTP code and user ID
    const tokenDoc = await Token.findOne({
      userId,
      otpCode,
      type: TokenType.OTP_PASSWORD_RESET,
      blacklisted: false,
    });
    
    if (!tokenDoc) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Invalid or expired reset code');
    }
    
    // Check if token is expired
    if (moment(tokenDoc.expires).isBefore()) {
      await Token.deleteOne({ _id: tokenDoc._id });
      throw new ApiError(httpStatus.BAD_REQUEST, 'Reset code has expired');
    }
    
    // Find user
    const user = await User.findById(tokenDoc.userId);
    
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    // Delete used tokens
    await Token.deleteMany({
      userId: user._id,
      type: { $in: [TokenType.OTP_PASSWORD_RESET, TokenType.RESET_PASSWORD] },
    });
  } catch (error) {
    logger.error('Error resetting password with OTP:', error);
    throw error;
  }
};

/**
 * Authentication service implementation
 */
export const authService = {
  /**
   * Register a new user
   */
  register: async (userInput: UserRegistrationInput): Promise<IUser> => {
    try {
      // Check if email is already taken
      const emailTaken = await User.isEmailTaken(userInput.email);
      if (emailTaken) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
      }
      
      // Create user based on role
      let user;
      
      switch (userInput.role) {
        case UserRole.PARTICIPANT:
          user = await Participant.create({
            ...userInput,
            status: UserStatus.PENDING,
          });

          // Automatically create an organization for the participant
          const organizationName = `${user.firstName}'s Organization`;
          await organizationService.createOrganization(
            user._id.toString(),
            organizationName,
            'Support worker organization'
          );
          break;
        case UserRole.GUARDIAN:
          user = await Guardian.create({
            ...userInput,
            status: UserStatus.PENDING,
          });
          break;
        case UserRole.SUPPORT_WORKER:
          user = await Worker.create({
            ...userInput,
            status: UserStatus.PENDING,
            verificationStatus: {
              profileSetupComplete: false,
              identityVerified: false,
              policeCheckVerified: false,
              ndisWorkerScreeningVerified: false,
              onboardingComplete: false,
              onboardingFeeReceived: false,
            },
          });
          break;
        case UserRole.ADMIN:
          user = await Admin.create({
            ...userInput,
            adminType: 'superAdmin',
            status: UserStatus.PENDING,
          });
          break;
        default:
          throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid user role');
      }
      
      // Generate OTP code for email verification
      // const otpCode = await generateEmailVerificationOTP(user._id.toString());
      
      // Send verification email with OTP
      // await emailService.sendVerificationOTP(user.email, user.firstName, otpCode);
      
      return user;
    } catch (error) {
      logger.error('Error during user registration:', error);
      throw error;
    }
  },
  
  /**
   * Login with email and password
   */
  login: async (email: string, password: string): Promise<{ user: IUser; tokens: Tokens }> => {
    try {
      // Find user by email
      const user = await User.findOne({ email }).select('+password');
      
      if (!user) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
      }
      
      // Check password
      const isPasswordMatch = await user.isPasswordMatch(password);
      
      if (!isPasswordMatch) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
      }
      
      // Check if user is active
      // if (user.status !== UserStatus.ACTIVE) {
      //   throw new ApiError(httpStatus.UNAUTHORIZED, 'Your account is not active');
      // }
      
      // Generate tokens
      const tokens = await authService.generateAuthTokens(user);
      
      // Update last login
      user.lastLogin = new Date();
      await user.save();
      
      return { user, tokens };
    } catch (error) {
      logger.error('Error during login:', error);
      throw error;
    }
  },
  
  /**
   * Generate auth tokens
   */
  generateAuthTokens: async (user: IUser): Promise<Tokens> => {
    try {
      // Generate access token
      const accessTokenExpires = moment()
        .add(config.jwt.accessExpirationMinutes, 'minutes')
        .toDate();
      const accessToken = generateToken(
        user._id.toString(),
        user.role as UserRole,
        accessTokenExpires
      );
      
      // Generate refresh token
      const refreshTokenExpires = moment()
        .add(config.jwt.refreshExpirationDays, 'days')
        .toDate();
      const refreshToken = generateToken(
        user._id.toString(),
        user.role as UserRole,
        refreshTokenExpires
      );
      
      // Save refresh token to database
      await saveToken(
        refreshToken,
        user._id.toString(),
        refreshTokenExpires,
        TokenType.REFRESH
      );
      
      return {
        access: {
          token: accessToken,
          expires: accessTokenExpires,
        },
        refresh: {
          token: refreshToken,
          expires: refreshTokenExpires,
        },
      };
    } catch (error) {
      logger.error('Error generating auth tokens:', error);
      throw error;
    }
  },
  
  /**
   * Refresh authentication tokens
   */
  refreshAuth: async (refreshToken: string): Promise<Tokens> => {
    try {
      // Verify token
      const payload = jwt.verify(refreshToken, config.jwt.secret) as {
        sub: string;
        role: UserRole;
        exp: number;
      };
      
      // Check if token exists in database
      const tokenDoc = await Token.findOne({
        token: refreshToken,
        userId: payload.sub,
        type: TokenType.REFRESH,
        blacklisted: false,
      });
      
      if (!tokenDoc) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid refresh token');
      }
      
      // Find user
      const user = await User.findById(payload.sub);
      
      if (!user) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'User not found');
      }
      
      // Generate new tokens
      const tokens = await authService.generateAuthTokens(user);
      
      // Blacklist old refresh token
      await Token.findByIdAndUpdate(tokenDoc._id, { blacklisted: true });
      
      return tokens;
    } catch (error) {
      logger.error('Error refreshing auth tokens:', error);
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid refresh token');
    }
  },
  
  /**
   * Send password reset OTP
   */
  sendPasswordResetEmail: async (email: string): Promise<void> => {
    try {
      // Find user by email
      const user = await User.findOne({ email });
      
      if (!user) {
        // Don't reveal that the email doesn't exist
        // Still return success but don't send email
        return;
      }
      
      // Generate OTP code for password reset
      const otpCode = await generatePasswordResetOTP(user._id.toString());
      
      // Send email with OTP code
      await emailService.sendPasswordResetOTP(user.email, user.firstName, otpCode);
    } catch (error) {
      logger.error('Error sending password reset email:', error);
      throw error;
    }
  },
  
  /**
   * Reset password with OTP code
   */
  resetPasswordWithOTP,
  
  /**
   * Verify email with OTP code
   */
  verifyEmailWithOTP,

  /**
   * Resend verification OTP
   */
  resendVerificationOTP,
  
  /**
   * Logout (blacklist refresh token)
   */
  logout: async (refreshToken: string): Promise<void> => {
    try {
      const refreshTokenDoc = await Token.findOne({
        token: refreshToken,
        type: TokenType.REFRESH,
        blacklisted: false,
      });
      
      if (!refreshTokenDoc) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Token not found');
      }
      
      // Blacklist token
      await Token.findByIdAndUpdate(refreshTokenDoc._id, { blacklisted: true });
    } catch (error) {
      logger.error('Error during logout:', error);
      throw error;
    }
  },
};