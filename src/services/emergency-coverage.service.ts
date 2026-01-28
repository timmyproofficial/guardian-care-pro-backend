/**
 * Emergency Coverage Service
 * Implements automated shift coverage workflow based on provider rules
 */

import mongoose from 'mongoose';
import ShiftReference, { IShiftReference } from '../models/shiftReference.model';
import ShiftEvent from '../models/shiftEvent.model';
import WorkerRegistry from '../models/workerRegistry.model';
import User from '../models/user.model';
import SupportWorker from '../models/worker.model';
import {
  ShiftEventType,
  EventTriggerSource,
  ResolutionStatus,
  ShiftReferenceStatus,
  WorkerPriorityCriteria
} from '../types/roster.types';
import {
  getProviderCoverageRules,
  checkAutoApprovalCriteria,
  checkManualApprovalRequired,
  getWorkerPriorityOrder,
  getEscalationSettings,
  getCommunicationSettings
} from './provider-coverage.service';
import logger from '../utils/logger';

/**
 * Coverage request interface
 */
export interface CoverageRequest {
  shiftReferenceId: string;
  providerId: string;
  noticeHours: number;
  isEmergency?: boolean;
}

/**
 * Worker ranking result
 */
export interface WorkerRanking {
  workerId: string;
  workerName: string;
  phone?: string;
  email?: string;
  rankingScore: number;
  rankingReason: string;
  autoApprovalEligible: boolean;
  distanceKm?: number;
  rating?: number;
  shiftsCompleted?: number;
}

/**
 * Coverage result
 */
export interface CoverageResult {
  success: boolean;
  message: string;
  coverageSecured?: boolean;
  assignedWorkerId?: string;
  assignedWorkerName?: string;
  autoApproved?: boolean;
  requiresManualApproval?: boolean;
  eventId?: string;
}

/**
 * Calculate worker ranking score based on provider priority criteria
 */
async function calculateWorkerRanking(
  worker: any,
  shift: IShiftReference,
  providerId: string,
  priorityOrder: WorkerPriorityCriteria[]
): Promise<{ score: number; reason: string }> {
  let score = 0;
  let reasons: string[] = [];

  for (const criteria of priorityOrder) {
    switch (criteria) {
      case WorkerPriorityCriteria.WORKED_EXACT_SHIFT:
        // Check if worker worked this exact shift before
        const exactShiftCount = await ShiftReference.countDocuments({
          providerId,
          assignedWorkerId: worker._id || worker.matchedUserId,
          shiftStartTime: shift.shiftStartTime,
          shiftEndTime: shift.shiftEndTime,
          participantId: shift.participantId,
          locationName: shift.locationName,
          currentStatus: ShiftReferenceStatus.COMPLETED
        });
        if (exactShiftCount > 0) {
          score += 100;
          reasons.push(`Worked this exact shift ${exactShiftCount} times`);
        }
        break;

      case WorkerPriorityCriteria.WORKED_SAME_LOCATION:
        // Check if worker worked at this location before
        const locationCount = await ShiftReference.countDocuments({
          providerId,
          assignedWorkerId: worker._id || worker.matchedUserId,
          locationName: shift.locationName,
          currentStatus: ShiftReferenceStatus.COMPLETED
        });
        if (locationCount > 0) {
          score += 50;
          reasons.push(`Worked at this location ${locationCount} times`);
        }
        break;

      case WorkerPriorityCriteria.HIGHEST_RATING:
        if (worker.rating) {
          score += worker.rating * 10;
          reasons.push(`Rating: ${worker.rating}★`);
        }
        break;

      case WorkerPriorityCriteria.CLOSEST_DISTANCE:
        if (worker.distanceKm !== undefined) {
          // Closer distance = higher score (inverse relationship)
          score += Math.max(0, 20 - worker.distanceKm);
          reasons.push(`${worker.distanceKm}km away`);
        }
        break;

      case WorkerPriorityCriteria.MOST_RECENT_SHIFT:
        if (worker.lastShiftDate) {
          const daysSince = (Date.now() - worker.lastShiftDate.getTime()) / (1000 * 60 * 60 * 24);
          score += Math.max(0, 30 - daysSince); // Recent = higher score
          reasons.push(`Last shift ${Math.round(daysSince)} days ago`);
        }
        break;

      case WorkerPriorityCriteria.LONGEST_TIME_SINCE_SHIFT:
        if (worker.lastShiftDate) {
          const daysSince = (Date.now() - worker.lastShiftDate.getTime()) / (1000 * 60 * 60 * 24);
          score += daysSince; // Longer time since shift = higher score
          reasons.push(`No shift for ${Math.round(daysSince)} days`);
        }
        break;
    }
  }

  return {
    score: Math.round(score * 100) / 100,
    reason: reasons.join(', ')
  };
}

