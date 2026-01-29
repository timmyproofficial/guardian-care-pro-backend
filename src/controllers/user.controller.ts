/**
 * User controller
 * Handles HTTP requests related to user management
 */

import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import mongoose from 'mongoose';
import { userService } from '../services/user.service';
import { successResponse, errorResponse } from '../utils/api-response';
import { AuthenticatedRequest } from '@/middlewares/auth.middleware';
import { UserRole, UserStatus } from '../types/user.types';
import { IProvider } from '../models/provider.model';
import WorkerRegistry from '../models/workerRegistry.model';
import ShiftReference from '../models/shiftReference.model';
import ParticipantRegistry from '../models/participantRegistry.model';
import { ShiftReferenceStatus } from '../types/roster.types';


export const userController = {
  /**
   * Get current user profile
   * @route GET /api/v1/users/profile
   */
  getProfile: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json({ message: 'Unauthorized: User not found on request' });
      }

      const userId = req.user._id.toString();
      const userRole = req.user.role;
      let user;

      // Get user data with appropriate population based on role
      switch (userRole) {
        case UserRole.SUPPORT_WORKER:
          user = await userService.getWorkerById(userId);
          break;
        case UserRole.PARTICIPANT:
          user = await userService.getParticipantById(userId);
          break;
        case UserRole.ADMIN:
          // Admin might have additional populated fields in the future
          user = await userService.getUserById(userId);
          break;
        case UserRole.GUARDIAN:
          // Guardian might have additional populated fields in the future
          user = await userService.getUserById(userId);
          break;
        default:
          user = await userService.getUserById(userId);
      }

      if (!user) {
        return res.status(httpStatus.NOT_FOUND).json({ message: 'User not found' });
      }
      // Ensure profileImage is always present
      if (typeof user.profileImage === 'undefined') user.profileImage = null;
      return res.json(successResponse({ user }, 'User profile retrieved successfully'));
    } catch (error) {
      next(error);
      return;
    }
  },
  /**
   * Get user by ID
   * @route GET /api/v1/users/:userId
   */
  getUserById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const user = await userService.getUserById(userId);

      if (!user) {
        return res.status(httpStatus.NOT_FOUND).json(errorResponse('User not found', httpStatus.NOT_FOUND));
      }
      if (typeof user.profileImage === 'undefined') user.profileImage = null;
      return res.json(successResponse({ user }, 'User retrieved successfully'));
    } catch (error) {
      next(error);
      return;
    }
  },

  /**
   * Get user by email
   * @route GET /api/v1/users/email/:email
   */
  getUserByEmail: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.params;
      const user = await userService.getUserByEmail(email);

      if (!user) {
        return res.status(httpStatus.NOT_FOUND).json(errorResponse('User not found', httpStatus.NOT_FOUND));
      }
      if (typeof user.profileImage === 'undefined') user.profileImage = null;
      return res.json(successResponse({ user }, 'User retrieved successfully'));
    } catch (error) {
      next(error);
      return;
    }
  },

  /**
   * Update current user profile based on role
   * @route PATCH /api/v1/users/profile
   */
  updateProfile: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json({
          message: 'Unauthorized: User not found on request',
        });
      }

      const userId = req.user._id.toString();
      const userRole = req.user.role;
      let updatedUser;

      // Route to the appropriate service method based on user role
      switch (userRole) {
        case UserRole.SUPPORT_WORKER:
          updatedUser = await userService.updateWorkerById(userId, req.body);
          break;
        case UserRole.PARTICIPANT:
          updatedUser = await userService.updateParticipantById(userId, req.body);
          break;
        case UserRole.ADMIN:
          updatedUser = await userService.updateAdminById(userId, req.body);
          break;
        case UserRole.GUARDIAN:
          // Add method for guardian if needed
          updatedUser = await userService.updateUserById(userId, req.body);
          break;
        default:
          updatedUser = await userService.updateUserById(userId, req.body);
      }

      return res.json(
        successResponse(
          {
            user:
              updatedUser && typeof updatedUser.profileImage === 'undefined'
                ? { ...updatedUser, profileImage: null }
                : updatedUser,
          },
          'User profile updated successfully',
        ),
      );
    } catch (error) {
      next(error);
      return;
    }
  },

  /**
   * Update specific user by ID and role (admin function)
   * @route PATCH /api/v1/users/:role/:userId
   */
  updateUserByRoleAndId: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { role, userId } = req.params;
      let updatedUser;

      switch (role) {
        case UserRole.SUPPORT_WORKER:
          updatedUser = await userService.updateWorkerById(userId, req.body);
          break;
        case UserRole.PARTICIPANT:
          updatedUser = await userService.updateParticipantById(userId, req.body);
          break;
        case UserRole.ADMIN:
          updatedUser = await userService.updateAdminById(userId, req.body);
          break;
        case UserRole.GUARDIAN:
          // Add method for guardian if needed
          updatedUser = await userService.updateUserById(userId, req.body);
          break;
        default:
          return res.status(httpStatus.BAD_REQUEST).json(errorResponse('Invalid user role', httpStatus.BAD_REQUEST));
      }

      if (!updatedUser) {
        return res.status(httpStatus.NOT_FOUND).json(errorResponse('User not found', httpStatus.NOT_FOUND));
      }

      return res.json(
        successResponse(
          {
            user:
              updatedUser && typeof updatedUser.profileImage === 'undefined'
                ? { ...updatedUser, profileImage: null }
                : updatedUser,
          },
          'User updated successfully',
        ),
      );
    } catch (error) {
      next(error);
      return;
    }
  },
  /**
   * Update user by ID (admin function)
   * @route PATCH /api/v1/users/:userId
   */
  updateUser: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const user = await userService.updateUserById(userId, req.body);

      if (!user) {
        return res.status(httpStatus.NOT_FOUND).json(errorResponse('User not found', httpStatus.NOT_FOUND));
      }
      if (typeof user.profileImage === 'undefined') user.profileImage = null;
      return res.json(successResponse({ user }, 'User updated successfully'));
    } catch (error) {
      next(error);
      return;
    }
  },

  /**
   * Update user profile image
   * @route POST /api/v1/users/profile-image
   */
  updateProfileImage: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res
          .status(httpStatus.UNAUTHORIZED)
          .json(errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED));
      }

      if (!req.file) {
        return res.status(httpStatus.BAD_REQUEST).json(errorResponse('No image file provided', httpStatus.BAD_REQUEST));
      }

      const userId = req.user._id;
      const fileBuffer = req.file.buffer;

      // Update profile image using buffer (memory storage)
      const user = await userService.updateProfileImage(userId.toString(), fileBuffer);

      return res.json(successResponse({ user }, 'Profile image updated successfully'));
    } catch (error) {
      next(error);
      return;
    }
  },
