/**
 * Cloudinary configuration
 * Utility for handling file uploads to Cloudinary
 */

import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import config from '../config/env';
import logger from './logger';

// Configure Cloudinary with credentials
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

// Configure CloudinaryStorage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'user-profiles',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }],
  } as any,
});

// Configure CloudinaryStorage for multer
const receiptStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'receipt-images',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    // transformation: [{ width: 500, height: 500, crop: 'limit' }],
  } as any,
});

// Configure multer for document uploads
const documentStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'user-documents',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
    resource_type: 'auto',
  } as any,
});

/**
 * Upload a profile image to Cloudinary
 * @param filePath - Path to the local file
 * @param userId - User ID for naming the file
 * @returns Promise with Cloudinary upload result
 */
export const uploadProfileImage = async (
  filePath: string,
  userId: string
): Promise<UploadApiResponse> => {
  try {
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
 * @param filePath Path to the temporary file
 * @param receiptId Unique ID for the receipt (can be shift ID + timestamp)
 * @returns Cloudinary upload result
 */
export const uploadReceiptImage = async (filePath: string, receiptId: string) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'receipt_images',
      public_id: `receipt_${receiptId}`,
      overwrite: true,
      transformation: [
        { width: 1000, height: 1000, crop: 'limit' }
      ]
    });

    return result;
  } catch (error) {
    logger.error('Error uploading receipt image to Cloudinary:', error);
    throw error;
  }
};

/**
 * Upload a document to Cloudinary
 * @param filePath - Path to the local file
 * @param documentId - Document ID for naming the file
 * @returns Promise with Cloudinary upload result
 */
export const uploadDocument = async (
  filePath: string,
  documentId: string
): Promise<UploadApiResponse> => {
  try {
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

// Multer upload configuration for profile images
export const profileUpload = multer({ storage: storage });

// Multer upload configuration for profile images
export const receiptUpload = multer({ storage: receiptStorage });

// Multer upload configuration for documents
export const documentUpload = multer({ storage: documentStorage });

// Configure CloudinaryStorage for job attachments (resume, cover letter)
const jobAttachmentStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'job-attachments',
    allowed_formats: ['pdf', 'doc', 'docx', 'txt'],
    resource_type: 'auto',
  } as any,
});

// Multer upload configuration for job attachments
export const jobAttachmentUpload = multer({ storage: jobAttachmentStorage });

/**
 * Upload a job attachment (resume/cover letter) to Cloudinary
 * @param filePath - Path to the local file or buffer
 * @param attachmentId - Unique ID for the attachment
 * @param attachmentType - Type of attachment ('resume' or 'coverLetter')
 * @returns Promise with Cloudinary upload result
 */
export const uploadJobAttachment = async (
  filePath: string,
  attachmentId: string,
  attachmentType: 'resume' | 'coverLetter'
): Promise<UploadApiResponse> => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'job-attachments',
      public_id: `${attachmentType}-${attachmentId}`,
      resource_type: 'auto',
    });
    return result;
  } catch (error) {
    logger.error('Error uploading job attachment to Cloudinary:', error);
    throw error;
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

export default cloudinary;