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

/**
 * Roster file filter configuration
 * Accepts CSV, Excel, and optionally PDF/images for OCR
 */
const rosterFileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [
    'text/csv',
    'application/csv',
    'text/plain', // Some systems send CSV as text/plain
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg'
  ];
  
  // Also check file extension for CSV files
  const extension = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.csv', '.xls', '.xlsx', '.pdf', '.png', '.jpg', '.jpeg'];
  
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(extension)) {
    cb(null, true);
  } else {
    cb(new ApiError(
      httpStatus.BAD_REQUEST,
      'Invalid file type. Allowed types: CSV, XLS, XLSX, PDF, PNG, JPG.'
    ));
  }
};

/**
 * Roster upload configuration using memory storage
 * Files are kept in memory buffer for processing
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: rosterFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max for roster files
  },
});

/**
 * Job attachment upload configuration using Cloudinary
 * Resume and cover letter files are stored in Cloudinary
 */
import { jobAttachmentUpload, uploadJobAttachment } from '../utils/cloudinary';
import { Response, NextFunction } from 'express';

/**
 * Job application upload middleware for resume and cover letter
 * Handles multipart/form-data with resume (required) and coverLetter (optional)
 * Files are uploaded to Cloudinary in the 'job-attachments' folder
 */
export const uploadJobAttachments = () => {
  // First, use multer to parse the multipart/form-data and store files in memory
  const multerMiddleware = jobAttachmentUpload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'coverLetter', maxCount: 1 },
  ]);

  // Return a middleware chain that uploads to Cloudinary
  return async (req: Request, res: Response, next: NextFunction) => {
    // First, parse the multipart form data
    multerMiddleware(req, res, async (err: any) => {
      if (err) {
        // Handle multer errors (file size, file type, etc.)
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new ApiError(httpStatus.BAD_REQUEST, 'File size too large. Maximum size is 10MB.'));
          }
          return next(new ApiError(httpStatus.BAD_REQUEST, `File upload error: ${err.message}`));
        }
        return next(new ApiError(httpStatus.BAD_REQUEST, err.message || 'File upload failed'));
      }

      try {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        
        if (!files || Object.keys(files).length === 0) {
          return next();
        }

        // Upload resume to Cloudinary if present
        if (files.resume && files.resume[0]) {
          const resumeFile = files.resume[0];
          const attachmentId = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
          
          try {
            const cloudinaryResult = await uploadJobAttachment(
              resumeFile.buffer,
              attachmentId,
              'resume'
            );
            
            // Attach Cloudinary URL to the file object
            (resumeFile as any).path = cloudinaryResult.secure_url;
            (resumeFile as any).cloudinary = cloudinaryResult;
          } catch (uploadError) {
            const errorMessage = uploadError instanceof Error ? uploadError.message : 'Resume upload failed';
            return next(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, errorMessage));
          }
        }

        // Upload cover letter to Cloudinary if present
        if (files.coverLetter && files.coverLetter[0]) {
          const coverLetterFile = files.coverLetter[0];
          const attachmentId = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
          
          try {
            const cloudinaryResult = await uploadJobAttachment(
              coverLetterFile.buffer,
              attachmentId,
              'coverLetter'
            );
            
            // Attach Cloudinary URL to the file object
            (coverLetterFile as any).path = cloudinaryResult.secure_url;
            (coverLetterFile as any).cloudinary = cloudinaryResult;
          } catch (uploadError) {
            const errorMessage = uploadError instanceof Error ? uploadError.message : 'Cover letter upload failed';
            return next(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, errorMessage));
          }
        }

        next();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'File processing failed';
        next(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, errorMessage));
      }
    });
  };
};