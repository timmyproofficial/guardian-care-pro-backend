/**
 * Type definitions for document-related entities
 * Includes enums and interfaces for compliance documents and verification
 */

import { DocumentType, VerificationStatus } from './user.types';

/**
 * Document submission interface
 * Data for document upload and processing
 */
export interface DocumentSubmission {
  // Document metadata
  documentType: DocumentType;
  title: string;
  description?: string;
  
  // Dates
  issueDate?: Date;
  expiryDate?: Date;
  
  // Document file
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  
  // Issuing authority
  issuingAuthority?: string;
  referenceNumber?: string;
}

/**
 * Document verification input
 * Data for verification decisions by admins
 */
export interface DocumentVerificationInput {
  documentId: string;
  status: VerificationStatus;
  notes?: string;
  verifiedBy: string; // Admin ID
}

/**
 * Document reminder settings
 * Configuration for expiry reminders
 */
export interface DocumentReminderSettings {
  enabled: boolean;
  reminderDays: number[]; // e.g., [30, 14, 7, 1] days before expiry
  notifyUser: boolean;
  notifyAdmin: boolean;
}

/**
 * Document verification result
 * Response from external verification services
 */
export interface VerificationResult {
  success: boolean;
  verified: boolean;
  provider: string;
  referenceId: string;
  details?: Record<string, any>;
  timestamp: Date;
}