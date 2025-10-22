/**
 * File upload middleware using multer
 * Handles document uploads for compliance verification
 */

import { Request } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import ApiError from '../utils/api-error';
import httpStatus from 'http-status';

/**
 * Configuration for different file types
 */
const fileFilterConfig = {
  // Document file types (PDF, images, etc.)
  documents: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ApiError(
        httpStatus.BAD_REQUEST,
        'Invalid file type. Only PDF, JPEG, PNG, and DOC/DOCX files are allowed.'
      ));
    }
  },
  
  // Profile photo file types (images only)
  images: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ApiError(
        httpStatus.BAD_REQUEST,
        'Invalid file type. Only JPEG and PNG images are allowed.'
      ));
    }
  }
};

/**
 * Multer storage configuration for local storage
 * In production, this would be replaced with cloud storage like S3
 */
const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    // In production, this would be a temporary directory before S3 upload
    cb(null, 'uploads/');
  },
  filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    // Generate a random name to prevent filename conflicts
    const randomName = crypto.randomBytes(16).toString('hex');
    const extension = path.extname(file.originalname);
    cb(null, `${randomName}${extension}`);
  },
});

/**
 * File size limits in bytes
 */
const fileSizeLimits = {
  documents: 5 * 1024 * 1024, // 5MB
  images: 2 * 1024 * 1024,    // 2MB
};

/**
 * Create multer upload instance for documents
 */
export const documentUpload = multer({
  storage,
  fileFilter: fileFilterConfig.documents,
  limits: {
    fileSize: fileSizeLimits.documents,
  },
});

/**
 * Create multer upload instance for profile photos
 */
export const imageUpload = multer({
  storage,
  fileFilter: fileFilterConfig.images,
  limits: {
    fileSize: fileSizeLimits.images,
  },
});

/**
 * Document upload middleware for a single file
 * 
 * @param fieldName - Form field name for the file
 */
export const uploadSingleDocument = (fieldName: string) => {
  return documentUpload.single(fieldName);
};

/**
 * Document upload middleware for multiple files
 * 
 * @param fieldName - Form field name for the files
 * @param maxCount - Maximum number of files allowed
 */
export const uploadMultipleDocuments = (fieldName: string, maxCount: number = 5) => {
  return documentUpload.array(fieldName, maxCount);
};

/**
 * Profile image upload middleware
 * 
 * @param fieldName - Form field name for the profile image
 */
export const uploadProfileImage = (fieldName: string = 'profileImage') => {
  return imageUpload.single(fieldName);
};