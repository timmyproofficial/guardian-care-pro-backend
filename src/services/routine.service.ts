/**
 * Routine service implementation
 * Provides business logic for routine management and operations
 */

import httpStatus from 'http-status';
import mongoose from 'mongoose';
import Routine, { IRoutine } from '../models/routine.model';
import RoutineCompletion from '../models/routineCompletion.model';
import User from '../models/user.model';
import { UserRole } from '../types/user.types';
import { 
  RoutineStatus, 
  RoutineInput, 
  RoutineUpdateInput, 
  RoutineFilter
} from '../types/routine.types';
import ApiError from '../utils/api-error';
import logger from '../utils/logger';

/**
 * Create a new routine
 */
const createRoutine = async (
  routineData: RoutineInput, 
  participantId: string, 
  organizationId: string
): Promise<IRoutine> => {
  try {
    // Validate participant exists and is a participant
    const participant = await User.findOne({
      _id: participantId,
      role: UserRole.PARTICIPANT
    });

    if (!participant) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Participant not found');
    }

    // Create routine with generated ID
    const routine = new Routine({
      ...routineData,
      participantId: new mongoose.Types.ObjectId(participantId),
      organizationId: new mongoose.Types.ObjectId(organizationId),
      status: RoutineStatus.ACTIVE,
      timesUsed: 0
    });

    await routine.save();
    
    logger.info('Routine created successfully', { 
      routineId: routine.routineId, 
      participantId, 
      taskCount: routine.tasks.length 
    });

    return routine;
  } catch (error) {
    logger.error('Error creating routine:', error);
    throw error;
  }
};

/**
 * Get routine by ID
 */
const getRoutineById = async (routineId: string, participantId?: string): Promise<IRoutine> => {
  try {
    const query: any = { routineId };
    
    // If participantId is provided, ensure the routine belongs to them
    if (participantId) {
      query.participantId = new mongoose.Types.ObjectId(participantId);
    }

    const routine = await Routine.findOne(query)
      .populate('serviceTypeId', 'name code')
      .populate('participantId', 'firstName lastName email');

    if (!routine) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Routine not found');
    }

    return routine;
  } catch (error) {
    logger.error(`Error getting routine ${routineId}:`, error);
    throw error;
  }
};

/**
 * Get routines for a participant
 */
const getParticipantRoutines = async (
  participantId: string, 
  filter: RoutineFilter = {}
): Promise<IRoutine[]> => {
  try {
    const query: any = { participantId: new mongoose.Types.ObjectId(participantId) };

    // Apply filters
    if (filter.status) {
      query.status = filter.status;
    }

    if (filter.serviceTypeId) {
      query.serviceTypeId = new mongoose.Types.ObjectId(filter.serviceTypeId);
    }

    if (filter.search) {
      query.$or = [
        { name: { $regex: filter.search, $options: 'i' } },
        { description: { $regex: filter.search, $options: 'i' } }
      ];
    }

    const routines = await Routine.find(query)
      .populate('serviceTypeId', 'name code')
      .sort({ timesUsed: -1, name: 1 })
      .lean();

    return routines;
  } catch (error) {
    logger.error(`Error getting routines for participant ${participantId}:`, error);
    throw error;
  }
};

/**
 * Update routine
 */
const updateRoutine = async (
  routineId: string, 
  updateData: RoutineUpdateInput, 
  participantId: string
): Promise<IRoutine> => {
  try {
    // Find routine and ensure ownership
    const routine = await Routine.findOne({
      routineId,
      participantId: new mongoose.Types.ObjectId(participantId)
    });

    if (!routine) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Routine not found or access denied');
    }

    // Check if routine is being used in active shifts
    if (updateData.status === RoutineStatus.INACTIVE) {
      const activeCompletions = await RoutineCompletion.countDocuments({
        routineId: routine._id,
        status: { $in: ['notStarted', 'inProgress'] }
      });

      if (activeCompletions > 0) {
        throw new ApiError(
          httpStatus.BAD_REQUEST, 
          'Cannot deactivate routine while it has active completions'
        );
      }
    }

    // Update routine
    Object.assign(routine, updateData);
    await routine.save();

    logger.info('Routine updated successfully', { 
      routineId: routine.routineId, 
      participantId 
    });

    return routine;
  } catch (error) {
    logger.error(`Error updating routine ${routineId}:`, error);
    throw error;
  }
};

/**
 * Delete routine
 */
const deleteRoutine = async (routineId: string, participantId: string): Promise<void> => {
  try {
    // Find routine and ensure ownership
    const routine = await Routine.findOne({
      routineId,
      participantId: new mongoose.Types.ObjectId(participantId)
    });

    if (!routine) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Routine not found or access denied');
    }

    // Check if routine has any completions
    const completionCount = await RoutineCompletion.countDocuments({
      routineId: routine._id
    });

    if (completionCount > 0) {
      throw new ApiError(
        httpStatus.BAD_REQUEST, 
        'Cannot delete routine that has completion history. Consider deactivating instead.'
      );
    }

    // Delete routine
    await Routine.deleteOne({ _id: routine._id });

    logger.info('Routine deleted successfully', { 
      routineId: routine.routineId, 
      participantId 
    });
  } catch (error) {
    logger.error(`Error deleting routine ${routineId}:`, error);
    throw error;
  }
};

