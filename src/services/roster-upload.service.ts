/**
 * Roster Upload Service
 * Handles roster file upload, parsing, and processing
 */

import mongoose from 'mongoose';
import RosterSnapshot, { IRosterSnapshot } from '../models/rosterSnapshot.model';
import ShiftReference from '../models/shiftReference.model';
import ParsingError, { PARSING_ERROR_TYPES } from '../models/parsingError.model';
import { IProvider } from '../models/provider.model';
import {
  ProcessingStatus,
  ShiftReferenceStatus,
  ParsedShiftRow
} from '../types/roster.types';
import {
  parseRoster,
  validateRosterFile,
  determineFileType,
  calculateDuration
} from '../utils/roster-parser';
import { processShiftMatching } from './roster-matching.service';
import logger from '../utils/logger';

/**
 * Processing result interface
 */
interface ProcessingResult {
  success: boolean;
  totalShiftsDetected: number;
  shiftsSuccessfullyParsed: number;
  shiftsFailedParsing: number;
  newWorkersCreated: number;
  newParticipantsCreated: number;
  existingWorkersMatched: number;
  existingParticipantsMatched: number;
  errors: string[];
}

/**
 * Create a roster snapshot record
 */
export async function createRosterSnapshot(
  providerId: mongoose.Types.ObjectId,
  uploadedBy: mongoose.Types.ObjectId,
  file: Express.Multer.File,
  options?: {
    rosterPeriodStart?: Date;
    rosterPeriodEnd?: Date;
    notes?: string;
  }
): Promise<IRosterSnapshot> {
  const fileType = determineFileType(file.originalname, file.mimetype);
  
  const snapshot = await RosterSnapshot.create({
    providerId,
    fileName: file.originalname,
    fileType,
    fileSizeBytes: file.size,
    fileStoragePath: file.path || `uploads/rosters/${Date.now()}_${file.originalname}`,
    processingStatus: ProcessingStatus.PENDING,
    uploadedBy,
    rosterPeriodStart: options?.rosterPeriodStart,
    rosterPeriodEnd: options?.rosterPeriodEnd,
    notes: options?.notes
  });
  
  logger.info(`Created roster snapshot: ${snapshot._id}`);
  return snapshot;
}

/**
 * Process a roster snapshot
 * This is the main processing function that parses the file and creates shift references
 */
