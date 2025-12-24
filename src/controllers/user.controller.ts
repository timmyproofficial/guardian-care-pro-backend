/**
 * User controller
 * Handles HTTP requests related to user management
 */

import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import { userService } from '../services/user.service';
import { successResponse, errorResponse } from '../utils/api-response';
import { AuthenticatedRequest } from '@/middlewares/auth.middleware';
import { UserRole, UserStatus } from '../types/user.types';


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
   * Get all users with filtering
   * @route GET /api/v1/users
   */
  getUsers: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { role, status, search, sortBy, limit, page } = req.query;

      // Build filter
      const filter: Record<string, any> = {};

      if (role) {
        filter.role = role;
      }

      if (status) {
        filter.status = status;
      }

      if (search) {
        filter.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ];
      }

      // Set options
      const options = {
        sortBy: sortBy as string,
        limit: limit ? parseInt(limit as string, 10) : 10,
        page: page ? parseInt(page as string, 10) : 1,
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
