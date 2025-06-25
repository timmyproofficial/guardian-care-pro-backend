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

// Get batch configuration
router.get(
  '/config',
  authenticate,
  authorize([UserRole.ADMIN]),
  batchInvoiceController.getBatchConfig
);

// Update batch configuration
router.put(
  '/config',
  authenticate,
  authorize([UserRole.ADMIN]),
  validate(batchInvoiceValidation.updateBatchConfig),
  batchInvoiceController.updateBatchConfig
);

// Get batch processing history
router.get(
  '/history',
  authenticate,
  authorize([UserRole.ADMIN]),
  batchInvoiceController.getBatchHistory
);

// Get batch invoices
router.get(
  '/',
  authenticate,
  batchInvoiceController.getBatchInvoices
);

// Get batch invoice by ID
router.get(
  '/:batchInvoiceId',
  authenticate,
  batchInvoiceController.getBatchInvoiceById
);

// Trigger batch invoice generation
router.post(
  '/trigger',
  authenticate,
  authorize([UserRole.ADMIN]),
  validate(batchInvoiceValidation.triggerBatch),
  batchInvoiceController.triggerBatchGeneration
);

// Download batch invoice PDF
router.get(
  '/:batchInvoiceId/download',
  authenticate,
  batchInvoiceController.downloadBatchInvoice
);

// Send batch invoice email
router.post(
  '/:batchInvoiceId/send',
  authenticate,
  authorize([UserRole.SUPPORT_WORKER, UserRole.ADMIN]),
  validate(batchInvoiceValidation.sendBatchInvoice),
  batchInvoiceController.sendBatchInvoice
);

// Run scheduled batch generation
router.post(
  '/run-scheduled',
  authenticate,
  authorize([UserRole.ADMIN]),
  batchInvoiceController.runScheduledBatch
);

export default router;