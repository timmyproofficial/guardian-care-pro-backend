/**
 * Roster Matching Service
 * Handles matching and auto-creation of workers and participants from roster data
 */

import mongoose from 'mongoose';
import WorkerRegistry, { IWorkerRegistry } from '../models/workerRegistry.model';
import ParticipantRegistry, { IParticipantRegistry } from '../models/participantRegistry.model';
import User from '../models/user.model';
import { UserRole } from '../types/user.types';
import { RegistryStatus, ParsedShiftRow } from '../types/roster.types';
import logger from '../utils/logger';

/**
 * Match result for worker/participant
 */
interface MatchResult {
  registryId: mongoose.Types.ObjectId;
  matchedUserId?: mongoose.Types.ObjectId;
  isNew: boolean;
  matchConfidence: number;
  status: RegistryStatus;
}

/**
 * Find or create a worker registry entry
 */
export async function findOrCreateWorker(
  providerId: mongoose.Types.ObjectId,
  snapshotId: mongoose.Types.ObjectId,
  workerData: {
    workerName: string;
    workerPhone?: string | null;
    workerEmail?: string | null;
    workerExternalId?: string;
  },
  autoCreate: boolean = true
): Promise<MatchResult | null> {
  const { workerName, workerPhone, workerEmail, workerExternalId } = workerData;
  
  if (!workerName) {
    return null;
  }
  
  try {
    // Build query conditions for matching
    const matchConditions: any[] = [];
    
    // Match by external ID (highest priority)
    if (workerExternalId) {
      matchConditions.push({
        providerId,
        externalWorkerId: workerExternalId
      });
    }
    
    // Match by phone
    if (workerPhone) {
      matchConditions.push({
        providerId,
        phone: workerPhone
      });
    }
    
    // Match by email
    if (workerEmail) {
      matchConditions.push({
        providerId,
        email: workerEmail.toLowerCase()
      });
    }
    
    // Match by exact name (lower priority)
    matchConditions.push({
      providerId,
      workerName: { $regex: new RegExp(`^${escapeRegex(workerName)}$`, 'i') }
    });
    
    // Try to find existing registry entry
    let existingWorker: IWorkerRegistry | null = null;
    
    for (const condition of matchConditions) {
      existingWorker = await WorkerRegistry.findOne(condition);
      if (existingWorker) break;
    }
    
    if (existingWorker) {
      // Update statistics
      await WorkerRegistry.findByIdAndUpdate(existingWorker._id, {
        $inc: { totalShiftsAssigned: 1 },
        $set: { lastShiftDate: new Date() }
      });
      
      return {
        registryId: existingWorker._id,
        matchedUserId: existingWorker.matchedUserId,
        isNew: false,
        matchConfidence: existingWorker.matchConfidence || 0.9,
        status: existingWorker.status
      };
    }
    
    // Try to match with existing platform user
    let matchedUser: any = null;
    let matchConfidence = 0;
    
    if (workerPhone) {
      matchedUser = await User.findOne({
        phone: workerPhone,
        role: UserRole.SUPPORT_WORKER
      });
      if (matchedUser) matchConfidence = 0.95;
    }
    
    if (!matchedUser && workerEmail) {
      matchedUser = await User.findOne({
        email: workerEmail.toLowerCase(),
        role: UserRole.SUPPORT_WORKER
      });
      if (matchedUser) matchConfidence = 0.9;
    }
    
    // Create new registry entry if auto-create is enabled
    if (!autoCreate) {
      return null;
    }
    
    const newWorker = await WorkerRegistry.create({
      providerId,
      workerName,
      phone: workerPhone || undefined,
      email: workerEmail?.toLowerCase() || undefined,
      externalWorkerId: workerExternalId || undefined,
      matchedUserId: matchedUser?._id,
      status: matchedUser ? RegistryStatus.MATCHED : RegistryStatus.LIGHTWEIGHT,
      matchConfidence: matchedUser ? matchConfidence : undefined,
      totalShiftsAssigned: 1,
      lastShiftDate: new Date(),
      firstSeenInSnapshot: snapshotId,
      firstSeenDate: new Date()
    });
    
    logger.info(`Created new worker registry entry: ${newWorker._id} for ${workerName}`);
    
    return {
      registryId: newWorker._id,
      matchedUserId: matchedUser?._id,
      isNew: true,
      matchConfidence: matchedUser ? matchConfidence : 0.5,
      status: newWorker.status
    };
    
  } catch (error) {
    logger.error('Error finding/creating worker:', error);
    throw error;
  }
}

/**
 * Find or create a participant registry entry
 */
