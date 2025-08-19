import httpStatus from 'http-status';
import mongoose from 'mongoose';
import moment from 'moment';
import Shift, { IShift } from '../models/shift.model';
import Routine from '../models/routine.model';
import Organization from '../models/organization.model';
import User, { IUser } from '../models/user.model';
import ServiceType from '../models/serviceType.model';
import { UserRole } from '../types/user.types';
import { 
  ShiftStatus, 
  ShiftType, 
  RecurrencePattern, 
  CancellationReason, 
  LocationType
} from '../types/shift.types';
import ApiError from '../utils/api-error';
import logger from '../utils/logger';
import { NotificationService } from './notification.service';

/**
 * Interface for shift creation input with multi-worker support
 */
interface CreateShiftInput {
  organizationId: string;
  participantId: string;
  isMultiWorkerShift: boolean;
  workerId?: string;
  workerIds?: string[];
  serviceTypeId: string;
  startTime: Date;
  endTime: Date;
  locationType: LocationType;
  address?: string;
  shiftType: ShiftType;
  requiresSupervision?: boolean;
  specialInstructions?: string;
  routineId?: string;                        // Optional routine to attach
  routineRequired?: boolean;                 // Whether routine completion is mandatory
  recurrence?: {
    pattern: RecurrencePattern;
    occurrences?: number;
    endDate?: Date;
  };
}

/**
 * Interface for shift update input with multi-worker support
 */
interface UpdateShiftInput {
  workerId?: string;
  workerIds?: string[];
  serviceTypeId?: string;
  startTime?: Date;
  endTime?: Date;
  locationType?: LocationType;
  address?: string;
  requiresSupervision?: boolean;
  specialInstructions?: string;
  routineId?: string;                        // Update routine attachment
  routineRequired?: boolean;                 // Update routine requirement
  status?: ShiftStatus;
  updateRecurring?: boolean;
  declineReason?: string;
}

/**
 * Helper function to update overall shift status based on worker assignments
 */
function updateMultiWorkerShiftStatus(shift: IShift): void {
  if (!shift.isMultiWorkerShift || !shift.workerAssignments || shift.workerAssignments.length === 0) {
    return;
  }
  
  // Count status types
  const statusCounts: Record<string, number> = {
    [ShiftStatus.OPEN]: 0,
    [ShiftStatus.PENDING]: 0,
    [ShiftStatus.CONFIRMED]: 0,
    [ShiftStatus.IN_PROGRESS]: 0,
    [ShiftStatus.COMPLETED]: 0,
    [ShiftStatus.CANCELLED]: 0,
    [ShiftStatus.NO_SHOW]: 0,
    [ShiftStatus.DECLINED]: 0
  };
  
  for (const assignment of shift.workerAssignments) {
    statusCounts[assignment.status]++;
  }
  
  // Determine overall status based on business rules
  
  // If all workers are in the same status, use that status
  const totalAssignments = shift.workerAssignments.length;
  for (const status of Object.keys(statusCounts)) {
    if (statusCounts[status] === totalAssignments) {
      shift.status = status as ShiftStatus;
      return;
    }
  }
  
  // If any worker has started, shift is IN_PROGRESS
  if (statusCounts[ShiftStatus.IN_PROGRESS] > 0) {
    shift.status = ShiftStatus.IN_PROGRESS;
    return;
  }
  
  // If any worker has confirmed, shift is CONFIRMED
  if (statusCounts[ShiftStatus.CONFIRMED] > 0) {
    shift.status = ShiftStatus.CONFIRMED;
    return;
  }
  
  // If some are pending but none confirmed, stay PENDING
  if (statusCounts[ShiftStatus.PENDING] > 0) {
    shift.status = ShiftStatus.PENDING;
    return;
  }
  
  // If all workers declined/cancelled, shift is OPEN again
  if (statusCounts[ShiftStatus.DECLINED] + statusCounts[ShiftStatus.CANCELLED] === totalAssignments) {
    shift.status = ShiftStatus.OPEN;
    return;
  }
  
  // Default to PENDING if no other rule applies
  shift.status = ShiftStatus.PENDING;
}

/**
 * Helper function to update recurring shifts
 */
