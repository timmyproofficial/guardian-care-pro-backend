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

export default cloudinary;
