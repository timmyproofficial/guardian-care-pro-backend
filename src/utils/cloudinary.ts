/**
 * Cloudinary configuration
 * Utility for handling file uploads to Cloudinary
 *
 * CHANGES:
 * - Removed multer-storage-cloudinary dependency (was causing constructor errors)
 * - Using multer's memory storage to buffer files
 * - Files are stored in memory temporarily, then uploaded to Cloudinary
 * - All folder paths and configurations remain the same
 * - Added proper cleanup of temporary buffers
 */

import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import multer from 'multer';
import config from '../config/env';
import logger from './logger';
import { Readable } from 'stream';

// Configure Cloudinary with credentials
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

/**
 * Helper function to upload buffer to Cloudinary
 * @param buffer - File buffer from multer
 * @param options - Cloudinary upload options
 * @returns Promise with Cloudinary upload result
 */
const uploadBufferToCloudinary = (buffer: Buffer, options: any): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) reject(error);
      else resolve(result as UploadApiResponse);
    });

    const readable = Readable.from(buffer);
    readable.pipe(uploadStream);
  });
};

/**
 * Upload a profile image to Cloudinary
 * @param filePath - Path to the local file OR buffer from multer
 * @param userId - User ID for naming the file
 * @returns Promise with Cloudinary upload result
 */
export const uploadProfileImage = async (filePath: string | Buffer, userId: string): Promise<UploadApiResponse> => {
  try {
    // If it's a buffer (from multer memory storage)
    if (Buffer.isBuffer(filePath)) {
      return await uploadBufferToCloudinary(filePath, {
        folder: 'user-profiles',
        public_id: `profile-${userId}`,
        overwrite: true,
        transformation: [{ width: 500, height: 500, crop: 'limit' }],
      });
    }

    // If it's a file path (existing functionality)
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'user-profiles',
      public_id: `profile-${userId}`,
      overwrite: true,
      transformation: [{ width: 500, height: 500, crop: 'limit' }],
    });
    return result;
  } catch (error) {
    logger.error('Error uploading to Cloudinary:', error);
    throw error;
  }
};

/**
 * Upload receipt image to Cloudinary
 * @param filePath Path to the temporary file OR buffer from multer
 * @param receiptId Unique ID for the receipt (can be shift ID + timestamp)
 * @returns Cloudinary upload result
 */
export const uploadReceiptImage = async (filePath: string | Buffer, receiptId: string): Promise<UploadApiResponse> => {
  try {
    // If it's a buffer (from multer memory storage)
    if (Buffer.isBuffer(filePath)) {
      return await uploadBufferToCloudinary(filePath, {
        folder: 'receipt-images',
        public_id: `receipt_${receiptId}`,
        overwrite: true,
        transformation: [{ width: 1000, height: 1000, crop: 'limit' }],
      });
    }

    // If it's a file path (existing functionality)
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'receipt-images',
      public_id: `receipt_${receiptId}`,
      overwrite: true,
      transformation: [{ width: 1000, height: 1000, crop: 'limit' }],
    });

    return result;
  } catch (error) {
    logger.error('Error uploading receipt image to Cloudinary:', error);
    throw error;
  }
};

/**
 * Upload a document to Cloudinary
 * @param filePath - Path to the local file OR buffer from multer
 * @param documentId - Document ID for naming the file
 * @returns Promise with Cloudinary upload result
 */
export const uploadDocument = async (filePath: string | Buffer, documentId: string): Promise<UploadApiResponse> => {
  try {
    // If it's a buffer (from multer memory storage)
    if (Buffer.isBuffer(filePath)) {
      return await uploadBufferToCloudinary(filePath, {
        folder: 'user-documents',
        public_id: `document-${documentId}`,
        resource_type: 'auto',
      });
    }

    // If it's a file path (existing functionality)
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'user-documents',
      public_id: `document-${documentId}`,
      resource_type: 'auto',
    });
    return result;
  } catch (error) {
    logger.error('Error uploading document to Cloudinary:', error);
    throw error;
  }
};

// File filter for profile images
const profileFileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, JPEG, PNG and GIF are allowed.'));
  }
};

// File filter for receipts
const receiptFileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, JPEG, PNG and GIF are allowed.'));
  }
};

// File filter for documents
const documentFileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, JPEG, PNG and PDF are allowed.'));
  }
};

