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
import { dailyRoutineAnalyticsService } from '../services/daily-routine-analytics.service';
import RoutineCompletion from '../models/routineCompletion.model';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { UserRole } from '../types/user.types';
import { 
  RoutineStatus, 
  RoutineFilter, 
  RoutineCompletionFilter,
  RoutineCompletionStatus
} from '../types/routine.types';
import { successResponse, errorResponse } from '../utils/api-response';
import logger from '../utils/logger';

export const routineController = {
  /**
   * Create a new routine
   * @route POST /api/v1/routines
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
   * @route GET /api/v1/routines
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
   * @route GET /api/v1/routines/:routineId
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
   * @route PUT /api/v1/routines/:routineId
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
   * @route DELETE /api/v1/routines/:routineId
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
   * @route POST /api/v1/routines/:routineId/duplicate
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
   * @route GET /api/v1/routines/:routineId/stats
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
   * @route PUT /api/v1/shifts/:shiftId/routine
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
   * Get routine completion by shift
   * @route GET /api/v1/shifts/:shiftId/routine-completion
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
   * @route GET /api/v1/participants/:participantId/routine-completions
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
   * @route GET /api/v1/workers/:workerId/routine-completions
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
  },

  /**
   * Get daily completion statistics for a participant
   * @route GET /api/v1/routines/daily-stats/:participantId
   */
  getDailyStats: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      const { participantId } = req.params;
      const { date } = req.query;

      // Parse date or use today
      const targetDate = date ? new Date(date as string) : new Date();

      // Participants can only see their own stats, workers/admins can see any participant's stats
      if (req.user.role === UserRole.PARTICIPANT && req.user._id.toString() !== participantId) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Participants can only view their own statistics', httpStatus.FORBIDDEN)
        );
      }

      const stats = await dailyRoutineAnalyticsService.getDailyCompletionStats(
        participantId,
        targetDate
      );

      return res.status(httpStatus.OK).json(
        successResponse(stats, 'Daily completion statistics retrieved successfully')
      );
    } catch (error) {
      logger.error('Error getting daily completion stats:', error);
      return next(error);
    }
  },

  /**
   * Get detailed daily routine completions for a participant
   * @route GET /api/v1/routines/daily-details/:participantId
   */
  getDailyDetails: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      const { participantId } = req.params;
      const { date } = req.query;

      // Parse date or use today
      const targetDate = date ? new Date(date as string) : new Date();

      // Participants can only see their own details, workers/admins can see any participant's details
      if (req.user.role === UserRole.PARTICIPANT && req.user._id.toString() !== participantId) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Participants can only view their own routine details', httpStatus.FORBIDDEN)
        );
      }

      const details = await dailyRoutineAnalyticsService.getDailyRoutineDetails(
        participantId,
        targetDate
      );

      return res.status(httpStatus.OK).json(
        successResponse(details, 'Daily routine details retrieved successfully')
      );
    } catch (error) {
      logger.error('Error getting daily routine details:', error);
      return next(error);
    }
  },

  /**
   * Get weekly completion trend for a participant
   * @route GET /api/v1/routines/weekly-trend/:participantId
   */
  getWeeklyTrend: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      const { participantId } = req.params;
      const { weekStartDate } = req.query;

      // Parse week start date or use current week start (Monday)
      let startDate: Date;
      if (weekStartDate) {
        startDate = new Date(weekStartDate as string);
      } else {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        startDate = new Date(today);
        startDate.setDate(today.getDate() + mondayOffset);
        startDate.setHours(0, 0, 0, 0);
      }

      // Participants can only see their own trends, workers/admins can see any participant's trends
      if (req.user.role === UserRole.PARTICIPANT && req.user._id.toString() !== participantId) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Participants can only view their own weekly trends', httpStatus.FORBIDDEN)
        );
      }

      const trend = await dailyRoutineAnalyticsService.getWeeklyCompletionTrend(
        participantId,
        startDate
      );

      return res.status(httpStatus.OK).json(
        successResponse(trend, 'Weekly completion trend retrieved successfully')
      );
    } catch (error) {
      logger.error('Error getting weekly completion trend:', error);
      return next(error);
    }
  },

  /**
   * Get organization daily statistics (admin only)
   * @route GET /api/v1/routines/organization-daily-stats
   */
  getOrganizationDailyStats: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      // Only admins can view organization stats
      if (req.user.role !== UserRole.ADMIN) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only administrators can view organization statistics', httpStatus.FORBIDDEN)
        );
      }

      const { date } = req.query;
      
      // Parse date or use today
      const targetDate = date ? new Date(date as string) : new Date();

      // Get organization ID
      const organizationId = req.query.organizationId as string;

      if (!organizationId) {
        return res.status(httpStatus.BAD_REQUEST).json(
          errorResponse('Organization ID is required', httpStatus.BAD_REQUEST)
        );
      }

      const stats = await dailyRoutineAnalyticsService.getOrganizationDailyStats(
        organizationId,
        targetDate
      );

      return res.status(httpStatus.OK).json(
        successResponse(stats, 'Organization daily statistics retrieved successfully')
      );
    } catch (error) {
      logger.error('Error getting organization daily stats:', error);
      return next(error);
    }
  },

  /**
   * Get overdue routines for organization (admin only)
   * @route GET /api/v1/routines/overdue
   */
  getOverdueRoutines: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      // Only admins can view overdue routines
      if (req.user.role !== UserRole.ADMIN) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only administrators can view overdue routines', httpStatus.FORBIDDEN)
        );
      }

      // Get organization ID
      const organizationId = req.query.organizationId as string;

      if (!organizationId) {
        return res.status(httpStatus.BAD_REQUEST).json(
          errorResponse('Organization ID is required', httpStatus.BAD_REQUEST)
        );
      }

      const overdueRoutines = await dailyRoutineAnalyticsService.getOverdueRoutines(organizationId);

      return res.status(httpStatus.OK).json(
        successResponse(overdueRoutines, 'Overdue routines retrieved successfully')
      );
    } catch (error) {
      logger.error('Error getting overdue routines:', error);
      return next(error);
    }
  },

  /**
   * Complete routine for a shift (ultra-simplified)
   * @route PATCH /api/v1/shifts/:shiftId/routine/complete
   */
  completeShiftRoutine: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

      const { shiftId } = req.params;
      const workerId = req.user._id.toString();
      const { notes } = req.body;

      // Get the shift with routine
      const shift = await shiftService.getShiftWithRoutine(shiftId, workerId);
      
      if (!shift) {
        return res.status(httpStatus.NOT_FOUND).json(
          errorResponse('Shift not found or access denied', httpStatus.NOT_FOUND)
        );
      }

      if (!shift.routineId) {
        return res.status(httpStatus.BAD_REQUEST).json(
          errorResponse('This shift has no routine attached', httpStatus.BAD_REQUEST)
        );
      }

      // Verify worker is assigned to this shift
      if (shift.workerId?.toString() !== workerId) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('You are not assigned to this shift', httpStatus.FORBIDDEN)
        );
      }

      // Find or create routine completion record
      let routineCompletion = await RoutineCompletion.findOne({ 
        shiftId: shift._id 
      });

      if (!routineCompletion) {
        // Create new completion record directly as COMPLETED
        routineCompletion = await RoutineCompletion.create({
          shiftId: shift._id,
          routineId: shift.routineId,
          workerId: shift.workerId,
          participantId: shift.participantId,
          organizationId: shift.organizationId,
          status: RoutineCompletionStatus.COMPLETED,
          completionPercentage: 100,
          completedAt: new Date(),
          overallNotes: notes || undefined
        });
      } else {
        // Update existing record to completed
        routineCompletion.status = RoutineCompletionStatus.COMPLETED;
        routineCompletion.completionPercentage = 100;
        routineCompletion.completedAt = new Date();
        if (notes) routineCompletion.overallNotes = notes;
        await routineCompletion.save();
      }

      logger.info('Routine completed', { 
        shiftId: shift.shiftId, 
        workerId,
        routineId: shift.routineId
      });

      return res.json(
        successResponse({ 
          shiftId: shift.shiftId,
          routineCompleted: true,
          completedAt: routineCompletion.completedAt,
          notes: routineCompletion.overallNotes 
        }, 'Routine completed successfully')
      );
    } catch (error) {
      logger.error('Error completing routine:', error);
      return next(error);
    }
  }
};