/**
 * Find and rank eligible workers for shift coverage
 */
async function findEligibleWorkers(
  shift: IShiftReference,
  providerId: string,
  limit: number = 10
): Promise<WorkerRanking[]> {
  // Get all workers from registry for this provider
  const registryWorkers = await WorkerRegistry.find({
    providerId,
    status: { $ne: 'inactive' }
  });

  // Get priority order from provider settings
  const priorityOrder = await getWorkerPriorityOrder(providerId);

  // Calculate rankings and eligibility
  const workerRankings: WorkerRanking[] = [];

  for (const worker of registryWorkers) {
    // Check if worker has required competencies
    const hasRequiredCompetencies = shift.requiredCompetencies.length === 0 ||
      shift.requiredCompetencies.some(comp => worker.competencies.includes(comp));

    if (!hasRequiredCompetencies) {
      continue; // Skip workers without required competencies
    }

    // Get worker rating and other details (would need to be populated from User model if available)
    let workerDetails: any = {
      _id: worker._id,
      workerName: worker.workerName,
      phone: worker.phone,
      email: worker.email,
      rating: 4.5, // Default rating, would come from User model
      totalShiftsAssigned: worker.totalShiftsAssigned,
      lastShiftDate: worker.lastShiftDate
    };

    // If worker is matched to a User account, get additional details
    if (worker.matchedUserId) {
      const supportWorker = await SupportWorker.findById(worker.matchedUserId).select('ratings.average');
      if (supportWorker && supportWorker.ratings?.average) {
        workerDetails.rating = supportWorker.ratings.average;
      }
    }

    // Calculate ranking
    const ranking = await calculateWorkerRanking(workerDetails, shift, providerId, priorityOrder);

    // Check auto-approval eligibility (simplified - would need more worker data)
    const autoApprovalEligible = await checkAutoApprovalCriteria(
      providerId,
      workerDetails.rating,
      worker.competencies.length > 0, // Simplified experience check
      false, // Location experience - would need to check past shifts
      10, // Default distance - would need geolocation calculation
      true, // Assume credentials valid
      30, // Accept time
      false // Not emergency for now
    );

    workerRankings.push({
      workerId: worker._id.toString(),
      workerName: worker.workerName,
      phone: worker.phone,
      email: worker.email,
      rankingScore: ranking.score,
      rankingReason: ranking.reason,
      autoApprovalEligible
    });
  }

  // Sort by ranking score (highest first)
  return workerRankings
    .sort((a, b) => b.rankingScore - a.rankingScore)
    .slice(0, limit);
}

/**
 * Send shift offer to worker (placeholder - would integrate with notification service)
 */
async function sendShiftOffer(
  workerRanking: WorkerRanking,
  shift: IShiftReference,
  providerId: string
): Promise<void> {
  // Create shift offer event
  await ShiftEvent.create({
    shiftReferenceId: shift._id,
    providerId,
    eventType: ShiftEventType.SHIFT_OFFER_SENT,
    triggeredBy: EventTriggerSource.SYSTEM_AUTOMATION,
    eventPayload: {
      workerId: workerRanking.workerId,
      workerName: workerRanking.workerName,
      rankingScore: workerRanking.rankingScore,
      offerTimestamp: new Date()
    },
    resolutionStatus: ResolutionStatus.PENDING
  });

  // TODO: Integrate with SMS/WhatsApp notification service
  logger.info('Shift offer sent', {
    workerId: workerRanking.workerId,
    workerName: workerRanking.workerName,
    shiftId: shift._id
  });
}

/**
 * Process emergency shift coverage
 */