async function updateRecurringShifts(
  shift: IShift,
  updateData: UpdateShiftInput,
  user: IUser
): Promise<void> {
  try {
    // Handle parent shift
    if (shift.recurrence?.parentShiftId) {
      // This is a child shift, update all siblings with the same parent
      const siblingShifts = await Shift.find({
        'recurrence.parentShiftId': shift.recurrence.parentShiftId,
        startTime: { $gt: new Date() }, // Only update future shifts
        _id: { $ne: shift._id } // Exclude the current shift
      });
      
      for (const siblingShift of siblingShifts) {
        if (siblingShift.isMultiWorkerShift) {
          // For multi-worker shifts
          if (shift.isMultiWorkerShift && shift.workerAssignments) {
            // Copy worker assignments from the updated shift
            siblingShift.workerAssignments = JSON.parse(JSON.stringify(shift.workerAssignments));
            
            // Update other fields (except status, which depends on worker assignments)
            const { status, ...otherUpdates } = updateData;
            Object.assign(siblingShift, otherUpdates);
            
            // If admin is forcing a status update, apply it
            if (user.role === UserRole.ADMIN && status) {
              siblingShift.status = status;
            } else {
              // Otherwise recalculate status based on worker assignments
              updateMultiWorkerShiftStatus(siblingShift);
            }
            
            await siblingShift.save();
          }
        } else {
          // For single-worker shifts
          // Exclude status updates for recurring instances (each must be confirmed separately)
          const { ...updateWithoutStatus } = updateData;
          
          await Shift.findByIdAndUpdate(
            siblingShift._id,
            updateWithoutStatus
          );
        }
      }
    } else {
      // This is a parent shift, update all child shifts
      const childShifts = await Shift.find({
        'recurrence.parentShiftId': shift.shiftId,
        startTime: { $gt: new Date() } // Only update future shifts
      });
      
      for (const childShift of childShifts) {
        if (childShift.isMultiWorkerShift) {
          // For multi-worker shifts
          if (shift.isMultiWorkerShift && shift.workerAssignments) {
            // Copy worker assignments from the updated shift
            childShift.workerAssignments = JSON.parse(JSON.stringify(shift.workerAssignments));
            
            // Update other fields (except status, which depends on worker assignments)
            const { status, ...otherUpdates } = updateData;
            Object.assign(childShift, otherUpdates);
            
            // If admin is forcing a status update, apply it
            if (user.role === UserRole.ADMIN && status) {
              childShift.status = status;
            } else {
              // Otherwise recalculate status based on worker assignments
              updateMultiWorkerShiftStatus(childShift);
            }
            
            await childShift.save();
          }
        } else {
          // For single-worker shifts
          // Exclude status updates for recurring instances (each must be confirmed separately)
          const { ...updateWithoutStatus } = updateData;
          
          await Shift.findByIdAndUpdate(
            childShift._id,
            updateWithoutStatus
          );
        }
      }
    }
  } catch (error) {
    logger.error('Error updating recurring shifts:', error);
    throw error;
  }
}

/**
 * Shift service implementation
 */
