/**
 * Invoice routes
 */

import express from 'express';
import { invoiceController } from '../controllers/invoice.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { UserRole } from '../types/user.types';

const router = express.Router();

// Get invoices (based on user role)
router.get(
  '/',
  authenticate,
  invoiceController.getInvoices
);

// Get invoice by ID
router.get(
  '/:invoiceId',
  authenticate,
  invoiceController.getInvoiceById
);

// Get invoice by number
router.get(
  '/number/:invoiceNumber',
  authenticate,
  invoiceController.getInvoiceByNumber
);

// Get invoice by timesheet ID
router.get(
  '/timesheet/:timesheetId',
  authenticate,
  invoiceController.getInvoiceByTimesheetId
);

// Generate invoice for timesheet (manual trigger - admin/participant only)
router.post(
  '/generate/:timesheetId',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.PARTICIPANT]),
  invoiceController.generateInvoice
);

// Send invoice to participant
router.post(
  '/:invoiceId/send',
  authenticate,
  authorize([UserRole.SUPPORT_WORKER, UserRole.ADMIN]),
  invoiceController.sendInvoice
);

// Send batch invoices to participant
router.post(
  '/send-batch',
  authenticate,
  authorize([UserRole.SUPPORT_WORKER, UserRole.ADMIN]),
  invoiceController.sendBatchInvoices
);

// Download invoice as PDF
router.get(
  '/:invoiceId/download',
  authenticate,
  invoiceController.downloadInvoice
);

export default router;