export async function processEmergencyCoverage(request: CoverageRequest): Promise<CoverageResult> {
  try {
    // Get the cancelled shift
    const shift = await ShiftReference.findById(request.shiftReferenceId);
    if (!shift) {
      return {
        success: false,
        message: 'Shift not found'
      };
    }

    // Create coverage needed event
    const coverageEvent = await ShiftEvent.create({
      shiftReferenceId: shift._id,
      providerId: request.providerId,
      eventType: ShiftEventType.COVERAGE_NEEDED,
      triggeredBy: EventTriggerSource.SYSTEM_AUTOMATION,
      eventPayload: {
        noticeHours: request.noticeHours,
        isEmergency: request.isEmergency,
        originalWorker: shift.assignedWorkerName,
        shiftDetails: {
          date: shift.shiftDate,
          startTime: shift.shiftStartTime,
          endTime: shift.shiftEndTime,
          location: shift.locationName,
          participant: shift.participantName
        }
      },
      resolutionStatus: ResolutionStatus.PENDING
    });

    // Find and rank eligible workers
    const eligibleWorkers = await findEligibleWorkers(shift, request.providerId, 8);

    if (eligibleWorkers.length === 0) {
      await ShiftEvent.findByIdAndUpdate(coverageEvent._id, {
        resolutionStatus: ResolutionStatus.FAILED,
        resolutionNotes: 'No eligible workers found'
      });

      return {
        success: false,
        message: 'No eligible workers found for shift coverage',
        eventId: coverageEvent._id.toString()
      };
    }

    // Create workers ranked event
    await ShiftEvent.create({
      shiftReferenceId: shift._id,
      providerId: request.providerId,
      eventType: ShiftEventType.WORKERS_RANKED,
      triggeredBy: EventTriggerSource.SYSTEM_AUTOMATION,
      eventPayload: {
        workerCount: eligibleWorkers.length,
        topWorkers: eligibleWorkers.slice(0, 3).map(w => ({
          workerId: w.workerId,
          workerName: w.workerName,
          rankingScore: w.rankingScore,
          autoApprovalEligible: w.autoApprovalEligible
        }))
      }
    });

    // Send offers to top 3 workers simultaneously
    const topWorkers = eligibleWorkers.slice(0, 3);
    const offerPromises = topWorkers.map(worker => sendShiftOffer(worker, shift, request.providerId));

    await Promise.all(offerPromises);

    // For now, simulate the workflow - in production this would be event-driven
    // Worker responses would come via SMS replies, app interactions, etc.

    logger.info('Emergency coverage process initiated', {
      shiftId: request.shiftReferenceId,
      providerId: request.providerId,
      eligibleWorkers: eligibleWorkers.length,
      topWorkersCount: topWorkers.length
    });

    return {
      success: true,
      message: `Coverage process initiated. Offers sent to ${topWorkers.length} top-ranked workers.`,
      eventId: coverageEvent._id.toString()
    };

  } catch (error) {
    logger.error('Error processing emergency coverage:', error);
    throw error;
  }
}

/**
 * Handle worker response to shift offer
 */
export async function handleWorkerOfferResponse(
  shiftId: string,
  workerId: string,
  accepted: boolean,
  responseTimeMinutes: number = 0
): Promise<CoverageResult> {
  try {
    const shift = await ShiftReference.findById(shiftId);
    if (!shift) {
      return {
        success: false,
        message: 'Shift not found'
      };
    }

    const eventType = accepted ? ShiftEventType.SHIFT_OFFER_ACCEPTED : ShiftEventType.SHIFT_OFFER_DECLINED;

    await ShiftEvent.create({
      shiftReferenceId: shift._id,
      providerId: shift.providerId,
      eventType,
      triggeredBy: EventTriggerSource.WORKER_PORTAL,
      eventPayload: {
        workerId,
        responseTimeMinutes,
        accepted
      }
    });

    if (!accepted) {
      return {
        success: true,
        message: 'Worker declined the shift offer',
        coverageSecured: false
      };
    }

    // Worker accepted - check auto-approval
    const workerRegistry = await WorkerRegistry.findById(workerId);
    if (!workerRegistry) {
      return {
        success: false,
        message: 'Worker not found in registry'
      };
    }

    // Get worker rating (simplified)
    let workerRating = 4.5;
    if (workerRegistry.matchedUserId) {
      const supportWorker = await SupportWorker.findById(workerRegistry.matchedUserId).select('ratings.average');
      workerRating = supportWorker?.ratings?.average || 4.5;
    }

    // Check if auto-approval is possible
    const autoApprovalEligible = await checkAutoApprovalCriteria(
      shift.providerId.toString(),
      workerRating,
      workerRegistry.competencies.length > 0,
      false, // Would need to check location history
      10, // Would need geolocation
      true,
      responseTimeMinutes,
      false // Not treating as emergency for now
    );

    if (autoApprovalEligible) {
      // Auto-approve and assign
      shift.assignedWorkerId = workerRegistry.matchedUserId || workerRegistry._id;
      shift.assignedWorkerName = workerRegistry.workerName;
      shift.assignedWorkerPhone = workerRegistry.phone;
      shift.assignedWorkerEmail = workerRegistry.email;
      shift.currentStatus = ShiftReferenceStatus.CONFIRMED;
      shift.statusUpdatedAt = new Date();

      await shift.save();

      // Update worker registry
      await WorkerRegistry.findByIdAndUpdate(workerId, {
        $inc: { totalShiftsAssigned: 1 }
      });

      // Create events
      await ShiftEvent.create({
        shiftReferenceId: shift._id,
        providerId: shift.providerId,
        eventType: ShiftEventType.AUTO_APPROVED,
        triggeredBy: EventTriggerSource.SYSTEM_AUTOMATION,
        eventPayload: {
          workerId,
          workerRating,
          autoApprovalEligible: true
        },
        resolutionStatus: ResolutionStatus.RESOLVED
      });

      await ShiftEvent.create({
        shiftReferenceId: shift._id,
        providerId: shift.providerId,
        eventType: ShiftEventType.COVERAGE_SECURED,
        triggeredBy: EventTriggerSource.SYSTEM_AUTOMATION,
        eventPayload: {
          assignedWorkerId: workerId,
          assignedWorkerName: workerRegistry.workerName,
          autoApproved: true
        },
        resolutionStatus: ResolutionStatus.RESOLVED
      });

      return {
        success: true,
        message: 'Shift automatically assigned and confirmed',
        coverageSecured: true,
        assignedWorkerId: workerId,
        assignedWorkerName: workerRegistry.workerName,
        autoApproved: true
      };
    } else {
      // Requires manual approval
      await ShiftEvent.create({
        shiftReferenceId: shift._id,
        providerId: shift.providerId,
        eventType: ShiftEventType.MANUAL_REVIEW_REQUESTED,
        triggeredBy: EventTriggerSource.SYSTEM_AUTOMATION,
        eventPayload: {
          workerId,
          workerRating,
          autoApprovalEligible: false,
          reason: 'Worker does not meet auto-approval criteria'
        },
        resolutionStatus: ResolutionStatus.PENDING
      });

      return {
        success: true,
        message: 'Worker accepted shift but requires manual approval',
        coverageSecured: false,
        assignedWorkerId: workerId,
        assignedWorkerName: workerRegistry.workerName,
        requiresManualApproval: true
      };
    }

  } catch (error) {
    logger.error('Error handling worker offer response:', error);
    throw error;
  }
}

