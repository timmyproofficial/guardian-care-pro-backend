/**
 * Timesheet service
 * Handles operations related to timesheet management and rate calculations
 */

import httpStatus from 'http-status';
import mongoose from 'mongoose';
import moment from 'moment';
import Timesheet, { ITimesheet, Expense, RateCalculation } from '../models/timesheet.model';
import Shift from '../models/shift.model';
import Organization from '../models/organization.model';
import User from '../models/user.model';
import RateTimeBand, { IRateTimeBand } from '../models/rateTimeBand.model';
import { UserRole } from '../types/user.types';
import { ShiftStatus, TimesheetStatus } from '../types/shift.types';
import ApiError from '../utils/api-error';
import logger from '../utils/logger';
import { NotificationService } from './notification.service';

/**
 * Interface for timesheet creation input
 */
interface CreateTimesheetInput {
  shiftId: string;
  actualStartTime: Date;
  actualEndTime: Date;
  extraTime?: number; // in minutes
  notes?: string;
  expenses?: Expense[];
}

/**
 * Interface for service agreement rate
 */
interface ServiceAgreementRate {
  rateTimeBandId: mongoose.Types.ObjectId;
  hourlyRate: number;
}

/**
 * Timesheet service implementation
 */
export const timesheetService = {
  /**
   * Create a new timesheet
   */
  createTimesheet: async (
    workerId: string,
    timesheetData: CreateTimesheetInput
  ): Promise<ITimesheet> => {
    try {
      // Get the shift
      const shift = await Shift.findById(timesheetData.shiftId);
      
      if (!shift) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Shift not found');
      }
      
      // Check if the worker is assigned to the shift
      if (shift.workerId?.toString() !== workerId) {
        throw new ApiError(
          httpStatus.FORBIDDEN, 
          'You are not assigned to this shift'
        );
      }
      
      // Check if shift is completed
      if (shift.status !== ShiftStatus.COMPLETED) {
        throw new ApiError(
          httpStatus.BAD_REQUEST, 
          'Timesheet can only be created for completed shifts'
        );
      }
      
      // Check if timesheet already exists
      const existingTimesheet = await Timesheet.findOne({ shiftId: shift._id });
      
      if (existingTimesheet) {
        throw new ApiError(
          httpStatus.BAD_REQUEST, 
          'Timesheet already exists for this shift'
        );
      }
      
      // Get organization to access service agreement
      const organization = await Organization.findById(shift.organizationId);
      
      if (!organization) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Organization not found');
      }
      
      // Find service agreement for the worker
      const workerAgreement = organization.workers.find(
        worker => worker.workerId.toString() === workerId
      );
      
      if (!workerAgreement) {
        throw new ApiError(
          httpStatus.NOT_FOUND, 
          'Service agreement not found for this worker'
        );
      }
      
      // Calculate extra time
      const extraTimeMinutes = timesheetData.extraTime || 0;
      
      // Calculate rate breakdown based on time bands
      const { rateCalculations, subtotal } = await calculateRateBreakdown(
        timesheetData.actualStartTime,
        timesheetData.actualEndTime,
        extraTimeMinutes,
        workerAgreement.serviceAgreement.baseHourlyRate,
        workerAgreement.serviceAgreement.shiftRates
      );
      
      // Calculate total expenses
      const expenses = timesheetData.expenses || [];
      const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
      
      // Create timesheet
      const timesheet = await Timesheet.create({
        shiftId: shift._id,
        shiftIdRef: shift.shiftId,
        organizationId: shift.organizationId,
        participantId: shift.participantId,
        workerId: new mongoose.Types.ObjectId(workerId),
        scheduledStartTime: shift.startTime,
        scheduledEndTime: shift.endTime,
        actualStartTime: timesheetData.actualStartTime,
        actualEndTime: timesheetData.actualEndTime,
        extraTime: extraTimeMinutes,
        notes: timesheetData.notes,
        expenses,
        totalExpenses,
        rateCalculations,
        subtotal,
        totalAmount: subtotal + totalExpenses,
        status: TimesheetStatus.PENDING
      });
      
      // Notify participant that timesheet is ready for review
      await NotificationService.notifyParticipantOfTimesheetSubmission(timesheet);
      
      return timesheet;
    } catch (error) {
      logger.error('Error creating timesheet:', error);
      throw error;
    }
  },
  
  /**
   * Get timesheet by ID
   */
  getTimesheetById: async (timesheetId: string): Promise<ITimesheet> => {
    try {
      const timesheet = await Timesheet.findById(timesheetId).populate([
        {
          path: 'shiftId',
          select: 'shiftId serviceType startTime endTime'
        },
        {
          path: 'participantId',
          select: 'firstName lastName email phone'
        },
        {
          path: 'workerId',
          select: 'firstName lastName email phone'
        },
        {
          path: 'organizationId',
          select: 'name'
        },
        {
          path: 'rateCalculations.rateTimeBandId',
          select: 'name code baseRateMultiplier isWeekend isPublicHoliday'
        }
      ]);
      
      if (!timesheet) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Timesheet not found');
      }
      
      return timesheet;
    } catch (error) {
      logger.error(`Error getting timesheet ${timesheetId}:`, error);
      throw error;
    }
  },
  
  /**
   * Get timesheet by shift ID
   */
  getTimesheetByShiftId: async (shiftId: string): Promise<ITimesheet> => {
    try {
      const timesheet = await Timesheet.findOne({ shiftId }).populate([
        {
          path: 'shiftId',
          select: 'shiftId serviceType startTime endTime'
        },
        {
          path: 'participantId',
          select: 'firstName lastName email phone'
        },
        {
          path: 'workerId',
          select: 'firstName lastName email phone'
        },
        {
          path: 'organizationId',
          select: 'name'
        },
        {
          path: 'rateCalculations.rateTimeBandId',
          select: 'name code baseRateMultiplier isWeekend isPublicHoliday'
        }
      ]);
      
      if (!timesheet) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Timesheet not found');
      }
      
      return timesheet;
    } catch (error) {
      logger.error(`Error getting timesheet by shift ID ${shiftId}:`, error);
      throw error;
    }
  },
  
  /**
   * Get timesheets for worker
   */
  getWorkerTimesheets: async (
    workerId: string,
    filter: {
      status?: TimesheetStatus;
      startDate?: Date;
      endDate?: Date;
      organizationId?: string;
    } = {}
  ): Promise<ITimesheet[]> => {
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
        query.actualStartTime = {};
        
        if (filter.startDate) {
          query.actualStartTime.$gte = filter.startDate;
        }
        
        if (filter.endDate) {
          query.actualStartTime.$lte = filter.endDate;
        }
      }
      
      const timesheets = await Timesheet.find(query)
        .sort({ actualStartTime: -1 })
        .populate([
          {
            path: 'shiftId',
            select: 'shiftId serviceType'
          },
          {
            path: 'participantId',
            select: 'firstName lastName'
          },
          {
            path: 'organizationId',
            select: 'name'
          }
        ]);
      
      return timesheets;
    } catch (error) {
      logger.error(`Error getting timesheets for worker ${workerId}:`, error);
      throw error;
    }
  },
  
  /**
   * Get timesheets for participant
   */
  getParticipantTimesheets: async (
    participantId: string,
    filter: {
      status?: TimesheetStatus;
      startDate?: Date;
      endDate?: Date;
      workerId?: string;
    } = {}
  ): Promise<ITimesheet[]> => {
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
        query.actualStartTime = {};
        
        if (filter.startDate) {
          query.actualStartTime.$gte = filter.startDate;
        }
        
        if (filter.endDate) {
          query.actualStartTime.$lte = filter.endDate;
        }
      }
      
      const timesheets = await Timesheet.find(query)
        .sort({ actualStartTime: -1 })
        .populate([
          {
            path: 'shiftId',
            select: 'shiftId serviceType'
          },
          {
            path: 'workerId',
            select: 'firstName lastName'
          }
        ]);
      
      return timesheets;
    } catch (error) {
      logger.error(`Error getting timesheets for participant ${participantId}:`, error);
      throw error;
    }
  },
  
  /**
   * Update timesheet status
   */
  updateTimesheetStatus: async (
    timesheetId: string,
    userId: string,
    status: TimesheetStatus,
    rejectionReason?: string
  ): Promise<ITimesheet> => {
    try {
      // Get the timesheet
      const timesheet = await Timesheet.findById(timesheetId);
      
      if (!timesheet) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Timesheet not found');
      }
      
      // Get user to check role
      const user = await User.findById(userId);
      
      if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
      }
      
      // Only participant can approve/reject
      if (
        user.role === UserRole.PARTICIPANT && 
        timesheet.participantId.toString() !== userId
      ) {
        throw new ApiError(
          httpStatus.FORBIDDEN, 
          'You do not have permission to update this timesheet'
        );
      }
      
      // Validate status update
      if (timesheet.status !== TimesheetStatus.PENDING && timesheet.status !== TimesheetStatus.REVISED) {
        throw new ApiError(
          httpStatus.BAD_REQUEST, 
          `Timesheet cannot be updated from ${timesheet.status} status`
        );
      }
      
      // For rejection, ensure reason is provided
      if (status === TimesheetStatus.REJECTED && !rejectionReason) {
        throw new ApiError(
          httpStatus.BAD_REQUEST, 
          'Rejection reason is required'
        );
      }
      
      // Update timesheet
      timesheet.status = status;
      
      if (status === TimesheetStatus.REJECTED) {
        timesheet.rejectionReason = rejectionReason;
      }
      
      if (status === TimesheetStatus.APPROVED) {
        timesheet.approvedBy = new mongoose.Types.ObjectId(userId);
        timesheet.approvedAt = new Date();
      }
      
      await timesheet.save();
      
      // Send notifications
      if (status === TimesheetStatus.APPROVED) {
        await NotificationService.notifyWorkerOfTimesheetApproval(timesheet);
      } else if (status === TimesheetStatus.REJECTED) {
        await NotificationService.notifyWorkerOfTimesheetRejection(timesheet, rejectionReason);
      }
      
      return timesheet;
    } catch (error) {
      logger.error(`Error updating timesheet status ${timesheetId}:`, error);
      throw error;
    }
  },
  
  /**
   * Revise timesheet (after rejection)
   */
  reviseTimesheet: async (
    timesheetId: string,
    workerId: string,
    updateData: {
      actualStartTime?: Date;
      actualEndTime?: Date;
      extraTime?: number;
      notes?: string;
      expenses?: Expense[];
    }
  ): Promise<ITimesheet> => {
    try {
      // Get the timesheet
      const timesheet = await Timesheet.findById(timesheetId);
      
      if (!timesheet) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Timesheet not found');
      }
      
      // Check if worker owns this timesheet
      if (timesheet.workerId.toString() !== workerId) {
        throw new ApiError(
          httpStatus.FORBIDDEN, 
          'You do not have permission to revise this timesheet'
        );
      }
      
      // Check if timesheet is rejected
      if (timesheet.status !== TimesheetStatus.REJECTED) {
        throw new ApiError(
          httpStatus.BAD_REQUEST, 
          'Only rejected timesheets can be revised'
        );
      }
      
      // Get organization to access service agreement
      const organization = await Organization.findById(timesheet.organizationId);
      
      if (!organization) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Organization not found');
      }
      
      // Find service agreement for the worker
      const workerAgreement = organization.workers.find(
        worker => worker.workerId.toString() === workerId
      );
      
      if (!workerAgreement) {
        throw new ApiError(
          httpStatus.NOT_FOUND, 
          'Service agreement not found for this worker'
        );
      }
      
      // Prepare update data
      const actualStartTime = updateData.actualStartTime || timesheet.actualStartTime;
      const actualEndTime = updateData.actualEndTime || timesheet.actualEndTime;
      const extraTime = updateData.extraTime !== undefined ? updateData.extraTime : timesheet.extraTime;
      const expenses = updateData.expenses || timesheet.expenses;
      
      // Recalculate rates if time changed
      let rateCalculations = timesheet.rateCalculations;
      let subtotal = timesheet.subtotal;
      
      if (updateData.actualStartTime || updateData.actualEndTime || updateData.extraTime !== undefined) {
        const result = await calculateRateBreakdown(
          actualStartTime,
          actualEndTime,
          extraTime,
          workerAgreement.serviceAgreement.baseHourlyRate,
          workerAgreement.serviceAgreement.shiftRates
        );
        
        rateCalculations = result.rateCalculations;
        subtotal = result.subtotal;
      }
      
      // Recalculate total expenses if expenses changed
      const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
      
      // Update timesheet
      const revisedTimesheet = await Timesheet.findByIdAndUpdate(
        timesheetId,
        {
          actualStartTime,
          actualEndTime,
          extraTime,
          notes: updateData.notes || timesheet.notes,
          expenses,
          totalExpenses,
          rateCalculations,
          subtotal,
          totalAmount: subtotal + totalExpenses,
          status: TimesheetStatus.REVISED,
          rejectionReason: undefined // Clear previous rejection reason
        },
        { new: true, runValidators: true }
      );
      
      if (!revisedTimesheet) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Timesheet not found');
      }
      
      // Notify participant that timesheet has been revised
      await NotificationService.notifyParticipantOfTimesheetRevision(revisedTimesheet);
      
      return revisedTimesheet;
    } catch (error) {
      logger.error(`Error revising timesheet ${timesheetId}:`, error);
      throw error;
    }
  }
};

