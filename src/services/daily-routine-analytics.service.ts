/**
 * Daily Routine Analytics Service
 * Provides daily tracking and analytics for routine completions
 */

import httpStatus from 'http-status';
import mongoose from 'mongoose';
import RoutineCompletion from '../models/routineCompletion.model';
import User from '../models/user.model';
import { RoutineCompletionStatus } from '../types/routine.types';
import { UserRole } from '../types/user.types';
import ApiError from '../utils/api-error';
import logger from '../utils/logger';

/**
 * Interface for daily completion statistics (simplified)
 */
export interface DailyCompletionStats {
  date: string;
  participantId: string;
  totalAssigned: number;
  completed: number;
  notStarted: number;
  completionRate: number; // percentage
}

/**
 * Interface for detailed daily routine status (simplified)
 */
export interface DailyRoutineDetail {
  routineCompletionId: string;
  routineId: string;
  routineName: string;
  shiftId: string;
  shiftStartTime: Date;
  workerId?: string;
  workerName?: string;
  status: RoutineCompletionStatus;
  completionPercentage: number;
  completedAt?: Date;
  isOverdue?: boolean;
}

/**
 * Interface for weekly completion trends
 */
export interface WeeklyCompletionTrend {
  participantId: string;
  weekStartDate: string;
  weekEndDate: string;
  dailyStats: DailyCompletionStats[];
  weeklyTotals: {
    totalAssigned: number;
    totalCompleted: number;
    averageCompletionRate: number;
  };
}

/**
 * Get daily completion statistics for a participant
 */
const getDailyCompletionStats = async (
  participantId: string,
  date: Date
): Promise<DailyCompletionStats> => {
  try {
    // Validate participant exists
    const participant = await User.findOne({
      _id: participantId,
      role: UserRole.PARTICIPANT
    });

    if (!participant) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Participant not found');
    }

    // Get statistics from the model
    const statsResult = await (RoutineCompletion as any).getDailyCompletionStats(
      participantId,
      date
    );

    const stats = statsResult[0] || {
      totalAssigned: 0,
      completed: 0,
      notStarted: 0
    };

    const completionRate = stats.totalAssigned > 0 
      ? Math.round((stats.completed / stats.totalAssigned) * 100) 
      : 0;

    const result: DailyCompletionStats = {
      date: date.toISOString().split('T')[0],
      participantId,
      totalAssigned: stats.totalAssigned,
      completed: stats.completed,
      notStarted: stats.notStarted,
      completionRate
    };

    logger.info('Daily completion stats retrieved', { 
      participantId, 
      date: date.toISOString().split('T')[0],
      completionRate: result.completionRate
    });

    return result;
  } catch (error) {
    logger.error(`Error getting daily completion stats for participant ${participantId}:`, error);
    throw error;
  }
};

/**
 * Get detailed daily routine completions for a participant
 */
const getDailyRoutineDetails = async (
  participantId: string,
  date: Date
): Promise<DailyRoutineDetail[]> => {
  try {
    // Get detailed completions from the model
    const completions = await (RoutineCompletion as any).getDailyRoutineCompletions(
      participantId,
      date
    );

    const now = new Date();
    
    const details: DailyRoutineDetail[] = completions.map((completion: any) => {
      // Check if routine is overdue (shift has ended but routine not completed)
      const isOverdue = completion.shiftId?.endTime && 
                        completion.shiftId.endTime < now && 
                        completion.status !== RoutineCompletionStatus.COMPLETED;

              return {
          routineCompletionId: completion._id.toString(),
          routineId: completion.routineId?.routineId || completion.routineId?._id?.toString() || '',
          routineName: completion.routineId?.name || 'Unknown Routine',
          shiftId: completion.shiftId?.shiftId || completion.shiftId?._id?.toString() || '',
          shiftStartTime: completion.shiftId?.startTime || completion.createdAt,
          workerId: completion.workerId?._id?.toString(),
          workerName: completion.workerId ? 
            `${completion.workerId.firstName} ${completion.workerId.lastName}` : 
            undefined,
          status: completion.status,
          completionPercentage: completion.completionPercentage,
          completedAt: completion.completedAt,
          isOverdue: Boolean(isOverdue)
        };
    });

    return details;
  } catch (error) {
    logger.error(`Error getting daily routine details for participant ${participantId}:`, error);
    throw error;
  }
};

