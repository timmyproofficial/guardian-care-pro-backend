/**
 * Shift Cancellation Service
 * Handles shift cancellation reporting and replacement workflow triggering
 */

import mongoose from 'mongoose';
import moment from 'moment';
import ShiftReference, { IShiftReference } from '../models/shiftReference.model';
import ShiftEvent from '../models/shiftEvent.model';
import WorkerRegistry from '../models/workerRegistry.model';
import {
  ShiftReferenceStatus,
  ShiftEventType,
  EventTriggerSource,
  ResolutionStatus,
  CancellationInput
} from '../types/roster.types';
import { findReplacementWorkers } from './replacement-finder.service';
import logger from '../utils/logger';

/**
 * Cancellation result interface
 */
interface CancellationResult {
  success: boolean;
  eventId: string;
  shiftReferenceId: string;
  shiftDetails: {
    shiftDate: string;
    shiftStartTime: string;
    shiftEndTime: string;
    workerName: string;
    participantName: string;
    locationName?: string;
  };
  replacementWorkflowStatus: 'initiated' | 'pending_provider_approval' | 'not_started';
  notificationsSent: {
    sms: string[];
    email: string[];
    push: string[];
  };
  nextSteps: string;
  error?: string;
}

/**
 * Find a shift by direct reference ID or by search parameters
 */
export async function findShiftForCancellation(
  providerId: mongoose.Types.ObjectId,
  input: CancellationInput
): Promise<IShiftReference | null> {
  // Direct lookup by ID
  if (input.shiftReferenceId) {
    return ShiftReference.findOne({
      _id: input.shiftReferenceId,
      providerId,
      currentStatus: { $in: [ShiftReferenceStatus.SCHEDULED, ShiftReferenceStatus.CONFIRMED] }
    });
  }
  
  // Build search query
  const query: any = {
    providerId,
    currentStatus: { $in: [ShiftReferenceStatus.SCHEDULED, ShiftReferenceStatus.CONFIRMED] }
  };
  
  // Phone-based lookup (fastest for SMS)
  if (input.workerPhone) {
    query.assignedWorkerPhone = input.workerPhone;
  }
  
  // Worker name lookup
  if (input.workerName) {
    query.assignedWorkerName = { $regex: new RegExp(input.workerName, 'i') };
  }
  
  // Parse and add date filter
  if (input.shiftDate) {
    const parsedDate = parseFlexibleDate(input.shiftDate);
    if (parsedDate) {
      // Set to start and end of day
      const startOfDay = moment(parsedDate).startOf('day').toDate();
      const endOfDay = moment(parsedDate).endOf('day').toDate();
      query.shiftDate = { $gte: startOfDay, $lte: endOfDay };
    }
  }
  
  // Participant name (for disambiguation)
  if (input.participantName) {
    query.participantName = { $regex: new RegExp(input.participantName, 'i') };
  }
  
  // Add time filter if provided
  if (input.shiftTime) {
    const parsedTime = parseFlexibleTime(input.shiftTime);
    if (parsedTime) {
      query.shiftStartTime = parsedTime;
    }
  }
  
  // Find matching shifts
  const shifts = await ShiftReference.find(query)
    .sort({ shiftDate: 1, shiftStartTime: 1 })
    .limit(5);
  
  if (shifts.length === 0) {
    return null;
  }
  
  // If multiple matches, try to narrow down
  if (shifts.length > 1) {
    // Prefer exact phone match
    if (input.workerPhone) {
      const exactMatch = shifts.find(s => s.assignedWorkerPhone === input.workerPhone);
      if (exactMatch) return exactMatch;
    }
    
    // Prefer upcoming shifts
    const now = new Date();
    const upcomingShifts = shifts.filter(s => s.shiftDate >= now);
    if (upcomingShifts.length === 1) return upcomingShifts[0];
    
    // Return the closest upcoming shift
    if (upcomingShifts.length > 0) {
      return upcomingShifts[0];
    }
  }
  
  return shifts[0];
}

/**
 * Report a shift cancellation
 */