/** 
 * update the resume of the user
 * 
  * @route POST /api/v1/users/upload-resume
*/
  uploadResume: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res
          .status(httpStatus.UNAUTHORIZED)
          .json(errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED));
      }

      if (!req.file) {
        return res.status(httpStatus.BAD_REQUEST).json(errorResponse('No resume file provided', httpStatus.BAD_REQUEST));
      }

      const userId = req.user._id;
      const fileBuffer = req.file.buffer;

      // Update resume using buffer (memory storage)
      const user = await userService.uploadResume(userId.toString(), fileBuffer);

      return res.json(successResponse({ user }, 'Resume updated successfully'));
    } catch (error) {
      next(error);
      return;
    }
  }

,
  /**
   * Update user password
   * @route POST /api/v1/users/change-password
   */
  changePassword: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res
          .status(httpStatus.UNAUTHORIZED)
          .json(errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED));
      }

      const userId = req.user._id;
      const { currentPassword, newPassword } = req.body;

      await userService.updatePassword(userId.toString(), currentPassword, newPassword);

      return res.json(successResponse({}, 'Password changed successfully'));
    } catch (error) {
      next(error);
      return;
    }
  },

  /**
   * Update user address
   * @route PATCH /api/v1/users/profile/address
   */
  updateAddress: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res
          .status(httpStatus.UNAUTHORIZED)
          .json(errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED));
      }

      const userId = req.user._id.toString();
      const { address } = req.body;

      const updatedUser = await userService.updateAddress(userId, address);

      if (!updatedUser) {
        return res.status(httpStatus.NOT_FOUND).json(errorResponse('User not found', httpStatus.NOT_FOUND));
      }

      return res.json(
        successResponse(
          {
            user:
              updatedUser && typeof updatedUser.profileImage === 'undefined'
                ? { ...updatedUser, profileImage: null }
                : updatedUser,
          },
          'Address updated successfully',
        ),
      );
    } catch (error) {
      next(error);
      return;
    }
  },

  /**
   * Delete user by ID
   * @route DELETE /api/v1/users/:userId
   */
  deleteUser: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      await userService.deleteUserById(userId);
      res.json(successResponse({}, 'User deleted successfully'));
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Delete current user's account
   * @route DELETE /api/v1/users/profile
   */
  deleteMyAccount: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res
          .status(httpStatus.UNAUTHORIZED)
          .json(errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED));
      }
      const userId = req.user._id.toString();
      await userService.deleteUserById(userId);
      res.json(successResponse({}, 'Your account has been successfully deleted. This action cannot be undone.'));
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Deactivate current user's account
   * @route PATCH /api/v1/users/profile/deactivate
   */
  deactivateMyAccount: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res
          .status(httpStatus.UNAUTHORIZED)
          .json(errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED));
      }
      const userId = req.user._id.toString();
      await userService.updateUserStatus(userId, UserStatus.INACTIVE);
      res.json(successResponse({}, 'Your account has been deactivated. You can reactivate it by logging in.'));
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get all provider users
   * @route GET /api/admin/providers
   */
  getAllProviderUsers: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const providers = await userService.getAllProviderUsers();
      return res.json(successResponse({ providers }, 'Provider users retrieved successfully'));
    } catch (error) {
      next(error);
      return;
    }
  },

  /**
   * Get provider by phone number
   * @route GET /api/admin/providers/phone/:phoneNumber
   */
  getProviderByPhoneNumber: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { phoneNumber } = req.params;
      const provider = await userService.getProviderByPhoneNumber(phoneNumber);

      if (!provider) {
        return res.status(httpStatus.NOT_FOUND).json(errorResponse('Provider not found', httpStatus.NOT_FOUND));
      }

      // Get workers associated with this provider from WorkerRegistry
      const workers = await WorkerRegistry.find({
        providerId: provider._id
      }).select('workerName phone email externalWorkerId status competencies qualifications totalShiftsAssigned totalShiftsCancelled lastShiftDate matchedUserId availabilitySchedule averageRating');

      // Get upcoming shifts for this provider (scheduled or confirmed, future dates)
      const upcomingShifts = await ShiftReference.find({
        providerId: provider._id,
        shiftDate: { $gte: new Date() },
        currentStatus: { $in: [ShiftReferenceStatus.SCHEDULED, ShiftReferenceStatus.CONFIRMED] }
      }).select('shiftDate shiftStartTime shiftEndTime assignedWorkerId assignedWorkerName assignedWorkerPhone assignedWorkerEmail participantId participantName locationName shiftType supportCategory requiredCompetencies currentStatus');

      // Create a map of worker registry entries by composite key for matching
      const workerRegistryMap = new Map();
      workers.forEach(worker => {
        // Create composite keys for matching (same logic as shift grouping)
        const keys = [
          worker.matchedUserId?.toString(), // Primary key if matched to user
          `${worker.workerName || ''}|${worker.phone || ''}|${worker.email || ''}`.toLowerCase() // Fallback composite key
        ];

        keys.forEach(key => {
          if (key) {
            workerRegistryMap.set(key, worker);
          }
        });
      });

      // Group shifts by worker and populate worker details
      const shiftsByWorker = new Map();

      for (const shift of upcomingShifts) {
        let workerKey = null;
        let assignedWorkerId = shift.assignedWorkerId;

        // First try to match by assignedWorkerId (for full user accounts)
        if (shift.assignedWorkerId) {
          workerKey = shift.assignedWorkerId.toString();
        } else {
          // For lightweight workers, create a composite key from worker details
          const shiftWorkerKey = `${shift.assignedWorkerName || ''}|${shift.assignedWorkerPhone || ''}|${shift.assignedWorkerEmail || ''}`.toLowerCase();
          workerKey = shiftWorkerKey;

          // Try to populate assignedWorkerId from worker registry
          const registryWorker = workerRegistryMap.get(shiftWorkerKey);
          if (registryWorker?.matchedUserId) {
            assignedWorkerId = registryWorker.matchedUserId;
          }
        }

        if (!shiftsByWorker.has(workerKey)) {
          shiftsByWorker.set(workerKey, []);
        }

        // Include the populated assignedWorkerId in the shift data
        shiftsByWorker.get(workerKey).push({
          ...shift.toObject(),
          assignedWorkerId
        });
      }

      // Add upcoming shifts to each worker
      const workersWithShifts = workers.map(worker => {
        let workerKey = null;

        // Check if worker has a matched user ID
        if (worker.matchedUserId) {
          workerKey = worker.matchedUserId.toString();
        } else {
          // Create composite key for lightweight workers
          const workerKeyComposite = `${worker.workerName || ''}|${worker.phone || ''}|${worker.email || ''}`.toLowerCase();
          workerKey = workerKeyComposite;
        }

        const workerShifts = shiftsByWorker.get(workerKey) || [];

        return {
          ...worker.toObject(),
          upcomingShifts: workerShifts
        };
      });

      // Get all future shifts for this provider (for admin overview)
      const allFutureShifts = upcomingShifts.map(shift => ({
        _id: shift._id,
        shiftDate: shift.shiftDate.toISOString().split('T')[0],
        shiftStartTime: shift.shiftStartTime,
        shiftEndTime: shift.shiftEndTime,
        assignedWorkerId: shift.assignedWorkerId,
        assignedWorkerName: shift.assignedWorkerName,
        assignedWorkerPhone: shift.assignedWorkerPhone,
        assignedWorkerEmail: shift.assignedWorkerEmail,
        participantId: shift.participantId,
        participantName: shift.participantName,
        locationName: shift.locationName,
        shiftType: shift.shiftType,
        supportCategory: shift.supportCategory,
        requiredCompetencies: shift.requiredCompetencies,
        currentStatus: shift.currentStatus
      }));

      return res.json(successResponse({ provider, workersWithShifts, allFutureShifts }, 'Provider and workers retrieved successfully'));
    } catch (error) {
      next(error);
      return;
    }
  },

  /**
   * Get all past shifts for a provider by phone number
   * @route GET /api/admin/providers/past-shifts/phone/:phoneNumber
   */
  getProviderPastShifts: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { phoneNumber } = req.params;
      const provider = await userService.getProviderByPhoneNumber(phoneNumber);

      if (!provider) {
        return res.status(httpStatus.NOT_FOUND).json(errorResponse('Provider not found', httpStatus.NOT_FOUND));
      }

      // Get all past shifts (completed shifts before today)
      const pastShifts = await ShiftReference.find({
        providerId: provider._id,
        shiftDate: { $lt: new Date() },
        currentStatus: { $in: [ShiftReferenceStatus.COMPLETED, ShiftReferenceStatus.CANCELLED] }
      })
      .populate('assignedWorkerId', 'averageRating')
      .sort({ shiftDate: -1, shiftStartTime: -1 })
      .lean();

      // Get participant data for addresses
      const participantIds = pastShifts
        .map(shift => shift.participantId)
        .filter((id): id is mongoose.Types.ObjectId => id != null);

      const participants = await ParticipantRegistry.find({
        providerId: provider._id,
        $or: [
          { _id: { $in: participantIds } },
          { participantName: { $in: pastShifts.map(s => s.participantName).filter(Boolean) } }
        ]
      }).select('participantName address postcode _id');

      // Create participant map
      const participantMap = new Map();
      participants.forEach(participant => {
        participantMap.set(participant._id.toString(), participant);
        participantMap.set(participant.participantName.toLowerCase(), participant);
      });

      // Get all worker registries for this provider
      const workerRegistries = await WorkerRegistry.find({
        providerId: provider._id
      }).select('workerName phone email externalWorkerId competencies qualifications availabilitySchedule averageRating status matchedUserId');

      // Create a map for quick lookup by various keys
      const workerRegistryMap = new Map();
      workerRegistries.forEach(worker => {
        // Key by user ID if matched
        if (worker.matchedUserId) {
          workerRegistryMap.set(worker.matchedUserId.toString(), worker);
        }
        // Key by worker registry ID
        workerRegistryMap.set(worker._id.toString(), worker);
        // Key by name/phone/email combination for fallback matching
        const compositeKey = `${worker.workerName || ''}|${worker.phone || ''}|${worker.email || ''}`.toLowerCase();
        workerRegistryMap.set(compositeKey, worker);
      });

      // Transform shifts to match the required format
      const allPastShifts = pastShifts.map(shift => {
        let workerRegistry = null;

        // Try to find worker registry by assignedWorkerId first
        if (shift.assignedWorkerId) {
          workerRegistry = workerRegistryMap.get(shift.assignedWorkerId.toString());
        }

        // Fallback: try to match by worker name/phone/email combination
        if (!workerRegistry) {
          const compositeKey = `${shift.assignedWorkerName || ''}|${shift.assignedWorkerPhone || ''}|${shift.assignedWorkerEmail || ''}`.toLowerCase();
          workerRegistry = workerRegistryMap.get(compositeKey);
        }

        // Get participant location
        let participantLocation = shift.locationName || 'Client Location';
        if (shift.participantId) {
          const participant = participantMap.get(shift.participantId.toString());
          if (participant?.address) {
            participantLocation = participant.address;
          }
        } else if (shift.participantName) {
          const participant = participantMap.get(shift.participantName.toLowerCase());
          if (participant?.address) {
            participantLocation = participant.address;
          }
        }

        return {
          _id: shift._id,
          shiftDate: shift.shiftDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
          shiftStartTime: shift.shiftStartTime,
          shiftEndTime: shift.shiftEndTime,
          assignedWorkerId: shift.assignedWorkerId,
          assignedWorkerName: shift.assignedWorkerName,
          assignedWorkerPhone: shift.assignedWorkerPhone,
          assignedWorkerEmail: shift.assignedWorkerEmail,
          participantId: shift.participantId,
          participantName: shift.participantName,
          externalWorkerId: workerRegistry?.externalWorkerId || null,
          status: workerRegistry?.status || 'lightweight',
          competencies: workerRegistry?.competencies || [],
          qualifications: workerRegistry?.qualifications || [],
          participantLocation: participantLocation,
          providerBusinessLocation: `${(provider as IProvider).businessAddress.street}, ${(provider as IProvider).businessAddress.city} ${(provider as IProvider).businessAddress.state} ${(provider as IProvider).businessAddress.postcode}`,
          currentStatus: shift.currentStatus,
          workerAvailability: workerRegistry?.availabilitySchedule || [],
          workerRating: workerRegistry?.averageRating || null
        };
      });

      return res.json(successResponse({ allPastShifts }, 'Past shifts retrieved successfully'));
    } catch (error) {
      next(error);
      return;
    }
  },

  /**
   * Get all workers for a provider
   * @route GET /api/admin/providers/workers/:phoneNumber
   */
  getAllProviderWorkers: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { phoneNumber } = req.params;
      const provider = await userService.getProviderByPhoneNumber(phoneNumber);

      if (!provider) {
        return res.status(httpStatus.NOT_FOUND).json(errorResponse('Provider not found', httpStatus.NOT_FOUND));
      }

      // Get all workers for this provider
      const workers = await WorkerRegistry.find({
        providerId: provider._id
      }).select('workerName phone email externalWorkerId status competencies qualifications availabilitySchedule averageRating totalShiftsAssigned totalShiftsCancelled lastShiftDate matchedUserId')
        .sort({ workerName: 1 });

      return res.json(successResponse({ workers }, 'Workers retrieved successfully'));
    } catch (error) {
      next(error);
      return;
    }
  },

  /**
   * Assign worker to shift
   * @route POST /api/v1/users/admin/assign-worker-to-shift
   */
  assignWorkerToShift: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workerId, shiftId } = req.body;

      if (!workerId || !shiftId) {
        return res.status(httpStatus.BAD_REQUEST).json(errorResponse('workerId and shiftId are required', httpStatus.BAD_REQUEST));
      }

      // Find the shift
      const shift = await ShiftReference.findById(shiftId);
      if (!shift) {
        return res.status(httpStatus.NOT_FOUND).json(errorResponse('Shift not found', httpStatus.NOT_FOUND));
      }

      // Find the worker
      const worker = await WorkerRegistry.findById(workerId);
      if (!worker) {
        return res.status(httpStatus.NOT_FOUND).json(errorResponse('Worker not found', httpStatus.NOT_FOUND));
      }

      // Update the shift with the new worker
      shift.assignedWorkerId = worker._id;
      shift.assignedWorkerName = worker.workerName;
      shift.assignedWorkerPhone = worker.phone;
      shift.assignedWorkerEmail = worker.email;
      shift.statusUpdatedAt = new Date();

      await shift.save();

      return res.json(successResponse({ shift }, 'Worker assigned to shift successfully'));
    } catch (error) {
      next(error);
      return;
    }
  },

  /**
   * Get all users with filtering
   * @route GET /api/v1/users
   */
  getUsers: async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Build filter
      const filter: Record<string, any> = {};

      if (req.query.role) {
        filter.role = req.query.role;
      }

      if (req.query.status) {
        filter.status = req.query.status;
      }

      if (req.query.search) {
        filter.$or = [
          { firstName: { $regex: req.query.search, $options: 'i' } },
          { lastName: { $regex: req.query.search, $options: 'i' } },
          { email: { $regex: req.query.search, $options: 'i' } },
        ];
      }

      // Set options
      const options = {
        sortBy: req.query.sortBy as string,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 10,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      };

      const result = await userService.getUsers(filter, options);
      // Ensure every user in the list has profileImage (null if missing)
      if (result.users && Array.isArray(result.users)) {
        result.users = result.users.map((u) => ({
          ...(u.toObject?.() || u),
          profileImage: typeof u.profileImage === 'undefined' ? null : u.profileImage,
        }));
      }
      res.json(successResponse(result, 'Users retrieved successfully'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get participant by ID
   * @route GET /api/v1/users/participants/:participantId
   */
  getParticipantById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { participantId } = req.params;
      const participant = await userService.getParticipantById(participantId);

      if (!participant) {
        return res.status(httpStatus.NOT_FOUND).json(errorResponse('Participant not found', httpStatus.NOT_FOUND));
      }
      if (typeof participant.profileImage === 'undefined') participant.profileImage = null;
      return res.json(successResponse({ participant }, 'Participant retrieved successfully'));
    } catch (error) {
      next(error);
      return;
    }
  },

  /**
   * Get support worker by ID
   * @route GET /api/v1/users/workers/:workerId
   */
  getWorkerById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workerId } = req.params;
      const worker = await userService.getWorkerById(workerId);

      if (!worker) {
        return res.status(httpStatus.NOT_FOUND).json(errorResponse('Support worker not found', httpStatus.NOT_FOUND));
      }
      if (typeof worker.profileImage === 'undefined') worker.profileImage = null;
      return res.json(successResponse({ worker }, 'Support worker retrieved successfully'));
    } catch (error) {
      next(error);
      return;
    }
  },

  /**
   * Get coordinator by ID
   * @route GET /api/v1/users/coordinators/:coordinatorId
   */
  getCoordinatorById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { coordinatorId } = req.params;
      const coordinator = await userService.getCoordinatorById(coordinatorId);

      if (!coordinator) {
        return res.status(httpStatus.NOT_FOUND).json(errorResponse('Coordinator not found', httpStatus.NOT_FOUND));
      }
      if (typeof coordinator.profileImage === 'undefined') coordinator.profileImage = null;
      return res.json(successResponse({ coordinator }, 'Coordinator retrieved successfully'));
    } catch (error) {
      next(error);
      return;
    }
  },

  /**
   * Update user status
   * @route PATCH /api/v1/users/:userId/status
   */
  updateUserStatus: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const { status } = req.body;

      // Check if status is valid
      if (!Object.values(UserStatus).includes(status as UserStatus)) {
        return res.status(httpStatus.BAD_REQUEST).json(errorResponse('Invalid status value', httpStatus.BAD_REQUEST));
      }

      const user = await userService.updateUserStatus(userId, status as UserStatus);

      return res.json(successResponse({ user }, 'User status updated successfully'));
    } catch (error) {
      next(error);
      return;
    }
  },

  /**
   * Link guardian to participant
   * @route POST /api/v1/users/participants/:participantId/guardians/:guardianId
   */
  linkGuardianToParticipant: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { participantId, guardianId } = req.params;

      await userService.linkGuardianToParticipant(guardianId, participantId);

      res.json(successResponse({}, 'Guardian linked to participant successfully'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Unlink guardian from participant
   * @route DELETE /api/v1/users/participants/:participantId/guardians/:guardianId
   */
  unlinkGuardianFromParticipant: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { participantId, guardianId } = req.params;

      await userService.unlinkGuardianFromParticipant(guardianId, participantId);

      res.json(successResponse({}, 'Guardian unlinked from participant successfully'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Complete participant onboarding
   * @route POST /api/v1/users/participants/onboarding
   */
  completeParticipantOnboarding: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res
          .status(httpStatus.UNAUTHORIZED)
          .json(errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED));
      }

      // Check if user is a participant
      if (req.user.role !== UserRole.PARTICIPANT) {
        return res
          .status(httpStatus.FORBIDDEN)
          .json(errorResponse('Only participants can complete onboarding', httpStatus.FORBIDDEN));
      }

      const participantId = req.user._id.toString();
      const onboardingData = req.body;

      const updatedParticipant = await userService.completeParticipantOnboarding(participantId, onboardingData);

      return res.json(
        successResponse({ participant: updatedParticipant }, 'Participant onboarding completed successfully'),
      );
    } catch (error) {
      next(error);
      return;
    }
  },

  /**
   * Complete worker onboarding
   * @route POST /api/v1/users/workers/onboarding
   */
  completeWorkerOnboarding: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res
          .status(httpStatus.UNAUTHORIZED)
          .json(errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED));
      }

      // Check if user is a support worker
      if (req.user.role !== UserRole.SUPPORT_WORKER) {
        return res
          .status(httpStatus.FORBIDDEN)
          .json(errorResponse('Only support workers can complete onboarding', httpStatus.FORBIDDEN));
      }

      const workerId = req.user._id.toString();
      const onboardingData = req.body;

      const updatedWorker = await userService.completeWorkerOnboarding(workerId, onboardingData);

      return res.json(successResponse({ worker: updatedWorker }, 'Worker onboarding completed successfully'));
    } catch (error) {
      next(error);
      return;
    }
  },
};