export async function findOrCreateParticipant(
  providerId: mongoose.Types.ObjectId,
  snapshotId: mongoose.Types.ObjectId,
  participantData: {
    participantName: string;
    participantPhone?: string | null;
    participantNdis?: string;
    participantExternalId?: string;
    address?: string;
    postcode?: string;
  },
  autoCreate: boolean = true
): Promise<MatchResult | null> {
  const {
    participantName,
    participantPhone,
    participantNdis,
    participantExternalId,
    address,
    postcode
  } = participantData;
  
  if (!participantName) {
    return null;
  }
  
  try {
    // Build query conditions for matching
    const matchConditions: any[] = [];
    
    // Match by external ID (highest priority)
    if (participantExternalId) {
      matchConditions.push({
        providerId,
        externalParticipantId: participantExternalId
      });
    }
    
    // Match by NDIS number (high priority)
    if (participantNdis) {
      matchConditions.push({
        providerId,
        ndisNumber: participantNdis
      });
    }
    
    // Match by phone
    if (participantPhone) {
      matchConditions.push({
        providerId,
        phone: participantPhone
      });
    }
    
    // Match by exact name
    matchConditions.push({
      providerId,
      participantName: { $regex: new RegExp(`^${escapeRegex(participantName)}$`, 'i') }
    });
    
    // Try to find existing registry entry
    let existingParticipant: IParticipantRegistry | null = null;
    
    for (const condition of matchConditions) {
      existingParticipant = await ParticipantRegistry.findOne(condition);
      if (existingParticipant) break;
    }
    
    if (existingParticipant) {
      // Update statistics
      await ParticipantRegistry.findByIdAndUpdate(existingParticipant._id, {
        $inc: { totalShiftsScheduled: 1 },
        $set: { lastShiftDate: new Date() }
      });
      
      return {
        registryId: existingParticipant._id,
        matchedUserId: existingParticipant.matchedUserId,
        isNew: false,
        matchConfidence: existingParticipant.matchConfidence || 0.9,
        status: existingParticipant.status
      };
    }
    
    // Try to match with existing platform user
    let matchedUser: any = null;
    let matchConfidence = 0;
    
    // Match by NDIS number in platform users
    if (participantNdis) {
      matchedUser = await User.findOne({
        role: UserRole.PARTICIPANT,
        ndisNumber: participantNdis
      });
      if (matchedUser) matchConfidence = 0.98;
    }
    
    // Create new registry entry if auto-create is enabled
    if (!autoCreate) {
      return null;
    }
    
    const newParticipant = await ParticipantRegistry.create({
      providerId,
      participantName,
      phone: participantPhone || undefined,
      ndisNumber: participantNdis || undefined,
      externalParticipantId: participantExternalId || undefined,
      matchedUserId: matchedUser?._id,
      status: matchedUser ? RegistryStatus.MATCHED : RegistryStatus.LIGHTWEIGHT,
      matchConfidence: matchedUser ? matchConfidence : undefined,
      address: address || undefined,
      postcode: postcode || undefined,
      totalShiftsScheduled: 1,
      lastShiftDate: new Date(),
      firstSeenInSnapshot: snapshotId,
      firstSeenDate: new Date()
    });
    
    logger.info(`Created new participant registry entry: ${newParticipant._id} for ${participantName}`);
    
    return {
      registryId: newParticipant._id,
      matchedUserId: matchedUser?._id,
      isNew: true,
      matchConfidence: matchedUser ? matchConfidence : 0.5,
      status: newParticipant.status
    };
    
  } catch (error) {
    logger.error('Error finding/creating participant:', error);
    throw error;
  }
}

/**
 * Process a parsed shift row and match/create worker and participant
 */
export async function processShiftMatching(
  providerId: mongoose.Types.ObjectId,
  snapshotId: mongoose.Types.ObjectId,
  parsedShift: ParsedShiftRow,
  settings: {
    autoCreateWorkers: boolean;
    autoCreateParticipants: boolean;
  }
): Promise<{
  workerMatch: MatchResult | null;
  participantMatch: MatchResult | null;
}> {
  // Match/create worker
  const workerMatch = await findOrCreateWorker(
    providerId,
    snapshotId,
    {
      workerName: parsedShift.workerName || '',
      workerPhone: parsedShift.workerPhone,
      workerEmail: parsedShift.workerEmail,
      workerExternalId: parsedShift.workerExternalId
    },
    settings.autoCreateWorkers
  );
  
  // Match/create participant
  const participantMatch = await findOrCreateParticipant(
    providerId,
    snapshotId,
    {
      participantName: parsedShift.participantName || '',
      participantPhone: parsedShift.participantPhone,
      participantNdis: parsedShift.participantNdis,
      participantExternalId: parsedShift.participantExternalId,
      address: parsedShift.locationAddress,
      postcode: parsedShift.locationPostcode
    },
    settings.autoCreateParticipants
  );
  
  return { workerMatch, participantMatch };
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get matching statistics for a snapshot
 */
export async function getMatchingStats(snapshotId: mongoose.Types.ObjectId): Promise<{
  newWorkersCreated: number;
  existingWorkersMatched: number;
  newParticipantsCreated: number;
  existingParticipantsMatched: number;
}> {
  const [workerStats, participantStats] = await Promise.all([
    WorkerRegistry.aggregate([
      { $match: { firstSeenInSnapshot: snapshotId } },
      { $group: { _id: null, count: { $sum: 1 } } }
    ]),
    ParticipantRegistry.aggregate([
      { $match: { firstSeenInSnapshot: snapshotId } },
      { $group: { _id: null, count: { $sum: 1 } } }
    ])
  ]);
  
  // These are rough estimates - actual tracking should be done during processing
  return {
    newWorkersCreated: workerStats[0]?.count || 0,
    existingWorkersMatched: 0, // Would need to track this during processing
    newParticipantsCreated: participantStats[0]?.count || 0,
    existingParticipantsMatched: 0
  };
}

