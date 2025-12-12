/**
 * Replacement Finder Service
 * Finds suitable replacement workers for cancelled shifts
 */

import mongoose from 'mongoose';
import moment from 'moment';
import ShiftReference, { IShiftReference } from '../models/shiftReference.model';
import WorkerRegistry from '../models/workerRegistry.model';
import User from '../models/user.model';
import Shift from '../models/shift.model';
import { UserRole } from '../types/user.types';
import {
  FindReplacementInput,
  ReplacementCandidate,
  MatchBreakdown,
  ShiftReferenceStatus
} from '../types/roster.types';
import logger from '../utils/logger';

/**
 * Default preferences for replacement finding
 */
const DEFAULT_PREFERENCES = {
  maxDistanceKm: 20,
  minReliabilityScore: 0.70,
  preferPastExperience: true,
  requireAllCompetencies: true
};

/**
 * Find replacement workers for a cancelled shift
 */
export async function findReplacementWorkers(
  providerId: mongoose.Types.ObjectId,
  input: FindReplacementInput
): Promise<ReplacementCandidate[]> {
  const preferences = {
    ...DEFAULT_PREFERENCES,
    ...input.preferences
  };
  const limit = input.limit || 10;
  
  try {
    // Get the shift reference
    const shift = await ShiftReference.findOne({
      _id: input.shiftReferenceId,
      providerId
    });
    
    if (!shift) {
      throw new Error('Shift reference not found');
    }
    
    // Get the shift datetime
    const shiftDateTime = combineDateAndTime(shift.shiftDate, shift.shiftStartTime);
    const shiftEndDateTime = combineDateAndTime(shift.shiftDate, shift.shiftEndTime);
    
    // Build base query for platform workers
    const workerQuery: any = {
      role: UserRole.SUPPORT_WORKER,
      status: 'active'
    };
    
    // Exclude specific workers
    if (preferences.excludeWorkerIds && preferences.excludeWorkerIds.length > 0) {
      workerQuery._id = {
        $nin: preferences.excludeWorkerIds.map(id => new mongoose.Types.ObjectId(id))
      };
    }
    
    // Find potential workers from platform
    const platformWorkers = await User.find(workerQuery)
      .select('firstName lastName email phone skills verificationStatus organizations baseLocation travelRadiusKm')
      .limit(100); // Get more than needed for filtering
    
    // Find potential workers from registry (matched with platform users)
    const registryWorkers = await WorkerRegistry.find({
      providerId,
      status: 'matched',
      matchedUserId: { $exists: true, $ne: null }
    }).populate('matchedUserId', 'firstName lastName email phone skills baseLocation travelRadiusKm');
    
    // Score and rank candidates
    const candidates: ReplacementCandidate[] = [];
    
    // Process platform workers
    for (const worker of platformWorkers) {
      const candidate = await scoreCandidate(
        worker,
        shift,
        shiftDateTime,
        shiftEndDateTime,
        preferences,
        providerId
      );
      
      if (candidate && candidate.matchScore >= preferences.minReliabilityScore) {
        candidates.push(candidate);
      }
    }
    
    // Process registry workers with matched users
    for (const regWorker of registryWorkers) {
      if (regWorker.matchedUserId) {
        const matchedUser = regWorker.matchedUserId as any;
        
        // Check if already processed
        if (candidates.find(c => c.workerId === matchedUser._id.toString())) {
          continue;
        }
        
        const candidate = await scoreCandidate(
          matchedUser,
          shift,
          shiftDateTime,
          shiftEndDateTime,
          preferences,
          providerId,
          regWorker
        );
        
        if (candidate && candidate.matchScore >= preferences.minReliabilityScore) {
          candidates.push(candidate);
        }
      }
    }
    
    // Sort by match score descending
    candidates.sort((a, b) => b.matchScore - a.matchScore);
    
    // Return top candidates
    return candidates.slice(0, limit);
    
  } catch (error) {
    logger.error('Error finding replacement workers:', error);
    throw error;
  }
}

/**
 * Score a candidate worker for the shift
 */