export async function processRosterSnapshot(
  snapshotId: mongoose.Types.ObjectId,
  fileBuffer: Buffer,
  provider: IProvider
): Promise<ProcessingResult> {
  const session = await mongoose.startSession();
  
  try {
    // Update status to processing
    await RosterSnapshot.findByIdAndUpdate(snapshotId, {
      processingStatus: ProcessingStatus.PROCESSING,
      processingStartedAt: new Date()
    });
    
    // Get snapshot details
    const snapshot = await RosterSnapshot.findById(snapshotId);
    if (!snapshot) {
      throw new Error('Snapshot not found');
    }
    
    // Validate file
    const validation = validateRosterFile(
      fileBuffer,
      snapshot.fileName
    );
    
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
    
    // Parse the roster
    const parseResult = parseRoster(fileBuffer, validation.fileType!);
    
    logger.info(`Parsed roster: ${parseResult.successfulRows} successful, ${parseResult.failedRows} failed`);
    
    // Track statistics
    let newWorkersCreated = 0;
    let newParticipantsCreated = 0;
    let existingWorkersMatched = 0;
    let existingParticipantsMatched = 0;
    let shiftsCreated = 0;
    const processingErrors: string[] = [];
    
    // Process each parsed shift
    session.startTransaction();
    
    for (const parsedShift of parseResult.parsedShifts) {
      try {
        if (!parsedShift.isValid) {
          // Log parsing errors
          for (const error of parsedShift.validationErrors) {
            await ParsingError.create({
              snapshotId,
              rowNumber: parsedShift.rowNumber,
              errorType: PARSING_ERROR_TYPES.MISSING_REQUIRED_FIELD,
              errorMessage: error
            });
          }
          continue;
        }
        
        // Match or create worker and participant
        const matchResult = await processShiftMatching(
          snapshot.providerId,
          snapshotId,
          parsedShift,
          {
            autoCreateWorkers: provider.settings?.autoCreateWorkers ?? true,
            autoCreateParticipants: provider.settings?.autoCreateParticipants ?? true
          }
        );
        
        // Track matching statistics
        if (matchResult.workerMatch) {
          if (matchResult.workerMatch.isNew) {
            newWorkersCreated++;
          } else {
            existingWorkersMatched++;
          }
        }
        
        if (matchResult.participantMatch) {
          if (matchResult.participantMatch.isNew) {
            newParticipantsCreated++;
          } else {
            existingParticipantsMatched++;
          }
        }
        
        // Calculate shift duration
        const duration = parsedShift.shiftStartTime && parsedShift.shiftEndTime
          ? calculateDuration(parsedShift.shiftStartTime, parsedShift.shiftEndTime)
          : 0;
        
        // Create shift reference
        await ShiftReference.create({
          snapshotId,
          providerId: snapshot.providerId,
          shiftDate: parsedShift.shiftDate,
          shiftStartTime: parsedShift.shiftStartTime || '00:00',
          shiftEndTime: parsedShift.shiftEndTime || '00:00',
          shiftDurationMinutes: duration,
          assignedWorkerId: matchResult.workerMatch?.matchedUserId,
          assignedWorkerName: parsedShift.workerName || 'Unknown',
          assignedWorkerPhone: parsedShift.workerPhone || undefined,
          assignedWorkerEmail: parsedShift.workerEmail || undefined,
          participantId: matchResult.participantMatch?.matchedUserId,
          participantName: parsedShift.participantName || 'Unknown',
          participantPhone: parsedShift.participantPhone || undefined,
          participantNdisNumber: parsedShift.participantNdis || undefined,
          locationName: parsedShift.locationName || undefined,
          locationAddress: parsedShift.locationAddress || undefined,
          locationPostcode: parsedShift.locationPostcode || undefined,
          shiftType: parsedShift.shiftType || undefined,
          supportCategory: parsedShift.supportCategory || undefined,
          billingRate: parsedShift.billingRate || undefined,
          requiredCompetencies: parsedShift.requiredCompetencies || [],
          currentStatus: ShiftReferenceStatus.SCHEDULED,
          statusUpdatedAt: new Date(),
          parsingConfidenceScore: calculateConfidenceScore(parsedShift, matchResult),
          parsingWarnings: parsedShift.parsingWarnings
        });
        
        shiftsCreated++;
        
      } catch (shiftError) {
        const errorMessage = shiftError instanceof Error ? shiftError.message : 'Unknown error';
        processingErrors.push(`Row ${parsedShift.rowNumber}: ${errorMessage}`);
        
        await ParsingError.create({
          snapshotId,
          rowNumber: parsedShift.rowNumber,
          errorType: PARSING_ERROR_TYPES.GENERAL_PARSE_ERROR,
          errorMessage
        });
      }
    }
    
    // Log any parsing-level errors
    for (const error of parseResult.errors) {
      await ParsingError.create({
        snapshotId,
        rowNumber: error.rowNumber,
        columnName: error.columnName,
        rawValue: error.rawValue,
        errorType: error.errorType,
        errorMessage: error.errorMessage
      });
    }
    
    await session.commitTransaction();
    
    // Determine final status
    const finalStatus = parseResult.failedRows === 0 && processingErrors.length === 0
      ? ProcessingStatus.COMPLETED
      : parseResult.successfulRows === 0
        ? ProcessingStatus.FAILED
        : ProcessingStatus.PARTIALLY_COMPLETED;
    
    // Update snapshot with results
    await RosterSnapshot.findByIdAndUpdate(snapshotId, {
      processingStatus: finalStatus,
      processingCompletedAt: new Date(),
      totalShiftsDetected: parseResult.totalRows,
      shiftsSuccessfullyParsed: shiftsCreated,
      shiftsFailedParsing: parseResult.failedRows + processingErrors.length,
      newWorkersCreated,
      newParticipantsCreated,
      existingWorkersMatched,
      existingParticipantsMatched
    });
    
    // Update provider statistics
    await mongoose.model('User').findByIdAndUpdate(snapshot.providerId, {
      $inc: {
        totalRostersUploaded: 1,
        totalShiftsManaged: shiftsCreated
      },
      $set: { lastRosterUpload: new Date() }
    });
    
    logger.info(`Roster processing completed: ${shiftsCreated} shifts created`);
    
    return {
      success: finalStatus !== ProcessingStatus.FAILED,
      totalShiftsDetected: parseResult.totalRows,
      shiftsSuccessfullyParsed: shiftsCreated,
      shiftsFailedParsing: parseResult.failedRows + processingErrors.length,
      newWorkersCreated,
      newParticipantsCreated,
      existingWorkersMatched,
      existingParticipantsMatched,
      errors: processingErrors
    };
    
  } catch (error) {
    await session.abortTransaction();
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
    logger.error('Roster processing failed:', error);
    
    // Update snapshot with error
    await RosterSnapshot.findByIdAndUpdate(snapshotId, {
      processingStatus: ProcessingStatus.FAILED,
      processingCompletedAt: new Date(),
      processingErrorMessage: errorMessage
    });
    
    return {
      success: false,
      totalShiftsDetected: 0,
      shiftsSuccessfullyParsed: 0,
      shiftsFailedParsing: 0,
      newWorkersCreated: 0,
      newParticipantsCreated: 0,
      existingWorkersMatched: 0,
      existingParticipantsMatched: 0,
      errors: [errorMessage]
    };
    
  } finally {
    session.endSession();
  }
}

