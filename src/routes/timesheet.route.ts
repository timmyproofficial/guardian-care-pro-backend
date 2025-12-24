/**
 * Timesheet routes
 */

import express from 'express';
import { timesheetController } from '../controllers/timesheet.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import validate from '../middlewares/validate.middleware';
import { timesheetValidation } from '../utils/validation';
import { UserRole } from '../types/user.types';
import { uploadTimesheetData } from '../utils/multer';

const router = express.Router();

/**
 * @swagger
 * /api/v1/timesheets:
 *   post:
 *     summary: Create timesheet
 *     description: Submit a new timesheet for a completed shift with optional file uploads (Worker only)
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - shiftId
 *               - actualStartTime
 *               - actualEndTime
 *             properties:
 *               shiftId:
 *                 type: string
 *                 description: Associated shift ID
 *               actualStartTime:
 *                 type: string
 *                 format: date-time
 *                 description: Actual shift start time
 *               actualEndTime:
 *                 type: string
 *                 format: date-time
 *                 description: Actual shift end time
 *               breakDuration:
 *                 type: number
 *                 description: Break duration in minutes
 *               notes:
 *                 type: string
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Supporting documents or photos
 *     responses:
 *       201:
 *         description: Timesheet created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Worker only
 */
router.post(
  '/',
  authenticate,
  authorize([UserRole.SUPPORT_WORKER]),
  uploadTimesheetData,
  validate(timesheetValidation.submitTimesheet),
  timesheetController.createTimesheet
);

/**
 * @swagger
 * /api/v1/timesheets:
 *   get:
 *     summary: Get timesheets
 *     description: Retrieve timesheets based on user role (Workers see their timesheets, Participants see timesheets for their shifts, Admins see all)
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved timesheets
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/',
  authenticate,
  timesheetController.getTimesheets
);

/**
 * @swagger
 * /api/v1/timesheets/{timesheetId}:
 *   get:
 *     summary: Get timesheet by ID
 *     description: Retrieve detailed information about a specific timesheet
 *     tags: [Timesheets]
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
 *         description: Successfully retrieved timesheet
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Timesheet not found
 */
router.get(
  '/:timesheetId',
  authenticate,
  timesheetController.getTimesheetById
);

/**
 * @swagger
 * /api/v1/timesheets/shift/{shiftId}:
 *   get:
 *     summary: Get timesheet by shift ID
 *     description: Retrieve timesheet associated with a specific shift
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shiftId
 *         required: true
 *         schema:
 *           type: string
 *         description: Shift ID
 *     responses:
 *       200:
 *         description: Successfully retrieved timesheet
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Timesheet not found
 */
router.get(
  '/shift/:shiftId',
  authenticate,
  timesheetController.getTimesheetByShiftId
);

/**
 * @swagger
 * /api/v1/timesheets/{timesheetId}/approve:
 *   post:
 *     summary: Approve timesheet
 *     description: Approve a submitted timesheet (Participant only)
 *     tags: [Timesheets]
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
 *         description: Timesheet approved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Participant only
 *       404:
 *         description: Timesheet not found
 */
router.post(
  '/:timesheetId/approve',
  authenticate,
  authorize([UserRole.PARTICIPANT]),
  timesheetController.approveTimesheet
);

/**
 * @swagger
 * /api/v1/timesheets/{timesheetId}/reject:
 *   post:
 *     summary: Reject timesheet
 *     description: Reject a submitted timesheet with reason (Participant only)
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: timesheetId
 *         required: true
 *         schema:
 *           type: string
 *         description: Timesheet ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for rejection
 *     responses:
 *       200:
 *         description: Timesheet rejected successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Participant only
 *       404:
 *         description: Timesheet not found
 */
router.post(
  '/:timesheetId/reject',
  authenticate,
  authorize([UserRole.PARTICIPANT]),
  validate(timesheetValidation.rejectTimesheet),
  timesheetController.rejectTimesheet
);

/**
 * @swagger
 * /api/v1/timesheets/{timesheetId}/revise:
 *   patch:
 *     summary: Revise timesheet
 *     description: Revise and resubmit a rejected timesheet (Worker only)
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: timesheetId
 *         required: true
 *         schema:
 *           type: string
 *         description: Timesheet ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               actualStartTime:
 *                 type: string
 *                 format: date-time
 *               actualEndTime:
 *                 type: string
 *                 format: date-time
 *               breakDuration:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Timesheet revised successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Worker only
 *       404:
 *         description: Timesheet not found
 */
router.patch(
  '/:timesheetId/revise',
  authenticate,
  authorize([UserRole.SUPPORT_WORKER]),
  validate(timesheetValidation.reviseTimesheet),
  timesheetController.reviseTimesheet
);

/**
 * @swagger
 * /api/v1/timesheets/{timesheetId}/status:
 *   patch:
 *     summary: Admin update timesheet status
 *     description: Update timesheet status as admin (Admin only)
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: timesheetId
 *         required: true
 *         schema:
 *           type: string
 *         description: Timesheet ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, approved, rejected, revised]
 *                 description: New timesheet status
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Timesheet not found
 */
router.patch(
  '/:timesheetId/status',
  authenticate,
  authorize([UserRole.ADMIN]),
  validate(timesheetValidation.adminUpdateTimesheet),
  timesheetController.adminUpdateTimesheetStatus
);

export default router;