export async function reportCancellation(
  providerId: mongoose.Types.ObjectId,
  input: CancellationInput,
  triggeredByUserId?: mongoose.Types.ObjectId
): Promise<CancellationResult> {
  try {
    // Find the shift
    const shift = await findShiftForCancellation(providerId, input);
    
    if (!shift) {
      return {
        success: false,
        eventId: '',
        shiftReferenceId: '',
        shiftDetails: {
          shiftDate: '',
          shiftStartTime: '',
          shiftEndTime: '',
          workerName: '',
          participantName: ''
        },
        replacementWorkflowStatus: 'not_started',
        notificationsSent: { sms: [], email: [], push: [] },
        nextSteps: '',
        error: 'No matching shift found for the provided criteria'
      };
    }
    
    // Check if already cancelled
    if (shift.currentStatus === ShiftReferenceStatus.CANCELLED) {
      return {
        success: false,
        eventId: '',
        shiftReferenceId: shift._id.toString(),
        shiftDetails: formatShiftDetails(shift),
        replacementWorkflowStatus: 'not_started',
        notificationsSent: { sms: [], email: [], push: [] },
        nextSteps: '',
        error: 'Shift is already cancelled'
      };
    }
    
    // Calculate notice hours
    const shiftDateTime = combineDateAndTime(shift.shiftDate, shift.shiftStartTime);
    const noticeHours = input.noticeHours || calculateNoticeHours(shiftDateTime);
    
    // Create cancellation event
    const event = await ShiftEvent.create({
      shiftReferenceId: shift._id,
      providerId,
      eventType: ShiftEventType.CANCELLATION_REPORTED,
      eventTimestamp: new Date(),
      triggeredBy: input.triggeredBy,
      triggeredByUserId,
      eventPayload: {
        cancellationReason: input.cancellationReason,
        noticeHours,
        messageContent: input.cancellationMessage,
        aiParsingConfidence: input.aiParsedEntities?.confidence,
        aiParsedEntities: input.aiParsedEntities
      },
      resolutionStatus: ResolutionStatus.PENDING
    });
    
    // Update shift status
    await ShiftReference.findByIdAndUpdate(shift._id, {
      currentStatus: ShiftReferenceStatus.CANCELLED,
      statusUpdatedAt: new Date(),
      cancellationEventId: event._id
    });
    
    // Update worker registry statistics
    await updateWorkerCancellationStats(providerId, shift.assignedWorkerName);
    
    // Initialize notifications tracking
    const notificationsSent = {
      sms: [] as string[],
      email: [] as string[],
      push: [] as string[]
    };
    
    let replacementWorkflowStatus: 'initiated' | 'pending_provider_approval' | 'not_started' = 'not_started';
    
    // Trigger replacement workflow if requested
    if (input.autoTriggerReplacement) {
      try {
        const replacements = await findReplacementWorkers(providerId, {
          shiftReferenceId: shift._id.toString(),
          preferences: {
            excludeWorkerIds: [shift.assignedWorkerId?.toString()].filter(Boolean) as string[],
            maxDistanceKm: 20,
            preferPastExperience: true
          },
          limit: 10
        });
        
        if (replacements.length > 0) {
          // Create replacement requested event
          await ShiftEvent.create({
            shiftReferenceId: shift._id,
            providerId,
            eventType: ShiftEventType.REPLACEMENT_REQUESTED,
            eventTimestamp: new Date(),
            triggeredBy: EventTriggerSource.SYSTEM_AUTOMATION,
            eventPayload: {
              candidatesFound: replacements.length,
              topCandidateScore: replacements[0].matchScore
            },
            resolutionStatus: ResolutionStatus.PENDING
          });
          
          // Update shift status
          await ShiftReference.findByIdAndUpdate(shift._id, {
            replacementRequestedAt: new Date()
          });
          
          replacementWorkflowStatus = 'initiated';
          
          // TODO: Send notifications to replacement candidates
          // This would integrate with the notification service
          logger.info(`Found ${replacements.length} replacement candidates for shift ${shift._id}`);
        }
      } catch (error) {
        logger.error('Error initiating replacement workflow:', error);
        replacementWorkflowStatus = 'pending_provider_approval';
      }
    }
    
    // Update event resolution if replacement initiated
    if (replacementWorkflowStatus === 'initiated') {
      await ShiftEvent.findByIdAndUpdate(event._id, {
        resolutionStatus: ResolutionStatus.PENDING,
        resolutionNotes: 'Replacement workflow initiated'
      });
    }
    
    // Generate next steps guidance
    const nextSteps = generateNextSteps(shift, replacementWorkflowStatus, noticeHours);
    
    logger.info(`Cancellation reported for shift ${shift._id}, event ${event._id}`);
    
    return {
      success: true,
      eventId: event._id.toString(),
      shiftReferenceId: shift._id.toString(),
      shiftDetails: formatShiftDetails(shift),
      replacementWorkflowStatus,
      notificationsSent,
      nextSteps
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error reporting cancellation:', error);
    
    return {
      success: false,
      eventId: '',
      shiftReferenceId: '',
      shiftDetails: {
        shiftDate: '',
        shiftStartTime: '',
        shiftEndTime: '',
        workerName: '',
        participantName: ''
      },
      replacementWorkflowStatus: 'not_started',
      notificationsSent: { sms: [], email: [], push: [] },
      nextSteps: '',
      error: errorMessage
    };
  }
}

/**
 * Parse flexible date input (natural language support)
 */
function parseFlexibleDate(dateStr: string): Date | null {
  const lower = dateStr.toLowerCase().trim();
  const now = moment();
  
  // Natural language dates
  if (lower === 'today') return now.startOf('day').toDate();
  if (lower === 'tomorrow') return now.add(1, 'day').startOf('day').toDate();
  if (lower === 'yesterday') return now.subtract(1, 'day').startOf('day').toDate();
  
  // Try common formats
  const formats = [
    'YYYY-MM-DD',
    'DD/MM/YYYY',
    'DD-MM-YYYY',
    'D/M/YYYY',
    'D/M/YY',
    'DD MMM',
    'D MMM'
  ];
  
  for (const format of formats) {
    const parsed = moment(dateStr, format, true);
    if (parsed.isValid()) {
      // If no year specified, assume current year
      if (!format.includes('Y') && parsed.year() === 2001) {
        parsed.year(now.year());
      }
      return parsed.toDate();
    }
  }
  
  return null;
}

/**
 * Parse flexible time input
 */
function parseFlexibleTime(timeStr: string): string | null {
  const lower = timeStr.toLowerCase().trim();
  
  // Handle period-based times
  if (lower === 'morning' || lower === 'am') return '09:00';
  if (lower === 'afternoon') return '13:00';
  if (lower === 'evening') return '17:00';
  if (lower === 'night') return '21:00';
  
  // Try common formats
  const formats = ['HH:mm', 'H:mm', 'h:mm A', 'hA', 'ha', 'h:mma'];
  
  for (const format of formats) {
    const parsed = moment(timeStr, format, true);
    if (parsed.isValid()) {
      return parsed.format('HH:mm');
    }
  }
  
  return null;
}

/**
 * Combine date and time into a single Date object
 */
function combineDateAndTime(date: Date, timeStr: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return combined;
}

/**
 * Calculate notice hours before shift start
 */
function calculateNoticeHours(shiftDateTime: Date): number {
  const now = new Date();
  const diffMs = shiftDateTime.getTime() - now.getTime();
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));
}

