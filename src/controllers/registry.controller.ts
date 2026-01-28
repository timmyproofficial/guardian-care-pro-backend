/**
 * Registry Controller
 * Handles manual onboarding and management of workers and participants
 */

import { Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import WorkerRegistry from '../models/workerRegistry.model';
import ParticipantRegistry from '../models/participantRegistry.model';
import User from '../models/user.model';
import { successResponse, errorResponse } from '../utils/api-response';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { UserRole } from '../types/user.types';
import { RegistryStatus } from '../types/roster.types';
import logger from '../utils/logger';

/**
 * Worker onboarding input
 */
interface WorkerOnboardingInput {
  workerName: string;
  phone?: string;
  email?: string;
  externalWorkerId?: string;
  competencies: string[];
  qualifications: string[];
  matchedUserId?: string;
}

/**
 * Participant onboarding input
 */
interface ParticipantOnboardingInput {
  participantName: string;
  phone?: string;
  ndisNumber?: string;
  externalParticipantId?: string;
  supportNeeds: string[];
  preferredGender?: string;
  preferredLanguages: string[];
  address?: string;
  postcode?: string;
  matchedUserId?: string;
}

export const registryController = {
  /**
   * Manually onboard a worker to the registry
   * POST /api/v1/registry/workers
   */
  onboardWorker: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      // Only providers and admins can manually onboard workers
      if (req.user.role !== UserRole.PROVIDER && req.user.role !== UserRole.ADMIN) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only providers and admins can manually onboard workers', httpStatus.FORBIDDEN)
        );
      }

      const {
        workerName,
        phone,
        email,
        externalWorkerId,
        competencies,
        qualifications,
        matchedUserId
      }: WorkerOnboardingInput = req.body;

      // Validate required fields
      if (!workerName) {
        return res.status(httpStatus.BAD_REQUEST).json(
          errorResponse('Worker name is required', httpStatus.BAD_REQUEST)
        );
      }

      // Check if worker with same details already exists
      const existingWorker = await WorkerRegistry.findOne({
        providerId: req.user._id,
        $or: [
          { workerName: { $regex: new RegExp(`^${workerName}$`, 'i') } },
          ...(phone ? [{ phone: normalizePhone(phone) }] : []),
          ...(email ? [{ email: email.toLowerCase() }] : []),
          ...(externalWorkerId ? [{ externalWorkerId }] : [])
        ]
      });

      if (existingWorker) {
        return res.status(httpStatus.CONFLICT).json(
          errorResponse('A worker with similar details already exists in the registry', httpStatus.CONFLICT)
        );
      }

      // Validate matched user if provided
      if (matchedUserId) {
        const matchedUser = await User.findById(matchedUserId);
        if (!matchedUser) {
          return res.status(httpStatus.BAD_REQUEST).json(
            errorResponse('Matched user not found', httpStatus.BAD_REQUEST)
          );
        }

        // Check if this user is already matched to another worker in this provider
        const existingMatch = await WorkerRegistry.findOne({
          providerId: req.user._id,
          matchedUserId
        });

        if (existingMatch) {
          return res.status(httpStatus.CONFLICT).json(
            errorResponse('This user is already matched to another worker in your registry', httpStatus.CONFLICT)
          );
        }
      }

      // Create worker registry entry
      const worker = await WorkerRegistry.create({
        providerId: req.user._id,
        workerName: workerName.trim(),
        phone: phone ? normalizePhone(phone) : undefined,
        email: email ? email.toLowerCase().trim() : undefined,
        externalWorkerId: externalWorkerId?.trim(),
        matchedUserId,
        status: matchedUserId ? RegistryStatus.MATCHED : RegistryStatus.LIGHTWEIGHT,
        competencies: competencies || [],
        qualifications: qualifications || [],
        firstSeenDate: new Date(),
        totalShiftsAssigned: 0,
        totalShiftsCancelled: 0
      });

      logger.info('Worker manually onboarded', {
        workerId: worker._id,
        providerId: req.user._id,
        workerName,
        matchedUserId
      });

      return res.status(httpStatus.CREATED).json(
        successResponse({
          worker: {
            _id: worker._id,
            workerName: worker.workerName,
            phone: worker.phone,
            email: worker.email,
            externalWorkerId: worker.externalWorkerId,
            status: worker.status,
            competencies: worker.competencies,
            qualifications: worker.qualifications,
            matchedUserId: worker.matchedUserId,
            createdAt: worker.createdAt
          }
        }, 'Worker successfully onboarded to registry')
      );

    } catch (error) {
      logger.error('Error onboarding worker:', error);
      return next(error);
    }
  },

  /**
   * Manually onboard a participant to the registry
   * POST /api/v1/registry/participants
   */
  onboardParticipant: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      // Only providers and admins can manually onboard participants
      if (req.user.role !== UserRole.PROVIDER && req.user.role !== UserRole.ADMIN) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only providers and admins can manually onboard participants', httpStatus.FORBIDDEN)
        );
      }

      const {
        participantName,
        phone,
        ndisNumber,
        externalParticipantId,
        supportNeeds,
        preferredGender,
        preferredLanguages,
        address,
        postcode,
        matchedUserId
      }: ParticipantOnboardingInput = req.body;

      // Validate required fields
      if (!participantName) {
        return res.status(httpStatus.BAD_REQUEST).json(
          errorResponse('Participant name is required', httpStatus.BAD_REQUEST)
        );
      }

      // Check if participant with same details already exists
      const existingParticipant = await ParticipantRegistry.findOne({
        providerId: req.user._id,
        $or: [
          { participantName: { $regex: new RegExp(`^${participantName}$`, 'i') } },
          ...(phone ? [{ phone: normalizePhone(phone) }] : []),
          ...(ndisNumber ? [{ ndisNumber }] : [])
        ]
      });

      if (existingParticipant) {
        return res.status(httpStatus.CONFLICT).json(
          errorResponse('A participant with similar details already exists in the registry', httpStatus.CONFLICT)
        );
      }

      // Validate matched user if provided
      if (matchedUserId) {
        const matchedUser = await User.findById(matchedUserId);
        if (!matchedUser) {
          return res.status(httpStatus.BAD_REQUEST).json(
            errorResponse('Matched user not found', httpStatus.BAD_REQUEST)
          );
        }

        // Check if this user is already matched to another participant in this provider
        const existingMatch = await ParticipantRegistry.findOne({
          providerId: req.user._id,
          matchedUserId
        });

        if (existingMatch) {
          return res.status(httpStatus.CONFLICT).json(
            errorResponse('This user is already matched to another participant in your registry', httpStatus.CONFLICT)
          );
        }
      }

      // Create participant registry entry
      const participant = await ParticipantRegistry.create({
        providerId: req.user._id,
        participantName: participantName.trim(),
        phone: phone ? normalizePhone(phone) : undefined,
        ndisNumber: ndisNumber?.trim(),
        externalParticipantId: externalParticipantId?.trim(),
        matchedUserId,
        status: matchedUserId ? RegistryStatus.MATCHED : RegistryStatus.LIGHTWEIGHT,
        supportNeeds: supportNeeds || [],
        preferredGender: preferredGender?.trim(),
        preferredLanguages: preferredLanguages || [],
        address: address?.trim(),
        postcode: postcode?.trim(),
        firstSeenDate: new Date(),
        totalShiftsScheduled: 0
      });

      logger.info('Participant manually onboarded', {
        participantId: participant._id,
        providerId: req.user._id,
        participantName,
        matchedUserId
      });

      return res.status(httpStatus.CREATED).json(
        successResponse({
          participant: {
            _id: participant._id,
            participantName: participant.participantName,
            phone: participant.phone,
            ndisNumber: participant.ndisNumber,
            externalParticipantId: participant.externalParticipantId,
            status: participant.status,
            supportNeeds: participant.supportNeeds,
            preferredGender: participant.preferredGender,
            preferredLanguages: participant.preferredLanguages,
            address: participant.address,
            postcode: participant.postcode,
            matchedUserId: participant.matchedUserId,
            createdAt: participant.createdAt
          }
        }, 'Participant successfully onboarded to registry')
      );

    } catch (error) {
      logger.error('Error onboarding participant:', error);
      return next(error);
    }
  },

  /**
   * Get workers in registry for provider
   * GET /api/v1/registry/workers
   */
  getWorkers: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const filter: any = { providerId: req.user._id };

      // Optional filters
      if (req.query.status) {
        filter.status = req.query.status;
      }

      if (req.query.search) {
        filter.$or = [
          { workerName: { $regex: req.query.search, $options: 'i' } },
          { phone: { $regex: req.query.search } },
          { email: { $regex: req.query.search, $options: 'i' } }
        ];
      }

      const workers = await WorkerRegistry.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v');

      const total = await WorkerRegistry.countDocuments(filter);

      return res.json(
        successResponse({
          workers,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }, `Found ${workers.length} workers in registry`)
      );

    } catch (error) {
      logger.error('Error fetching workers:', error);
      return next(error);
    }
  },

  /**
   * Get participants in registry for provider
   * GET /api/v1/registry/participants
   */
  getParticipants: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const filter: any = { providerId: req.user._id };

      // Optional filters
      if (req.query.status) {
        filter.status = req.query.status;
      }

      if (req.query.search) {
        filter.$or = [
          { participantName: { $regex: req.query.search, $options: 'i' } },
          { phone: { $regex: req.query.search } },
          { ndisNumber: { $regex: req.query.search, $options: 'i' } }
        ];
      }

      const participants = await ParticipantRegistry.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v');

      const total = await ParticipantRegistry.countDocuments(filter);

      return res.json(
        successResponse({
          participants,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }, `Found ${participants.length} participants in registry`)
      );

    } catch (error) {
      logger.error('Error fetching participants:', error);
      return next(error);
    }
  },

  /**
   * Update worker registry entry
   * PATCH /api/v1/registry/workers/:workerId
   */
  updateWorker: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      const { workerId } = req.params;
      const updates = req.body;

      // Remove fields that shouldn't be updated directly
      delete updates._id;
      delete updates.providerId;
      delete updates.createdAt;
      delete updates.firstSeenInSnapshot;
      delete updates.firstSeenDate;

      const worker = await WorkerRegistry.findOneAndUpdate(
        { _id: workerId, providerId: req.user._id },
        updates,
        { new: true, runValidators: true }
      );

      if (!worker) {
        return res.status(httpStatus.NOT_FOUND).json(
          errorResponse('Worker not found in your registry', httpStatus.NOT_FOUND)
        );
      }

      return res.json(
        successResponse({ worker }, 'Worker registry entry updated successfully')
      );

    } catch (error) {
      logger.error('Error updating worker:', error);
      return next(error);
    }
  },

  /**
   * Update participant registry entry
   * PATCH /api/v1/registry/participants/:participantId
   */
  updateParticipant: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      const { participantId } = req.params;
      const updates = req.body;

      // Remove fields that shouldn't be updated directly
      delete updates._id;
      delete updates.providerId;
      delete updates.createdAt;
      delete updates.firstSeenInSnapshot;
      delete updates.firstSeenDate;

      const participant = await ParticipantRegistry.findOneAndUpdate(
        { _id: participantId, providerId: req.user._id },
        updates,
        { new: true, runValidators: true }
      );

      if (!participant) {
        return res.status(httpStatus.NOT_FOUND).json(
          errorResponse('Participant not found in your registry', httpStatus.NOT_FOUND)
        );
      }

      return res.json(
        successResponse({ participant }, 'Participant registry entry updated successfully')
      );

    } catch (error) {
      logger.error('Error updating participant:', error);
      return next(error);
    }
  }
};

/**
 * Normalize phone number for storage
 */
function normalizePhone(phone: string): string {
  if (!phone) return phone;

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