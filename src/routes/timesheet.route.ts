/**
 * Timesheet routes
 */

import express from 'express';
import { timesheetController } from '../controllers/timesheet.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import validate from '../middlewares/validate.middleware';
import { timesheetValidation } from '../utils/validation';
import { UserRole } from '../types/user.types';

const router = express.Router();

// Create timesheet (Worker only)
router.post(
  '/',
  authenticate,
  authorize([UserRole.SUPPORT_WORKER]),
  validate(timesheetValidation.submitTimesheet),
  timesheetController.createTimesheet
);

// Get timesheets (based on user role)
router.get(
  '/',
  authenticate,
  timesheetController.getTimesheets
);

// Get timesheet by ID
router.get(
  '/:timesheetId',
  authenticate,
  timesheetController.getTimesheetById
);

// Get timesheet by shift ID
router.get(
  '/shift/:shiftId',
  authenticate,
  timesheetController.getTimesheetByShiftId
);

// Approve timesheet (Participant only)
router.post(
  '/:timesheetId/approve',
  authenticate,
  authorize([UserRole.PARTICIPANT]),
  timesheetController.approveTimesheet
);

// Reject timesheet (Participant only)
router.post(
  '/:timesheetId/reject',
  authenticate,
  authorize([UserRole.PARTICIPANT]),
  validate(timesheetValidation.rejectTimesheet),
  timesheetController.rejectTimesheet
);

// Revise timesheet (Worker only)
router.patch(
  '/:timesheetId/revise',
  authenticate,
  authorize([UserRole.SUPPORT_WORKER]),
  validate(timesheetValidation.reviseTimesheet),
  timesheetController.reviseTimesheet
);

// Admin update timesheet status (Admin only)
router.patch(
  '/:timesheetId/status',
  authenticate,
  authorize([UserRole.ADMIN]),
  validate(timesheetValidation.adminUpdateTimesheet),
  timesheetController.adminUpdateTimesheetStatus
);

export default router;