/**
 * Format shift details for response
 */
function formatShiftDetails(shift: IShiftReference): CancellationResult['shiftDetails'] {
  return {
    shiftDate: moment(shift.shiftDate).format('YYYY-MM-DD'),
    shiftStartTime: shift.shiftStartTime,
    shiftEndTime: shift.shiftEndTime,
    workerName: shift.assignedWorkerName,
    participantName: shift.participantName,
    locationName: shift.locationName
  };
}

/**
 * Update worker cancellation statistics
 */
async function updateWorkerCancellationStats(
  providerId: mongoose.Types.ObjectId,
  workerName: string
): Promise<void> {
  await WorkerRegistry.updateOne(
    { providerId, workerName },
    { $inc: { totalShiftsCancelled: 1 } }
  );
}

/**
 * Generate human-readable next steps guidance
 */
function generateNextSteps(
  shift: IShiftReference,
  workflowStatus: string,
  noticeHours: number
): string {
  const steps: string[] = [];
  
  if (workflowStatus === 'initiated') {
    steps.push('Replacement worker search has been initiated.');
    steps.push('You will be notified when a replacement worker accepts.');
  } else if (workflowStatus === 'pending_provider_approval') {
    steps.push('Manual intervention required to find replacement worker.');
    steps.push('Use the Find Replacement endpoint to search for available workers.');
  } else {
    steps.push('No automatic replacement workflow started.');
    steps.push('To find a replacement, use POST /api/v1/workers/find-replacements');
  }
  
  if (noticeHours < 4) {
    steps.push('⚠️ Short notice cancellation - immediate action recommended.');
  } else if (noticeHours < 24) {
    steps.push('ℹ️ Less than 24 hours notice - prioritize finding replacement.');
  }
  
  steps.push(`Participant ${shift.participantName} should be notified of the cancellation.`);
  
  return steps.join(' ');
}

/**
 * Get shift events for a shift reference
 */
export async function getShiftEvents(
  shiftReferenceId: mongoose.Types.ObjectId,
  providerId: mongoose.Types.ObjectId
): Promise<any[]> {
  return ShiftEvent.find({
    shiftReferenceId,
    providerId
  }).sort({ eventTimestamp: -1 });
}

