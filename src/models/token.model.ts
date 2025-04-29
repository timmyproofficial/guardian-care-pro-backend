/**
 * Token model definition
 * Schema for authentication tokens, OTP codes, and refresh tokens
 */

import mongoose, { Document, Schema } from 'mongoose';

/**
 * Token type enumeration
 */
export enum TokenType {
  REFRESH = 'refresh',
  RESET_PASSWORD = 'resetPassword',
  VERIFY_EMAIL = 'verifyEmail',
  OTP_PASSWORD_RESET = 'otpPasswordReset',
  OTP_EMAIL_VERIFY = 'otpEmailVerify',
}

/**
 * Token document interface
 */
export interface IToken extends Document {
  token: string;
  userId: mongoose.Types.ObjectId;
  type: TokenType;
  expires: Date;
  blacklisted: boolean;
  otpCode?: string; // OTP code for email verification or password reset
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Token schema definition
 */
const tokenSchema = new Schema<IToken>(
  {
    // Token value
    token: {
      type: String,
      required: true,
      index: true,
    },
    
    // User associated with this token
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    // Token type
    type: {
      type: String,
      enum: Object.values(TokenType),
      required: true,
    },
    
    // Expiration timestamp
    expires: {
      type: Date,
      required: true,
    },
    
    // Whether token has been invalidated
    blacklisted: {
      type: Boolean,
      default: false,
    },
    
    // OTP code for verification or password reset (6-digit code)
    otpCode: {
      type: String,
      minlength: 6,
      maxlength: 6,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

/**
 * Add indexes for faster queries
 */
tokenSchema.index({ token: 1, type: 1 });
tokenSchema.index({ userId: 1, type: 1 });
tokenSchema.index({ expires: 1 });
tokenSchema.index({ otpCode: 1, type: 1 }); // Index for OTP code lookup

/**
 * Create and export the Token model
 */
const Token = mongoose.model<IToken>('Token', tokenSchema);

export default Token;