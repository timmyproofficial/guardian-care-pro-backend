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
 * @route POST /api/routines
 * @desc Create a new routine
 * @access Private (Participants only)
 */
router.post(
  '/',
  authenticate,
  authorize([UserRole.PARTICIPANT]),
  validate(routineValidation.createRoutine),
  routineController.createRoutine
);

/**
 * @route GET /api/routines
 * @desc Get routines for the authenticated user
 * @access Private (Participants and Workers)
 * @query {string} [status] - Filter by routine status
 * @query {string} [serviceTypeId] - Filter by service type
 * @query {string} [search] - Search in routine name/description
 * @query {string} [participantId] - Required for workers to specify participant
 */
router.get(
  '/',
  authenticate,
  authorize([UserRole.PARTICIPANT, UserRole.SUPPORT_WORKER]),
  validate(routineValidation.getRoutines, 'query'),
  routineController.getRoutines
);

/**
 * @route GET /api/routines/:routineId
 * @desc Get routine by ID
 * @access Private
 */
router.get(
  '/:routineId',
  authenticate,
  routineController.getRoutineById
);

/**
 * @route PUT /api/routines/:routineId
 * @desc Update routine
 * @access Private (Participants only)
 */
router.put(
  '/:routineId',
  authenticate,
  authorize([UserRole.PARTICIPANT]),
  validate(routineValidation.updateRoutine),
  routineController.updateRoutine
);

/**
 * @route DELETE /api/routines/:routineId
 * @desc Delete routine
 * @access Private (Participants only)
 */
router.delete(
  '/:routineId',
  authenticate,
  authorize([UserRole.PARTICIPANT]),
  routineController.deleteRoutine
);

/**
 * @route POST /api/routines/:routineId/duplicate
 * @desc Duplicate routine
 * @access Private (Participants only)
 */
router.post(
  '/:routineId/duplicate',
  authenticate,
  authorize([UserRole.PARTICIPANT]),
  validate(routineValidation.duplicateRoutine),
  routineController.duplicateRoutine
);

/**
 * @route GET /api/routines/:routineId/stats
 * @desc Get routine usage statistics
 * @access Private (Participants only)
 */
router.get(
  '/:routineId/stats',
  authenticate,
  authorize([UserRole.PARTICIPANT]),
  routineController.getRoutineStats
);

/**
 * @route PUT /api/shifts/:shiftId/routine
 * @desc Update shift routine attachment
 * @access Private (Participants only)
 */
router.put(
  '/shifts/:shiftId/routine',
  authenticate,
  authorize([UserRole.PARTICIPANT]),
  validate(routineValidation.updateShiftRoutine),
  routineController.updateShiftRoutine
);



/**
 * @route GET /api/shifts/:shiftId/routine-completion
 * @desc Get routine completion by shift
 * @access Private
 */
router.get(
  '/shifts/:shiftId/routine-completion',
  authenticate,
  routineController.getRoutineCompletionByShift
);



/**
 * @route GET /api/participants/:participantId/routine-completions
 * @desc Get routine completions for participant
 * @access Private
 * @query {string} [status] - Filter by completion status
 * @query {string} [routineId] - Filter by routine
 * @query {string} [workerId] - Filter by worker
 * @query {string} [startDate] - Filter by date range start
 * @query {string} [endDate] - Filter by date range end
 */
router.get(
  '/participants/:participantId/routine-completions',
  authenticate,
  validate(routineValidation.getParticipantCompletions, 'query'),
  routineController.getParticipantCompletions
);

/**
 * @route GET /api/workers/:workerId/routine-completions
 * @desc Get routine completions for worker
 * @access Private
 * @query {string} [status] - Filter by completion status
 * @query {string} [routineId] - Filter by routine
 * @query {string} [participantId] - Filter by participant
 * @query {string} [startDate] - Filter by date range start
 * @query {string} [endDate] - Filter by date range end
 */
router.get(
  '/workers/:workerId/routine-completions',
  authenticate,
  validate(routineValidation.getWorkerCompletions, 'query'),
  routineController.getWorkerCompletions
);

/**
 * @route GET /api/routines/daily-stats/:participantId
 * @desc Get daily completion statistics for a participant
 * @access Private (Participants can only view their own, workers/admins can view any)
 * @query {string} [date] - Date in ISO format (defaults to today)
 */
router.get(
  '/daily-stats/:participantId',
  authenticate,
  validate(routineValidation.getDailyStats, 'query'),
  routineController.getDailyStats
);

/**
 * @route GET /api/routines/daily-details/:participantId
 * @desc Get detailed daily routine completions for a participant
 * @access Private (Participants can only view their own, workers/admins can view any)
 * @query {string} [date] - Date in ISO format (defaults to today)
 */
router.get(
  '/daily-details/:participantId',
  authenticate,
  validate(routineValidation.getDailyDetails, 'query'),
  routineController.getDailyDetails
);

/**
 * @route GET /api/routines/weekly-trend/:participantId
 * @desc Get weekly completion trend for a participant
 * @access Private (Participants can only view their own, workers/admins can view any)
 * @query {string} [weekStartDate] - Week start date in ISO format (defaults to current week Monday)
 */
router.get(
  '/weekly-trend/:participantId',
  authenticate,
  validate(routineValidation.getWeeklyTrend, 'query'),
  routineController.getWeeklyTrend
);

/**
 * @route GET /api/routines/organization-daily-stats
 * @desc Get organization daily statistics (admin only)
 * @access Private (Admin and Organization Admin only)
 * @query {string} [date] - Date in ISO format (defaults to today)
 * @query {string} [organizationId] - Organization ID (required for admin, auto for org admin)
 */
router.get(
  '/organization-daily-stats',
  authenticate,
  authorize([UserRole.ADMIN]),
  validate(routineValidation.getOrganizationDailyStats, 'query'),
  routineController.getOrganizationDailyStats
);

/**
 * @route GET /api/routines/overdue
 * @desc Get overdue routines for organization (admin only)
 * @access Private (Admin and Organization Admin only)
 * @query {string} [organizationId] - Organization ID (required for admin, auto for org admin)
 */
router.get(
  '/overdue',
  authenticate,
  authorize([UserRole.ADMIN]),
  validate(routineValidation.getOverdueRoutines, 'query'),
  routineController.getOverdueRoutines
);

/**
 * @route PATCH /api/shifts/:shiftId/routine/complete
 * @desc Complete routine for a shift (ultra-simplified)
 * @access Private (Workers only)
 */
router.patch(
  '/shifts/:shiftId/routine/complete',
  authenticate,
  authorize([UserRole.SUPPORT_WORKER]),
  routineController.completeShiftRoutine
);

export default router;
