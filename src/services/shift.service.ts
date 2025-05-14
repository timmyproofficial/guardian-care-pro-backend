/**
 * Shift service
 * Handles operations related to shift management
 */

import httpStatus from 'http-status';
import mongoose from 'mongoose';
import moment from 'moment';
import Shift, { IShift } from '../models/shift.model';
import Organization from '../models/organization.model';
import User from '../models/user.model';
import { UserRole } from '../types/user.types';
import { 
  ShiftStatus, 
  ShiftType, 
  RecurrencePattern, 
  CancellationReason, 
  ServiceType,
  LocationType
} from '../types/shift.types';
import ApiError from '../utils/api-error';
import logger from '../utils/logger';
import { NotificationService } from './notification.service';

/**
 * Interface for shift creation input
 */
interface CreateShiftInput {
  organizationId: string;
  participantId: string;
  workerId?: string;
  serviceType: ServiceType;
  startTime: Date;
  endTime: Date;
  locationType: LocationType;
  address?: string;
  shiftType: ShiftType;
  requiresSupervision?: boolean;
  specialInstructions?: string;
  recurrence?: {
    pattern: RecurrencePattern;
    occurrences?: number;
    endDate?: Date;
  };
}

/**
 * Interface for shift update input
 */
interface UpdateShiftInput {
  workerId?: string;
  serviceType?: ServiceType;
  startTime?: Date;
  endTime?: Date;
  locationType?: LocationType;
  address?: string;
  requiresSupervision?: boolean;
  specialInstructions?: string;
  status?: ShiftStatus;
  updateRecurring?: boolean;
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
        workerId: shiftData.workerId ? new mongoose.Types.ObjectId(shiftData.workerId) : undefined,
        serviceType: shiftData.serviceType,
        startTime: shiftData.startTime,
        endTime: shiftData.endTime,
        locationType: shiftData.locationType,
        address: shiftData.address,
        shiftType: shiftData.shiftType,
        requiresSupervision: shiftData.requiresSupervision || false,
        specialInstructions: shiftData.specialInstructions,
        status
      };
      
      // Handle single shift (no recurrence)
      if (!shiftData.recurrence || shiftData.recurrence.pattern === RecurrencePattern.NONE) {
        const shift = await Shift.create(shiftBase);
        
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
      const shift = await Shift.findById(shiftId);
      
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
      const shift = await Shift.findOne({ shiftId });
      
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
        query.workerId = new mongoose.Types.ObjectId(filter.workerId);
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
      const query: any = { workerId: new mongoose.Types.ObjectId(workerId) };
      
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
        user.role === UserRole.SUPPORT_WORKER && 
        shift.workerId?.toString() !== userId
      ) {
        throw new ApiError(
          httpStatus.FORBIDDEN, 
          'You do not have permission to update this shift'
        );
      }
      
      // Validate status update permissions
      if (updateData.status) {
        // Participants can only update to CANCELLED
        if (
          user.role === UserRole.PARTICIPANT && 
          updateData.status !== ShiftStatus.CANCELLED
        ) {
          throw new ApiError(
            httpStatus.FORBIDDEN, 
            'Participants can only cancel shifts'
          );
        }
        
        // Workers can update to specific statuses
        if (user.role === UserRole.SUPPORT_WORKER) {
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
          if (updateData.status === ShiftStatus.CONFIRMED && shift.status !== ShiftStatus.PENDING) {
            throw new ApiError(
              httpStatus.BAD_REQUEST, 
              'Only pending shifts can be confirmed'
            );
          }
          
          if (updateData.status === ShiftStatus.IN_PROGRESS && shift.status !== ShiftStatus.CONFIRMED) {
            throw new ApiError(
              httpStatus.BAD_REQUEST, 
              'Only confirmed shifts can be started'
            );
          }
          
          if (updateData.status === ShiftStatus.COMPLETED && shift.status !== ShiftStatus.IN_PROGRESS) {
            throw new ApiError(
              httpStatus.BAD_REQUEST, 
              'Only in-progress shifts can be completed'
            );
          }
        }
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
      
      // Update shift
      const updatedShift = await Shift.findByIdAndUpdate(
        shiftId,
        updateData,
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
        // Handle parent shift
        if (shift.recurrence?.parentShiftId) {
          // This is a child shift, we need to update all siblings with the same parent
          const siblingShifts = await Shift.find({
            'recurrence.parentShiftId': shift.recurrence.parentShiftId,
            startTime: { $gt: new Date() }, // Only update future shifts
            _id: { $ne: shift._id } // Exclude the current shift
          });
          
          // Update each sibling
          for (const siblingShift of siblingShifts) {
            await Shift.findByIdAndUpdate(
              siblingShift._id,
              {
                workerId: updateData.workerId ? new mongoose.Types.ObjectId(updateData.workerId) : undefined,
                serviceType: updateData.serviceType,
                locationType: updateData.locationType,
                address: updateData.address,
                requiresSupervision: updateData.requiresSupervision,
                specialInstructions: updateData.specialInstructions
              }
            );
          }
        } else {
          // This is a parent shift, update all child shifts
          const childShifts = await Shift.find({
            'recurrence.parentShiftId': shift.shiftId,
            startTime: { $gt: new Date() } // Only update future shifts
          });
          
          // Update each child
          for (const childShift of childShifts) {
            await Shift.findByIdAndUpdate(
              childShift._id,
              {
                workerId: updateData.workerId ? new mongoose.Types.ObjectId(updateData.workerId) : undefined,
                serviceType: updateData.serviceType,
                locationType: updateData.locationType,
                address: updateData.address,
                requiresSupervision: updateData.requiresSupervision,
                specialInstructions: updateData.specialInstructions
              }
            );
          }
        }
      }
      
      return updatedShift;
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
  }
};