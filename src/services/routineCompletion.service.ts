/**
 * Routine Completion Service (Simplified)
 * Provides business logic for simple routine completion tracking
 */

import httpStatus from 'http-status';
import mongoose from 'mongoose';
import RoutineCompletion, { IRoutineCompletion } from '../models/routineCompletion.model';
import { 
  RoutineCompletionStatus, 
  RoutineCompletionFilter,
  CompleteRoutineInput
} from '../types/routine.types';
import ApiError from '../utils/api-error';
import logger from '../utils/logger';

/**
 * Get routine completion by shift
 */
const getCompletionByShift = async (shiftId: string): Promise<IRoutineCompletion | null> => {
  try {
    const completion = await RoutineCompletion.findOne({ 
      shiftId: new mongoose.Types.ObjectId(shiftId) 
    })
    .populate('routineId', 'name description')
    .populate('workerId', 'firstName lastName')
    .populate('participantId', 'firstName lastName');
    
    return completion;
  } catch (error) {
    logger.error('Error getting routine completion by shift:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to get routine completion');
  }
};

/**
 * Get routine completions for a participant
 */
const getParticipantCompletions = async (
  participantId: string, 
  filter: RoutineCompletionFilter = {}
): Promise<IRoutineCompletion[]> => {
  try {
    const query: any = { 
      participantId: new mongoose.Types.ObjectId(participantId) 
    };

    // Add status filter if provided
    if (filter.status) {
      query.status = filter.status;
    }

    // Add routine filter if provided
    if (filter.routineId) {
      query.routineId = new mongoose.Types.ObjectId(filter.routineId);
    }

    // Add worker filter if provided
    if (filter.workerId) {
      query.workerId = new mongoose.Types.ObjectId(filter.workerId);
    }

    // Add date range filters if provided
    if (filter.startDate || filter.endDate) {
      query.createdAt = {};
      if (filter.startDate) {
        query.createdAt.$gte = filter.startDate;
      }
      if (filter.endDate) {
        query.createdAt.$lte = filter.endDate;
      }
    }

    const completions = await RoutineCompletion.find(query)
      .populate('routineId', 'name description')
      .populate('workerId', 'firstName lastName')
      .populate('shiftId', 'shiftId startTime endTime')
      .sort({ createdAt: -1 })
      .limit(filter.limit || 100);

    return completions;
  } catch (error) {
    logger.error('Error getting participant completions:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to get participant completions');
  }
};

/**
 * Mark routine as completed (simplified)
 */
const completeRoutine = async (
  completionId: string,
  workerId: string,
  completionData: CompleteRoutineInput
): Promise<IRoutineCompletion> => {
  try {
    const completion = await RoutineCompletion.findOne({
      _id: new mongoose.Types.ObjectId(completionId),
      workerId: new mongoose.Types.ObjectId(workerId)
    });

    if (!completion) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'Routine completion not found or you are not authorized to complete it'
      );
    }

    // Update completion status
    completion.status = RoutineCompletionStatus.COMPLETED;
    completion.completedAt = new Date();
    completion.completionPercentage = 100;

    // Add notes if provided
    if (completionData.overallNotes) {
      completion.overallNotes = completionData.overallNotes;
    }

    const updatedCompletion = await completion.save();
    
    logger.info(`Routine completed: ${completionId} by worker: ${workerId}`);
    
    return updatedCompletion;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error completing routine:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to complete routine');
  }
};

/**
 * Complete routine by shift (ultra-simplified)
 */