/**
 * Duplicate routine
 */
const duplicateRoutine = async (
  routineId: string, 
  participantId: string, 
  newName?: string
): Promise<IRoutine> => {
  try {
    // Get original routine
    const originalRoutine = await getRoutineById(routineId, participantId);

    // Create duplicate with new name
    const duplicateData: RoutineInput = {
      name: newName || `${originalRoutine.name} (Copy)`,
      description: originalRoutine.description,
      serviceTypeId: originalRoutine.serviceTypeId?.toString(),
      tasks: originalRoutine.tasks.map(task => ({
        title: task.title,
        description: task.description
      }))
    };

    const duplicateRoutine = await createRoutine(
      duplicateData, 
      participantId, 
      originalRoutine.organizationId.toString()
    );

    logger.info('Routine duplicated successfully', { 
      originalRoutineId: originalRoutine.routineId,
      duplicateRoutineId: duplicateRoutine.routineId,
      participantId 
    });

    return duplicateRoutine;
  } catch (error) {
    logger.error(`Error duplicating routine ${routineId}:`, error);
    throw error;
  }
};

/**
 * Get routine usage statistics
 */
const getRoutineUsageStats = async (routineId: string, participantId: string) => {
  try {
    const routine = await getRoutineById(routineId, participantId);

    // Get completion statistics
    const completionStats = await RoutineCompletion.aggregate([
      {
        $match: { routineId: routine._id }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgCompletionPercentage: { $avg: '$completionPercentage' },
          avgTimeSpent: { $avg: '$totalTimeSpentMinutes' }
        }
      }
    ]);

    // Get recent completions
    const recentCompletions = await RoutineCompletion.find({
      routineId: routine._id
    })
      .populate('workerId', 'firstName lastName')
      .sort({ completedAt: -1 })
      .limit(10)
      .lean();

    return {
      routine: {
        routineId: routine.routineId,
        name: routine.name,
        timesUsed: routine.timesUsed,
        lastUsedAt: routine.lastUsedAt
      },
      completionStats,
      recentCompletions
    };
  } catch (error) {
    logger.error(`Error getting usage stats for routine ${routineId}:`, error);
    throw error;
  }
};

/**
 * Get popular routines by service type
 */
const getPopularRoutinesByServiceType = async (
  serviceTypeId: string, 
  organizationId: string, 
  limit: number = 10
): Promise<IRoutine[]> => {
  try {
    const routines = await Routine.find({
      serviceTypeId: new mongoose.Types.ObjectId(serviceTypeId),
      organizationId: new mongoose.Types.ObjectId(organizationId),
      status: RoutineStatus.ACTIVE
    })
      .populate('participantId', 'firstName lastName')
      .sort({ timesUsed: -1 })
      .limit(limit)
      .lean();

    return routines;
  } catch (error) {
    logger.error(`Error getting popular routines for service type ${serviceTypeId}:`, error);
    throw error;
  }
};

/**
 * Search routines across organization (admin only)
 */
const searchOrganizationRoutines = async (
  organizationId: string,
  filter: RoutineFilter & { limit?: number; offset?: number } = {}
): Promise<{ routines: IRoutine[]; total: number }> => {
  try {
    const query: any = { organizationId: new mongoose.Types.ObjectId(organizationId) };

    // Apply filters
    if (filter.status) {
      query.status = filter.status;
    }

    if (filter.serviceTypeId) {
      query.serviceTypeId = new mongoose.Types.ObjectId(filter.serviceTypeId);
    }

    if (filter.participantId) {
      query.participantId = new mongoose.Types.ObjectId(filter.participantId);
    }

    if (filter.search) {
      query.$or = [
        { name: { $regex: filter.search, $options: 'i' } },
        { description: { $regex: filter.search, $options: 'i' } }
      ];
    }

    const total = await Routine.countDocuments(query);
    
    const routines = await Routine.find(query)
      .populate('participantId', 'firstName lastName')
      .populate('serviceTypeId', 'name code')
      .sort({ timesUsed: -1, createdAt: -1 })
      .skip(filter.offset || 0)
      .limit(filter.limit || 20)
      .lean();

    return { routines, total };
  } catch (error) {
    logger.error(`Error searching organization routines:`, error);
    throw error;
  }
};

/**
 * Routine service exports
 */
export const routineService = {
  createRoutine,
  getRoutineById,
  getParticipantRoutines,
  updateRoutine,
  deleteRoutine,
  duplicateRoutine,
  getRoutineUsageStats,
  getPopularRoutinesByServiceType,
  searchOrganizationRoutines
};
