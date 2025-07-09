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
import fs from 'fs';

export const userController = {
  /**
   * Get current user profile
   * @route GET /api/users/profile
   */
  getProfile: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json({ message: 'Unauthorized: User not found on request' });
      }
  
      // No need to fetch user again - req.user is already populated by auth middleware
      const user = req.user;
      return res.json(successResponse({ user }, 'User profile retrieved successfully'));
    } catch (error) {
      next(error);
      return; 
    }
  }
  ,

  /**
   * Get user by ID
   * @route GET /api/users/:userId
   */
  getUserById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const user = await userService.getUserById(userId);
      
      if (!user) {
        return res.status(httpStatus.NOT_FOUND).json(
          errorResponse('User not found', httpStatus.NOT_FOUND)
        );
      }
      
      return res.json(successResponse({ user }, 'User retrieved successfully'));
    } catch (error) {
      next(error);
      return;
    }
  },

  /**
   * Get user by email
   * @route GET /api/users/email/:email
   */
  getUserByEmail: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.params;
      const user = await userService.getUserByEmail(email);
      
      if (!user) {
        return res.status(httpStatus.NOT_FOUND).json(
          errorResponse('User not found', httpStatus.NOT_FOUND)
        );
      }
      
      return res.json(successResponse({ user }, 'User retrieved successfully'));
    } catch (error) {
      next(error);
      return;
    }
  },

  /**
   * Update current user profile based on role
   * @route PATCH /api/users/profile
   */
  updateProfile: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json({ 
          message: 'Unauthorized: User not found on request' 
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
      
      return res.json(successResponse({ user: updatedUser }, 'User profile updated successfully'));
    } catch (error) {
      next(error);
      return;
    }
  },
  
  /**
   * Update specific user by ID and role (admin function)
   * @route PATCH /api/users/:role/:userId
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
          return res.status(httpStatus.BAD_REQUEST).json(
            errorResponse('Invalid user role', httpStatus.BAD_REQUEST)
          );
      }
      
      if (!updatedUser) {
        return res.status(httpStatus.NOT_FOUND).json(
          errorResponse('User not found', httpStatus.NOT_FOUND)
        );
      }
      
      return res.json(successResponse({ user: updatedUser }, 'User updated successfully'));
    } catch (error) {
      next(error);
      return;
    }
  }
  ,

  /**
   * Update user by ID (admin function)
   * @route PATCH /api/users/:userId
   */
  updateUser: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const user = await userService.updateUserById(userId, req.body);
      
      if (!user) {
        return res.status(httpStatus.NOT_FOUND).json(
          errorResponse('User not found', httpStatus.NOT_FOUND)
        );
      }
      
      return res.json(successResponse({ user }, 'User updated successfully'));
    } catch (error) {
      next(error);
      return;
    }
  },

  /**
   * Update user profile image
   * @route POST /api/users/profile-image
   */
  updateProfileImage: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
  
      if (!req.file) {
        return res.status(httpStatus.BAD_REQUEST).json(
          errorResponse('No image file provided', httpStatus.BAD_REQUEST)
        );
      }
  
      const userId = req.user._id;
      const filePath = req.file.path;
  
      // Update profile image
      const user = await userService.updateProfileImage(userId.toString(), filePath);
  
      // Clean up temporary file if needed
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
  
      return res.json(successResponse({ user }, 'Profile image updated successfully'));
    } catch (error) {
      // Clean up temporary file in case of error
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      next(error);
      return;
    }
  }
  ,

  /**
   * Update user password
   * @route POST /api/users/change-password
   */
  changePassword: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
  
      const userId = req.user._id;
      const { currentPassword, newPassword } = req.body;
  
      await userService.updatePassword(
        userId.toString(),
        currentPassword,
        newPassword
      );
  
      return res.json(successResponse({}, 'Password changed successfully'));
    } catch (error) {
      next(error);
      return;
    }
  }
  ,

  /**
   * Delete user by ID
   * @route DELETE /api/users/:userId
   */
  deleteUser: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      await userService.deleteUserById(userId);
      res.json(successResponse({}, 'User deleted successfully'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get all users with filtering
   * @route GET /api/users
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
          { email: { $regex: search, $options: 'i' } }
        ];
      }
      
      // Set options
      const options = {
        sortBy: sortBy as string,
        limit: limit ? parseInt(limit as string, 10) : 10,
        page: page ? parseInt(page as string, 10) : 1
      };
      
      const result = await userService.getUsers(filter, options);
      
      res.json(successResponse(result, 'Users retrieved successfully'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get participant by ID
   * @route GET /api/users/participants/:participantId
   */
  getParticipantById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { participantId } = req.params;
      const participant = await userService.getParticipantById(participantId);
      
      if (!participant) {
        return res.status(httpStatus.NOT_FOUND).json(
          errorResponse('Participant not found', httpStatus.NOT_FOUND)
        );
      }
      
      return res.json(successResponse({ participant }, 'Participant retrieved successfully'));
    } catch (error) {
      next(error);
      return;
    }
  },

  /**
   * Get support worker by ID
   * @route GET /api/users/workers/:workerId
   */
  getWorkerById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workerId } = req.params;
      const worker = await userService.getWorkerById(workerId);
      
      if (!worker) {
        return res.status(httpStatus.NOT_FOUND).json(
          errorResponse('Support worker not found', httpStatus.NOT_FOUND)
        );
      }
      
      return res.json(successResponse({ worker }, 'Support worker retrieved successfully'));
    } catch (error) {
      next(error);
      return;
    }
  },

  /**
   * Get coordinator by ID
   * @route GET /api/users/coordinators/:coordinatorId
   */
  getCoordinatorById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { coordinatorId } = req.params;
      const coordinator = await userService.getCoordinatorById(coordinatorId);
      
      if (!coordinator) {
        return res.status(httpStatus.NOT_FOUND).json(
          errorResponse('Coordinator not found', httpStatus.NOT_FOUND)
        );
      }
      
      return res.json(successResponse({ coordinator }, 'Coordinator retrieved successfully'));
    } catch (error) {
      next(error);
      return;
    }
  },

  /**
   * Update user status
   * @route PATCH /api/users/:userId/status
   */
  updateUserStatus: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const { status } = req.body;
      
      // Check if status is valid
      if (!Object.values(UserStatus).includes(status as UserStatus)) {
        return res.status(httpStatus.BAD_REQUEST).json(
          errorResponse('Invalid status value', httpStatus.BAD_REQUEST)
        );
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
   * @route POST /api/users/participants/:participantId/guardians/:guardianId
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
   * @route DELETE /api/users/participants/:participantId/guardians/:guardianId
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
   * Complete worker onboarding
   * @route POST /api/users/workers/onboarding
   */
  completeWorkerOnboarding: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      // Check if user is a support worker
      if (req.user.role !== UserRole.SUPPORT_WORKER) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only support workers can complete onboarding', httpStatus.FORBIDDEN)
        );
      }

      const workerId = req.user._id.toString();
      const onboardingData = req.body;

      const updatedWorker = await userService.completeWorkerOnboarding(workerId, onboardingData);

      return res.json(successResponse({ worker: updatedWorker }, 'Worker onboarding completed successfully'));
    } catch (error) {
      next(error);
      return;
    }
  }
};