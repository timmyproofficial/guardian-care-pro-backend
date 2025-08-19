/**
 * Routine Completion service implementation
 * Provides business logic for routine completion tracking during shifts
 */

import httpStatus from 'http-status';
import mongoose from 'mongoose';
import RoutineCompletion, { IRoutineCompletion } from '../models/routineCompletion.model';
import Routine from '../models/routine.model';
import Shift from '../models/shift.model';
import { 
  RoutineCompletionStatus, 
  TaskCompletionStatus,
  TaskCompletionUpdateInput,
  CompleteRoutineInput,
  RoutineCompletionFilter,
  TaskCompletion
} from '../types/routine.types';
import ApiError from '../utils/api-error';
import logger from '../utils/logger';

/**
 * Initialize routine completion when shift starts
 */
const initializeRoutineCompletion = async (
  shiftId: string,
  workerId: string
): Promise<IRoutineCompletion | null> => {
  try {
    // Get shift with routine
    const shift = await Shift.findById(shiftId).populate('routineId');
    
    if (!shift) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Shift not found');
    }

    // Check if shift has a routine
    if (!shift.routineId) {
      logger.info('Shift has no routine attached', { shiftId });
      return null;
    }

    // Check if completion already exists
    const existingCompletion = await RoutineCompletion.findOne({ shiftId });
    if (existingCompletion) {
      logger.info('Routine completion already exists', { shiftId, completionId: existingCompletion._id });
      return existingCompletion;
    }

    // Get routine details
    const routine = await Routine.findById(shift.routineId);
    if (!routine) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Routine not found');
    }

    // Initialize task completions
    const taskCompletions: TaskCompletion[] = routine.tasks.map(task => ({
      taskId: task._id,
      status: TaskCompletionStatus.NOT_STARTED
    }));

    // Create routine completion
    const routineCompletion = new RoutineCompletion({
      shiftId: new mongoose.Types.ObjectId(shiftId),
      routineId: routine._id,
      workerId: new mongoose.Types.ObjectId(workerId),
      participantId: shift.participantId,
      organizationId: shift.organizationId,
      status: RoutineCompletionStatus.NOT_STARTED,
      taskCompletions,
      completionPercentage: 0
    });

    await routineCompletion.save();

    logger.info('Routine completion initialized', { 
      shiftId, 
      routineId: routine.routineId, 
      workerId,
      taskCount: taskCompletions.length
    });

    return routineCompletion;
  } catch (error) {
    logger.error('Error initializing routine completion:', error);
    throw error;
  }
};

/**
 * Start routine completion
 */
const startRoutineCompletion = async (
  completionId: string,
  workerId: string
): Promise<IRoutineCompletion> => {
  try {
    const completion = await RoutineCompletion.findOne({
      _id: completionId,
      workerId: new mongoose.Types.ObjectId(workerId)
    });

    if (!completion) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Routine completion not found or access denied');
    }

    if (completion.status !== RoutineCompletionStatus.NOT_STARTED) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Routine has already been started');
    }

    completion.status = RoutineCompletionStatus.IN_PROGRESS;
    completion.startedAt = new Date();
    await completion.save();

    logger.info('Routine completion started', { 
      completionId, 
      workerId,
      shiftId: completion.shiftId
    });

    return completion;
  } catch (error) {
    logger.error('Error starting routine completion:', error);
    throw error;
  }
};

/**
 * Update task completions
 */
const updateTaskCompletions = async (
  completionId: string,
  workerId: string,
  updateData: TaskCompletionUpdateInput
): Promise<IRoutineCompletion> => {
  try {
    const completion = await RoutineCompletion.findOne({
      _id: completionId,
      workerId: new mongoose.Types.ObjectId(workerId)
    });

    if (!completion) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Routine completion not found or access denied');
    }

    // Update task completions
    updateData.taskCompletions.forEach(updatedTask => {
      const existingTask = completion.taskCompletions.find(
        tc => tc.taskId.toString() === updatedTask.taskId.toString()
      );

      if (existingTask) {
        Object.assign(existingTask, updatedTask);
        
        // Set completion time if task is being completed
        if (updatedTask.status === TaskCompletionStatus.COMPLETED && !existingTask.completedAt) {
          existingTask.completedAt = new Date();
        }
      } else {
        // Add new task completion if it doesn't exist
        completion.taskCompletions.push(updatedTask);
      }
    });

    // Update overall notes if provided
    if (updateData.overallNotes !== undefined) {
      completion.overallNotes = updateData.overallNotes;
    }

    if (updateData.issuesEncountered !== undefined) {
      completion.issuesEncountered = updateData.issuesEncountered;
    }

    // Auto-start routine if not already started
    if (completion.status === RoutineCompletionStatus.NOT_STARTED) {
      completion.status = RoutineCompletionStatus.IN_PROGRESS;
      completion.startedAt = new Date();
    }

    await completion.save();

    logger.info('Task completions updated', { 
      completionId, 
      workerId,
      updatedTaskCount: updateData.taskCompletions.length,
      completionPercentage: completion.completionPercentage
    });

    return completion;
  } catch (error) {
    logger.error('Error updating task completions:', error);
    throw error;
  }
};

