/**
 * Custom validators for Joi
 * Defines reusable validation rules
 */

import Joi from 'joi';

/**
 * Password validation
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */
export const password = Joi.string()
  .min(8)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,}$/)
  .message(
    'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  );

/**
 * Phone number validation
 * Allows various phone formats
 */
export const phoneNumber = Joi.string()
  .pattern(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/)
  .message('Please enter a valid phone number');

/**
 * Australian ABN validation
 * Must be 11 digits
 */
export const abn = Joi.string()
  .pattern(/^\d{11}$/)
  .message('ABN must be an 11-digit number');

/**
 * Australian BSB validation
 * Format: XXX-XXX
 */
export const bsb = Joi.string()
  .pattern(/^\d{3}-\d{3}$/)
  .message('BSB must be in the format XXX-XXX');

/**
 * Australian bank account number validation
 * Between 6-10 digits
 */
export const accountNumber = Joi.string()
  .pattern(/^\d{6,10}$/)
  .message('Account number must be between 6-10 digits');

/**
 * NDIS number validation
 * 9 digits
 */
export const ndisNumber = Joi.string()
  .pattern(/^\d{9}$/)
  .message('NDIS number must be a 9-digit number');

/**
 * Time format validation (HH:MM)
 */
export const timeFormat = Joi.string()
  .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  .message('Time must be in the format HH:MM');

/**
 * MongoDB ObjectId validation
 */
export const objectId = Joi.string()
  .regex(/^[0-9a-fA-F]{24}$/)
  .message('Invalid ID format');