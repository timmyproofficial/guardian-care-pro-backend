/**
 * Routine routes
 * Provides endpoints for routine management and completion tracking
 */

import express from 'express';
import { routineController } from '../controllers/routine.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import validate from '../middlewares/validate.middleware';
import { routineValidation } from '../utils/routine.validation';
import { UserRole } from '../types/user.types';

const router = express.Router();

/**
 * @swagger
 * /api/v1/routines:
 *   post:
 *     summary: Create a new routine
 *     description: Create a new routine
 *     tags: [Routines]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Successfully created
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/',
  authenticate,
  authorize([UserRole.PARTICIPANT]),
  validate(routineValidation.createRoutine),
  routineController.createRoutine
);

/**
 * @swagger
 * /api/v1/routines:
 *   get:
 *     summary: Get routines for the authenticated user
 *     description: Get routines for the authenticated user
 *     tags: [Routines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: string
 *         required: true
 *         schema:
 *           type: string
 *         description: {string} [status] - Filter by routine status
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/',
  authenticate,
  authorize([UserRole.PARTICIPANT, UserRole.SUPPORT_WORKER]),
  validate(routineValidation.getRoutines, 'query'),
  routineController.getRoutines
);

/**
 * @swagger
 * /api/v1/routines/:routineId:
 *   get:
 *     summary: Get routine by ID
 *     description: Get routine by ID
 *     tags: [Routines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: routineId
 *         required: true
 *         schema:
 *           type: string
 *         description: The routineId
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.get(
  '/:routineId',
  authenticate,
  routineController.getRoutineById
);

/**
 * @swagger
 * /api/v1/routines/:routineId:
 *   put:
 *     summary: Update routine
 *     description: Update routine
 *     tags: [Routines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: routineId
 *         required: true
 *         schema:
 *           type: string
 *         description: The routineId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Successfully updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.put(
  '/:routineId',
  authenticate,
  authorize([UserRole.PARTICIPANT]),
  validate(routineValidation.updateRoutine),
  routineController.updateRoutine
);

/**
 * @swagger
 * /api/v1/routines/:routineId:
 *   delete:
 *     summary: Delete routine
 *     description: Delete routine
 *     tags: [Routines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: routineId
 *         required: true
 *         schema:
 *           type: string
 *         description: The routineId
 *     responses:
 *       200:
 *         description: Successfully deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.delete(
  '/:routineId',
  authenticate,
  authorize([UserRole.PARTICIPANT]),
  routineController.deleteRoutine
);

/**
 * @swagger
 * /api/v1/routines/:routineId/duplicate:
 *   post:
 *     summary: Duplicate routine
 *     description: Duplicate routine
 *     tags: [Routines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: routineId
 *         required: true
 *         schema:
 *           type: string
 *         description: The routineId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Successfully created
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.post(
  '/:routineId/duplicate',
  authenticate,
  authorize([UserRole.PARTICIPANT]),
  validate(routineValidation.duplicateRoutine),
  routineController.duplicateRoutine
);

/**
 * @swagger
 * /api/v1/routines/:routineId/stats:
 *   get:
 *     summary: Get routine usage statistics
 *     description: Get routine usage statistics
 *     tags: [Routines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: routineId
 *         required: true
 *         schema:
 *           type: string
 *         description: The routineId
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.get(
  '/:routineId/stats',
  authenticate,
  authorize([UserRole.PARTICIPANT]),
  routineController.getRoutineStats
);

/**
 * @swagger
 * /api/v1/shifts/:shiftId/routine:
 *   put:
 *     summary: Update shift routine attachment
 *     description: Update shift routine attachment
 *     tags: [Routines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shiftId
 *         required: true
 *         schema:
 *           type: string
 *         description: The shiftId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Successfully updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.put(
  '/shifts/:shiftId/routine',
  authenticate,
  authorize([UserRole.PARTICIPANT]),
  validate(routineValidation.updateShiftRoutine),
  routineController.updateShiftRoutine
);



/**
 * @swagger
 * /api/v1/shifts/:shiftId/routine-completion:
 *   get:
 *     summary: Get routine completion by shift
 *     description: Get routine completion by shift
 *     tags: [Routines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shiftId
 *         required: true
 *         schema:
 *           type: string
 *         description: The shiftId
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.get(
  '/shifts/:shiftId/routine-completion',
  authenticate,
  routineController.getRoutineCompletionByShift
);



/**
 * @swagger
 * /api/v1/participants/:participantId/routine-completions:
 *   get:
 *     summary: Get routine completions for participant
 *     description: Get routine completions for participant
 *     tags: [Routines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: participantId
 *         required: true
 *         schema:
 *           type: string
 *         description: The participantId
 *       - in: query
 *         name: string
 *         required: true
 *         schema:
 *           type: string
 *         description: {string} [status] - Filter by completion status
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.get(
  '/participants/:participantId/routine-completions',
  authenticate,
  validate(routineValidation.getParticipantCompletions, 'query'),
  routineController.getParticipantCompletions
);

/**
 * @swagger
 * /api/v1/workers/:workerId/routine-completions:
 *   get:
 *     summary: Get routine completions for worker
 *     description: Get routine completions for worker
 *     tags: [Routines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workerId
 *         required: true
 *         schema:
 *           type: string
 *         description: The workerId
 *       - in: query
 *         name: string
 *         required: true
 *         schema:
 *           type: string
 *         description: {string} [status] - Filter by completion status
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.get(
  '/workers/:workerId/routine-completions',
  authenticate,
  validate(routineValidation.getWorkerCompletions, 'query'),
  routineController.getWorkerCompletions
);

/**
 * @swagger
 * /api/v1/routines/daily-stats/:participantId:
 *   get:
 *     summary: Get daily completion statistics for a participant
 *     description: Get daily completion statistics for a participant
 *     tags: [Routines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: participantId
 *         required: true
 *         schema:
 *           type: string
 *         description: The participantId
 *       - in: query
 *         name: string
 *         required: true
 *         schema:
 *           type: string
 *         description: {string} [date] - Date in ISO format (defaults to today)
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.get(
  '/daily-stats/:participantId',
  authenticate,
  validate(routineValidation.getDailyStats, 'query'),
  routineController.getDailyStats
);

/**
 * @swagger
 * /api/v1/routines/daily-details/:participantId:
 *   get:
 *     summary: Get detailed daily routine completions for a participant
 *     description: Get detailed daily routine completions for a participant
 *     tags: [Routines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: participantId
 *         required: true
 *         schema:
 *           type: string
 *         description: The participantId
 *       - in: query
 *         name: string
 *         required: true
 *         schema:
 *           type: string
 *         description: {string} [date] - Date in ISO format (defaults to today)
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.get(
  '/daily-details/:participantId',
  authenticate,
  validate(routineValidation.getDailyDetails, 'query'),
  routineController.getDailyDetails
);

/**
 * @swagger
 * /api/v1/routines/weekly-trend/:participantId:
 *   get:
 *     summary: Get weekly completion trend for a participant
 *     description: Get weekly completion trend for a participant
 *     tags: [Routines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: participantId
 *         required: true
 *         schema:
 *           type: string
 *         description: The participantId
 *       - in: query
 *         name: string
 *         required: true
 *         schema:
 *           type: string
 *         description: {string} [weekStartDate] - Week start date in ISO format (defaults to current week Monday)
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.get(
  '/weekly-trend/:participantId',
  authenticate,
  validate(routineValidation.getWeeklyTrend, 'query'),
  routineController.getWeeklyTrend
);

/**
 * @swagger
 * /api/v1/routines/organization-daily-stats:
 *   get:
 *     summary: Get organization daily statistics (admin only)
 *     description: Get organization daily statistics (admin only)
 *     tags: [Routines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: string
 *         required: true
 *         schema:
 *           type: string
 *         description: {string} [date] - Date in ISO format (defaults to today)
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/organization-daily-stats',
  authenticate,
  authorize([UserRole.ADMIN]),
  validate(routineValidation.getOrganizationDailyStats, 'query'),
  routineController.getOrganizationDailyStats
);

/**
 * @swagger
 * /api/v1/routines/overdue:
 *   get:
 *     summary: Get overdue routines for organization (admin only)
 *     description: Get overdue routines for organization (admin only)
 *     tags: [Routines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: string
 *         required: true
 *         schema:
 *           type: string
 *         description: {string} [organizationId] - Organization ID (required for admin
 *       - in: query
 *         name: auto
 *         required: true
 *         schema:
 *           type: string
 *         description: auto for org admin)
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/overdue',
  authenticate,
  authorize([UserRole.ADMIN]),
  validate(routineValidation.getOverdueRoutines, 'query'),
  routineController.getOverdueRoutines
);

/**
 * @swagger
 * /api/v1/shifts/:shiftId/routine/complete:
 *   patch:
 *     summary: Complete routine for a shift (ultra-simplified)
 *     description: Complete routine for a shift (ultra-simplified)
 *     tags: [Routines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shiftId
 *         required: true
 *         schema:
 *           type: string
 *         description: The shiftId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Successfully updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.patch(
  '/shifts/:shiftId/routine/complete',
  authenticate,
  authorize([UserRole.SUPPORT_WORKER]),
  routineController.completeShiftRoutine
);

export default router;