const completeRoutineByShift = async (
  shiftId: string,
  workerId: string,
  notes?: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // Find or create routine completion record for this shift
    let completion = await RoutineCompletion.findOne({ 
      shiftId: new mongoose.Types.ObjectId(shiftId) 
    });

    if (!completion) {
      // Get shift details to create completion record
      const Shift = mongoose.model('Shift');
      const shift = await Shift.findById(shiftId).populate('routineId');
      
      if (!shift) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Shift not found');
      }

      if (!shift.routineId) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'No routine assigned to this shift');
      }

      // Create new completion record
      completion = new RoutineCompletion({
        shiftId: new mongoose.Types.ObjectId(shiftId),
        routineId: shift.routineId,
        workerId: new mongoose.Types.ObjectId(workerId),
        participantId: shift.participantId,
        organizationId: shift.organizationId,
        status: RoutineCompletionStatus.NOT_STARTED,
        completionPercentage: 0
      });
    }

    // Verify worker is assigned to this shift
    const Shift = mongoose.model('Shift');
    const shift = await Shift.findOne({
      _id: shiftId,
      $or: [
        { workerId: new mongoose.Types.ObjectId(workerId) },
        { 'workerAssignments.workerId': new mongoose.Types.ObjectId(workerId) }
      ]
    });

    if (!shift) {
      throw new ApiError(httpStatus.FORBIDDEN, 'You are not assigned to this shift');
    }

    // Mark as completed
    completion.status = RoutineCompletionStatus.COMPLETED;
    completion.completedAt = new Date();
    completion.completionPercentage = 100;
    
    if (notes) {
      completion.overallNotes = notes;
    }

    await completion.save();

    logger.info(`Routine completed for shift ${shiftId} by worker ${workerId}`);
    
    return {
      success: true,
      message: 'Routine marked as completed successfully'
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error completing routine by shift:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to complete routine');
  }
};

/**
 * Get daily completion statistics for a participant
 */
const getDailyCompletionStats = async (participantId: string, date: Date) => {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const stats = await RoutineCompletion.aggregate([
      {
        $match: {
          participantId: new mongoose.Types.ObjectId(participantId),
          createdAt: { $gte: startOfDay, $lte: endOfDay }
        }
      },
      {
        $group: {
          _id: null,
          totalAssigned: { $sum: 1 },
          completed: {
            $sum: {
              $cond: [{ $eq: ['$status', RoutineCompletionStatus.COMPLETED] }, 1, 0]
            }
          },
          notStarted: {
            $sum: {
              $cond: [{ $eq: ['$status', RoutineCompletionStatus.NOT_STARTED] }, 1, 0]
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalAssigned: 0,
      completed: 0,
      notStarted: 0
    };

    const completionRate = result.totalAssigned > 0 
      ? Math.round((result.completed / result.totalAssigned) * 100) 
      : 0;

    return {
      ...result,
      completionRate
    };
  } catch (error) {
    logger.error('Error getting daily completion stats:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to get completion stats');
  }
};

/**
 * Get routine completions for a worker
 */
const getWorkerCompletions = async (
  workerId: string, 
  filter: RoutineCompletionFilter = {}
): Promise<IRoutineCompletion[]> => {
  try {
    const query: any = { 
      workerId: new mongoose.Types.ObjectId(workerId) 
    };

    // Add status filter if provided
    if (filter.status) {
      query.status = filter.status;
    }

    // Add routine filter if provided
    if (filter.routineId) {
      query.routineId = new mongoose.Types.ObjectId(filter.routineId);
    }

    // Add participant filter if provided
    if (filter.participantId) {
      query.participantId = new mongoose.Types.ObjectId(filter.participantId);
    }

    // Add date range filters if provided
    if (filter.startDate || filter.endDate) {
      query.createdAt = {};
      if (filter.startDate) {
        query.createdAt.$gte = filter.startDate;
      }
      if (filter.endDate) {
        query.createdAt.$lte = filter.endDate;
      }
    }

    const completions = await RoutineCompletion.find(query)
      .populate('routineId', 'name description')
      .populate('participantId', 'firstName lastName')
      .populate('shiftId', 'shiftId startTime endTime')
      .sort({ createdAt: -1 })
      .limit(filter.limit || 100);

    return completions;
  } catch (error) {
    logger.error('Error getting worker completions:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to get worker completions');
  }
};

export const routineCompletionService = {
  getCompletionByShift,
  getParticipantCompletions,
  getWorkerCompletions,
  completeRoutine,
  completeRoutineByShift,
  getDailyCompletionStats
};