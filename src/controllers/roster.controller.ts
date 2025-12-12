/**
 * Roster Controller
 * Handles HTTP requests for the Roster Lookup Table system
 */

import { Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { UserRole } from '../types/user.types';
import {
  ProcessingStatus,
  CancellationReason,
  EventTriggerSource
} from '../types/roster.types';
import { IProvider } from '../models/provider.model';
import ShiftReference from '../models/shiftReference.model';
import {
  createRosterSnapshot,
  processRosterSnapshot,
  getRosterSnapshot,
  listRosterSnapshots,
  getParsingErrors
} from '../services/roster-upload.service';
import { reportCancellation } from '../services/shift-cancellation.service';
import { findReplacementWorkers } from '../services/replacement-finder.service';
import { successResponse, errorResponse } from '../utils/api-response';
import logger from '../utils/logger';

/**
 * Helper to check if user is a provider
 */
function isProvider(req: AuthenticatedRequest): boolean {
  return req.user?.role === UserRole.PROVIDER;
}

/**
 * Helper to get provider ID from request
 */
function getProviderId(req: AuthenticatedRequest): mongoose.Types.ObjectId | null {
  if (!req.user) return null;
  
  if (req.user.role === UserRole.PROVIDER) {
    return req.user._id;
  }
  
  if (req.user.role === UserRole.ADMIN && req.query.providerId) {
    return new mongoose.Types.ObjectId(req.query.providerId as string);
  }
  
  return null;
}

export const rosterController = {
  /**
   * Upload roster file
   * POST /api/roster-snapshots/upload
   */
  uploadRoster: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized', httpStatus.UNAUTHORIZED)
        );
      }
      
      if (!isProvider(req)) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only providers can upload rosters', httpStatus.FORBIDDEN)
        );
      }
      
      if (!req.file) {
        return res.status(httpStatus.BAD_REQUEST).json(
          errorResponse('No file provided', httpStatus.BAD_REQUEST)
        );
      }
      
      const providerId = req.user._id;
      const { rosterPeriodStart, rosterPeriodEnd, notes } = req.body;
      
      // Create snapshot record
      const snapshot = await createRosterSnapshot(
        providerId,
        providerId,
        req.file,
        {
          rosterPeriodStart: rosterPeriodStart ? new Date(rosterPeriodStart) : undefined,
          rosterPeriodEnd: rosterPeriodEnd ? new Date(rosterPeriodEnd) : undefined,
          notes
        }
      );
      
      // Process the roster asynchronously
      // In a production system, this would be queued to a job processor
      setImmediate(async () => {
        try {
          await processRosterSnapshot(
            snapshot._id,
            req.file!.buffer,
            req.user as IProvider
          );
        } catch (error) {
          logger.error(`Async roster processing failed for ${snapshot._id}:`, error);
        }
      });
      
      // Calculate estimated completion time (2-5 minutes based on file size)
      const estimatedMinutes = Math.min(5, Math.max(2, Math.ceil(req.file.size / (1024 * 1024))));
      const estimatedCompletionTime = new Date(Date.now() + estimatedMinutes * 60 * 1000);
      
      return res.status(httpStatus.ACCEPTED).json(
        successResponse({
          snapshotId: snapshot._id.toString(),
          message: 'Roster uploaded. Processing will complete in 2-5 minutes.',
          estimatedCompletionTime: estimatedCompletionTime.toISOString()
        }, 'Roster upload accepted')
      );
      
    } catch (error) {
      return next(error);
    }
  },
  
  /**
   * List roster snapshots
   * GET /api/roster-snapshots
   */
  listSnapshots: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized', httpStatus.UNAUTHORIZED)
        );
      }
      
      const providerId = getProviderId(req);
      if (!providerId) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Provider ID required', httpStatus.FORBIDDEN)
        );
      }
      
      const {
        limit = '20',
        offset = '0',
        status,
        startDate,
        endDate
      } = req.query;
      
      const result = await listRosterSnapshots(providerId, {
        limit: Math.min(100, parseInt(limit as string, 10)),
        offset: parseInt(offset as string, 10),
        status: status as ProcessingStatus,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });
      
      return res.json(
        successResponse({
          total: result.total,
          snapshots: result.snapshots.map(s => ({
            snapshotId: s._id.toString(),
            fileName: s.fileName,
            fileType: s.fileType,
            uploadedAt: s.createdAt.toISOString(),
            processingStatus: s.processingStatus,
            totalShiftsDetected: s.totalShiftsDetected,
            shiftsSuccessfullyParsed: s.shiftsSuccessfullyParsed,
            shiftsFailedParsing: s.shiftsFailedParsing,
            newWorkersCreated: s.newWorkersCreated,
            newParticipantsCreated: s.newParticipantsCreated,
            rosterPeriodStart: s.rosterPeriodStart?.toISOString(),
            rosterPeriodEnd: s.rosterPeriodEnd?.toISOString(),
            processingCompletedAt: s.processingCompletedAt?.toISOString()
          })),
          pagination: {
            limit: parseInt(limit as string, 10),
            offset: parseInt(offset as string, 10),
            hasMore: result.total > parseInt(offset as string, 10) + result.snapshots.length
          }
        }, 'Snapshots retrieved successfully')
      );
      
    } catch (error) {
      return next(error);
    }
  },
  
  /**
   * Get snapshot details
   * GET /api/roster-snapshots/:snapshotId
   */
  getSnapshot: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized', httpStatus.UNAUTHORIZED)
        );
      }
      
      const providerId = getProviderId(req);
      if (!providerId) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Provider ID required', httpStatus.FORBIDDEN)
        );
      }
      
      const { snapshotId } = req.params;
      
      const snapshot = await getRosterSnapshot(snapshotId, providerId);
      
      if (!snapshot) {
        return res.status(httpStatus.NOT_FOUND).json(
          errorResponse('Snapshot not found', httpStatus.NOT_FOUND)
        );
      }
      
      return res.json(
        successResponse({
          snapshot: {
            snapshotId: snapshot._id.toString(),
            providerId: snapshot.providerId.toString(),
            fileName: snapshot.fileName,
            fileType: snapshot.fileType,
            fileSizeBytes: snapshot.fileSizeBytes,
            uploadedAt: snapshot.createdAt.toISOString(),
            processingStatus: snapshot.processingStatus,
            processingStartedAt: snapshot.processingStartedAt?.toISOString(),
            processingCompletedAt: snapshot.processingCompletedAt?.toISOString(),
            processingErrorMessage: snapshot.processingErrorMessage,
            totalShiftsDetected: snapshot.totalShiftsDetected,
            shiftsSuccessfullyParsed: snapshot.shiftsSuccessfullyParsed,
            shiftsFailedParsing: snapshot.shiftsFailedParsing,
            newWorkersCreated: snapshot.newWorkersCreated,
            newParticipantsCreated: snapshot.newParticipantsCreated,
            existingWorkersMatched: snapshot.existingWorkersMatched,
            existingParticipantsMatched: snapshot.existingParticipantsMatched,
            rosterPeriodStart: snapshot.rosterPeriodStart?.toISOString(),
            rosterPeriodEnd: snapshot.rosterPeriodEnd?.toISOString(),
            notes: snapshot.notes
          }
        }, 'Snapshot retrieved successfully')
      );
      
    } catch (error) {
      return next(error);
    }
  },
  
  /**
   * Search shift references
   * GET /api/shift-references/search
   */
  searchShifts: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized', httpStatus.UNAUTHORIZED)
        );
      }
      
      const providerId = getProviderId(req);
      if (!providerId) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Provider ID required', httpStatus.FORBIDDEN)
        );
      }
      
      const {
        workerId,
        workerName,
        workerPhone,
        participantId,
        participantName,
        shiftDate,
        shiftDateStart,
        shiftDateEnd,
        status,
        locationPostcode,
        requiredCompetencies,
        limit = '50',
        offset = '0',
        sortBy = 'shiftDate',
        sortOrder = 'asc'
      } = req.query;
      
      // Build query
      const query: any = { providerId };
      
      if (workerId) {
        query.assignedWorkerId = new mongoose.Types.ObjectId(workerId as string);
      }
      
      if (workerName) {
        query.assignedWorkerName = { $regex: new RegExp(workerName as string, 'i') };
      }
      
      if (workerPhone) {
        query.assignedWorkerPhone = workerPhone;
      }
      
      if (participantId) {
        query.participantId = new mongoose.Types.ObjectId(participantId as string);
      }
      
      if (participantName) {
        query.participantName = { $regex: new RegExp(participantName as string, 'i') };
      }
      
      if (shiftDate) {
        const date = new Date(shiftDate as string);
        query.shiftDate = {
          $gte: new Date(date.setHours(0, 0, 0, 0)),
          $lte: new Date(date.setHours(23, 59, 59, 999))
        };
      } else if (shiftDateStart || shiftDateEnd) {
        query.shiftDate = {};
        if (shiftDateStart) query.shiftDate.$gte = new Date(shiftDateStart as string);
        if (shiftDateEnd) query.shiftDate.$lte = new Date(shiftDateEnd as string);
      }
      
      if (status) {
        query.currentStatus = status;
      }
      
      if (locationPostcode) {
        query.locationPostcode = locationPostcode;
      }
      
      if (requiredCompetencies) {
        const competencies = (requiredCompetencies as string).split(',').map(c => c.trim());
        query.requiredCompetencies = { $all: competencies };
      }
      
      // Execute query
      const sort: any = {};
      sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;
      
      const [shifts, total] = await Promise.all([
        ShiftReference.find(query)
          .sort(sort)
          .skip(parseInt(offset as string, 10))
          .limit(Math.min(500, parseInt(limit as string, 10))),
        ShiftReference.countDocuments(query)
      ]);
      
      return res.json(
        successResponse({
          total,
          shifts: shifts.map(s => ({
            shiftReferenceId: s._id.toString(),
            shiftDate: s.shiftDate.toISOString().split('T')[0],
            shiftStartTime: s.shiftStartTime,
            shiftEndTime: s.shiftEndTime,
            shiftDurationMinutes: s.shiftDurationMinutes,
            assignedWorkerName: s.assignedWorkerName,
            assignedWorkerPhone: s.assignedWorkerPhone,
            participantName: s.participantName,
            participantPhone: s.participantPhone,
            locationName: s.locationName,
            locationAddress: s.locationAddress,
            shiftType: s.shiftType,
            supportCategory: s.supportCategory,
            requiredCompetencies: s.requiredCompetencies,
            currentStatus: s.currentStatus,
            parsingConfidenceScore: s.parsingConfidenceScore,
            linkedShiftId: s.linkedShiftId?.toString()
          })),
          pagination: {
            limit: parseInt(limit as string, 10),
            offset: parseInt(offset as string, 10),
            hasMore: total > parseInt(offset as string, 10) + shifts.length
          }
        }, 'Shifts retrieved successfully')
      );
      
    } catch (error) {
      return next(error);
    }
  },
  
  /**
   * Report shift cancellation
   * POST /api/shift-events/cancellation
   */
  reportCancellation: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized', httpStatus.UNAUTHORIZED)
        );
      }
      
      const providerId = getProviderId(req);
      if (!providerId) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Provider ID required', httpStatus.FORBIDDEN)
        );
      }
      
      const {
        shiftReferenceId,
        workerPhone,
        workerName,
        participantName,
        shiftDate,
        shiftTime,
        cancellationReason,
        cancellationMessage,
        noticeHours,
        triggeredBy,
        triggeredByPhone,
        aiParsedEntities,
        autoTriggerReplacement
      } = req.body;
      
      // Validate cancellation reason
      if (!Object.values(CancellationReason).includes(cancellationReason)) {
        return res.status(httpStatus.BAD_REQUEST).json(
          errorResponse('Invalid cancellation reason', httpStatus.BAD_REQUEST)
        );
      }
      
      // Validate trigger source
      if (!Object.values(EventTriggerSource).includes(triggeredBy)) {
        return res.status(httpStatus.BAD_REQUEST).json(
          errorResponse('Invalid trigger source', httpStatus.BAD_REQUEST)
        );
      }
      
      const result = await reportCancellation(
        providerId,
        {
          shiftReferenceId,
          workerPhone,
          workerName,
          participantName,
          shiftDate,
          shiftTime,
          cancellationReason,
          cancellationMessage,
          noticeHours,
          triggeredBy,
          triggeredByPhone,
          aiParsedEntities,
          autoTriggerReplacement: autoTriggerReplacement ?? false
        },
        req.user._id
      );
      
      if (!result.success) {
        return res.status(httpStatus.BAD_REQUEST).json(
          errorResponse(result.error || 'Cancellation failed', httpStatus.BAD_REQUEST)
        );
      }
      
      return res.json(
        successResponse({
          eventId: result.eventId,
          shiftReferenceId: result.shiftReferenceId,
          shiftDetails: result.shiftDetails,
          replacementWorkflowStatus: result.replacementWorkflowStatus,
          notificationsSent: result.notificationsSent,
          nextSteps: result.nextSteps
        }, 'Cancellation reported successfully')
      );
      
    } catch (error) {
      return next(error);
    }
  },
  
  /**
   * Find replacement workers
   * POST /api/workers/find-replacements
   */
  findReplacements: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized', httpStatus.UNAUTHORIZED)
        );
      }
      
      const providerId = getProviderId(req);
      if (!providerId) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Provider ID required', httpStatus.FORBIDDEN)
        );
      }
      
      const { shiftReferenceId, preferences, limit } = req.body;
      
      if (!shiftReferenceId) {
        return res.status(httpStatus.BAD_REQUEST).json(
          errorResponse('shiftReferenceId is required', httpStatus.BAD_REQUEST)
        );
      }
      
      const candidates = await findReplacementWorkers(providerId, {
        shiftReferenceId,
        preferences,
        limit: limit || 10
      });
      
      return res.json(
        successResponse({
          shiftReferenceId,
          totalCandidatesFound: candidates.length,
          replacementCandidates: candidates
        }, 'Replacement candidates found')
      );
      
    } catch (error) {
      return next(error);
    }
  },
  
  /**
   * Get parsing errors for a snapshot
   * GET /api/roster-snapshots/:snapshotId/errors
   */
  getSnapshotErrors: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized', httpStatus.UNAUTHORIZED)
        );
      }
      
      const providerId = getProviderId(req);
      if (!providerId) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Provider ID required', httpStatus.FORBIDDEN)
        );
      }
      
      const { snapshotId } = req.params;
      const { limit = '50', offset = '0', unreviewed } = req.query;
      
      // Verify snapshot belongs to provider
      const snapshot = await getRosterSnapshot(snapshotId, providerId);
      if (!snapshot) {
        return res.status(httpStatus.NOT_FOUND).json(
          errorResponse('Snapshot not found', httpStatus.NOT_FOUND)
        );
      }
      
      const result = await getParsingErrors(
        new mongoose.Types.ObjectId(snapshotId),
        {
          limit: parseInt(limit as string, 10),
          offset: parseInt(offset as string, 10),
          unreviewed: unreviewed === 'true'
        }
      );
      
      return res.json(
        successResponse({
          total: result.total,
          errors: result.errors,
          pagination: {
            limit: parseInt(limit as string, 10),
            offset: parseInt(offset as string, 10),
            hasMore: result.total > parseInt(offset as string, 10) + result.errors.length
          }
        }, 'Errors retrieved successfully')
      );
      
    } catch (error) {
      return next(error);
    }
  }
};

