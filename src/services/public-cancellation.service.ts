/**
 * Public Shift Cancellation Service
 * Handles shift cancellations from external workers (no auth required)
 * Workers identify themselves via phone number
 */

import moment from 'moment';
import ShiftReference, { IShiftReference } from '../models/shiftReference.model';
import ShiftEvent from '../models/shiftEvent.model';
import WorkerRegistry from '../models/workerRegistry.model';
import {
  ShiftReferenceStatus,
  CancellationReason,
  ShiftEventType,
  EventTriggerSource,
  ResolutionStatus
} from '../types/roster.types';
import logger from '../utils/logger';

/**
 * Input for public shift cancellation
 */
// export interface PublicCancellationInput {
//   workerPhone: string;
//   shiftDate?: string; // ISO date or 'today', 'tomorrow'
//   shiftStartTime?: string; // HH:mm format or 'morning', 'afternoon', 'evening', 'night'
//   cancellationReason: CancellationReason;
//   cancellationMessage?: string;
// }

/**
 * Input for public shift cancellation
 */
export interface PublicCancellationInput {
  shiftReferenceId: string;
  cancellationReason: string;
  cancellationMessage?: string;
  workerPhone: string;
  providerId: string;
}

/**
 * Result of public cancellation
 */
export interface PublicCancellationResult {
  success: boolean;
  message: string;
  shiftDetails?: {
    shiftId: string;
    shiftDate: string;
    shiftTime: string;
    participantName?: string;
    serviceType?: string;
  };
  eventId?: string;
}

/**
 * Normalize phone number for comparison
 */
function normalizePhone(phone: string): string {
  // Remove all non-digit characters except +
  let normalized = phone.replace(/[^\d+]/g, '');
  
  // Handle Australian numbers
  if (normalized.startsWith('0')) {
    normalized = '+61' + normalized.substring(1);
  } else if (normalized.startsWith('61') && !normalized.startsWith('+')) {
    normalized = '+' + normalized;
  }
  
  return normalized;
}

/**
 * Parse shift date from input
 */