export const shiftService = {
  /**
   * Create a new shift
   */
  createShift: async (shiftData: CreateShiftInput): Promise<IShift | IShift[]> => {
    try {
      // Verify organization exists
      const organization = await Organization.findById(shiftData.organizationId);
      if (!organization) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Organization not found');
      }
      
      // Verify participant belongs to organization
      if (organization.participantId.toString() !== shiftData.participantId) {
        throw new ApiError(
          httpStatus.BAD_REQUEST, 
          'Participant does not belong to this organization'
        );
      }
      
      // Verify service type exists and is active
      const serviceType = await ServiceType.findOne({
        _id: shiftData.serviceTypeId,
        status: 'active'
      });
      
      if (!serviceType) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Service type not found or inactive');
      }
      
      // Validate routine if provided
      let routine = null;
      if (shiftData.routineId) {
        routine = await Routine.findOne({
          routineId: shiftData.routineId,
          participantId: new mongoose.Types.ObjectId(shiftData.participantId),
          status: 'active'
        });
        
        if (!routine) {
          throw new ApiError(httpStatus.NOT_FOUND, 'Routine not found or inactive');
        }
        
        // Optionally validate that routine matches service type
        if (routine.serviceTypeId && routine.serviceTypeId.toString() !== shiftData.serviceTypeId) {
          logger.warn('Routine service type does not match shift service type', {
            routineServiceType: routine.serviceTypeId.toString(),
            shiftServiceType: shiftData.serviceTypeId
          });
        }
      }
      
      // Handle single worker or multi-worker setup
      if (shiftData.isMultiWorkerShift) {
        // Validate worker count limit (maximum 3)
        if (!shiftData.workerIds || shiftData.workerIds.length === 0) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            'At least one worker must be assigned for multi-worker shifts'
          );
        }
        
        if (shiftData.workerIds.length > 3) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            'Maximum of 3 workers can be assigned to a shift'
          );
        }
        
        // Verify all workers belong to the organization
        for (const workerId of shiftData.workerIds) {
          const workerExists = organization.workers.some(
            worker => worker.workerId.toString() === workerId
          );
          
          if (!workerExists) {
            throw new ApiError(
              httpStatus.BAD_REQUEST,
              `Worker ${workerId} is not associated with this organization`
            );
          }
        }
        
        // Prepare worker assignments
        const workerAssignments = shiftData.workerIds.map(workerId => ({
          workerId: new mongoose.Types.ObjectId(workerId),
          status: ShiftStatus.PENDING,
        }));
        
        // Create the base shift
        const shiftBase = {
          organizationId: new mongoose.Types.ObjectId(shiftData.organizationId),
          participantId: new mongoose.Types.ObjectId(shiftData.participantId),
          isMultiWorkerShift: true,
          workerAssignments,
          serviceTypeId: new mongoose.Types.ObjectId(shiftData.serviceTypeId),
          startTime: shiftData.startTime,
          endTime: shiftData.endTime,
          locationType: shiftData.locationType,
          address: shiftData.address,
          shiftType: shiftData.shiftType,
          requiresSupervision: shiftData.requiresSupervision || false,
          specialInstructions: shiftData.specialInstructions,
          routineId: routine ? routine._id : undefined,
          routineRequired: shiftData.routineRequired || false,
          status: ShiftStatus.PENDING // Overall shift status
        };
        
        // Handle single shift or recurring shifts
        if (!shiftData.recurrence || shiftData.recurrence.pattern === RecurrencePattern.NONE) {
          const shift = await Shift.create(shiftBase);
          
          // Increment routine usage if routine is attached
          if (routine) {
            await Routine.findByIdAndUpdate(routine._id, {
              $inc: { timesUsed: 1 },
              lastUsedAt: new Date()
            });
          }
          
          // Notify all assigned workers
          for (const assignment of shift.workerAssignments || []) {
            await NotificationService.notifyWorkerOfNewShift({
              ...shift.toObject(),
              workerId: assignment.workerId,
            });
          }
          
          return shift;
        } else {
          // Handle recurring shifts with multi-worker
          const shifts: IShift[] = [];
          const recurrencePattern = shiftData.recurrence.pattern;
          const occurrences = shiftData.recurrence.occurrences;
          const endDate = shiftData.recurrence.endDate;
          
          // Create the first shift
          const firstShift = await Shift.create({
            ...shiftBase,
            recurrence: {
              pattern: recurrencePattern,
              occurrences,
              endDate
            }
          });
          
          shifts.push(firstShift);
          
          // Notify all assigned workers for the first shift
          for (const assignment of firstShift.workerAssignments || []) {
            await NotificationService.notifyWorkerOfNewShift({
              ...firstShift.toObject(),
              workerId: assignment.workerId,
            });
          }
          
          // Determine number of occurrences if endDate is provided
          let totalOccurrences = occurrences;
          
          if (!totalOccurrences && endDate) {
            // Calculate occurrences based on recurrence pattern and end date
            const startDate = moment(shiftData.startTime);
            const end = moment(endDate);
            
            switch (recurrencePattern) {
              case RecurrencePattern.DAILY:
                totalOccurrences = end.diff(startDate, 'days');
                break;
              case RecurrencePattern.WEEKLY:
                totalOccurrences = end.diff(startDate, 'weeks');
                break;
              case RecurrencePattern.BIWEEKLY:
                totalOccurrences = Math.floor(end.diff(startDate, 'weeks') / 2);
                break;
              case RecurrencePattern.MONTHLY:
                totalOccurrences = end.diff(startDate, 'months');
                break;
              default:
                totalOccurrences = 0;
            }
          }
          
          // Create recurring instances
          if (totalOccurrences && totalOccurrences > 0) {
            // Limit to a reasonable number
            const maxOccurrences = Math.min(totalOccurrences, 50);
            
            for (let i = 1; i < maxOccurrences; i++) {
              // Calculate new start and end times
              let newStartTime = moment(shiftData.startTime);
              let newEndTime = moment(shiftData.endTime);
              
              switch (recurrencePattern) {
                case RecurrencePattern.DAILY:
                  newStartTime = newStartTime.add(i, 'days');
                  newEndTime = newEndTime.add(i, 'days');
                  break;
                case RecurrencePattern.WEEKLY:
                  newStartTime = newStartTime.add(i, 'weeks');
                  newEndTime = newEndTime.add(i, 'weeks');
                  break;
                case RecurrencePattern.BIWEEKLY:
                  newStartTime = newStartTime.add(i * 2, 'weeks');
                  newEndTime = newEndTime.add(i * 2, 'weeks');
                  break;
                case RecurrencePattern.MONTHLY:
                  newStartTime = newStartTime.add(i, 'months');
                  newEndTime = newEndTime.add(i, 'months');
                  break;
              }
              
              // Skip if beyond end date
              if (endDate && newStartTime.isAfter(endDate)) {
                break;
              }
              
              // Create the recurring instance
              const recurringShift = await Shift.create({
                ...shiftBase,
                startTime: newStartTime.toDate(),
                endTime: newEndTime.toDate(),
                recurrence: {
                  pattern: recurrencePattern,
                  parentShiftId: firstShift.shiftId
                }
              });
              
              shifts.push(recurringShift);
              
              // Notify all assigned workers for each recurring shift
              for (const assignment of recurringShift.workerAssignments || []) {
                await NotificationService.notifyWorkerOfNewShift({
                  ...recurringShift.toObject(),
                  workerId: assignment.workerId,
                });
              }
            }
          }
          
          return shifts;
        }
      } else {
        // Single worker shift logic
        // If worker is specified, verify they belong to the organization
        if (shiftData.workerId) {
          const workerExists = organization.workers.some(
            worker => worker.workerId.toString() === shiftData.workerId
          );
          
          if (!workerExists) {
            throw new ApiError(
              httpStatus.BAD_REQUEST, 
              'Worker is not associated with this organization'
            );
          }
        }
        
        // Set default status based on shift type
        const status = shiftData.workerId ? ShiftStatus.PENDING : ShiftStatus.OPEN;
        
        // Create the base shift
        const shiftBase = {
          organizationId: new mongoose.Types.ObjectId(shiftData.organizationId),
          participantId: new mongoose.Types.ObjectId(shiftData.participantId),
          isMultiWorkerShift: false,
          workerId: shiftData.workerId ? new mongoose.Types.ObjectId(shiftData.workerId) : undefined,
          serviceTypeId: new mongoose.Types.ObjectId(shiftData.serviceTypeId),
          startTime: shiftData.startTime,
          endTime: shiftData.endTime,
          locationType: shiftData.locationType,
          address: shiftData.address,
          shiftType: shiftData.shiftType,
          requiresSupervision: shiftData.requiresSupervision || false,
          specialInstructions: shiftData.specialInstructions,
          routineId: routine ? routine._id : undefined,
          routineRequired: shiftData.routineRequired || false,
          status
        };
        
        // Handle single shift (no recurrence)
        if (!shiftData.recurrence || shiftData.recurrence.pattern === RecurrencePattern.NONE) {
          const shift = await Shift.create(shiftBase);
          
          // Increment routine usage if routine is attached
          if (routine) {
            await Routine.findByIdAndUpdate(routine._id, {
              $inc: { timesUsed: 1 },
              lastUsedAt: new Date()
            });
          }
          
          // Notify the worker if assigned
          if (shift.workerId) {
            await NotificationService.notifyWorkerOfNewShift(shift);
          }
          
          return shift;
        }
        
        // Handle recurring shifts
        const shifts: IShift[] = [];
        const recurrencePattern = shiftData.recurrence.pattern;
        const occurrences = shiftData.recurrence.occurrences;
        const endDate = shiftData.recurrence.endDate;
        
        // Create the first shift
        const firstShift = await Shift.create({
          ...shiftBase,
          recurrence: {
            pattern: recurrencePattern,
            occurrences,
            endDate
          }
        });
        
        shifts.push(firstShift);
        
        // Notify the worker if assigned
        if (firstShift.workerId) {
          await NotificationService.notifyWorkerOfNewShift(firstShift);
        }
        
        // Determine number of occurrences if endDate is provided
        let totalOccurrences = occurrences;
        
        if (!totalOccurrences && endDate) {
          // Calculate occurrences based on recurrence pattern and end date
          const startDate = moment(shiftData.startTime);
          const end = moment(endDate);
          
          switch (recurrencePattern) {
            case RecurrencePattern.DAILY:
              totalOccurrences = end.diff(startDate, 'days');
              break;
            case RecurrencePattern.WEEKLY:
              totalOccurrences = end.diff(startDate, 'weeks');
              break;
            case RecurrencePattern.BIWEEKLY:
              totalOccurrences = Math.floor(end.diff(startDate, 'weeks') / 2);
              break;
            case RecurrencePattern.MONTHLY:
              totalOccurrences = end.diff(startDate, 'months');
              break;
            default:
              totalOccurrences = 0;
          }
        }
        
        // Create recurring instances
        if (totalOccurrences && totalOccurrences > 0) {
          // Limit to a reasonable number
          const maxOccurrences = Math.min(totalOccurrences, 50);
          
          for (let i = 1; i < maxOccurrences; i++) {
            // Calculate new start and end times
            let newStartTime = moment(shiftData.startTime);
            let newEndTime = moment(shiftData.endTime);
            
            switch (recurrencePattern) {
              case RecurrencePattern.DAILY:
                newStartTime = newStartTime.add(i, 'days');
                newEndTime = newEndTime.add(i, 'days');
                break;
              case RecurrencePattern.WEEKLY:
                newStartTime = newStartTime.add(i, 'weeks');
                newEndTime = newEndTime.add(i, 'weeks');
                break;
              case RecurrencePattern.BIWEEKLY:
                newStartTime = newStartTime.add(i * 2, 'weeks');
                newEndTime = newEndTime.add(i * 2, 'weeks');
                break;
              case RecurrencePattern.MONTHLY:
                newStartTime = newStartTime.add(i, 'months');
                newEndTime = newEndTime.add(i, 'months');
                break;
            }
            
            // Skip if beyond end date
            if (endDate && newStartTime.isAfter(endDate)) {
              break;
            }
            
            // Create the recurring instance
            const recurringShift = await Shift.create({
              ...shiftBase,
              startTime: newStartTime.toDate(),
              endTime: newEndTime.toDate(),
              recurrence: {
                pattern: recurrencePattern,
                parentShiftId: firstShift.shiftId
              }
            });
            
            shifts.push(recurringShift);
            
            // Notify the worker if assigned
            if (recurringShift.workerId) {
              await NotificationService.notifyWorkerOfNewShift(recurringShift);
            }
          }
        }
        
        return shifts;
      }
    } catch (error) {
      logger.error('Error creating shift:', error);
      throw error;
    }
  },
  
  /**
   * Get shift by ID
   */
  getShiftById: async (shiftId: string): Promise<IShift> => {
    try {
      const shift = await Shift.findById(shiftId)
        .populate([
          {
            path: 'participantId',
            select: 'firstName lastName email phone profileImage'
          },
          {
            path: 'workerId',
            select: 'firstName lastName email phone profileImage'
          },
          {
            path: 'workerAssignments.workerId',
            select: 'firstName lastName email phone profileImage'
          },
          {
            path: 'organizationId',
            select: 'name'
          },
          {
            path: 'serviceTypeId',
            select: 'name code status'
          }
        ]);
      
      if (!shift) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Shift not found');
      }
      
      return shift;
    } catch (error) {
      logger.error(`Error getting shift ${shiftId}:`, error);
      throw error;
    }
  },
  
  /**
   * Get shift by shift ID (unique identifier)
   */
  getShiftByShiftId: async (shiftId: string): Promise<IShift> => {
    try {
      const shift = await Shift.findOne({ shiftId })
        .populate([
          {
            path: 'participantId',
            select: 'firstName lastName email phone profileImage'
          },
          {
            path: 'workerId',
            select: 'firstName lastName email phone profileImage'
          },
          {
            path: 'workerAssignments.workerId',
            select: 'firstName lastName email phone profileImage'
          },
          {
            path: 'organizationId',
            select: 'name'
          },
          {
            path: 'serviceTypeId',
            select: 'name code status'
          }
        ]);
      
      if (!shift) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Shift not found');
      }
      
      return shift;
    } catch (error) {
      logger.error(`Error getting shift by shift ID ${shiftId}:`, error);
      throw error;
    }
  },
  
  /**
   * Get shifts for participant
   */
  getParticipantShifts: async (
    participantId: string,
    filter: {
      status?: ShiftStatus;
      startDate?: Date;
      endDate?: Date;
      workerId?: string;
    } = {}
  ): Promise<IShift[]> => {
    try {
      const query: any = { participantId: new mongoose.Types.ObjectId(participantId) };
      
      // Apply filters
      if (filter.status) {
        query.status = filter.status;
      }
      
      if (filter.workerId) {
        // query.workerId = new mongoose.Types.ObjectId(filter.workerId);
        query.$or = [
          { workerId: new mongoose.Types.ObjectId(filter.workerId) }, // Single worker
          { 'workerAssignments.workerId': new mongoose.Types.ObjectId(filter.workerId) } // Multi-worker
        ];
      }
      
      if (filter.startDate || filter.endDate) {
        query.startTime = {};
        
        if (filter.startDate) {
          query.startTime.$gte = filter.startDate;
        }
        
        if (filter.endDate) {
          query.startTime.$lte = filter.endDate;
        }
      }
      
      const shifts = await Shift.find(query)
        .sort({ startTime: 1 })
        .populate([
          {
            path: 'workerId',
            select: 'firstName lastName email phone profileImage'
          },
          {
            path: 'workerAssignments.workerId',
            select: 'firstName lastName email phone profileImage'
          },
          {
            path: 'serviceTypeId',
            select: 'name code status'
          }
        ]);
      
      return shifts;
    } catch (error) {
      logger.error(`Error getting shifts for participant ${participantId}:`, error);
      throw error;
    }
  },
  
  /**
   * Get shifts for worker
   */
  getWorkerShifts: async (
    workerId: string,
    filter: {
      status?: ShiftStatus;
      startDate?: Date;
      endDate?: Date;
      organizationId?: string;
    } = {}
  ): Promise<IShift[]> => {
    try {
      // Query for both single-worker and multi-worker shifts
      const query: any = {
        $or: [
          { workerId: new mongoose.Types.ObjectId(workerId) }, // Single worker
          { 'workerAssignments.workerId': new mongoose.Types.ObjectId(workerId) } // Multi-worker
        ]
      };
      
      // Apply filters
      if (filter.status) {
        query.status = filter.status;
      }
      
      if (filter.organizationId) {
        query.organizationId = new mongoose.Types.ObjectId(filter.organizationId);
      }
      
      if (filter.startDate || filter.endDate) {
        query.startTime = {};
        
        if (filter.startDate) {
          query.startTime.$gte = filter.startDate;
        }
        
        if (filter.endDate) {
          query.startTime.$lte = filter.endDate;
        }
      }
      
      const shifts = await Shift.find(query)
        .sort({ startTime: 1 })
        .populate([
          {
            path: 'participantId',
            select: 'firstName lastName email phone profileImage'
          },
          {
            path: 'organizationId',
            select: 'name'
          },
          {
            path: 'serviceTypeId',
            select: 'name code status'
          }
        ]);
      
      return shifts;
    } catch (error) {
      logger.error(`Error getting shifts for worker ${workerId}:`, error);
      throw error;
    }
  },
  
  /**
   * Update shift
   */
  updateShift: async (
  shiftId: string,
  userId: string,
  updateData: UpdateShiftInput
  ): Promise<IShift> => {
    try {
      // Get the shift
      const shift = await Shift.findById(shiftId);
      
      if (!shift) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Shift not found');
      }
      
      // Get user to check role
      const user = await User.findById(userId);
      
      if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
      }
      
      // Validate permissions to update shift
      if (
        user.role === UserRole.PARTICIPANT && 
        shift.participantId.toString() !== userId
      ) {
        throw new ApiError(
          httpStatus.FORBIDDEN, 
          'You do not have permission to update this shift'
        );
      }
      
      if (
        user.role === UserRole.SUPPORT_WORKER
      ) {
        // For multi-worker shifts, check worker assignments
        if (shift.isMultiWorkerShift) {
          const isAssigned = (shift.workerAssignments || []).some(
            assignment => assignment.workerId.toString() === userId
          );
          
          if (!isAssigned) {
            throw new ApiError(
              httpStatus.FORBIDDEN, 
              'You do not have permission to update this shift'
            );
          }
        } 
        // For single-worker shifts, check workerId
        else if (shift.workerId?.toString() !== userId) {
          throw new ApiError(
            httpStatus.FORBIDDEN, 
            'You do not have permission to update this shift'
          );
        }
      }
      
      // Validate service type if being updated
      if (updateData.serviceTypeId) {
        const serviceType = await ServiceType.findOne({
          _id: updateData.serviceTypeId,
          status: 'active'
        });
        
        if (!serviceType) {
          throw new ApiError(httpStatus.NOT_FOUND, 'Service type not found or inactive');
        }
      }
      
      // Validate worker assignment updates based on shift type
      if (shift.isMultiWorkerShift) {
        // Multi-worker shift
        if (updateData.workerId) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            'Cannot update workerId for multi-worker shifts. Use workerIds instead.'
          );
        }
        
        if (updateData.workerIds) {
          // Validate worker count limit (maximum 3)
          if (updateData.workerIds.length > 3) {
            throw new ApiError(
              httpStatus.BAD_REQUEST,
              'Maximum of 3 workers can be assigned to a shift'
            );
          }
          
          // For participants updating workerIds, check organization membership
          if (user.role === UserRole.PARTICIPANT) {
            const organization = await Organization.findById(shift.organizationId);
            
            if (!organization) {
              throw new ApiError(httpStatus.NOT_FOUND, 'Organization not found');
            }
            
            for (const workerId of updateData.workerIds) {
              const workerExists = organization.workers.some(
                worker => worker.workerId.toString() === workerId
              );
              
              if (!workerExists) {
                throw new ApiError(
                  httpStatus.BAD_REQUEST,
                  `Worker ${workerId} is not associated with this organization`
                );
              }
            }
            
            // Prepare the new worker assignments array
            const newAssignments = updateData.workerIds.map(workerId => {
              // Check if this worker is already assigned
              const existingAssignment = (shift.workerAssignments || []).find(
                a => a.workerId.toString() === workerId
              );
              
              if (existingAssignment) {
                // Keep the existing assignment
                return existingAssignment;
              } else {
                // Create a new assignment
                return {
                  workerId: new mongoose.Types.ObjectId(workerId),
                  status: ShiftStatus.PENDING
                };
              }
            });
            
            // Update the shift's worker assignments
            shift.workerAssignments = newAssignments;
            
            // Track workers who were removed
            const removedWorkerIds = (shift.workerAssignments || [])
              .filter(a => !updateData.workerIds!.includes(a.workerId.toString()))
              .map(a => a.workerId.toString());
            
            // Notify new workers
            for (const workerId of updateData.workerIds) {
              const existingAssignment = (shift.workerAssignments || []).find(
                a => a.workerId.toString() === workerId
              );
              
              if (!existingAssignment) {
                await NotificationService.notifyWorkerOfNewShift({
                  ...shift.toObject(),
                  workerId: new mongoose.Types.ObjectId(workerId),
                });
              }
            }
            
            // Notify removed workers
            for (const workerId of removedWorkerIds) {
              await NotificationService.notifyWorkerOfShiftRemoval({
                ...shift.toObject(),
                workerId: new mongoose.Types.ObjectId(workerId),
              });
            }
          }
        }
      } else {
        // Single worker shift
        if (updateData.workerIds) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            'Cannot update workerIds for single-worker shifts. Use workerId instead.'
          );
        }
        
        // Validate worker assignment
        if (updateData.workerId && user.role === UserRole.PARTICIPANT) {
          // Check if worker belongs to the organization
          const organization = await Organization.findById(shift.organizationId);
          
          if (!organization) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Organization not found');
          }
          
          const workerExists = organization.workers.some(
            worker => worker.workerId.toString() === updateData.workerId
          );
          
          if (!workerExists) {
            throw new ApiError(
              httpStatus.BAD_REQUEST, 
              'Worker is not associated with this organization'
            );
          }
        }
      }
      
      // Validate status update permissions
      if (updateData.status) {
        // Admin can update any status
        if (user.role === UserRole.ADMIN) {
          // No restrictions for admin
        }
        // Participants can only update to CANCELLED
        else if (
          user.role === UserRole.PARTICIPANT && 
          updateData.status !== ShiftStatus.CANCELLED
        ) {
          throw new ApiError(
            httpStatus.FORBIDDEN, 
            'Participants can only cancel shifts'
          );
        }
        // Workers can update to specific statuses
        else if (user.role === UserRole.SUPPORT_WORKER) {
          const allowedStatuses = [
            ShiftStatus.CONFIRMED, 
            ShiftStatus.IN_PROGRESS, 
            ShiftStatus.COMPLETED, 
            ShiftStatus.CANCELLED
          ];
          
          if (!allowedStatuses.includes(updateData.status)) {
            throw new ApiError(
              httpStatus.FORBIDDEN, 
              'Workers can only confirm, start, complete, or cancel shifts'
            );
          }
          
          // Validate status transition
          if (updateData.status === ShiftStatus.CONFIRMED) {
            if (shift.isMultiWorkerShift) {
              // For multi-worker shifts, check the worker's assignment
              const assignment = (shift.workerAssignments || []).find(
                a => a.workerId.toString() === userId
              );
              
              if (!assignment || assignment.status !== ShiftStatus.PENDING) {
                throw new ApiError(
                  httpStatus.BAD_REQUEST, 
                  'Only pending assignments can be confirmed'
                );
              }
            } else if (shift.status !== ShiftStatus.PENDING) {
              throw new ApiError(
                httpStatus.BAD_REQUEST, 
                'Only pending shifts can be confirmed'
              );
            }
          }
          
          if (updateData.status === ShiftStatus.IN_PROGRESS) {
            if (shift.isMultiWorkerShift) {
              // For multi-worker shifts, check the worker's assignment
              const assignment = (shift.workerAssignments || []).find(
                a => a.workerId.toString() === userId
              );
              
              if (!assignment || assignment.status !== ShiftStatus.CONFIRMED) {
                throw new ApiError(
                  httpStatus.BAD_REQUEST, 
                  'Only confirmed assignments can be started'
                );
              }
            } else if (shift.status !== ShiftStatus.CONFIRMED) {
              throw new ApiError(
                httpStatus.BAD_REQUEST, 
                'Only confirmed shifts can be started'
              );
            }
          }
          
          if (updateData.status === ShiftStatus.COMPLETED) {
            if (shift.isMultiWorkerShift) {
              // For multi-worker shifts, check the worker's assignment
              const assignment = (shift.workerAssignments || []).find(
                a => a.workerId.toString() === userId
              );
              
              if (!assignment || assignment.status !== ShiftStatus.IN_PROGRESS) {
                throw new ApiError(
                  httpStatus.BAD_REQUEST, 
                  'Only in-progress assignments can be completed'
                );
              }
            } else if (shift.status !== ShiftStatus.IN_PROGRESS) {
              throw new ApiError(
                httpStatus.BAD_REQUEST, 
                'Only in-progress shifts can be completed'
              );
            }
          }
        }
      }

      // Handle updates differently based on shift type
      if (shift.isMultiWorkerShift) {
        // For multi-worker shifts, we need to update specific fields
        // while preserving the workerAssignments array updates we made
        
        // If a worker is updating their status
        if (user.role === UserRole.SUPPORT_WORKER && updateData.status) {
          const assignment = (shift.workerAssignments || []).find(
            a => a.workerId.toString() === userId
          );
          
          if (assignment) {
            assignment.status = updateData.status;
            assignment.responseDate = new Date();
            
            // For declines, add decline reason
            if (updateData.status === ShiftStatus.DECLINED && updateData.declineReason) {
              assignment.declineReason = updateData.declineReason;
            }
            
            // Update overall shift status based on worker assignments
            updateMultiWorkerShiftStatus(shift);
          }
        }
        
        // Apply other updates (not workerId/workerIds/status for workers)
        const { status, ...otherUpdates } = updateData;
        
        // Apply these updates to the shift
        Object.assign(shift, otherUpdates);
        
        // For admin status updates, directly update the shift status
        if (user.role === UserRole.ADMIN && status) {
          shift.status = status;
        }
        
        // For participant cancellations
        if (user.role === UserRole.PARTICIPANT && status === ShiftStatus.CANCELLED) {
          shift.status = status;
          
          // Update all worker assignments to cancelled as well
          (shift.workerAssignments || []).forEach(assignment => {
            assignment.status = ShiftStatus.CANCELLED;
            assignment.cancelledBy = new mongoose.Types.ObjectId(userId);
          });
        }
        
        await shift.save();
        
        // Send notifications based on status changes
        if (updateData.status) {
          if (user.role === UserRole.SUPPORT_WORKER) {
            if (updateData.status === ShiftStatus.CONFIRMED) {
              await NotificationService.notifyParticipantOfShiftConfirmation({
                ...shift.toObject(),
                workerId: new mongoose.Types.ObjectId(userId)
              });
            } else if (updateData.status === ShiftStatus.COMPLETED) {
              await NotificationService.notifyParticipantOfShiftCompletion({
                ...shift.toObject(),
                workerId: new mongoose.Types.ObjectId(userId)
              });
            } else if (updateData.status === ShiftStatus.CANCELLED) {
              await NotificationService.notifyParticipantOfShiftCancellation({
                ...shift.toObject(),
                workerId: new mongoose.Types.ObjectId(userId)
              });
            }
          } else if (user.role === UserRole.PARTICIPANT && updateData.status === ShiftStatus.CANCELLED) {
            // Notify all assigned workers
            for (const assignment of (shift.workerAssignments || [])) {
              await NotificationService.notifyWorkerOfShiftCancellation({
                ...shift.toObject(),
                workerId: assignment.workerId
              });
            }
          }
        }
        
        // Update recurring instances if requested
        if (updateData.updateRecurring && shift.recurrence?.pattern !== RecurrencePattern.NONE) {
          await updateRecurringShifts(shift, updateData, user);
        }
      } else {
        // For single-worker shifts
        // Prepare update object based on user role
        const updateObj: any = { ...updateData };
        
        // For worker status updates, make necessary validations
        if (user.role === UserRole.SUPPORT_WORKER && updateData.status) {
          // Worker-specific status validations already done above
        }
        
        // Update the shift
        const updatedShift = await Shift.findByIdAndUpdate(
          shiftId,
          updateObj,
          { new: true, runValidators: true }
        );
        
        if (!updatedShift) {
          throw new ApiError(httpStatus.NOT_FOUND, 'Shift not found');
        }
        
        // Handle status change notifications
        if (updateData.status) {
          if (updateData.status === ShiftStatus.CONFIRMED) {
            await NotificationService.notifyParticipantOfShiftConfirmation(updatedShift);
          } else if (updateData.status === ShiftStatus.COMPLETED) {
            await NotificationService.notifyParticipantOfShiftCompletion(updatedShift);
          } else if (updateData.status === ShiftStatus.CANCELLED) {
            if (user.role === UserRole.PARTICIPANT) {
              await NotificationService.notifyWorkerOfShiftCancellation(updatedShift);
            } else {
              await NotificationService.notifyParticipantOfShiftCancellation(updatedShift);
            }
          }
        }
        
        // Handle worker reassignment notification
        if (updateData.workerId && updateData.workerId !== shift.workerId?.toString()) {
          await NotificationService.notifyWorkerOfNewShift(updatedShift);
          
          // If there was a previous worker, notify them of removal
          if (shift.workerId) {
            await NotificationService.notifyWorkerOfShiftRemoval(shift);
          }
        }
        
        // Update recurring instances if requested
        if (updateData.updateRecurring && shift.recurrence?.pattern !== RecurrencePattern.NONE) {
          await updateRecurringShifts(updatedShift, updateData, user);
        }
        
        return updatedShift;
      }
      
      return shift;
    } catch (error) {
      logger.error(`Error updating shift ${shiftId}:`, error);
      throw error;
    }
  },
  
  /**
   * Accept or decline shift (worker only)
   */
  respondToShift: async (
    shiftId: string,
    workerId: string,
    accept: boolean,
    declineReason?: string
  ): Promise<IShift> => {
    try {
      // Get the shift
      const shift = await Shift.findById(shiftId);
      
      if (!shift) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Shift not found');
      }
      
      // Validate worker is assigned to this shift
      if (shift.workerId?.toString() !== workerId) {
        throw new ApiError(
          httpStatus.FORBIDDEN, 
          'You are not assigned to this shift'
        );
      }
      
      // Validate shift is in PENDING status
      if (shift.status !== ShiftStatus.PENDING) {
        throw new ApiError(
          httpStatus.BAD_REQUEST, 
          'Shift is not in pending status'
        );
      }
      
      // Update shift status
      if (accept) {
        shift.status = ShiftStatus.CONFIRMED;
      } else {
        shift.status = ShiftStatus.OPEN;
        shift.workerId = undefined;
        shift.declineReason = declineReason;
      }
      
      await shift.save();
      
      // Send notification
      if (accept) {
        await NotificationService.notifyParticipantOfShiftConfirmation(shift);
      } else {
        await NotificationService.notifyParticipantOfShiftDecline(shift, declineReason);
      }
      
      return shift;
    } catch (error) {
      logger.error(`Error responding to shift ${shiftId}:`, error);
      throw error;
    }
  },
  
  /**
   * Cancel shift
   */
  cancelShift: async (
    shiftId: string,
    userId: string,
    reason: CancellationReason,
    note?: string
  ): Promise<IShift> => {
    try {
      // Get the shift
      const shift = await Shift.findById(shiftId);
      
      if (!shift) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Shift not found');
      }
      
      // Get user to check role
      const user = await User.findById(userId);
      
      if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
      }
      
      // Validate permissions to cancel shift
      if (
        user.role === UserRole.PARTICIPANT && 
        shift.participantId.toString() !== userId
      ) {
        throw new ApiError(
          httpStatus.FORBIDDEN, 
          'You do not have permission to cancel this shift'
        );
      }
      
      if (
        user.role === UserRole.SUPPORT_WORKER && 
        shift.workerId?.toString() !== userId
      ) {
        throw new ApiError(
          httpStatus.FORBIDDEN, 
          'You do not have permission to cancel this shift'
        );
      }
      
      // Validate shift can be cancelled
      const nonCancellableStatuses = [
        ShiftStatus.COMPLETED, 
        ShiftStatus.CANCELLED
      ];
      
      if (nonCancellableStatuses.includes(shift.status)) {
        throw new ApiError(
          httpStatus.BAD_REQUEST, 
          `Shift cannot be cancelled in ${shift.status} status`
        );
      }
      
      // Update shift
      shift.status = ShiftStatus.CANCELLED;
      shift.cancelledBy = new mongoose.Types.ObjectId(userId);
      shift.cancellationReason = reason;
      shift.cancellationNote = note;
      
      await shift.save();
      
      // Send notification
      if (user.role === UserRole.PARTICIPANT) {
        await NotificationService.notifyWorkerOfShiftCancellation(shift);
      } else {
        await NotificationService.notifyParticipantOfShiftCancellation(shift);
      }
      
      return shift;
    } catch (error) {
      logger.error(`Error cancelling shift ${shiftId}:`, error);
      throw error;
    }
  },

  /**
   * Update shift routine attachment
   */
  updateShiftRoutine: async (
    shiftId: string, 
    routineId: string | null, 
    routineRequired: boolean = false,
    participantId: string
  ): Promise<IShift> => {
    try {
      // Find shift and validate ownership
      const shift = await Shift.findOne({
        _id: shiftId,
        participantId: new mongoose.Types.ObjectId(participantId)
      });

      if (!shift) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Shift not found or access denied');
      }

      // Only allow routine updates on pending or confirmed shifts
      if (![ShiftStatus.PENDING, ShiftStatus.CONFIRMED].includes(shift.status)) {
        throw new ApiError(
          httpStatus.BAD_REQUEST, 
          'Cannot modify routine for shifts that are in progress or completed'
        );
      }

      // Validate routine if provided
      let routine = null;
      if (routineId) {
        routine = await Routine.findOne({
          routineId,
          participantId: new mongoose.Types.ObjectId(participantId),
          status: 'active'
        });

        if (!routine) {
          throw new ApiError(httpStatus.NOT_FOUND, 'Routine not found or inactive');
        }
      }

      // Update shift routine fields
      const previousRoutineId = shift.routineId;
      shift.routineId = routine ? routine._id : undefined;
      shift.routineRequired = routineRequired;
      await shift.save();

      // Update routine usage counters
      if (routine && !previousRoutineId) {
        // New routine attached
        await Routine.findByIdAndUpdate(routine._id, {
          $inc: { timesUsed: 1 },
          lastUsedAt: new Date()
        });
      } else if (!routine && previousRoutineId) {
        // Routine removed - decrement usage
        await Routine.findByIdAndUpdate(previousRoutineId, {
          $inc: { timesUsed: -1 }
        });
      } else if (routine && previousRoutineId && routine._id.toString() !== previousRoutineId.toString()) {
        // Routine changed - update both counters
        await Routine.findByIdAndUpdate(routine._id, {
          $inc: { timesUsed: 1 },
          lastUsedAt: new Date()
        });
        await Routine.findByIdAndUpdate(previousRoutineId, {
          $inc: { timesUsed: -1 }
        });
      }

      logger.info('Shift routine updated', { 
        shiftId: shift.shiftId, 
        routineId: routine?.routineId || null,
        previousRoutineId,
        participantId 
      });

      return shift;
    } catch (error) {
      logger.error(`Error updating routine for shift ${shiftId}:`, error);
      throw error;
    }
  },

  /**
   * Get shift with routine details
   */
  getShiftWithRoutine: async (shiftId: string, userId?: string): Promise<IShift | null> => {
    try {
      const query: any = { _id: shiftId };
      
      // Add user-based access control if userId provided
      if (userId) {
        query.$or = [
          { participantId: new mongoose.Types.ObjectId(userId) },
          { workerId: new mongoose.Types.ObjectId(userId) },
          { 'workerAssignments.workerId': new mongoose.Types.ObjectId(userId) }
        ];
      }

      const shift = await Shift.findOne(query)
        .populate('routineId', 'routineId name description estimatedDuration tasks status')
        .populate('participantId', 'firstName lastName')
        .populate('workerId', 'firstName lastName')
        .populate('serviceTypeId', 'name code');

      return shift;
    } catch (error) {
      logger.error(`Error getting shift with routine ${shiftId}:`, error);
      throw error;
    }
  }
};