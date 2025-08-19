/**
 * Routine controller
 * Handles HTTP requests for routine management and operations
 */

import { Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import { routineService } from '../services/routine.service';
import { routineCompletionService } from '../services/routineCompletion.service';
import { shiftService } from '../services/shift.service';
import { organizationService } from '../services/organization.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { UserRole } from '../types/user.types';
import { 
  RoutineStatus, 
  RoutineFilter, 
  RoutineCompletionFilter 
} from '../types/routine.types';
import { successResponse, errorResponse } from '../utils/api-response';
import logger from '../utils/logger';

export const routineController = {
  /**
   * Create a new routine
   * @route POST /api/routines
   */
  createRoutine: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      // Only participants can create routines
      if (req.user.role !== UserRole.PARTICIPANT) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only participants can create routines', httpStatus.FORBIDDEN)
        );
      }

      const participantId = req.user._id.toString();
      
      // Get the organization ID for the participant
      const organizationId = await organizationService.getOrganizationIdForParticipant(participantId);

      const routine = await routineService.createRoutine(
        req.body,
        participantId,
        organizationId
      );

      return res.status(httpStatus.CREATED).json(
        successResponse(routine, 'Routine created successfully')
      );
    } catch (error) {
      logger.error('Error creating routine:', error);
      return next(error);
    }
  },

  /**
   * Get participant's routines
   * @route GET /api/routines
   */
  getRoutines: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      const userId = req.user._id.toString();
      let participantId: string;

      // Determine participant ID based on user role
      if (req.user.role === UserRole.PARTICIPANT) {
        participantId = userId;
      } else if (req.user.role === UserRole.SUPPORT_WORKER) {
        // Workers can optionally view routines for a specific participant they work with
        participantId = req.query.participantId as string;
        if (!participantId) {
          return res.status(httpStatus.BAD_REQUEST).json(
            errorResponse('Participant ID required for workers', httpStatus.BAD_REQUEST)
          );
        }
      } else {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Access denied', httpStatus.FORBIDDEN)
        );
      }

      // Build filter from query parameters
      const filter: RoutineFilter = {};
      
      if (req.query.status) {
        filter.status = req.query.status as RoutineStatus;
      }
      
      if (req.query.serviceTypeId) {
        filter.serviceTypeId = req.query.serviceTypeId as string;
      }
      
      if (req.query.search) {
        filter.search = req.query.search as string;
      }

      const routines = await routineService.getParticipantRoutines(participantId, filter);

      return res.json(
        successResponse(routines, 'Routines retrieved successfully')
      );
    } catch (error) {
      logger.error('Error getting routines:', error);
      return next(error);
    }
  },

  /**
   * Get routine by ID
   * @route GET /api/routines/:routineId
   */
  getRoutineById: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      const { routineId } = req.params;
      const userId = req.user._id.toString();

      // Participants can only view their own routines, workers can view any routine
      let participantIdFilter: string | undefined;
      if (req.user.role === UserRole.PARTICIPANT) {
        participantIdFilter = userId;
      }

      const routine = await routineService.getRoutineById(routineId, participantIdFilter);

      return res.json(
        successResponse(routine, 'Routine retrieved successfully')
      );
    } catch (error) {
      logger.error('Error getting routine:', error);
      return next(error);
    }
  },

  /**
   * Update routine
   * @route PUT /api/routines/:routineId
   */
  updateRoutine: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      // Only participants can update routines
      if (req.user.role !== UserRole.PARTICIPANT) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only participants can update routines', httpStatus.FORBIDDEN)
        );
      }

      const { routineId } = req.params;
      const participantId = req.user._id.toString();

      const routine = await routineService.updateRoutine(
        routineId,
        req.body,
        participantId
      );

      return res.json(
        successResponse(routine, 'Routine updated successfully')
      );
    } catch (error) {
      logger.error('Error updating routine:', error);
      return next(error);
    }
  },

  /**
   * Delete routine
   * @route DELETE /api/routines/:routineId
   */
  deleteRoutine: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      // Only participants can delete routines
      if (req.user.role !== UserRole.PARTICIPANT) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only participants can delete routines', httpStatus.FORBIDDEN)
        );
      }

      const { routineId } = req.params;
      const participantId = req.user._id.toString();

      await routineService.deleteRoutine(routineId, participantId);

      return res.json(
        successResponse({}, 'Routine deleted successfully')
      );
    } catch (error) {
      logger.error('Error deleting routine:', error);
      return next(error);
    }
  },

  /**
   * Duplicate routine
   * @route POST /api/routines/:routineId/duplicate
   */
  duplicateRoutine: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      // Only participants can duplicate routines
      if (req.user.role !== UserRole.PARTICIPANT) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only participants can duplicate routines', httpStatus.FORBIDDEN)
        );
      }

      const { routineId } = req.params;
      const participantId = req.user._id.toString();
      const { name } = req.body;

      const duplicatedRoutine = await routineService.duplicateRoutine(
        routineId,
        participantId,
        name
      );

      return res.status(httpStatus.CREATED).json(
        successResponse(duplicatedRoutine, 'Routine duplicated successfully')
      );
    } catch (error) {
      logger.error('Error duplicating routine:', error);
      return next(error);
    }
  },

  /**
   * Get routine usage statistics
   * @route GET /api/routines/:routineId/stats
   */
  getRoutineStats: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      const { routineId } = req.params;
      const userId = req.user._id.toString();

      // Only participants can view their routine stats
      if (req.user.role !== UserRole.PARTICIPANT) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only participants can view routine statistics', httpStatus.FORBIDDEN)
        );
      }

      const stats = await routineService.getRoutineUsageStats(routineId, userId);

      return res.json(
        successResponse(stats, 'Routine statistics retrieved successfully')
      );
    } catch (error) {
      logger.error('Error getting routine stats:', error);
      return next(error);
    }
  },

  /**
   * Update shift routine attachment
   * @route PUT /api/shifts/:shiftId/routine
   */
  updateShiftRoutine: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      // Only participants can update shift routines
      if (req.user.role !== UserRole.PARTICIPANT) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only participants can update shift routines', httpStatus.FORBIDDEN)
        );
      }

      const { shiftId } = req.params;
      const { routineId, routineRequired } = req.body;
      const participantId = req.user._id.toString();

      const shift = await shiftService.updateShiftRoutine(
        shiftId,
        routineId,
        routineRequired || false,
        participantId
      );

      return res.json(
        successResponse(shift, 'Shift routine updated successfully')
      );
    } catch (error) {
      logger.error('Error updating shift routine:', error);
      return next(error);
    }
  },

  /**
   * Initialize routine completion for shift
   * @route POST /api/shifts/:shiftId/routine/start
   */
  initializeRoutineCompletion: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      // Only workers can initialize routine completions
      if (req.user.role !== UserRole.SUPPORT_WORKER) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only workers can initialize routine completions', httpStatus.FORBIDDEN)
        );
      }

      const { shiftId } = req.params;
      const workerId = req.user._id.toString();

      const completion = await routineCompletionService.initializeRoutineCompletion(
        shiftId,
        workerId
      );

      if (!completion) {
        return res.json(
          successResponse({}, 'Shift has no routine attached')
        );
      }

      return res.status(httpStatus.CREATED).json(
        successResponse(completion, 'Routine completion initialized successfully')
      );
    } catch (error) {
      logger.error('Error initializing routine completion:', error);
      return next(error);
    }
  },

  /**
   * Update task completions
   * @route PUT /api/routine-completions/:completionId
   */
  updateTaskCompletions: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      // Only workers can update task completions
      if (req.user.role !== UserRole.SUPPORT_WORKER) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only workers can update task completions', httpStatus.FORBIDDEN)
        );
      }

      const { completionId } = req.params;
      const workerId = req.user._id.toString();

      const completion = await routineCompletionService.updateTaskCompletions(
        completionId,
        workerId,
        req.body
      );

      return res.json(
        successResponse(completion, 'Task completions updated successfully')
      );
    } catch (error) {
      logger.error('Error updating task completions:', error);
      return next(error);
    }
  },

  /**
   * Complete entire routine
   * @route POST /api/routine-completions/:completionId/complete
   */
  completeRoutine: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      // Only workers can complete routines
      if (req.user.role !== UserRole.SUPPORT_WORKER) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only workers can complete routines', httpStatus.FORBIDDEN)
        );
      }

      const { completionId } = req.params;
      const workerId = req.user._id.toString();

      const completion = await routineCompletionService.completeRoutine(
        completionId,
        workerId,
        req.body
      );

      return res.json(
        successResponse(completion, 'Routine completed successfully')
      );
    } catch (error) {
      logger.error('Error completing routine:', error);
      return next(error);
    }
  },

  /**
   * Get routine completion by shift
   * @route GET /api/shifts/:shiftId/routine-completion
   */
  getRoutineCompletionByShift: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      const { shiftId } = req.params;

      const completion = await routineCompletionService.getCompletionByShift(shiftId);

      if (!completion) {
        return res.json(
          successResponse({}, 'No routine completion found for this shift')
        );
      }

      return res.json(
        successResponse(completion, 'Routine completion retrieved successfully')
      );
    } catch (error) {
      logger.error('Error getting routine completion:', error);
      return next(error);
    }
  },

  /**
   * Get routine completions for participant
   * @route GET /api/participants/:participantId/routine-completions
   */
  getParticipantCompletions: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      const { participantId } = req.params;
      const userId = req.user._id.toString();

      // Participants can only view their own completions
      if (req.user.role === UserRole.PARTICIPANT && participantId !== userId) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Access denied', httpStatus.FORBIDDEN)
        );
      }

      // Build filter from query parameters
      const filter: RoutineCompletionFilter = {};
      
      if (req.query.status) {
        filter.status = req.query.status as any;
      }
      
      if (req.query.routineId) {
        filter.routineId = req.query.routineId as string;
      }
      
      if (req.query.workerId) {
        filter.workerId = req.query.workerId as string;
      }
      
      if (req.query.startDate) {
        filter.startDate = new Date(req.query.startDate as string);
      }
      
      if (req.query.endDate) {
        filter.endDate = new Date(req.query.endDate as string);
      }

      const completions = await routineCompletionService.getParticipantCompletions(
        participantId,
        filter
      );

      return res.json(
        successResponse(completions, 'Routine completions retrieved successfully')
      );
    } catch (error) {
      logger.error('Error getting participant completions:', error);
      return next(error);
    }
  },

  /**
   * Get routine completions for worker
   * @route GET /api/workers/:workerId/routine-completions
   */
  getWorkerCompletions: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      const { workerId } = req.params;
      const userId = req.user._id.toString();

      // Workers can only view their own completions
      if (req.user.role === UserRole.SUPPORT_WORKER && workerId !== userId) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Access denied', httpStatus.FORBIDDEN)
        );
      }

      // Build filter from query parameters
      const filter: RoutineCompletionFilter = {};
      
      if (req.query.status) {
        filter.status = req.query.status as any;
      }
      
      if (req.query.routineId) {
        filter.routineId = req.query.routineId as string;
      }
      
      if (req.query.participantId) {
        filter.participantId = req.query.participantId as string;
      }
      
      if (req.query.startDate) {
        filter.startDate = new Date(req.query.startDate as string);
      }
      
      if (req.query.endDate) {
        filter.endDate = new Date(req.query.endDate as string);
      }

      const completions = await routineCompletionService.getWorkerCompletions(
        workerId,
        filter
      );

      return res.json(
        successResponse(completions, 'Routine completions retrieved successfully')
      );
    } catch (error) {
      logger.error('Error getting worker completions:', error);
      return next(error);
    }
  }
};