/**
 * Calculate overall confidence score for a shift reference
 */
function calculateConfidenceScore(
  parsedShift: ParsedShiftRow,
  matchResult: {
    workerMatch: { matchConfidence: number } | null;
    participantMatch: { matchConfidence: number } | null;
  }
): number {
  let score = 1.0;
  
  // Reduce score based on parsing warnings
  score -= parsedShift.parsingWarnings.length * 0.1;
  
  // Factor in match confidence
  if (matchResult.workerMatch) {
    score = score * 0.5 + matchResult.workerMatch.matchConfidence * 0.5;
  }
  if (matchResult.participantMatch) {
    score = score * 0.5 + matchResult.participantMatch.matchConfidence * 0.5;
  }
  
  return Math.max(0, Math.min(1, score));
}

/**
 * Get roster snapshot by ID
 */
export async function getRosterSnapshot(
  snapshotId: string,
  providerId: mongoose.Types.ObjectId
): Promise<IRosterSnapshot | null> {
  return RosterSnapshot.findOne({
    _id: snapshotId,
    providerId
  });
}

/**
 * List roster snapshots for a provider
 */
export async function listRosterSnapshots(
  providerId: mongoose.Types.ObjectId,
  options: {
    limit?: number;
    offset?: number;
    status?: ProcessingStatus;
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<{ snapshots: IRosterSnapshot[]; total: number }> {
  const query: any = { providerId };
  
  if (options.status) {
    query.processingStatus = options.status;
  }
  
  if (options.startDate || options.endDate) {
    query.createdAt = {};
    if (options.startDate) query.createdAt.$gte = options.startDate;
    if (options.endDate) query.createdAt.$lte = options.endDate;
  }
  
  const [snapshots, total] = await Promise.all([
    RosterSnapshot.find(query)
      .sort({ createdAt: -1 })
      .skip(options.offset || 0)
      .limit(options.limit || 20),
    RosterSnapshot.countDocuments(query)
  ]);
  
  return { snapshots, total };
}

/**
 * Get parsing errors for a snapshot
 */
export async function getParsingErrors(
  snapshotId: mongoose.Types.ObjectId,
  options: {
    limit?: number;
    offset?: number;
    unreviewed?: boolean;
  } = {}
): Promise<{ errors: any[]; total: number }> {
  const query: any = { snapshotId };
  
  if (options.unreviewed) {
    query.manuallyReviewed = false;
  }
  
  const [errors, total] = await Promise.all([
    ParsingError.find(query)
      .sort({ rowNumber: 1 })
      .skip(options.offset || 0)
      .limit(options.limit || 50),
    ParsingError.countDocuments(query)
  ]);
  
  return { errors, total };
}

