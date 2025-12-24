/**
 * Invoice routes
 */

import express from 'express';
import { invoiceController } from '../controllers/invoice.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { UserRole } from '../types/user.types';

const router = express.Router();

/**
 * @swagger
 * /api/v1/invoices:
 *   get:
 *     summary: Get invoices
 *     description: Retrieve invoices based on user role (Workers see their invoices, Participants see invoices for their shifts, Admins see all)
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved invoices
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/',
  authenticate,
  invoiceController.getInvoices
);

/**
 * @swagger
 * /api/v1/invoices/{invoiceId}:
 *   get:
 *     summary: Get invoice by ID
 *     description: Retrieve detailed information about a specific invoice
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Successfully retrieved invoice
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invoice not found
 */
router.get(
  '/:invoiceId',
  authenticate,
  invoiceController.getInvoiceById
);

/**
 * @swagger
 * /api/v1/invoices/number/{invoiceNumber}:
 *   get:
 *     summary: Get invoice by number
 *     description: Retrieve invoice using its unique invoice number
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invoiceNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice number
 *     responses:
 *       200:
 *         description: Successfully retrieved invoice
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invoice not found
 */
router.get(
  '/number/:invoiceNumber',
  authenticate,
  invoiceController.getInvoiceByNumber
);

/**
 * @swagger
 * /api/v1/invoices/timesheet/{timesheetId}:
 *   get:
 *     summary: Get invoice by timesheet ID
 *     description: Retrieve invoice associated with a specific timesheet
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: timesheetId
 *         required: true
 *         schema:
 *           type: string
 *         description: Timesheet ID
 *     responses:
 *       200:
 *         description: Successfully retrieved invoice
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invoice not found
 */
router.get(
  '/timesheet/:timesheetId',
  authenticate,
  invoiceController.getInvoiceByTimesheetId
);

/**
 * @swagger
 * /api/v1/invoices/generate/{timesheetId}:
 *   post:
 *     summary: Generate invoice for timesheet
 *     description: Manually trigger invoice generation from an approved timesheet (Admin or Participant only)
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: timesheetId
 *         required: true
 *         schema:
 *           type: string
 *         description: Timesheet ID
 *     responses:
 *       201:
 *         description: Invoice generated successfully
 *       400:
 *         description: Timesheet not approved or already has invoice
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin or Participant only
 *       404:
 *         description: Timesheet not found
 */
router.post(
  '/generate/:timesheetId',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.PARTICIPANT]),
  invoiceController.generateInvoice
);

/**
 * @swagger
 * /api/v1/invoices/{invoiceId}/send:
 *   post:
 *     summary: Send invoice to participant
 *     description: Send invoice via email to the participant (Support Worker or Admin only)
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Invoice sent successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Invoice not found
 */
router.post(
  '/:invoiceId/send',
  authenticate,
  authorize([UserRole.SUPPORT_WORKER, UserRole.ADMIN]),
  invoiceController.sendInvoice
);

/**
 * @swagger
 * /api/v1/invoices/send-batch:
 *   post:
 *     summary: Send batch invoices
 *     description: Send multiple invoices to participant in batch (Support Worker or Admin only)
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - invoiceIds
 *             properties:
 *               invoiceIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of invoice IDs to send
 *     responses:
 *       200:
 *         description: Batch invoices sent successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
  '/send-batch',
  authenticate,
  authorize([UserRole.SUPPORT_WORKER, UserRole.ADMIN]),
  invoiceController.sendBatchInvoices
);

/**
 * @swagger
 * /api/v1/invoices/{invoiceId}/download:
 *   get:
 *     summary: Download invoice as PDF
 *     description: Download invoice in PDF format
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice ID
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
 *         description: Invoice not found
 */
router.get(
  '/:invoiceId/download',
  authenticate,
  invoiceController.downloadInvoice
);

export default router;