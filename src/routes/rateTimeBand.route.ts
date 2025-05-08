/**
 * RateTimeBand routes
 */

import express from 'express';
import { rateTimeBandController } from '../controllers/rateTimeBand.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import validate from '../middlewares/validate.middleware';
import { rateTimeBandValidation } from '../utils/validation';
import { UserRole } from '../types/user.types';

const router = express.Router();

// Get all rate time bands (accessible to all authenticated users)
router.get(
  '/',
  authenticate,
  rateTimeBandController.getAllRateTimeBands
);

// Get rate time band by ID (accessible to all authenticated users)
router.get(
  '/:rateTimeBandId',
  authenticate,
  rateTimeBandController.getRateTimeBandById
);

// Create rate time band (admin only)
router.post(
  '/',
  authenticate,
  authorize([UserRole.ADMIN]),
  validate(rateTimeBandValidation.createRateTimeBand),
  rateTimeBandController.createRateTimeBand
);

// Update rate time band (admin only)
router.patch(
  '/:rateTimeBandId',
  authenticate,
  authorize([UserRole.ADMIN]),
  validate(rateTimeBandValidation.updateRateTimeBand),
  rateTimeBandController.updateRateTimeBand
);

// Delete rate time band (admin only)
router.delete(
  '/:rateTimeBandId',
  authenticate,
  authorize([UserRole.ADMIN]),
  rateTimeBandController.deleteRateTimeBand
);

export default router;