// Multer upload configuration for profile images
// Uses memory storage - files are stored in memory as Buffer objects
export const profileUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: profileFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Multer upload configuration for receipt images
export const receiptUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: receiptFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Multer upload configuration for documents
export const documentUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: documentFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// File filter for job attachments
const jobAttachmentFileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-word',
    'text/plain',
    // Some systems send DOC files with these MIME types
    'application/octet-stream',
    // RTF files
    'application/rtf',
    'text/rtf',
  ];
  
  // Also check file extension as a fallback
  const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.rtf'];
  const fileExtension = file.originalname.toLowerCase().match(/\.[^.]*$/);
  const hasValidExtension = fileExtension && allowedExtensions.includes(fileExtension[0]);
  
  if (allowedMimes.includes(file.mimetype) || hasValidExtension) {
    cb(null, true);
  } else {
    logger.warn('Job attachment file type rejected', { 
      mimetype: file.mimetype, 
      filename: file.originalname 
    });
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, TXT and RTF are allowed.'));
  }
};

// Multer upload configuration for job attachments
export const jobAttachmentUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: jobAttachmentFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

/**
 * Upload a job attachment (resume/cover letter) to Cloudinary
 * @param filePath - Path to the local file or buffer
 * @param attachmentId - Unique ID for the attachment
 * @param attachmentType - Type of attachment ('resume' or 'coverLetter')
 * @returns Promise with Cloudinary upload result
 */
