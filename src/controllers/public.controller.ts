/**
 * Public Controller
 * Handles public API endpoints that don't require authentication
 * Used for external worker interactions (shift cancellations, etc.)
 */

import { Request, Response } from 'express';
import httpStatus from 'http-status';
import moment from 'moment';
import {
  processPublicCancellation,
  getWorkerUpcomingShifts,
  PublicCancellationInput
} from '../services/public-cancellation.service';
import { CancellationReason } from '../types/roster.types';
import { successResponse, errorResponse } from '../utils/api-response';
import logger from '../utils/logger';

/**
 * Cancel a shift via phone number verification
 * POST /api/v1/public/shift-cancellation
 * 
 * No authentication required - worker identifies via phone number
 */
export const cancelShiftByPhone = async (req: Request, res: Response) => {
  try {
    const {
      workerPhone,
      shiftDate,
      shiftStartTime,
      cancellationReason,
      cancellationMessage
    } = req.body;
    
    // Validate required fields
    if (!workerPhone) {
      return res.status(httpStatus.BAD_REQUEST).json(
        errorResponse('Worker phone number is required', httpStatus.BAD_REQUEST)
      );
    }
    
    if (!cancellationReason) {
      return res.status(httpStatus.BAD_REQUEST).json(
        errorResponse('Cancellation reason is required', httpStatus.BAD_REQUEST)
      );
    }
    
    // Validate cancellation reason
    const validReasons = Object.values(CancellationReason);
    if (!validReasons.includes(cancellationReason)) {
      return res.status(httpStatus.BAD_REQUEST).json(
        errorResponse(
          `Invalid cancellation reason. Valid options: ${validReasons.join(', ')}`,
          httpStatus.BAD_REQUEST
        )
      );
    }
    
    const input: PublicCancellationInput = {
      workerPhone,
      shiftDate,
      shiftStartTime,
      cancellationReason,
      cancellationMessage
    };
    
    const result = await processPublicCancellation(input);
    
    if (!result.success) {
      return res.status(httpStatus.NOT_FOUND).json(
        errorResponse(result.message, httpStatus.NOT_FOUND)
      );
    }
    
    return res.status(httpStatus.OK).json(
      successResponse(result, result.message)
    );
    
  } catch (error) {
    logger.error('Error in public shift cancellation:', error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse('An error occurred while processing your cancellation', httpStatus.INTERNAL_SERVER_ERROR)
    );
  }
};

/**
 * Get upcoming shifts for a worker by phone
 * GET /api/v1/public/my-shifts
 * 
 * Query params:
 * - phone: Worker's phone number (required)
 */
export const getMyShifts = async (req: Request, res: Response) => {
  try {
    const { phone } = req.query;
    
    if (!phone || typeof phone !== 'string') {
      return res.status(httpStatus.BAD_REQUEST).json(
        errorResponse('Phone number is required', httpStatus.BAD_REQUEST)
      );
    }
    
    const shifts = await getWorkerUpcomingShifts(phone);
    
    // Format shifts for response
    const formattedShifts = shifts.map(shift => ({
      shiftId: shift._id,
      date: moment(shift.shiftDate).format('dddd, MMMM D, YYYY'),
      dateISO: moment(shift.shiftDate).format('YYYY-MM-DD'),
      startTime: shift.shiftStartTime,
      endTime: shift.shiftEndTime,
      duration: `${shift.shiftDurationMinutes} minutes`,
      participant: shift.participantName,
      serviceType: shift.shiftType || shift.supportCategory,
      location: shift.locationAddress || shift.locationName,
      status: shift.currentStatus
    }));
    
    return res.status(httpStatus.OK).json(
      successResponse({
        shifts: formattedShifts,
        total: formattedShifts.length
      }, `Found ${formattedShifts.length} upcoming shift(s)`)
    );
    
  } catch (error) {
    logger.error('Error fetching worker shifts:', error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse('An error occurred while fetching shifts', httpStatus.INTERNAL_SERVER_ERROR)
    );
  }
};

/**
 * Get cancellation reasons (for UI dropdown)
 * GET /api/v1/public/cancellation-reasons
 */
export const getCancellationReasons = async (_req: Request, res: Response) => {
  const reasons = [
    { value: CancellationReason.SICK, label: 'Sick / Unwell' },
    { value: CancellationReason.EMERGENCY, label: 'Emergency' },
    { value: CancellationReason.UNAVAILABLE, label: 'Unavailable' },
    { value: CancellationReason.TRANSPORT, label: 'Transport Issues' },
    { value: CancellationReason.OTHER, label: 'Other' }
  ];
  
  return res.status(httpStatus.OK).json(
    successResponse({ reasons }, 'Cancellation reasons retrieved')
  );
};