/**
 * Complete individual task
 */
const completeTask = async (
  completionId: string,
  taskId: string,
  workerId: string,
  taskData: Partial<TaskCompletion>
): Promise<IRoutineCompletion> => {
  try {
    const completion = await RoutineCompletion.findOne({
      _id: completionId,
      workerId: new mongoose.Types.ObjectId(workerId)
    });

    if (!completion) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Routine completion not found or access denied');
    }

    const taskCompletion = completion.taskCompletions.find(
      tc => tc.taskId.toString() === taskId
    );

    if (!taskCompletion) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Task not found in this routine');
    }

    // Update task completion
    taskCompletion.status = TaskCompletionStatus.COMPLETED;
    taskCompletion.completedAt = new Date();
    Object.assign(taskCompletion, taskData);

    // Auto-start routine if not already started
    if (completion.status === RoutineCompletionStatus.NOT_STARTED) {
      completion.status = RoutineCompletionStatus.IN_PROGRESS;
      completion.startedAt = new Date();
    }

    await completion.save();

    logger.info('Task completed', { 
      completionId, 
      taskId, 
      workerId,
      completionPercentage: completion.completionPercentage
    });

    return completion;
  } catch (error) {
    logger.error('Error completing task:', error);
    throw error;
  }
};

/**
 * Skip individual task
 */
const skipTask = async (
  completionId: string,
  taskId: string,
  workerId: string,
  reason?: string
): Promise<IRoutineCompletion> => {
  try {
    const completion = await RoutineCompletion.findOne({
      _id: completionId,
      workerId: new mongoose.Types.ObjectId(workerId)
    });

    if (!completion) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Routine completion not found or access denied');
    }

    const taskCompletion = completion.taskCompletions.find(
      tc => tc.taskId.toString() === taskId
    );

    if (!taskCompletion) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Task not found in this routine');
    }

    // Update task completion
    taskCompletion.status = TaskCompletionStatus.SKIPPED;
    if (reason) {
      taskCompletion.notes = reason;
    }

    // Auto-start routine if not already started
    if (completion.status === RoutineCompletionStatus.NOT_STARTED) {
      completion.status = RoutineCompletionStatus.IN_PROGRESS;
      completion.startedAt = new Date();
    }

    await completion.save();

    logger.info('Task skipped', { 
      completionId, 
      taskId, 
      workerId,
      reason
    });

    return completion;
  } catch (error) {
    logger.error('Error skipping task:', error);
    throw error;
  }
};

/**
 * Complete entire routine
 */
const completeRoutine = async (
  completionId: string,
  workerId: string,
  finalData: CompleteRoutineInput
): Promise<IRoutineCompletion> => {
  try {
    const completion = await RoutineCompletion.findOne({
      _id: completionId,
      workerId: new mongoose.Types.ObjectId(workerId)
    });

    if (!completion) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Routine completion not found or access denied');
    }

    if (completion.status === RoutineCompletionStatus.COMPLETED) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Routine is already completed');
    }

    // Update final task completions if provided
    if (finalData.taskCompletions && finalData.taskCompletions.length > 0) {
      finalData.taskCompletions.forEach(updatedTask => {
        const existingTask = completion.taskCompletions.find(
          tc => tc.taskId.toString() === updatedTask.taskId.toString()
        );

        if (existingTask) {
          Object.assign(existingTask, updatedTask);
          
          if (updatedTask.status === TaskCompletionStatus.COMPLETED && !existingTask.completedAt) {
            existingTask.completedAt = new Date();
          }
        }
      });
    }

    // Set completion data
    completion.status = RoutineCompletionStatus.COMPLETED;
    completion.completedAt = new Date();
    
    if (!completion.startedAt) {
      completion.startedAt = completion.completedAt;
    }

    if (finalData.overallNotes) {
      completion.overallNotes = finalData.overallNotes;
    }

    if (finalData.issuesEncountered) {
      completion.issuesEncountered = finalData.issuesEncountered;
    }

    if (finalData.totalTimeSpentMinutes) {
      completion.totalTimeSpentMinutes = finalData.totalTimeSpentMinutes;
    }

    await completion.save();

    // Increment routine usage counter
    await Routine.findByIdAndUpdate(completion.routineId, {
      $inc: { timesUsed: 1 },
      lastUsedAt: new Date()
    });

    logger.info('Routine completion finished', { 
      completionId, 
      workerId,
      completionPercentage: completion.completionPercentage,
      totalTimeSpent: completion.totalTimeSpentMinutes
    });

    return completion;
  } catch (error) {
    logger.error('Error completing routine:', error);
    throw error;
  }
};

