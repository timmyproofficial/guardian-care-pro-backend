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
 * @route POST /api/shifts/:shiftId/routine/start
 * @desc Initialize routine completion for shift
 * @access Private (Workers only)
 */
router.post(
  '/shifts/:shiftId/routine/start',
  authenticate,
  authorize([UserRole.SUPPORT_WORKER]),
  routineController.initializeRoutineCompletion
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
 * @route PUT /api/routine-completions/:completionId
 * @desc Update task completions
 * @access Private (Workers only)
 */
router.put(
  '/routine-completions/:completionId',
  authenticate,
  authorize([UserRole.SUPPORT_WORKER]),
  validate(routineValidation.updateTaskCompletions),
  routineController.updateTaskCompletions
);

/**
 * @route POST /api/routine-completions/:completionId/complete
 * @desc Mark routine as completed
 * @access Private (Workers only)
 */
router.post(
  '/routine-completions/:completionId/complete',
  authenticate,
  authorize([UserRole.SUPPORT_WORKER]),
  validate(routineValidation.completeRoutine),
  routineController.completeRoutine
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

export default router;
