/**
 * Shift controller
 * Handles HTTP requests related to shift management
 */

import { Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { shiftService } from '../services/shift.service';
import { UserRole } from '../types/user.types';
import { 
  ShiftStatus, 
//   ShiftType, 
//   RecurrencePattern, 
  CancellationReason
} from '../types/shift.types';
import Shift, { IShift } from '../models/shift.model';
import { successResponse, errorResponse } from '../utils/api-response';
import mongoose from 'mongoose';
import logger from '../utils/logger';

/**
   * Helper function to get all shifts with filtering for admins
   */
  async function getAllShifts(filter: {
    status?: ShiftStatus;
    startDate?: Date;
    endDate?: Date;
    workerId?: string;
    participantId?: string;
    organizationId?: string;
  }): Promise<IShift[]> {
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
      
      if (filter.startDate || filter.endDate) {
        query.startTime = {};
        
        if (filter.startDate) {
          query.startTime.$gte = filter.startDate;
        }
        
        if (filter.endDate) {
          query.startTime.$lte = filter.endDate;
        }
      }
      
      // Get shifts with populated references
      const shifts = await Shift.find(query)
        .sort({ startTime: -1 }) // Most recent first
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
            path: 'organizationId',
            select: 'name'
          }
        ]);
      
      return shifts;
    } catch (error) {
      logger.error('Error getting all shifts:', error);
      throw error;
    }
  }

export const shiftController = {
  /**
   * Create a new shift
   * @route POST /api/shifts
   */
  createShift: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      // Only participants can create shifts
      if (req.user.role !== UserRole.PARTICIPANT) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only participants can create shifts', httpStatus.FORBIDDEN)
        );
      }
      
      const participantId = req.user._id.toString();
      const {
        organizationId,
        workerId,
        serviceType,
        startTime,
        endTime,
        locationType,
        address,
        shiftType,
        requiresSupervision,
        specialInstructions,
        recurrence
      } = req.body;
      
      const shift = await shiftService.createShift({
        organizationId,
        participantId,
        workerId,
        serviceType,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        locationType,
        address,
        shiftType,
        requiresSupervision,
        specialInstructions,
        recurrence
      });
      
      return res.status(httpStatus.CREATED).json(
        successResponse({ shift }, 'Shift created successfully')
      );
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get shift by ID
   * @route GET /api/shifts/:shiftId
   */
  getShiftById: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      const { shiftId } = req.params;
      const shift = await shiftService.getShiftById(shiftId);
      
      // Check permissions to view shift
      if (
        req.user.role === UserRole.PARTICIPANT && 
        shift.participantId.toString() !== req.user._id.toString()
      ) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('You do not have permission to view this shift', httpStatus.FORBIDDEN)
        );
      }
      
      if (
        req.user.role === UserRole.SUPPORT_WORKER && 
        shift.workerId?.toString() !== req.user._id.toString()
      ) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('You do not have permission to view this shift', httpStatus.FORBIDDEN)
        );
      }
      
      return res.json(successResponse({ shift }, 'Shift retrieved successfully'));
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get shift by unique shift ID
   * @route GET /api/shifts/byShiftId/:shiftIdRef
   */
  getShiftByShiftId: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      const { shiftIdRef } = req.params;
      const shift = await shiftService.getShiftByShiftId(shiftIdRef);
      
      // Check permissions to view shift
      if (
        req.user.role === UserRole.PARTICIPANT && 
        shift.participantId.toString() !== req.user._id.toString()
      ) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('You do not have permission to view this shift', httpStatus.FORBIDDEN)
        );
      }
      
      if (
        req.user.role === UserRole.SUPPORT_WORKER && 
        shift.workerId?.toString() !== req.user._id.toString()
      ) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('You do not have permission to view this shift', httpStatus.FORBIDDEN)
        );
      }
      
      return res.json(successResponse({ shift }, 'Shift retrieved successfully'));
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get shifts for current user (based on role)
   * @route GET /api/shifts
   */
  getShifts: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
        organizationId
      } = req.query;
      
      let shifts;
      
      // Get shifts based on user role
      if (req.user.role === UserRole.PARTICIPANT) {
        shifts = await shiftService.getParticipantShifts(
          userId,
          {
            status: status as ShiftStatus,
            startDate: startDate ? new Date(startDate as string) : undefined,
            endDate: endDate ? new Date(endDate as string) : undefined,
            workerId: workerId as string
          }
        );
      } else if (req.user.role === UserRole.SUPPORT_WORKER) {
        shifts = await shiftService.getWorkerShifts(
          userId,
          {
            status: status as ShiftStatus,
            startDate: startDate ? new Date(startDate as string) : undefined,
            endDate: endDate ? new Date(endDate as string) : undefined,
            organizationId: organizationId as string
          }
        );
      } else if (req.user.role === UserRole.ADMIN) {
        // Admin can see all shifts with optional filtering
        shifts = await getAllShifts({
          status: status as ShiftStatus,
          startDate: startDate ? new Date(startDate as string) : undefined,
          endDate: endDate ? new Date(endDate as string) : undefined,
          workerId: workerId as string,
          participantId: participantId as string,
          organizationId: organizationId as string
        });
      } else {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Role not authorized to view shifts', httpStatus.FORBIDDEN)
        );
      }
      
      return res.json(successResponse({ shifts }, 'Shifts retrieved successfully'));
    } catch (error) {
      return next(error);
    }
  },
  

  /**
   * Update shift
   * @route PATCH /api/shifts/:shiftId
   */
  updateShift: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      const { shiftId } = req.params;
      const userId = req.user._id.toString();
      
      const updateData = {
        workerId: req.body.workerId,
        serviceType: req.body.serviceType,
        startTime: req.body.startTime ? new Date(req.body.startTime) : undefined,
        endTime: req.body.endTime ? new Date(req.body.endTime) : undefined,
        locationType: req.body.locationType,
        address: req.body.address,
        requiresSupervision: req.body.requiresSupervision,
        specialInstructions: req.body.specialInstructions,
        status: req.body.status,
        updateRecurring: req.body.updateRecurring
      };
      
      const shift = await shiftService.updateShift(shiftId, userId, updateData);
      
      return res.json(successResponse({ shift }, 'Shift updated successfully'));
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Respond to shift (worker accepts or declines)
   * @route POST /api/shifts/:shiftId/respond
   */
  respondToShift: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      // Only support workers can respond to shifts
      if (req.user.role !== UserRole.SUPPORT_WORKER) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only support workers can respond to shifts', httpStatus.FORBIDDEN)
        );
      }
      
      const { shiftId } = req.params;
      const workerId = req.user._id.toString();
      const { accept, declineReason } = req.body;
      
      const shift = await shiftService.respondToShift(
        shiftId,
        workerId,
        accept,
        declineReason
      );
      
      const message = accept
        ? 'Shift confirmed successfully'
        : 'Shift declined successfully';
      
      return res.json(successResponse({ shift }, message));
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Cancel shift
   * @route POST /api/shifts/:shiftId/cancel
   */
  cancelShift: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      const { shiftId } = req.params;
      const userId = req.user._id.toString();
      const { reason, note } = req.body;
      
      // Validate cancellation reason
      if (!Object.values(CancellationReason).includes(reason)) {
        return res.status(httpStatus.BAD_REQUEST).json(
          errorResponse('Invalid cancellation reason', httpStatus.BAD_REQUEST)
        );
      }
      
      const shift = await shiftService.cancelShift(
        shiftId,
        userId,
        reason,
        note
      );
      
      return res.json(successResponse({ shift }, 'Shift cancelled successfully'));
    } catch (error) {
      return next(error);
    }
  }
};