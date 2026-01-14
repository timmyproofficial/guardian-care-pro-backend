/**
 * Compliance controller
 * Handles HTTP requests for worker compliance submissions and admin reviews
 */

import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import { complianceService } from '../services/compliance.service';
import { successResponse, errorResponse } from '../utils/api-response';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { UserRole } from '../types/user.types';
import { ComplianceDocumentType, ComplianceStatus } from '../types/compliance.types';
import { uploadComplianceDocument as uploadToCloudinary } from '../utils/cloudinary';

export const complianceController = {
  /**
   * Get worker's compliance status
   * @route GET /api/v1/compliance/my
   */
  async getMyCompliance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res
          .status(httpStatus.UNAUTHORIZED)
          .json(errorResponse('Unauthorized', httpStatus.UNAUTHORIZED));
      }

      if (req.user.role !== UserRole.SUPPORT_WORKER) {
        return res
          .status(httpStatus.FORBIDDEN)
          .json(errorResponse('Only support workers can access compliance', httpStatus.FORBIDDEN));
      }

      const compliance = await complianceService.getOrCreateCompliance(req.user._id.toString());

      return res.json(
        successResponse({ compliance }, 'Compliance retrieved successfully')
      );
    } catch (error) {
      next(error);
      return;
    }
  },

  /**
   * Update compliance answers
   * @route PATCH /api/v1/compliance/answers
   */
  async updateAnswers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res
          .status(httpStatus.UNAUTHORIZED)
          .json(errorResponse('Unauthorized', httpStatus.UNAUTHORIZED));
      }

      if (req.user.role !== UserRole.SUPPORT_WORKER) {
        return res
          .status(httpStatus.FORBIDDEN)
          .json(errorResponse('Only support workers can update compliance', httpStatus.FORBIDDEN));
      }

      const compliance = await complianceService.updateComplianceAnswers(
        req.user._id.toString(),
        req.body
      );

      return res.json(
        successResponse({ compliance }, 'Compliance answers updated successfully')
      );
    } catch (error) {
      next(error);
      return;
    }
  },

  /**
   * Upload a compliance document
   * @route POST /api/v1/compliance/documents/:type
   */
  async uploadDocument(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res
          .status(httpStatus.UNAUTHORIZED)
          .json(errorResponse('Unauthorized', httpStatus.UNAUTHORIZED));
      }

      if (req.user.role !== UserRole.SUPPORT_WORKER) {
        return res
          .status(httpStatus.FORBIDDEN)
          .json(errorResponse('Only support workers can upload documents', httpStatus.FORBIDDEN));
      }

      const documentType = req.params.type as ComplianceDocumentType;
      
      // Validate document type
      if (!Object.values(ComplianceDocumentType).includes(documentType)) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .json(errorResponse(`Invalid document type: ${documentType}`, httpStatus.BAD_REQUEST));
      }

      // Check if file was uploaded
      if (!req.file) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .json(errorResponse('No file uploaded', httpStatus.BAD_REQUEST));
      }

      // Upload to Cloudinary
      const uploadResult = await uploadToCloudinary(
        req.file.buffer,
        `${req.user._id}-${documentType}`
      );

      // Get expiry date from body if provided
      const expiryDate = req.body.expiryDate ? new Date(req.body.expiryDate) : undefined;

      // Update compliance record
      const compliance = await complianceService.uploadDocument(
        req.user._id.toString(),
        documentType,
        uploadResult.secure_url,
        expiryDate
      );

      return res.json(
        successResponse(
          { 
            compliance,
            uploadedDocument: {
              type: documentType,
              url: uploadResult.secure_url,
            }
          }, 
          'Document uploaded successfully'
        )
      );
    } catch (error) {
      next(error);
      return;
    }
  },

  /**
   * Submit compliance with all documents and answers
   * @route POST /api/v1/compliance/submit
   * Expects multipart/form-data with:
   * - complianceAnswers: JSON string with 14 boolean fields
   * - firstAidCertificate: file (required)
   * - cprCertificate: file (required)
   * - policeCheck: file (required)
   * - wwcc: file (required)
   * - relevantDocument: file (optional)
   * - relevantInsurance: file (optional)
   */
  async submitCompliance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res
          .status(httpStatus.UNAUTHORIZED)
          .json(errorResponse('Unauthorized', httpStatus.UNAUTHORIZED));
      }

      if (req.user.role !== UserRole.SUPPORT_WORKER) {
        return res
          .status(httpStatus.FORBIDDEN)
          .json(errorResponse('Only support workers can submit compliance', httpStatus.FORBIDDEN));
      }

      // Parse compliance answers from form data (sent as JSON string)
      let complianceAnswers;
      try {
        complianceAnswers = typeof req.body.complianceAnswers === 'string' 
          ? JSON.parse(req.body.complianceAnswers) 
          : req.body.complianceAnswers;
      } catch {
        return res
          .status(httpStatus.BAD_REQUEST)
          .json(errorResponse('Invalid complianceAnswers format', httpStatus.BAD_REQUEST));
      }

      if (!complianceAnswers) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .json(errorResponse('complianceAnswers is required', httpStatus.BAD_REQUEST));
      }

      // Get files from multer (using req.files which is an object when using .fields())
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      
      // Upload documents to Cloudinary and collect URLs
      const uploadedDocs: { type: ComplianceDocumentType; url: string; expiryDate?: Date }[] = [];
      
      const documentTypes: ComplianceDocumentType[] = [
        ComplianceDocumentType.FIRST_AID_CERTIFICATE,
        ComplianceDocumentType.CPR_CERTIFICATE,
        ComplianceDocumentType.POLICE_CHECK,
        ComplianceDocumentType.WWCC,
        ComplianceDocumentType.RELEVANT_DOCUMENT,
        ComplianceDocumentType.RELEVANT_INSURANCE,
      ];

      for (const docType of documentTypes) {
        const fileArray = files?.[docType];
        if (fileArray && fileArray.length > 0) {
          const file = fileArray[0];
          // Upload to Cloudinary
          const uploadResult = await uploadToCloudinary(
            file.buffer,
            `${req.user._id}-${docType}`
          );
          
          // Check for expiry date in body
          const expiryKey = `${docType}ExpiryDate`;
          const expiryDate = req.body[expiryKey] ? new Date(req.body[expiryKey]) : undefined;
          
          uploadedDocs.push({
            type: docType,
            url: uploadResult.secure_url,
            expiryDate,
          });
        }
      }

      // Call service to submit with documents and answers
      const compliance = await complianceService.submitComplianceWithDocuments(
        req.user._id.toString(),
        {
          complianceAnswers,
          documents: uploadedDocs,
        }
      );

      return res.json(
        successResponse({ compliance }, 'Compliance submitted for review')
      );
    } catch (error) {
      next(error);
      return;
    }
  },

  /**
   * Get pending compliances (admin)
   * @route GET /api/v1/compliance/pending
   */
  async getPendingCompliances(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, page, limit, sortBy } = req.query;

      const result = await complianceService.getPendingCompliances(
        {
          status: status as ComplianceStatus,
        },
        {
          page: page ? parseInt(page as string) : 1,
          limit: limit ? parseInt(limit as string) : 10,
          sortBy: sortBy as string,
        }
      );

      return res.json(
        successResponse(result, 'Compliances retrieved successfully')
      );
    } catch (error) {
      next(error);
      return;
    }
  },

  /**
   * Get compliance by ID (admin)
   * @route GET /api/v1/compliance/:complianceId
   */
  async getComplianceById(req: Request, res: Response, next: NextFunction) {
    try {
      const { complianceId } = req.params;

      const compliance = await complianceService.getComplianceById(complianceId);
      
      if (!compliance) {
        return res
          .status(httpStatus.NOT_FOUND)
          .json(errorResponse('Compliance not found', httpStatus.NOT_FOUND));
      }

      return res.json(
        successResponse({ compliance }, 'Compliance retrieved successfully')
      );
    } catch (error) {
      next(error);
      return;
    }
  },

  /**
   * Review compliance (admin approve/reject)
   * @route PATCH /api/v1/compliance/:complianceId/review
   */
  async reviewCompliance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res
          .status(httpStatus.UNAUTHORIZED)
          .json(errorResponse('Unauthorized', httpStatus.UNAUTHORIZED));
      }

      const { complianceId } = req.params;
      const { decision, rejectionReasons, adminNotes } = req.body;

      const compliance = await complianceService.reviewCompliance(
        complianceId,
        req.user._id.toString(),
        decision,
        rejectionReasons,
        adminNotes
      );

      return res.json(
        successResponse(
          { compliance }, 
          `Compliance ${decision === 'approved' ? 'approved' : 'rejected'} successfully`
        )
      );
    } catch (error) {
      next(error);
      return;
    }
  },

  /**
   * Get compliance statistics (admin dashboard)
   * @route GET /api/v1/compliance/statistics
   */
  async getStatistics(_req: Request, res: Response, next: NextFunction) {
    try {
      const statistics = await complianceService.getComplianceStatistics();

      return res.json(
        successResponse({ statistics }, 'Statistics retrieved successfully')
      );
    } catch (error) {
      next(error);
      return;
    }
  },
};
