/**
 * Shift routes
 */

import express from 'express';
import { shiftController } from '../controllers/shift.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import validate from '../middlewares/validate.middleware';
import { shiftValidation } from '../utils/validation';
import { UserRole } from '../types/user.types';

const router = express.Router();

// Create shift (Participant only)
router.post(
  '/',
  authenticate,
  authorize([UserRole.PARTICIPANT]),
  validate(shiftValidation.createShift),
  shiftController.createShift
);

// Get shifts (based on user role)
router.get(
  '/',
  authenticate,
  shiftController.getShifts
);

// Get shift by ID
router.get(
  '/:shiftId',
  authenticate,
  shiftController.getShiftById
);

// Get timesheets for a specific shift
router.get(
  '/:shiftId/timesheets',
  authenticate,
  shiftController.getShiftTimesheets
);

// Get shift by unique shift ID
router.get(
  '/byShiftId/:shiftIdRef',
  authenticate,
  shiftController.getShiftByShiftId
);

// Update shift (Both participant and worker can update different fields)
router.patch(
  '/:shiftId',
  authenticate,
  validate(shiftValidation.updateShift),
  shiftController.updateShift
);

// Respond to shift (Worker only - accept or decline)
router.post(
  '/:shiftId/respond',
  authenticate,
  authorize([UserRole.SUPPORT_WORKER]),
  validate(shiftValidation.respondToShift),
  shiftController.respondToShift
);

// Cancel shift (Both participant and worker can cancel)
router.post(
  '/:shiftId/cancel',
  authenticate,
  validate(shiftValidation.cancelShift),
  shiftController.cancelShift
);

export default router;