/**
 * Provider manual override of coverage decision
 */
export async function providerCoverageOverride(
  shiftId: string,
  providerId: string,
  decision: 'approve' | 'reject' | 'reassign',
  workerId?: string,
  notes?: string
): Promise<CoverageResult> {
  try {
    const shift = await ShiftReference.findById(shiftId);
    if (!shift || shift.providerId.toString() !== providerId) {
      return {
        success: false,
        message: 'Shift not found or access denied'
      };
    }

    await ShiftEvent.create({
      shiftReferenceId: shift._id,
      providerId,
      eventType: ShiftEventType.PROVIDER_OVERRIDE,
      triggeredBy: EventTriggerSource.PROVIDER_PORTAL,
      eventPayload: {
        decision,
        workerId,
        notes,
        overrideTimestamp: new Date()
      },
      resolutionStatus: ResolutionStatus.RESOLVED
    });

    if (decision === 'approve' && workerId) {
      const workerRegistry = await WorkerRegistry.findById(workerId);
      if (workerRegistry) {
        shift.assignedWorkerId = workerRegistry.matchedUserId || workerRegistry._id;
        shift.assignedWorkerName = workerRegistry.workerName;
        shift.assignedWorkerPhone = workerRegistry.phone;
        shift.assignedWorkerEmail = workerRegistry.email;
        shift.currentStatus = ShiftReferenceStatus.CONFIRMED;
        shift.statusUpdatedAt = new Date();

        await shift.save();

        await WorkerRegistry.findByIdAndUpdate(workerId, {
          $inc: { totalShiftsAssigned: 1 }
        });

        await ShiftEvent.create({
          shiftReferenceId: shift._id,
          providerId,
          eventType: ShiftEventType.COVERAGE_SECURED,
          triggeredBy: EventTriggerSource.PROVIDER_PORTAL,
          eventPayload: {
            assignedWorkerId: workerId,
            assignedWorkerName: workerRegistry.workerName,
            providerOverride: true
          },
          resolutionStatus: ResolutionStatus.RESOLVED
        });

        return {
          success: true,
          message: 'Shift coverage approved and secured',
          coverageSecured: true,
          assignedWorkerId: workerId,
          assignedWorkerName: workerRegistry.workerName
        };
      }
    }

    return {
      success: true,
      message: `Provider override processed: ${decision}`,
      coverageSecured: decision === 'approve'
    };

  } catch (error) {
    logger.error('Error processing provider override:', error);
    throw error;
  }
}