/**
 * Get weekly completion trend for a participant
 */
const getWeeklyCompletionTrend = async (
  participantId: string,
  weekStartDate: Date
): Promise<WeeklyCompletionTrend> => {
  try {
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);

    const dailyStats: DailyCompletionStats[] = [];
    
    // Get stats for each day of the week
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(weekStartDate);
      currentDate.setDate(currentDate.getDate() + i);
      
      const dayStats = await getDailyCompletionStats(participantId, currentDate);
      dailyStats.push(dayStats);
    }

    // Calculate weekly totals
    const weeklyTotals = {
      totalAssigned: dailyStats.reduce((sum, day) => sum + day.totalAssigned, 0),
      totalCompleted: dailyStats.reduce((sum, day) => sum + day.completed, 0),
      averageCompletionRate: Math.round(
        dailyStats.reduce((sum, day) => sum + day.completionRate, 0) / 7
      )
    };

    const result: WeeklyCompletionTrend = {
      participantId,
      weekStartDate: weekStartDate.toISOString().split('T')[0],
      weekEndDate: weekEndDate.toISOString().split('T')[0],
      dailyStats,
      weeklyTotals
    };

    logger.info('Weekly completion trend retrieved', { 
      participantId, 
      weekStartDate: result.weekStartDate,
      averageCompletionRate: weeklyTotals.averageCompletionRate
    });

    return result;
  } catch (error) {
    logger.error(`Error getting weekly completion trend for participant ${participantId}:`, error);
    throw error;
  }
};

/**
 * Get completion statistics for multiple participants (admin view)
 */
const getOrganizationDailyStats = async (
  organizationId: string,
  date: Date
): Promise<DailyCompletionStats[]> => {
  try {
    // Get all participants in the organization
    const participants = await User.find({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      role: UserRole.PARTICIPANT
    }).select('_id firstName lastName');

    const stats: DailyCompletionStats[] = [];

    // Get stats for each participant
    for (const participant of participants) {
      try {
        const participantStats = await getDailyCompletionStats(
          participant._id.toString(),
          date
        );
        stats.push(participantStats);
      } catch (error) {
        logger.warn(`Failed to get stats for participant ${participant._id}:`, error);
        // Continue with other participants
      }
    }

    return stats;
  } catch (error) {
    logger.error(`Error getting organization daily stats:`, error);
    throw error;
  }
};

/**
 * Get overdue routines across organization
 */
const getOverdueRoutines = async (organizationId: string): Promise<DailyRoutineDetail[]> => {
  try {
    const now = new Date();
    
    // Find routine completions where shift has ended but routine is not completed
    const overdueCompletions = await RoutineCompletion.find({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      status: { 
        $ne: RoutineCompletionStatus.COMPLETED
      }
    })
    .populate('routineId', 'routineId name')
    .populate('shiftId', 'shiftId startTime endTime')
    .populate('participantId', 'firstName lastName')
    .populate('workerId', 'firstName lastName');

    const overdueDetails: DailyRoutineDetail[] = [];

    for (const completion of overdueCompletions) {
      const shift = completion.shiftId as any;
      
      // Check if shift has ended
      if (shift?.endTime && shift.endTime < now) {
        overdueDetails.push({
          routineCompletionId: completion._id.toString(),
          routineId: (completion.routineId as any)?.routineId || '',
          routineName: (completion.routineId as any)?.name || 'Unknown Routine',
          shiftId: shift?.shiftId || '',
          shiftStartTime: shift?.startTime || completion.createdAt,
          workerId: (completion.workerId as any)?._id?.toString(),
          workerName: completion.workerId ? 
            `${(completion.workerId as any).firstName} ${(completion.workerId as any).lastName}` : 
            'Unassigned',
          status: completion.status,
          completionPercentage: completion.completionPercentage,
          completedAt: completion.completedAt,
          isOverdue: true
        });
      }
    }

    return overdueDetails;
  } catch (error) {
    logger.error(`Error getting overdue routines:`, error);
    throw error;
  }
};

/**
 * Daily Routine Analytics Service exports
 */
export const dailyRoutineAnalyticsService = {
  getDailyCompletionStats,
  getDailyRoutineDetails,
  getWeeklyCompletionTrend,
  getOrganizationDailyStats,
  getOverdueRoutines
};