export const uploadJobAttachment = async (
  filePath: string | Buffer,
  attachmentId: string,
  attachmentType: 'resume' | 'coverLetter'
): Promise<UploadApiResponse> => {
  try {
    logger.info('Uploading job attachment to Cloudinary', { 
      attachmentType, 
      attachmentId,
      isBuffer: Buffer.isBuffer(filePath),
      bufferSize: Buffer.isBuffer(filePath) ? filePath.length : 'N/A'
    });

    // If it's a buffer (from multer memory storage)
    if (Buffer.isBuffer(filePath)) {
      const result = await uploadBufferToCloudinary(filePath, {
        folder: 'job-attachments',
        public_id: `${attachmentType}-${attachmentId}`,
        resource_type: 'auto',
        timeout: 60000, // 60 second timeout
      });
      
      logger.info('Job attachment uploaded successfully', { 
        attachmentType, 
        url: result.secure_url 
      });
      
      return result;
    }

    // If it's a file path (existing functionality)
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'job-attachments',
      public_id: `${attachmentType}-${attachmentId}`,
      resource_type: 'auto',
      timeout: 60000, // 60 second timeout
    });
    
    logger.info('Job attachment uploaded successfully', { 
      attachmentType, 
      url: result.secure_url 
    });
    
    return result;
  } catch (error) {
    logger.error('Error uploading job attachment to Cloudinary:', { 
      error: error instanceof Error ? error.message : error,
      attachmentType,
      attachmentId
    });
    throw new Error(`Failed to upload ${attachmentType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Delete a job attachment from Cloudinary
 * @param publicId - The public ID of the file to delete
 * @returns Promise with deletion result
 */
export const deleteJobAttachment = async (publicId: string): Promise<any> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'raw',
    });
    return result;
  } catch (error) {
    logger.error('Error deleting job attachment from Cloudinary:', error);
    throw error;
  }
};

// File filter for event images
const eventImageFileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, JPEG, PNG, GIF and WEBP are allowed.'));
  }
};

// Multer upload configuration for event images
export const eventImageUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: eventImageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

/**
 * Upload an event image to Cloudinary
 * @param filePath - Path to the local file or buffer
 * @param eventId - Event ID for naming the file
 * @returns Promise with Cloudinary upload result
 */
export const uploadEventImage = async (
  filePath: string | Buffer,
  eventId: string
): Promise<UploadApiResponse> => {
  try {
    // If it's a buffer (from multer memory storage)
    if (Buffer.isBuffer(filePath)) {
      return await uploadBufferToCloudinary(filePath, {
        folder: 'event-images',
        public_id: `event-${eventId}`,
        overwrite: true,
        transformation: [{ width: 1200, height: 630, crop: 'limit' }],
      });
    }

    // If it's a file path (existing functionality)
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'event-images',
      public_id: `event-${eventId}`,
      overwrite: true,
      transformation: [{ width: 1200, height: 630, crop: 'limit' }],
    });
    return result;
  } catch (error) {
    logger.error('Error uploading event image to Cloudinary:', error);
    throw error;
  }
};

/**
 * Delete an event image from Cloudinary
 * @param publicId - The public ID of the image to delete
 * @returns Promise with deletion result
 */
export const deleteEventImage = async (publicId: string): Promise<any> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    logger.error('Error deleting event image from Cloudinary:', error);
    throw error;
  }
};

// File filter for compliance documents (certificates, checks)
const complianceDocumentFileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'image/jpeg', 
    'image/jpg', 
    'image/png', 
    'application/pdf'
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, JPEG, PNG and PDF are allowed for compliance documents.'));
  }
};

// Multer upload configuration for compliance documents
export const complianceDocumentUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: complianceDocumentFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

/**
 * Upload a compliance document to Cloudinary
 * @param filePath - Path to the local file or buffer
 * @param documentId - Unique ID for the document (workerId-documentType)
 * @returns Promise with Cloudinary upload result
 */
export const uploadComplianceDocument = async (
  filePath: string | Buffer,
  documentId: string
): Promise<UploadApiResponse> => {
  try {
    logger.info('Uploading compliance document to Cloudinary', { 
      documentId,
      isBuffer: Buffer.isBuffer(filePath),
    });

    // If it's a buffer (from multer memory storage)
    if (Buffer.isBuffer(filePath)) {
      const result = await uploadBufferToCloudinary(filePath, {
        folder: 'compliance-documents',
        public_id: `compliance-${documentId}`,
        resource_type: 'auto',
        timeout: 60000,
      });
      
      logger.info('Compliance document uploaded successfully', { 
        documentId, 
        url: result.secure_url 
      });
      
      return result;
    }

    // If it's a file path (existing functionality)
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'compliance-documents',
      public_id: `compliance-${documentId}`,
      resource_type: 'auto',
      timeout: 60000,
    });
    
    logger.info('Compliance document uploaded successfully', { 
      documentId, 
      url: result.secure_url 
    });
    
    return result;
  } catch (error) {
    logger.error('Error uploading compliance document to Cloudinary:', { 
      error: error instanceof Error ? error.message : error,
      documentId,
    });
    throw new Error(`Failed to upload compliance document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Extract public_id from a Cloudinary URL
 * @param url - The Cloudinary secure_url
 * @returns The public_id or null if extraction fails
 */
const extractPublicIdFromUrl = (url: string): string | null => {
  try {
    // Cloudinary URLs follow pattern: 
    // https://res.cloudinary.com/<cloud>/<resource_type>/upload/<version>/<folder>/<public_id>.<ext>
    // or without version: https://res.cloudinary.com/<cloud>/<resource_type>/upload/<folder>/<public_id>.<ext>
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    
    // Find 'upload' index and get everything after it
    const uploadIndex = pathParts.indexOf('upload');
    if (uploadIndex === -1) return null;
    
    // Skip version if present (starts with 'v' followed by digits)
    let startIndex = uploadIndex + 1;
    if (pathParts[startIndex]?.match(/^v\d+$/)) {
      startIndex++;
    }
    
    // Join remaining parts and remove file extension
    const publicIdWithExt = pathParts.slice(startIndex).join('/');
    const publicId = publicIdWithExt.replace(/\.[^/.]+$/, '');
    
    return publicId || null;
  } catch (error) {
    logger.error('Error extracting public_id from URL:', { url, error });
    return null;
  }
};

/**
 * Delete a compliance document from Cloudinary
 * @param url - The Cloudinary URL of the document to delete
 * @returns Promise with deletion result
 */
export const deleteComplianceDocument = async (url: string): Promise<any> => {
  try {
    const publicId = extractPublicIdFromUrl(url);
    if (!publicId) {
      logger.warn('Could not extract public_id from URL for deletion', { url });
      return { result: 'not_found' };
    }

    logger.info('Attempting to delete compliance document from Cloudinary', { publicId, url });

    // Try deleting as 'raw' first (for PDFs), then as 'image' if that fails
    let result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'raw',
    });

    if (result.result === 'not found') {
      // Try as image type
      result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
      });
    }

    logger.info('Compliance document deletion result', { publicId, result: result.result });
    return result;
  } catch (error) {
    logger.error('Error deleting compliance document from Cloudinary:', { url, error });
    throw error;
  }
};

export default cloudinary;