/**
 * Calculate rate breakdown for timesheet
 * This function determines which rate time bands apply to the shift and calculates the total
 */
async function calculateRateBreakdown(
  startTime: Date,
  endTime: Date,
  extraTimeMinutes: number,
  baseHourlyRate: number,
  shiftRates: ServiceAgreementRate[]
): Promise<{ rateCalculations: RateCalculation[], subtotal: number }> {
  try {
    // Get all rate time bands
    const rateTimeBands = await RateTimeBand.find({ isActive: true });
    
    // Map service agreement rates by rate time band ID for quick lookup
    const rateMap = new Map<string, number>();
    shiftRates.forEach(rate => {
      rateMap.set(rate.rateTimeBandId.toString(), rate.hourlyRate);
    });
    
    // Calculate total shift duration including extra time (in minutes)
    const scheduledDuration = moment(endTime).diff(moment(startTime), 'minutes');
    const totalDuration = scheduledDuration + extraTimeMinutes;
    
    // Convert to hours for rate calculation
    const totalHours = totalDuration / 60;
    
    // Get day of week (0 = Sunday, 6 = Saturday)
    const dayOfWeek = moment(startTime).day();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // TODO: Add logic for checking if the date is a public holiday
    const isPublicHoliday = false; // This should be replaced with an actual check
    
    // Type for a document from the database with known _id
    type RateTimeBandDoc = IRateTimeBand & { _id: mongoose.Types.ObjectId };
    
    // Determine applicable rate time bands
    let applicableRateBand: RateTimeBandDoc | null = null;
    
    // First, check if it's a public holiday
    if (isPublicHoliday) {
      const holidayBand = rateTimeBands.find(band => band.isPublicHoliday) as RateTimeBandDoc | undefined;
      if (holidayBand) applicableRateBand = holidayBand;
    }
    
    // Then check if it's a weekend (and not already assigned a holiday rate)
    if (!applicableRateBand && isWeekend) {
      const weekendBand = rateTimeBands
      .find(band => band.isWeekend && !band.isPublicHoliday) as RateTimeBandDoc | undefined;
      if (weekendBand) applicableRateBand = weekendBand;
    }
    
    // If not a special day, find the applicable time band
    if (!applicableRateBand) {
      // Format the shift start time to HH:MM for comparison
      const timeFormat = 'HH:mm';
      const shiftTimeString = moment(startTime).format(timeFormat);
      
      // Find a matching time band
      const timeBand = rateTimeBands.find(band => {
        if (!band.startTime || !band.endTime) return false;
        
        const bandStart = band.startTime;
        const bandEnd = band.endTime;
        
        // Handle cases where the time band spans midnight
        if (bandStart > bandEnd) {
          // e.g., 22:00 - 06:00
          return shiftTimeString >= bandStart || shiftTimeString < bandEnd;
        } else {
          // e.g., 08:00 - 17:00
          return shiftTimeString >= bandStart && shiftTimeString < bandEnd;
        }
      }) as RateTimeBandDoc | undefined;
      
      if (timeBand) applicableRateBand = timeBand;
    }
    
    // If no specific band found, use the standard rate
    if (!applicableRateBand) {
      const standardBand = rateTimeBands
      .find(band => band.code === 'STD' || band.baseRateMultiplier === 1) as RateTimeBandDoc | undefined;
      if (standardBand) applicableRateBand = standardBand;
    }
    
    // If still no band found, use the base rate
    let hourlyRate = baseHourlyRate;
    
    if (applicableRateBand) {
      const rateBandId = applicableRateBand._id.toString();
      if (rateMap.has(rateBandId)) {
        const mappedRate = rateMap.get(rateBandId);
        if (mappedRate !== undefined) {
          hourlyRate = mappedRate;
        }
      }
    }
    
    // Create rate calculations array
    const rateCalculations: RateCalculation[] = [];
    
    if (applicableRateBand) {
      rateCalculations.push({
        rateTimeBandId: applicableRateBand._id,
        name: applicableRateBand.name,
        hourlyRate: hourlyRate,
        hours: totalHours,
        amount: hourlyRate * totalHours
      });
    } else {
      // Fallback if no rate band found
      const defaultId = new mongoose.Types.ObjectId();
      rateCalculations.push({
        rateTimeBandId: defaultId,
        name: 'Standard Rate',
        hourlyRate: baseHourlyRate,
        hours: totalHours,
        amount: baseHourlyRate * totalHours
      });
    }
    
    // Calculate subtotal
    const subtotal = rateCalculations.reduce((sum, calc) => sum + calc.amount, 0);
    
    return { rateCalculations, subtotal };
  } catch (error) {
    logger.error('Error calculating rate breakdown:', error);
    throw error;
  }
}