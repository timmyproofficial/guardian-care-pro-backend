/**
 * Generator utilities
 * Functions for generating unique identifiers and references
 */

import { nanoid } from 'nanoid';

/**
 * Generate a unique shift ID
 * Format: SHIFT-XXXXXXXXXX (where X is alphanumeric)
 * @returns A unique shift identifier
 */
export const generateShiftId = (): string => {
  // Generate a 10 character alphanumeric string
  const uniqueId = nanoid(10).toUpperCase();
  // Format as SHIFT-XXXXXXXXXX
  return `SHIFT-${uniqueId}`;
};

/**
 * Generate a unique invoice number
 * Format: INV-YYYYMMDD-XXXXX (where X is alphanumeric)
 * @returns A unique invoice number
 */
export const generateInvoiceNumber = (): string => {
  // Get current date in YYYYMMDD format
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateString = `${year}${month}${day}`;
  
  // Generate a 5 character alphanumeric string
  const uniqueId = nanoid(5).toUpperCase();
  
  // Format as INV-YYYYMMDD-XXXXX
  return `INV-${dateString}-${uniqueId}`;
};

/**
 * Generate a unique routine ID
 * Format: RTN-XXXXXXXXXX (where X is alphanumeric)
 * @returns A unique routine identifier
 */
export const generateRoutineId = (): string => {
  // Generate a 10 character alphanumeric string
  const uniqueId = nanoid(10).toUpperCase();
  // Format as RTN-XXXXXXXXXX
  return `RTN-${uniqueId}`;
};