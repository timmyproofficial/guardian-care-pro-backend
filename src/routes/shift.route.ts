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

/**
 * @swagger
 * /api/v1/shifts:
 *   post:
 *     summary: Create shift
 *     description: Create a new shift assignment (Participant only)
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - workerId
 *               - startTime
 *               - endTime
 *               - serviceType
 *             properties:
 *               workerId:
 *                 type: string
 *                 description: Support worker ID
 *               startTime:
 *                 type: string
 *                 format: date-time
 *                 description: Shift start time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *                 description: Shift end time
 *               serviceType:
 *                 type: string
 *                 description: Type of service required
 *               location:
 *                 type: object
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Shift created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Participant only
 */
router.post(
  '/',
  authenticate,
  authorize([UserRole.PARTICIPANT]),
  validate(shiftValidation.createShift),
  shiftController.createShift
);

/**
 * @swagger
 * /api/v1/shifts:
 *   get:
 *     summary: Get shifts
 *     description: Retrieve shifts based on user role (Workers see assigned shifts, Participants see their shifts, Admins see all)
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved shifts
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/',
  authenticate,
  shiftController.getShifts
);

/**
 * @swagger
 * /api/v1/shifts/{shiftId}:
 *   get:
 *     summary: Get shift by ID
 *     description: Retrieve detailed information about a specific shift
 *     tags: [Shifts]
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
 *         description: Successfully retrieved shift
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Shift not found
 */
router.get(
  '/:shiftId',
  authenticate,
  shiftController.getShiftById
);

/**
 * @swagger
 * /api/v1/shifts/{shiftId}/timesheets:
 *   get:
 *     summary: Get shift timesheets
 *     description: Retrieve all timesheets associated with a specific shift
 *     tags: [Shifts]
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
 *         description: Successfully retrieved timesheets
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Shift not found
 */
router.get(
  '/:shiftId/timesheets',
  authenticate,
  shiftController.getShiftTimesheets
);

/**
 * @swagger
 * /api/v1/shifts/byShiftId/{shiftIdRef}:
 *   get:
 *     summary: Get shift by unique shift ID
 *     description: Retrieve shift using its unique shift ID reference
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shiftIdRef
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique shift ID reference
 *     responses:
 *       200:
 *         description: Successfully retrieved shift
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Shift not found
 */
router.get(
  '/byShiftId/:shiftIdRef',
  authenticate,
  shiftController.getShiftByShiftId
);

/**
 * @swagger
 * /api/v1/shifts/{shiftId}:
 *   patch:
 *     summary: Update shift
 *     description: Update shift details (Participant can update shift details, Worker can update status)
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shiftId
 *         required: true
 *         schema:
 *           type: string
 *         description: Shift ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               serviceType:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Shift updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Shift not found
 */
router.patch(
  '/:shiftId',
  authenticate,
  validate(shiftValidation.updateShift),
  shiftController.updateShift
);

/**
 * @swagger
 * /api/v1/shifts/{shiftId}/respond:
 *   post:
 *     summary: Respond to shift
 *     description: Accept or decline a shift assignment (Worker only)
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shiftId
 *         required: true
 *         schema:
 *           type: string
 *         description: Shift ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - response
 *             properties:
 *               response:
 *                 type: string
 *                 enum: [accept, decline]
 *                 description: Worker's response to the shift
 *               reason:
 *                 type: string
 *                 description: Reason for declining (if applicable)
 *     responses:
 *       200:
 *         description: Response recorded successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Worker only
 *       404:
 *         description: Shift not found
 */
router.post(
  '/:shiftId/respond',
  authenticate,
  authorize([UserRole.SUPPORT_WORKER]),
  validate(shiftValidation.respondToShift),
  shiftController.respondToShift
);

/**
 * @swagger
 * /api/v1/shifts/{shiftId}/cancel:
 *   post:
 *     summary: Cancel shift
 *     description: Cancel a shift (Both Participant and Worker can cancel)
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shiftId
 *         required: true
 *         schema:
 *           type: string
 *         description: Shift ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for cancellation
 *               cancellationMessage:
 *                 type: string
 *     responses:
 *       200:
 *         description: Shift cancelled successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Shift not found
 */
router.post(
  '/:shiftId/cancel',
  authenticate,
  validate(shiftValidation.cancelShift),
  shiftController.cancelShift
);

export default router;