async function scoreCandidate(
  worker: any,
  shift: IShiftReference,
  shiftDateTime: Date,
  shiftEndDateTime: Date,
  preferences: typeof DEFAULT_PREFERENCES & { excludeWorkerIds?: string[] },
  providerId: mongoose.Types.ObjectId,
  registryEntry?: any
): Promise<ReplacementCandidate | null> {
  try {
    const breakdown: MatchBreakdown = {
      competencies: 0,
      location: 0,
      availability: 0,
      pastExperience: 0,
      reliability: 0
    };
    
    // 1. Score competencies (0-1)
    breakdown.competencies = scoreCompetencies(
      worker.skills || [],
      shift.requiredCompetencies,
      preferences.requireAllCompetencies
    );
    
    // If competencies don't match and required, skip
    if (preferences.requireAllCompetencies && breakdown.competencies < 0.5) {
      return null;
    }
    
    // 2. Score location (0-1)
    const locationResult = await scoreLocation(
      worker.baseLocation,
      shift.locationGeoJSON || shift.locationPostcode,
      worker.travelRadiusKm || preferences.maxDistanceKm
    );
    breakdown.location = locationResult.score;
    
    // 3. Score availability (0-1)
    const availabilityResult = await scoreAvailability(
      worker._id,
      shiftDateTime,
      shiftEndDateTime
    );
    breakdown.availability = availabilityResult.score;
    
    // If not available, skip
    if (!availabilityResult.isAvailable) {
      return null;
    }
    
    // 4. Score past experience (0-1)
    const experienceResult = await scorePastExperience(
      worker._id,
      shift.participantId || shift.participantName,
      providerId
    );
    breakdown.pastExperience = experienceResult.score;
    
    // 5. Score reliability (0-1)
    const reliabilityResult = scoreReliability(worker, registryEntry);
    breakdown.reliability = reliabilityResult.score;
    
    // Calculate overall score (weighted average)
    const weights = {
      competencies: 0.25,
      location: 0.20,
      availability: 0.20,
      pastExperience: preferences.preferPastExperience ? 0.20 : 0.10,
      reliability: preferences.preferPastExperience ? 0.15 : 0.25
    };
    
    const matchScore = 
      breakdown.competencies * weights.competencies +
      breakdown.location * weights.location +
      breakdown.availability * weights.availability +
      breakdown.pastExperience * weights.pastExperience +
      breakdown.reliability * weights.reliability;
    
    // Generate recommendation text
    const recommendation = generateRecommendation(
      breakdown,
      experienceResult,
      locationResult
    );
    
    return {
      workerId: worker._id.toString(),
      workerName: `${worker.firstName} ${worker.lastName}`,
      phone: worker.phone,
      email: worker.email,
      matchScore: Math.round(matchScore * 100) / 100,
      matchBreakdown: breakdown,
      details: {
        distanceKm: locationResult.distanceKm,
        hasWorkedWithParticipant: experienceResult.hasWorkedWithParticipant,
        pastShiftsWithParticipant: experienceResult.pastShifts,
        lastShiftWithParticipant: experienceResult.lastShift,
        competencies: worker.skills?.map((s: any) => s.toString()) || [],
        isAvailable: availabilityResult.isAvailable,
        conflictingShifts: availabilityResult.conflictingShifts,
        reliabilityScore: reliabilityResult.score,
        totalShiftsCompleted: reliabilityResult.totalCompleted,
        totalShiftsCancelled: reliabilityResult.totalCancelled
      },
      recommendation
    };
    
  } catch (error) {
    logger.error(`Error scoring candidate ${worker._id}:`, error);
    return null;
  }
}

/**
 * Score competencies match
 */
function scoreCompetencies(
  workerSkills: any[],
  requiredCompetencies: string[],
  requireAll: boolean
): number {
  if (!requiredCompetencies || requiredCompetencies.length === 0) {
    return 1.0; // No requirements = full score
  }
  
  const workerSkillStrings = workerSkills.map(s => s.toString().toLowerCase());
  const requiredLower = requiredCompetencies.map(c => c.toLowerCase());
  
  let matchCount = 0;
  for (const req of requiredLower) {
    if (workerSkillStrings.some(s => s.includes(req) || req.includes(s))) {
      matchCount++;
    }
  }
  
  const matchRatio = matchCount / requiredLower.length;
  
  if (requireAll) {
    return matchRatio >= 1.0 ? 1.0 : matchRatio * 0.5;
  }
  
  return matchRatio;
}

/**
 * Score location proximity
 */
async function scoreLocation(
  workerLocation: any,
  shiftLocation: any,
  _maxDistanceKm: number // Placeholder for future GeoJSON distance calculation
): Promise<{ score: number; distanceKm?: number }> {
  // If no location data, return neutral score
  if (!workerLocation || !shiftLocation) {
    return { score: 0.5 };
  }
  
  // TODO: Implement actual distance calculation using GeoJSON
  // For now, return a placeholder based on postcode matching
  
  if (typeof shiftLocation === 'string') {
    // Postcode-based matching
    return { score: 0.7, distanceKm: 10 };
  }
  
  // GeoJSON-based matching would go here
  return { score: 0.6, distanceKm: 15 };
}

/**
 * Score availability (check for conflicting shifts)
 */
async function scoreAvailability(
  workerId: mongoose.Types.ObjectId,
  shiftStart: Date,
  shiftEnd: Date
): Promise<{ score: number; isAvailable: boolean; conflictingShifts: string[] }> {
  // Check for conflicting shifts in the main Shift collection
  const conflictingShifts = await Shift.find({
    workerId,
    status: { $in: ['pending', 'confirmed', 'inProgress'] },
    $or: [
      // Shift starts during our shift
      { startTime: { $gte: shiftStart, $lt: shiftEnd } },
      // Shift ends during our shift
      { endTime: { $gt: shiftStart, $lte: shiftEnd } },
      // Shift encompasses our shift
      { startTime: { $lte: shiftStart }, endTime: { $gte: shiftEnd } }
    ]
  }).select('_id shiftId');
  
  // Also check ShiftReference collection
  const conflictingReferences = await ShiftReference.find({
    $or: [
      { assignedWorkerId: workerId },
      { replacementWorkerId: workerId }
    ],
    currentStatus: { $in: [ShiftReferenceStatus.SCHEDULED, ShiftReferenceStatus.CONFIRMED] },
    shiftDate: {
      $gte: moment(shiftStart).startOf('day').toDate(),
      $lte: moment(shiftEnd).endOf('day').toDate()
    }
  }).select('_id');
  
  const conflictIds = [
    ...conflictingShifts.map(s => s.shiftId || s._id.toString()),
    ...conflictingReferences.map(r => r._id.toString())
  ];
  
  const isAvailable = conflictIds.length === 0;
  
  return {
    score: isAvailable ? 1.0 : 0.0,
    isAvailable,
    conflictingShifts: conflictIds
  };
}

