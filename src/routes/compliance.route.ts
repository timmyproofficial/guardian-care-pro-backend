/**
 * Compliance routes
 * Routes for worker compliance submissions and admin reviews
 */

import express from 'express';
import { complianceController } from '../controllers/compliance.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import validate from '../middlewares/validate.middleware';
import { complianceValidation } from '../utils/validation';
import { complianceDocumentUpload } from '../utils/cloudinary';
import { UserRole } from '../types/user.types';

const router = express.Router();

// ============================================
// WORKER ROUTES
// ============================================

/**
 * @swagger
 * /api/v1/compliance/my:
 *   get:
 *     summary: Get current worker's compliance status
 *     description: Get the compliance submission status for the logged-in worker
 *     tags: [Compliance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved compliance
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only support workers can access
 */
router.get(
  '/my',
  authenticate,
  authorize([UserRole.SUPPORT_WORKER]),
  complianceController.getMyCompliance
);

/**
 * @swagger
 * /api/v1/compliance/answers:
 *   patch:
 *     summary: Update compliance answers
 *     description: Update compliance question answers (14 boolean questions)
 *     tags: [Compliance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ndisWorkerScreeningCheck:
 *                 type: boolean
 *               ndisWorkerOrientationModule:
 *                 type: boolean
 *               # ... other properties
 *     responses:
 *       200:
 *         description: Successfully updated answers
 *       401:
 *         description: Unauthorized
 */
router.patch(
  '/answers',
  authenticate,
  authorize([UserRole.SUPPORT_WORKER]),
  validate(complianceValidation.updateAnswers),
  complianceController.updateAnswers
);

/**
 * @swagger
 * /api/v1/compliance/documents/{type}:
 *   post:
 *     summary: Upload a compliance document
 *     description: Upload a certificate or check document
 *     tags: [Compliance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [firstAidCertificate, cprCertificate, policeCheck, wwcc, relevantDocument, relevantInsurance]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               expiryDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Successfully uploaded document
 *       400:
 *         description: Invalid document type or missing file
 */
router.post(
  '/documents/:type',
  authenticate,
  authorize([UserRole.SUPPORT_WORKER]),
  complianceDocumentUpload.single('file'),
  complianceController.uploadDocument
);

/**
 * @swagger
 * /api/v1/compliance/submit:
 *   post:
 *     summary: Submit compliance with all documents and answers
 *     description: |
 *       Submit compliance for admin review with all required documents and answers in a single request.
 *       Uses multipart/form-data format.
 *       
 *       **Required Documents:**
 *       - firstAidCertificate (file)
 *       - cprCertificate (file)
 *       - policeCheck (file)
 *       - wwcc (file)
 *       
 *       **Optional Documents:**
 *       - relevantDocument (file)
 *       - relevantInsurance (file)
 *       
 *       **Form Fields:**
 *       - complianceAnswers: JSON string with 14 boolean answer fields
 *       - [documentType]ExpiryDate: Optional expiry date for each document (e.g., firstAidCertificateExpiryDate)
 *     tags: [Compliance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - complianceAnswers
 *               - firstAidCertificate
 *               - cprCertificate
 *               - policeCheck
 *               - wwcc
 *             properties:
 *               complianceAnswers:
 *                 type: string
 *                 description: JSON string containing 14 boolean compliance answers
 *               firstAidCertificate:
 *                 type: string
 *                 format: binary
 *               cprCertificate:
 *                 type: string
 *                 format: binary
 *               policeCheck:
 *                 type: string
 *                 format: binary
 *               wwcc:
 *                 type: string
 *                 format: binary
 *               relevantDocument:
 *                 type: string
 *                 format: binary
 *               relevantInsurance:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Successfully submitted compliance
 *       400:
 *         description: Missing required documents or already submitted
 */
router.post(
  '/submit',
  authenticate,
  authorize([UserRole.SUPPORT_WORKER]),
  complianceDocumentUpload.fields([
    { name: 'firstAidCertificate', maxCount: 1 },
    { name: 'cprCertificate', maxCount: 1 },
    { name: 'policeCheck', maxCount: 1 },
    { name: 'wwcc', maxCount: 1 },
    { name: 'relevantDocument', maxCount: 1 },
    { name: 'relevantInsurance', maxCount: 1 },
  ]),
  complianceController.submitCompliance
);

// ============================================
// ADMIN ROUTES
// ============================================

/**
 * @swagger
 * /api/v1/compliance/statistics:
 *   get:
 *     summary: Get compliance statistics
 *     description: Get counts of compliances by status for admin dashboard
 *     tags: [Compliance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved statistics
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/statistics',
  authenticate,
  authorize([UserRole.ADMIN]),
  complianceController.getStatistics
);

/**
 * @swagger
 * /api/v1/compliance/pending:
 *   get:
 *     summary: Get pending compliances
 *     description: Get list of compliances pending review with pagination
 *     tags: [Compliance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, pending, approved, rejected]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successfully retrieved compliances
 */
router.get(
  '/pending',
  authenticate,
  authorize([UserRole.ADMIN]),
  complianceController.getPendingCompliances
);

/**
 * @swagger
 * /api/v1/compliance/{complianceId}:
 *   get:
 *     summary: Get compliance by ID
 *     description: Get detailed compliance information by ID
 *     tags: [Compliance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: complianceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved compliance
 *       404:
 *         description: Compliance not found
 */
router.get(
  '/:complianceId',
  authenticate,
  authorize([UserRole.ADMIN]),
  complianceController.getComplianceById
);

/**
 * @swagger
 * /api/v1/compliance/{complianceId}/review:
 *   patch:
 *     summary: Review compliance (approve/reject)
 *     description: Admin approves or rejects a compliance submission
 *     tags: [Compliance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: complianceId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - decision
 *             properties:
 *               decision:
 *                 type: string
 *                 enum: [approved, rejected]
 *               rejectionReasons:
 *                 type: array
 *                 items:
 *                   type: string
 *               adminNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully reviewed compliance
 *       400:
 *         description: Invalid decision or missing rejection reasons
 */
router.patch(
  '/:complianceId/review',
  authenticate,
  authorize([UserRole.ADMIN]),
  validate(complianceValidation.reviewCompliance),
  complianceController.reviewCompliance
);

export default router;
