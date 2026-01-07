/**
 * Timesheet controller
 * Handles HTTP requests related to timesheet management
 */

import { Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import mongoose from 'mongoose';
import type {} from 'multer';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { timesheetService } from '../services/timesheet.service';
import { UserRole } from '../types/user.types';
import { TimesheetStatus } from '../types/shift.types';
import { successResponse, errorResponse } from '../utils/api-response';
import Timesheet, { ITimesheet } from '../models/timesheet.model';
import logger from '../utils/logger';
import fs from 'fs';

export const timesheetController = {
  /**
 * Helper function to get all timesheets with filtering for admins
 */
  getAllTimesheets: async (filter: {
    status?: TimesheetStatus;
    startDate?: Date;
    endDate?: Date;
    workerId?: string;
    participantId?: string;
    organizationId?: string;
    isPaid?: boolean;
    shiftId?: string;
  }): Promise<ITimesheet[]> => {
    try {
      const query: any = {};
      
      // Apply filters
      if (filter.status) {
        query.status = filter.status;
      }
      
      if (filter.workerId) {
        query.workerId = new mongoose.Types.ObjectId(filter.workerId);
      }
      
      if (filter.participantId) {
        query.participantId = new mongoose.Types.ObjectId(filter.participantId);
      }
      
      if (filter.organizationId) {
        query.organizationId = new mongoose.Types.ObjectId(filter.organizationId);
      }
      
      if (filter.isPaid !== undefined) {
        query.isPaid = filter.isPaid;
      }
      
      if (filter.shiftId) {
        query.shiftId = new mongoose.Types.ObjectId(filter.shiftId);
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
      
      // Get timesheets with populated references
      const timesheets = await Timesheet.find(query)
        .sort({ actualStartTime: -1 }) // Most recent first
        .populate([
          {
            path: 'shiftId',
            select: 'shiftId serviceTypeId isMultiWorkerShift',
            populate: {
              path: 'serviceTypeId',
              select: 'name code status'
            }
          },
          {
            path: 'participantId',
            select: 'firstName lastName email phone profileImage'
          },
          {
            path: 'workerId',
            select: 'firstName lastName email phone profileImage'
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
      
      return timesheets;
    } catch (error) {
      logger.error('Error getting all timesheets:', error);
      throw error;
    }
  },

  /**
   * Create a new timesheet
   * @route POST /api/v1/timesheets
   */
  createTimesheet: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      // Only support workers can create timesheets
      if (req.user.role !== UserRole.SUPPORT_WORKER) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only support workers can create timesheets', httpStatus.FORBIDDEN)
        );
      }
      
      const workerId = req.user._id.toString();
      const {
        shiftId,
        actualStartTime,
        actualEndTime,
        distanceTravelKm, // New field
        notes,
        expenses
      } = req.body;
      
      // Process expenses data if provided
      let parsedExpenses;
      if (expenses) {
        // Parse expenses data from form-data if needed
        if (typeof expenses === 'string') {
          try {
            parsedExpenses = JSON.parse(expenses);
          } catch (error) {
            return res.status(httpStatus.BAD_REQUEST).json(
              errorResponse('Invalid expenses format', httpStatus.BAD_REQUEST)
            );
          }
        } else {
          parsedExpenses = expenses;
        }
      }
      
      // Get files from multer
      const files = req.files as Express.Multer.File[] | undefined;
      
      const timesheet = await timesheetService.createTimesheet(
        workerId,
        {
          shiftId,
          actualStartTime: new Date(actualStartTime),
          actualEndTime: new Date(actualEndTime),
          distanceTravelKm: distanceTravelKm ? parseFloat(distanceTravelKm) : 0,
          notes,
          expenses: parsedExpenses
        },
        files
      );
      
      // Clean up temporary files if needed
      if (files && files.length > 0) {
        files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      
      return res.status(httpStatus.CREATED).json(
        successResponse({ timesheet }, 'Timesheet created successfully')
      );
    } catch (error) {
      // Clean up temporary files in case of error
      if (req.files) {
        const files = req.files as Express.Multer.File[];
        files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      return next(error);
    }
  },

  /**
   * Get timesheet by ID
   * @route GET /api/v1/timesheets/:timesheetId
   */
  getTimesheetById: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      const { timesheetId } = req.params;
      const timesheet = await timesheetService.getTimesheetById(timesheetId);
      
      // Check permissions to view timesheet (admins can view any timesheet)
      if (
        req.user.role === UserRole.PARTICIPANT && 
        timesheet.participantId._id.toString() !== req.user._id.toString()
      ) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('You do not have permission to view this timesheet', httpStatus.FORBIDDEN)
        );
      }
      
      if (
        req.user.role === UserRole.SUPPORT_WORKER && 
        timesheet.workerId._id.toString() !== req.user._id.toString()
      ) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('You do not have permission to view this timesheet', httpStatus.FORBIDDEN)
        );
      }
      
      return res.json(successResponse({ timesheet }, 'Timesheet retrieved successfully'));
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get timesheet by shift ID
   * @route GET /api/v1/timesheets/shift/:shiftId
   */
  getTimesheetByShiftId: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      const { shiftId } = req.params;
      const timesheet = await timesheetService.getTimesheetByShiftId(shiftId);
      
      // Check permissions to view timesheet (admins can view any timesheet)
      if (
        req.user.role === UserRole.PARTICIPANT && 
        timesheet.participantId.toString() !== req.user._id.toString()
      ) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('You do not have permission to view this timesheet', httpStatus.FORBIDDEN)
        );
      }
      
      if (
        req.user.role === UserRole.SUPPORT_WORKER && 
        timesheet.workerId.toString() !== req.user._id.toString()
      ) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('You do not have permission to view this timesheet', httpStatus.FORBIDDEN)
        );
      }
      
      return res.json(successResponse({ timesheet }, 'Timesheet retrieved successfully'));
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get timesheets for current user (based on role)
   * @route GET /api/v1/timesheets
   */
  getTimesheets: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      const userId = req.user._id.toString();
      const {
        status,
        startDate,
        endDate,
        workerId,
        participantId,
        organizationId,
        isPaid
      } = req.query;
      
      let timesheets;
      
      // Get timesheets based on user role
      if (req.user.role === UserRole.PARTICIPANT) {
        timesheets = await timesheetService.getParticipantTimesheets(
          userId,
          {
            status: status as TimesheetStatus,
            startDate: startDate ? new Date(startDate as string) : undefined,
            endDate: endDate ? new Date(endDate as string) : undefined,
            workerId: workerId as string
          }
        );
      } else if (req.user.role === UserRole.SUPPORT_WORKER) {
        timesheets = await timesheetService.getWorkerTimesheets(
          userId,
          {
            status: status as TimesheetStatus,
            startDate: startDate ? new Date(startDate as string) : undefined,
            endDate: endDate ? new Date(endDate as string) : undefined,
            organizationId: organizationId as string
          }
        );
      } else if (req.user.role === UserRole.ADMIN) {
        // Admin can see all timesheets with optional filtering
        timesheets = await timesheetController.getAllTimesheets({
          status: status as TimesheetStatus,
          startDate: startDate ? new Date(startDate as string) : undefined,
          endDate: endDate ? new Date(endDate as string) : undefined,
          workerId: workerId as string,
          participantId: participantId as string,
          organizationId: organizationId as string,
          isPaid: isPaid === 'true' ? true : isPaid === 'false' ? false : undefined
        });
      } else {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Role not authorized to view timesheets', httpStatus.FORBIDDEN)
        );
      }
      
      return res.json(successResponse({ timesheets }, 'Timesheets retrieved successfully'));
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Approve timesheet (participant only)
   * @route POST /api/v1/timesheets/:timesheetId/approve
   */
  approveTimesheet: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      // Only participants can approve timesheets
      if (req.user.role !== UserRole.PARTICIPANT) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only participants can approve timesheets', httpStatus.FORBIDDEN)
        );
      }
      
      const { timesheetId } = req.params;
      const userId = req.user._id.toString();
      
      const timesheet = await timesheetService.updateTimesheetStatus(
        timesheetId,
        userId,
        TimesheetStatus.APPROVED
      );
      
      return res.json(successResponse({ timesheet }, 'Timesheet approved successfully'));
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Reject timesheet (participant only)
   * @route POST /api/v1/timesheets/:timesheetId/reject
   */
  rejectTimesheet: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      // Only participants can reject timesheets
      if (req.user.role !== UserRole.PARTICIPANT) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only participants can reject timesheets', httpStatus.FORBIDDEN)
        );
      }
      
      const { timesheetId } = req.params;
      const userId = req.user._id.toString();
      const { reason } = req.body;
      
      // Validate rejection reason
      if (!reason) {
        return res.status(httpStatus.BAD_REQUEST).json(
          errorResponse('Rejection reason is required', httpStatus.BAD_REQUEST)
        );
      }
      
      const timesheet = await timesheetService.updateTimesheetStatus(
        timesheetId,
        userId,
        TimesheetStatus.REJECTED,
        reason
      );
      
      return res.json(successResponse({ timesheet }, 'Timesheet rejected successfully'));
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Revise timesheet (worker only)
   * @route PATCH /api/v1/timesheets/:timesheetId/revise
   */
  reviseTimesheet: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      // Only support workers can revise timesheets
      if (req.user.role !== UserRole.SUPPORT_WORKER) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only support workers can revise timesheets', httpStatus.FORBIDDEN)
        );
      }
      
      const { timesheetId } = req.params;
      const workerId = req.user._id.toString();
      
      // Extract and parse form data
      const {
        actualStartTime,
        actualEndTime,
        distanceTravelKm,
        notes,
        expenses
      } = req.body;
      
      // Process expenses data if provided
      let parsedExpenses;
      if (expenses) {
        // Parse expenses data from form-data if needed
        if (typeof expenses === 'string') {
          try {
            parsedExpenses = JSON.parse(expenses);
          } catch (error) {
            return res.status(httpStatus.BAD_REQUEST).json(
              errorResponse('Invalid expenses format', httpStatus.BAD_REQUEST)
            );
          }
        } else {
          parsedExpenses = expenses;
        }
      }
      
      // Get files from multer
      const files = req.files as Express.Multer.File[] | undefined;
      
      const timesheet = await timesheetService.reviseTimesheet(
        timesheetId,
        workerId,
        {
          actualStartTime: actualStartTime ? new Date(actualStartTime) : undefined,
          actualEndTime: actualEndTime ? new Date(actualEndTime) : undefined,
          distanceTravelKm: distanceTravelKm ? parseFloat(distanceTravelKm) : undefined,
          notes,
          expenses: parsedExpenses
        },
        files
      );
      
      // Clean up temporary files if needed
      if (files && files.length > 0) {
        files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      
      return res.json(successResponse({ timesheet }, 'Timesheet revised successfully'));
    } catch (error) {
      // Clean up temporary files in case of error
      if (req.files) {
        const files = req.files as Express.Multer.File[];
        files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      return next(error);
    }
  },
  
  /**
   * Admin update timesheet status
   * @route PATCH /api/v1/timesheets/:timesheetId/status
   */
  adminUpdateTimesheetStatus: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      // Only admins can use this endpoint
      if (req.user.role !== UserRole.ADMIN) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only administrators can update timesheet status', httpStatus.FORBIDDEN)
        );
      }
      
      const { timesheetId } = req.params;
      const { status, reason, isPaid } = req.body;
      
      // Validate the status is valid
      if (status && !Object.values(TimesheetStatus).includes(status)) {
        return res.status(httpStatus.BAD_REQUEST).json(
          errorResponse('Invalid timesheet status', httpStatus.BAD_REQUEST)
        );
      }
      
      // Get the timesheet
      const timesheet = await Timesheet.findById(timesheetId);
      
      if (!timesheet) {
        return res.status(httpStatus.NOT_FOUND).json(
          errorResponse('Timesheet not found', httpStatus.NOT_FOUND)
        );
      }
      
      // Update status if provided
      if (status) {
        timesheet.status = status;
        
        // If rejecting, require reason
        if (status === TimesheetStatus.REJECTED && !reason) {
          return res.status(httpStatus.BAD_REQUEST).json(
            errorResponse('Rejection reason is required', httpStatus.BAD_REQUEST)
          );
        }
        
        if (status === TimesheetStatus.REJECTED) {
          timesheet.rejectionReason = reason;
        }
        
        if (status === TimesheetStatus.APPROVED) {
          timesheet.approvedBy = req.user._id;
          timesheet.approvedAt = new Date();
        }
      }
      
      // Update payment status if provided
      if (isPaid !== undefined) {
        timesheet.isPaid = isPaid;
      }
      
      // Save changes
      await timesheet.save();
      
      // Return updated timesheet
      return res.json(successResponse({ timesheet }, 'Timesheet updated successfully'));
    } catch (error) {
      return next(error);
    }
  }
};