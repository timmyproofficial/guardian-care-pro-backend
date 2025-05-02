/**
 * User service
 * Handles user management operations
 */

import httpStatus from 'http-status';
import mongoose from 'mongoose';
import User, { IUser } from '../models/user.model';
import Participant from '../models/participant.model';
import Guardian from '../models/guardian.model';
import Worker from '../models/worker.model';
import Coordinator from '../models/coordinator.model';
import { UserStatus } from '../types/user.types';
import { uploadProfileImage } from '../utils/cloudinary';
import ApiError from '../utils/api-error';
import logger from '../utils/logger';


/**
 * User service implementation
*/
export const userService = {
  /**
   * Get user by ID
   */
  getUserById: async (id: string): Promise<IUser | null> => {
    try{
      if(!mongoose.Types.ObjectId.isValid(id)){
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid userID');
      }

      const user = await User.findById(id);
      return user;
    } catch(error){
      logger.error(`Error getting user by ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Get user by email
   */
  getUserByEmail: async (email: string): Promise<IUser | null> => {
    try{
      const user = await User.findOne({ email });
      return user;
    } catch(error){
      logger.error(`Error getting user by email ${email}:`, error);
      throw error;
    }
  },

  /**
   * Update user by ID
   */
  updateUserById: async (userId: string, updateData: Partial<IUser>): Promise<IUser | null> => {
    try{
      // Check if email is being updated and is taken
      if(updateData.email){
        const emailTaken = await User.isEmailTaken(updateData.email, new mongoose.Types.ObjectId(userId));
        if(emailTaken) {
          throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
        }
      }

      // Remove sensitive fields that shouldn't be updated directly
      const sanitizedData = { ...updateData };
      delete sanitizedData.password;
      delete sanitizedData.role;
      delete sanitizedData.status;
      delete sanitizedData.isEmailVerified;

      // Update user
      const user = await User.findByIdAndUpdate(userId, sanitizedData, {
        new: true,
        runValidators: true,
      });

      if(!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
      }

      return user;
    }catch (error) {
      logger.error(`Error updating user ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Update user password
   */
  updatePassword: async (userId: string, currentPassword: string, newPassword: string): Promise<void> => {
    try {
      const user = await User.findById(userId).select('+password');

      if(!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
      }

      // Check current password
      const isPasswordMatch = await user.isPasswordMatch(currentPassword);

      if(!isPasswordMatch) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect password');
      }

      // Update password
      user.password = newPassword;
      await user.save();
    } catch (error) {
      logger.error(`Error updating password for user ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Delete user by ID
   */
  deleteUserById: async (userId: string): Promise<void> => {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
      }

      await User.deleteOne({ _id: userId });
    } catch (error) {
      logger.error(`Error deleting user ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Get all users with optional filtering
   */
  getUsers: async (
    filter: Record<string, any> = {},
    options: {
      sortBy?: string;
      limit?: number;
      page?: number;
    } = {}
  ): Promise<{
    users: IUser[],
    page: number;
    limit: number;
    totalPages: number;
    totalResults: number;
  }> => {
    try{
      const { sortBy, limit = 10, page = 1 } = options;

      // Set up pagination
      const skip = (page - 1) * limit;

      // Create sort object
      const sort: Record<string, 1 | -1> = {};
      if(sortBy) {
        const [sortField, sortOrder] = sortBy.split(':');
        sort[sortField] = sortOrder === 'desc' ? -1 : 1;
      } else {
        sort.createdAt = -1; // Default sort by created date descending
      }

      // Execute query
      const users = await User.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit);

      // Get total count
      const totalResults = await User.countDocuments(filter);

      return {
        users,
        page,
        limit,
        totalPages: Math.ceil(totalResults / limit),
        totalResults,
      };
    } catch (error) {
      logger.error('Error getting users:', error);
      throw error;
    }
  },

  /**
   * Get participant by ID
   */
  getParticipantById: async (participantId: string): Promise<IUser | null> => {
    try{
      const participant = await Participant.findById(participantId);
      return participant;
    } catch (error) {
      logger.error(`Error getting participant ${participantId}:`, error);
      throw error;
    }
  },

  /**
   * Get support worker by ID
   */
  getWorkerById: async (workerId: string): Promise<IUser | null> => {
    try{
      const worker = await Worker.findById(workerId);
      return worker;
    } catch (error) {
      logger.error(`Error getting worker ${workerId}:`, error);
      throw error;
    }
  },

  /**
   * Get coordinator by ID
   */
  getCoordinatorById: async (coordinatorId: string): Promise<IUser | null> => {
    try {
      const coordinator = await Coordinator.findById(coordinatorId);
      return coordinator;
    } catch (error) {
      logger.error(`Error getting coordinator ${coordinatorId}:`, error);
      throw error;
    }
  },

  /**
   * Update user status
   */
  updateUserStatus: async (userId: string, status: UserStatus): Promise<IUser | null> => {
    try {
      const user = await User.findByIdAndUpdate(userId, { status }, { new: true });

      if(!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
      }

      return user;
    } catch (error) {
      logger.error(`Error updating status for user ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Update user profile image
  */
  updateProfileImage: async (userId: string, filePath: string): Promise<IUser | null> => {
    try {
      // Upload the image to Cloudinary
      const uploadResult = await uploadProfileImage(filePath, userId);
      
      // Update the user with the new profile image URL
      const user = await User.findByIdAndUpdate(
        userId,
        { profileImage: uploadResult.secure_url },
        { new: true }
      );
      
      if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
      }
      
      return user;
    } catch (error) {
      logger.error(`Error updating profile image for user ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Link guardian to participant
   */
  linkGuardianToParticipant: async (guardianId: string, participantId: string): Promise<void> => {
    try {
      const session = await mongoose.startSession();
      session.startTransaction();

      try{
        // Check that both users exist and have correct roles
        const guardian = await Guardian.findById(guardianId).session(session);
        if(!guardian) {
          throw new ApiError(httpStatus.NOT_FOUND, 'Guardian not found');
        }

        const participant = await Participant.findById(participantId).session(session);
        if(!participant) {
          throw new ApiError(httpStatus.NOT_FOUND, 'Participant not found');
        }

        // Update guardian's participants array
        if(!guardian.participants.includes(new mongoose.Types.ObjectId(participantId))){
          guardian.participants.push(new mongoose.Types.ObjectId(participantId));
          await guardian.save({ session });
        }

        // Update participant's guardianId
        participant.guardianId = new mongoose.Types.ObjectId(guardianId);
        await participant.save({ session });

        await session.commitTransaction();
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    } catch (error) {
      logger.error(`Error linking guardian ${guardianId} to participant ${participantId}:`, error);
      throw error;
    }
  },

  /**
   * Unlink guardian from participant
   */
  unlinkGuardianFromParticipant: async (guardianId: string, participantId: string): Promise<void> => {
    try {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Check that both users exist
        const guardian = await Guardian.findById(guardianId).session(session);
        if(!guardian) {
          throw new ApiError(httpStatus.NOT_FOUND, 'Guardian not found');
        }

        const participant = await Participant.findById(participantId).session(session);
        if(!participant) {
          throw new ApiError(httpStatus.NOT_FOUND, 'Participant not found');
        }

        // Remove participant from guardian's array
        guardian.participants = guardian.participants.filter(
          (id) => !id.equals(new mongoose.Types.ObjectId(participantId))
        );
        await guardian.save({ session });

        // Remove guardianId from participant if it matches
        if (participant.guardianId && participant.guardianId.equals(new mongoose.Types.ObjectId(guardianId))){
          participant.guardianId = undefined;
          await participant.save({ session });
        }

        await session.commitTransaction();
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    } catch (error) {
        logger.error(`Error unlinking guardian ${guardianId} from participant ${participantId}:`, error);
        throw error;
    }
  }
};
