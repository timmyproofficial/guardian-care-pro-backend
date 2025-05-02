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

// Multer upload configuration for documents
export const documentUpload = multer({ storage: documentStorage });

export default cloudinary;