function parseShiftDate(dateInput?: string): { start: Date; end: Date } {
  const today = moment().startOf('day');
  
  if (!dateInput) {
    // Default to today and tomorrow
    return {
      start: today.toDate(),
      end: moment().add(1, 'day').endOf('day').toDate()
    };
  }
  
  const lowerInput = dateInput.toLowerCase().trim();
  
  if (lowerInput === 'today') {
    return {
      start: today.toDate(),
      end: today.endOf('day').toDate()
    };
  }
  
  if (lowerInput === 'tomorrow') {
    const tomorrow = moment().add(1, 'day').startOf('day');
    return {
      start: tomorrow.toDate(),
      end: tomorrow.endOf('day').toDate()
    };
  }
  
  // Try to parse as ISO date
  const parsed = moment(dateInput, ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'], true);
  if (parsed.isValid()) {
    return {
      start: parsed.startOf('day').toDate(),
      end: parsed.endOf('day').toDate()
    };
  }
  
  // Default fallback
  return {
    start: today.toDate(),
    end: moment().add(7, 'days').endOf('day').toDate()
  };
}

/**
 * Parse time period from input
 */
function parseTimePeriod(timeInput?: string): { startHour?: number; endHour?: number } {
  if (!timeInput) {
    return {};
  }
  
  const lowerInput = timeInput.toLowerCase().trim();
  
  // Named periods
  const periods: Record<string, { startHour: number; endHour: number }> = {
    'morning': { startHour: 5, endHour: 12 },
    'afternoon': { startHour: 12, endHour: 17 },
    'evening': { startHour: 17, endHour: 21 },
    'night': { startHour: 21, endHour: 5 }
  };
  
  if (periods[lowerInput]) {
    return periods[lowerInput];
  }
  
  // Try to parse as HH:mm
  const timeMatch = timeInput.match(/^(\d{1,2}):(\d{2})$/);
  if (timeMatch) {
    const hour = parseInt(timeMatch[1], 10);
    return { startHour: hour, endHour: hour + 1 };
  }
  
  return {};
}

/**
 * Find matching shift for the worker
 */
async function findWorkerShift(
  workerPhone: string,
  dateRange: { start: Date; end: Date },
  timePeriod: { startHour?: number; endHour?: number }
): Promise<IShiftReference | null> {
  const normalizedPhone = normalizePhone(workerPhone);
  
  // Build query
  const query: any = {
    assignedWorkerPhone: { 
      $in: [
        normalizedPhone,
        workerPhone,
        workerPhone.replace(/\s/g, ''),
        // Try without country code
        normalizedPhone.replace('+61', '0')
      ]
    },
    shiftDate: {
      $gte: dateRange.start,
      $lte: dateRange.end
    },
    currentStatus: {
      $in: [ShiftReferenceStatus.SCHEDULED, ShiftReferenceStatus.CONFIRMED]
    }
  };
  
  // Find all matching shifts
  let shifts = await ShiftReference.find(query).sort({ shiftDate: 1, shiftStartTime: 1 });
  
  // Filter by time period if specified
  if (timePeriod.startHour !== undefined && shifts.length > 1) {
    shifts = shifts.filter(shift => {
      const shiftHour = parseInt(shift.shiftStartTime.split(':')[0], 10);
      if (timePeriod.endHour !== undefined) {
        if (timePeriod.startHour! < timePeriod.endHour!) {
          return shiftHour >= timePeriod.startHour! && shiftHour < timePeriod.endHour!;
        } else {
          // Night shift wraps around midnight
          return shiftHour >= timePeriod.startHour! || shiftHour < timePeriod.endHour!;
        }
      }
      return shiftHour === timePeriod.startHour;
    });
  }
  
  // Return the first (soonest) matching shift
  return shifts.length > 0 ? shifts[0] : null;
}

/**
 * Calculate notice hours
 */
function calculateNoticeHours(shiftDate: Date, shiftStartTime: string): number {
  const [hours, minutes] = shiftStartTime.split(':').map(Number);
  const shiftDateTime = new Date(shiftDate);
  shiftDateTime.setHours(hours, minutes, 0, 0);
  
  const now = new Date();
  const diffMs = shiftDateTime.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  
  return Math.max(0, Math.round(diffHours * 10) / 10);
}

/**
 * Process public shift cancellation
 */
export async function processPublicCancellation(
  input: PublicCancellationInput
): Promise<PublicCancellationResult> {
  try {
    // Find the shift by ID and validate worker phone and provider
    const shift = await ShiftReference.findOne({
      _id: input.shiftReferenceId,
      providerId: input.providerId,
      assignedWorkerPhone: { 
        $in: [
          normalizePhone(input.workerPhone),
          input.workerPhone,
          input.workerPhone.replace(/\s/g, ''),
          normalizePhone(input.workerPhone).replace('+61', '0')
        ]
      },
      currentStatus: {
        $in: [ShiftReferenceStatus.SCHEDULED, ShiftReferenceStatus.CONFIRMED]
      }
    });
    
    if (!shift) {
      logger.warn('Public cancellation: No shift found', {
        shiftReferenceId: input.shiftReferenceId,
        workerPhone: input.workerPhone,
        providerId: input.providerId
      });
      
      return {
        success: false,
        message: 'Shift not found or you are not authorized to cancel this shift. Please verify the shift ID and your phone number.'
      };
    }
    
    // Check if already cancelled
    if (shift.currentStatus === ShiftReferenceStatus.CANCELLED) {
      return {
        success: false,
        message: 'This shift has already been cancelled.',
        shiftDetails: {
          shiftId: shift._id.toString(),
          shiftDate: moment(shift.shiftDate).format('YYYY-MM-DD'),
          shiftTime: `${shift.shiftStartTime} - ${shift.shiftEndTime}`,
          participantName: shift.participantName,
          serviceType: shift.shiftType || shift.supportCategory
        }
      };
    }
    
    // Calculate notice hours
    const noticeHours = calculateNoticeHours(shift.shiftDate, shift.shiftStartTime);
    
    // Create cancellation event
    const event = await ShiftEvent.create({
      shiftReferenceId: shift._id,
      providerId: shift.providerId,
      eventType: ShiftEventType.CANCELLATION_REPORTED,
      triggeredBy: EventTriggerSource.WORKER_PORTAL,
      eventPayload: {
        cancellationReason: input.cancellationReason,
        messageContent: input.cancellationMessage,
        noticeHours,
        previousStatus: shift.currentStatus,
        workerName: shift.assignedWorkerName,
        workerPhone: shift.assignedWorkerPhone || input.workerPhone
      },
      resolutionStatus: ResolutionStatus.PENDING
    });
    
    // Update shift status
    shift.currentStatus = ShiftReferenceStatus.CANCELLED;
    shift.cancellationEventId = event._id;
    shift.statusUpdatedAt = new Date();
    await shift.save();
    
    // Update worker registry stats if worker is in registry
    if (shift.assignedWorkerId) {
      await WorkerRegistry.updateOne(
        { 
          providerId: shift.providerId,
          $or: [
            { matchedUserId: shift.assignedWorkerId },
            { _id: shift.assignedWorkerId }
          ]
        },
        { $inc: { totalShiftsCancelled: 1 } }
      );
    }
    
    logger.info('Public cancellation processed', {
      shiftId: shift._id,
      shiftReferenceId: input.shiftReferenceId,
      workerPhone: input.workerPhone,
      reason: input.cancellationReason,
      noticeHours
    });
    
    return {
      success: true,
      message: `Shift cancelled successfully. ${noticeHours > 0 ? `You provided ${noticeHours.toFixed(1)} hours notice.` : 'Please note this is a late cancellation.'}`,
      shiftDetails: {
        shiftId: shift._id.toString(),
        shiftDate: moment(shift.shiftDate).format('dddd, MMMM D, YYYY'),
        shiftTime: `${shift.shiftStartTime} - ${shift.shiftEndTime}`,
        participantName: shift.participantName,
        serviceType: shift.shiftType || shift.supportCategory
      },
      eventId: event._id.toString()
    };
    
  } catch (error) {
    logger.error('Error processing public cancellation:', error);
    throw error;
  }
}

// /**
//  * Process public shift cancellation
//  */
// export async function processPublicCancellation(
//   input: PublicCancellationInput
// ): Promise<PublicCancellationResult> {
//   try {
//     // Parse date and time
//     const dateRange = parseShiftDate(input.shiftDate);
//     const timePeriod = parseTimePeriod(input.shiftStartTime);
    
//     // Find the shift
//     const shift = await findWorkerShift(input.workerPhone, dateRange, timePeriod);
    
//     if (!shift) {
//       logger.warn('Public cancellation: No shift found', {
//         workerPhone: input.workerPhone,
//         dateRange,
//         timePeriod
//       });
      
//       return {
//         success: false,
//         message: 'No upcoming shift found for this phone number. Please check your details and try again.'
//       };
//     }
    
//     // Check if already cancelled
//     if (shift.currentStatus === ShiftReferenceStatus.CANCELLED) {
//       return {
//         success: false,
//         message: 'This shift has already been cancelled.',
//         shiftDetails: {
//           shiftId: shift._id.toString(),
//           shiftDate: moment(shift.shiftDate).format('YYYY-MM-DD'),
//           shiftTime: `${shift.shiftStartTime} - ${shift.shiftEndTime}`,
//           participantName: shift.participantName,
//           serviceType: shift.shiftType || shift.supportCategory
//         }
//       };
//     }
    
//     // Calculate notice hours
//     const noticeHours = calculateNoticeHours(shift.shiftDate, shift.shiftStartTime);
    
//     // Create cancellation event
//     const event = await ShiftEvent.create({
//       shiftReferenceId: shift._id,
//       providerId: shift.providerId,
//       eventType: ShiftEventType.CANCELLATION_REPORTED,
//       triggeredBy: EventTriggerSource.WORKER_PORTAL,
//       eventPayload: {
//         cancellationReason: input.cancellationReason,
//         messageContent: input.cancellationMessage,
//         noticeHours,
//         previousStatus: shift.currentStatus,
//         workerName: shift.assignedWorkerName,
//         workerPhone: shift.assignedWorkerPhone || input.workerPhone
//       },
//       resolutionStatus: ResolutionStatus.PENDING
//     });
    
//     // Update shift status
//     shift.currentStatus = ShiftReferenceStatus.CANCELLED;
//     shift.cancellationEventId = event._id;
//     shift.statusUpdatedAt = new Date();
//     await shift.save();
    
//     // Update worker registry stats if worker is in registry
//     if (shift.assignedWorkerId) {
//       await WorkerRegistry.updateOne(
//         { 
//           providerId: shift.providerId,
//           $or: [
//             { matchedUserId: shift.assignedWorkerId },
//             { _id: shift.assignedWorkerId }
//           ]
//         },
//         { $inc: { totalShiftsCancelled: 1 } }
//       );
//     }
    
//     logger.info('Public cancellation processed', {
//       shiftId: shift._id,
//       workerPhone: input.workerPhone,
//       reason: input.cancellationReason,
//       noticeHours
//     });
    
//     return {
//       success: true,
//       message: `Shift cancelled successfully. ${noticeHours > 0 ? `You provided ${noticeHours.toFixed(1)} hours notice.` : 'Please note this is a late cancellation.'}`,
//       shiftDetails: {
//         shiftId: shift._id.toString(),
//         shiftDate: moment(shift.shiftDate).format('dddd, MMMM D, YYYY'),
//         shiftTime: `${shift.shiftStartTime} - ${shift.shiftEndTime}`,
//         participantName: shift.participantName,
//         serviceType: shift.shiftType || shift.supportCategory
//       },
//       eventId: event._id.toString()
//     };
    
//   } catch (error) {
//     logger.error('Error processing public cancellation:', error);
//     throw error;
//   }
// }

/**
 * Get worker's upcoming shifts by phone
 */
export async function getWorkerUpcomingShifts(
  workerPhone: string
): Promise<IShiftReference[]> {
  const normalizedPhone = normalizePhone(workerPhone);
  const today = moment().startOf('day').toDate();
  
  const shifts = await ShiftReference.find({
    assignedWorkerPhone: {
      $in: [
        normalizedPhone,
        workerPhone,
        workerPhone.replace(/\s/g, ''),
        normalizedPhone.replace('+61', '0')
      ]
    },
    shiftDate: { $gte: today },
    currentStatus: {
      $in: [ShiftReferenceStatus.SCHEDULED, ShiftReferenceStatus.CONFIRMED]
    }
  })
    .sort({ shiftDate: 1, shiftStartTime: 1 })
    .limit(10);
  
  return shifts;
}