/**
 * Score past experience with participant
 */
async function scorePastExperience(
  workerId: mongoose.Types.ObjectId,
  participantRef: mongoose.Types.ObjectId | string | undefined,
  providerId: mongoose.Types.ObjectId
): Promise<{
  score: number;
  hasWorkedWithParticipant: boolean;
  pastShifts: number;
  lastShift?: string;
}> {
  if (!participantRef) {
    return { score: 0.5, hasWorkedWithParticipant: false, pastShifts: 0 };
  }
  
  // Check past shifts in main Shift collection
  const pastShiftQuery: any = {
    workerId,
    status: 'completed'
  };
  
  if (mongoose.Types.ObjectId.isValid(participantRef.toString())) {
    pastShiftQuery.participantId = participantRef;
  }
  
  const pastShifts = await Shift.find(pastShiftQuery)
    .sort({ endTime: -1 })
    .limit(10)
    .select('shiftId endTime');
  
  // Also check ShiftReference collection
  const pastReferences = await ShiftReference.find({
    $or: [
      { assignedWorkerId: workerId },
      { replacementWorkerId: workerId }
    ],
    currentStatus: ShiftReferenceStatus.COMPLETED,
    providerId
  }).sort({ shiftDate: -1 }).limit(10);
  
  const totalPastShifts = pastShifts.length + pastReferences.length;
  const hasWorkedWithParticipant = totalPastShifts > 0;
  
  let lastShift: string | undefined;
  if (pastShifts.length > 0) {
    lastShift = moment(pastShifts[0].endTime).format('YYYY-MM-DD');
  } else if (pastReferences.length > 0) {
    lastShift = moment(pastReferences[0].shiftDate).format('YYYY-MM-DD');
  }
  
  // Score based on past experience
  let score = 0.5; // Base score
  if (totalPastShifts >= 10) score = 1.0;
  else if (totalPastShifts >= 5) score = 0.9;
  else if (totalPastShifts >= 3) score = 0.8;
  else if (totalPastShifts >= 1) score = 0.7;
  
  return {
    score,
    hasWorkedWithParticipant,
    pastShifts: totalPastShifts,
    lastShift
  };
}

/**
 * Score reliability based on past performance
 */
function scoreReliability(
  _worker: any, // Placeholder for future worker-based reliability scoring
  registryEntry?: any
): { score: number; totalCompleted: number; totalCancelled: number } {
  let totalCompleted = 0;
  let totalCancelled = 0;
  
  // Get stats from registry entry if available
  if (registryEntry) {
    totalCompleted = registryEntry.totalShiftsAssigned - registryEntry.totalShiftsCancelled;
    totalCancelled = registryEntry.totalShiftsCancelled;
  }
  
  // Calculate reliability score
  const total = totalCompleted + totalCancelled;
  if (total === 0) {
    return { score: 0.7, totalCompleted: 0, totalCancelled: 0 }; // New worker, neutral score
  }
  
  const reliabilityRatio = totalCompleted / total;
  
  return {
    score: reliabilityRatio,
    totalCompleted,
    totalCancelled
  };
}

/**
 * Generate human-readable recommendation
 */
function generateRecommendation(
  breakdown: MatchBreakdown,
  experienceResult: { hasWorkedWithParticipant: boolean; pastShifts: number },
  locationResult: { distanceKm?: number }
): string {
  const parts: string[] = [];
  
  // Highlight strengths
  if (breakdown.competencies >= 0.9) {
    parts.push('Excellent skill match');
  } else if (breakdown.competencies >= 0.7) {
    parts.push('Good skill match');
  }
  
  if (experienceResult.hasWorkedWithParticipant) {
    parts.push(`Has worked with participant ${experienceResult.pastShifts} times before`);
  }
  
  if (locationResult.distanceKm && locationResult.distanceKm < 10) {
    parts.push(`Close proximity (${locationResult.distanceKm}km)`);
  }
  
  if (breakdown.reliability >= 0.9) {
    parts.push('Highly reliable');
  }
  
  // Add any concerns
  if (breakdown.reliability < 0.7) {
    parts.push('Note: Below average reliability');
  }
  
  if (parts.length === 0) {
    return 'Suitable candidate based on availability';
  }
  
  return parts.join('. ') + '.';
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