/**
 * Get routine completion by shift
 */
const getCompletionByShift = async (shiftId: string): Promise<IRoutineCompletion | null> => {
  try {
    const completion = await RoutineCompletion.findOne({ shiftId })
      .populate('routineId', 'name description estimatedDuration tasks')
      .populate('workerId', 'firstName lastName')
      .lean();

    return completion;
  } catch (error) {
    logger.error(`Error getting completion for shift ${shiftId}:`, error);
    throw error;
  }
};

/**
 * Get routine completions for participant
 */
const getParticipantCompletions = async (
  participantId: string,
  filter: RoutineCompletionFilter = {}
): Promise<IRoutineCompletion[]> => {
  try {
    const query: any = { participantId: new mongoose.Types.ObjectId(participantId) };

    // Apply filters
    if (filter.status) {
      query.status = filter.status;
    }

    if (filter.routineId) {
      query.routineId = new mongoose.Types.ObjectId(filter.routineId);
    }

    if (filter.workerId) {
      query.workerId = new mongoose.Types.ObjectId(filter.workerId);
    }

    if (filter.startDate || filter.endDate) {
      query.completedAt = {};
      
      if (filter.startDate) {
        query.completedAt.$gte = filter.startDate;
      }
      
      if (filter.endDate) {
        query.completedAt.$lte = filter.endDate;
      }
    }

    const completions = await RoutineCompletion.find(query)
      .populate('routineId', 'name description')
      .populate('workerId', 'firstName lastName')
      .populate('shiftId', 'shiftId startTime endTime')
      .sort({ completedAt: -1, createdAt: -1 })
      .lean();

    return completions;
  } catch (error) {
    logger.error(`Error getting completions for participant ${participantId}:`, error);
    throw error;
  }
};

/**
 * Get routine completions for worker
 */
const getWorkerCompletions = async (
  workerId: string,
  filter: RoutineCompletionFilter = {}
): Promise<IRoutineCompletion[]> => {
  try {
    const query: any = { workerId: new mongoose.Types.ObjectId(workerId) };

    // Apply filters
    if (filter.status) {
      query.status = filter.status;
    }

    if (filter.routineId) {
      query.routineId = new mongoose.Types.ObjectId(filter.routineId);
    }

    if (filter.participantId) {
      query.participantId = new mongoose.Types.ObjectId(filter.participantId);
    }

    if (filter.startDate || filter.endDate) {
      query.completedAt = {};
      
      if (filter.startDate) {
        query.completedAt.$gte = filter.startDate;
      }
      
      if (filter.endDate) {
        query.completedAt.$lte = filter.endDate;
      }
    }

    const completions = await RoutineCompletion.find(query)
      .populate('routineId', 'name description')
      .populate('participantId', 'firstName lastName')
      .populate('shiftId', 'shiftId startTime endTime')
      .sort({ completedAt: -1, createdAt: -1 })
      .lean();

    return completions;
  } catch (error) {
    logger.error(`Error getting completions for worker ${workerId}:`, error);
    throw error;
  }
};

/**
 * Get completion statistics for a routine
 */
const getRoutineCompletionStats = async (routineId: string) => {
  try {
    const stats = await RoutineCompletion.aggregate([
      {
        $match: { routineId: new mongoose.Types.ObjectId(routineId) }
      },
      {
        $group: {
          _id: null,
          totalCompletions: { $sum: 1 },
          avgCompletionPercentage: { $avg: '$completionPercentage' },
          avgTimeSpent: { $avg: '$totalTimeSpentMinutes' },
          completedCount: {
            $sum: { $cond: [{ $eq: ['$status', RoutineCompletionStatus.COMPLETED] }, 1, 0] }
          },
          inProgressCount: {
            $sum: { $cond: [{ $eq: ['$status', RoutineCompletionStatus.IN_PROGRESS] }, 1, 0] }
          },
          skippedCount: {
            $sum: { $cond: [{ $eq: ['$status', RoutineCompletionStatus.SKIPPED] }, 1, 0] }
          }
        }
      }
    ]);

    return stats[0] || {
      totalCompletions: 0,
      avgCompletionPercentage: 0,
      avgTimeSpent: 0,
      completedCount: 0,
      inProgressCount: 0,
      skippedCount: 0
    };
  } catch (error) {
    logger.error(`Error getting completion stats for routine ${routineId}:`, error);
    throw error;
  }
};

/**
 * Routine completion service exports
 */
export const routineCompletionService = {
  initializeRoutineCompletion,
  startRoutineCompletion,
  updateTaskCompletions,
  completeTask,
  skipTask,
  completeRoutine,
  getCompletionByShift,
  getParticipantCompletions,
  getWorkerCompletions,
  getRoutineCompletionStats
};
