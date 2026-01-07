/**
 * Batch Invoice routes
 */

import express from 'express';
import { batchInvoiceController } from '../controllers/batchInvoice.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import validate from '../middlewares/validate.middleware';
import { batchInvoiceValidation } from '../utils/validation';
import { UserRole } from '../types/user.types';

const router = express.Router();

/**
 * @swagger
 * /api/v1/batch-invoices/config:
 *   get:
 *     summary: Get batch configuration
 *     description: Retrieve the current batch invoice configuration settings (Admin only)
 *     tags: [Batch Invoices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved configuration
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get(
  '/config',
  authenticate,
  authorize([UserRole.ADMIN]),
  batchInvoiceController.getBatchConfig
);

/**
 * @swagger
 * /api/v1/batch-invoices/config:
 *   put:
 *     summary: Update batch configuration
 *     description: Update batch invoice generation configuration (Admin only)
 *     tags: [Batch Invoices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               scheduleEnabled:
 *                 type: boolean
 *                 description: Enable automatic scheduled generation
 *               scheduleFrequency:
 *                 type: string
 *                 enum: [weekly, biweekly, monthly]
 *                 description: Batch generation frequency
 *               dayOfWeek:
 *                 type: number
 *                 description: Day of week for weekly batches (0-6)
 *               dayOfMonth:
 *                 type: number
 *                 description: Day of month for monthly batches (1-31)
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.put(
  '/config',
  authenticate,
  authorize([UserRole.ADMIN]),
  validate(batchInvoiceValidation.updateBatchConfig),
  batchInvoiceController.updateBatchConfig
);

/**
 * @swagger
 * /api/v1/batch-invoices/history:
 *   get:
 *     summary: Get batch processing history
 *     description: Retrieve history of all batch invoice generation runs (Admin only)
 *     tags: [Batch Invoices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved batch history
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get(
  '/history',
  authenticate,
  authorize([UserRole.ADMIN]),
  batchInvoiceController.getBatchHistory
);

/**
 * @swagger
 * /api/v1/batch-invoices:
 *   get:
 *     summary: Get batch invoices
 *     description: Retrieve batch invoices based on user role
 *     tags: [Batch Invoices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved batch invoices
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/',
  authenticate,
  batchInvoiceController.getBatchInvoices
);

/**
 * @swagger
 * /api/v1/batch-invoices/{batchInvoiceId}:
 *   get:
 *     summary: Get batch invoice by ID
 *     description: Retrieve detailed information about a specific batch invoice
 *     tags: [Batch Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batchInvoiceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Batch invoice ID
 *     responses:
 *       200:
 *         description: Successfully retrieved batch invoice
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Batch invoice not found
 */
router.get(
  '/:batchInvoiceId',
  authenticate,
  batchInvoiceController.getBatchInvoiceById
);

/**
 * @swagger
 * /api/v1/batch-invoices/trigger:
 *   post:
 *     summary: Trigger batch invoice generation
 *     description: Manually trigger batch invoice generation for a date range (Admin only)
 *     tags: [Batch Invoices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - startDate
 *               - endDate
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Start date for timesheet inclusion
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: End date for timesheet inclusion
 *               workerId:
 *                 type: string
 *                 description: Optional worker ID to generate batch for specific worker
 *     responses:
 *       202:
 *         description: Batch generation triggered successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.post(
  '/trigger',
  authenticate,
  authorize([UserRole.ADMIN]),
  validate(batchInvoiceValidation.triggerBatch),
  batchInvoiceController.triggerBatchGeneration
);

/**
 * @swagger
 * /api/v1/batch-invoices/{batchInvoiceId}/download:
 *   get:
 *     summary: Download batch invoice PDF
 *     description: Download consolidated batch invoice as PDF
 *     tags: [Batch Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batchInvoiceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Batch invoice ID
 *     responses:
 *       200:
 *         description: PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Batch invoice not found
 */
router.get(
  '/:batchInvoiceId/download',
  authenticate,
  batchInvoiceController.downloadBatchInvoice
);

/**
 * @swagger
 * /api/v1/batch-invoices/{batchInvoiceId}/send:
 *   post:
 *     summary: Send batch invoice email
 *     description: Send batch invoice via email to the worker (Support Worker or Admin only)
 *     tags: [Batch Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batchInvoiceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Batch invoice ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               recipientEmail:
 *                 type: string
 *                 format: email
 *                 description: Optional custom recipient email
 *     responses:
 *       200:
 *         description: Batch invoice sent successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Batch invoice not found
 */
router.post(
  '/:batchInvoiceId/send',
  authenticate,
  authorize([UserRole.SUPPORT_WORKER, UserRole.ADMIN]),
  validate(batchInvoiceValidation.sendBatchInvoice),
  batchInvoiceController.sendBatchInvoice
);

/**
 * @swagger
 * /api/v1/batch-invoices/run-scheduled:
 *   post:
 *     summary: Run scheduled batch generation
 *     description: Execute scheduled batch invoice generation (typically called by cron job, Admin only)
 *     tags: [Batch Invoices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       202:
 *         description: Scheduled batch generation started
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.post(
  '/run-scheduled',
  authenticate,
  authorize([UserRole.ADMIN]),
  batchInvoiceController.runScheduledBatch
);
export default router;