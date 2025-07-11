/**
 * User service
 * Handles user management operations
 */

import httpStatus from 'http-status';
import mongoose from 'mongoose';
import User, { IUser } from '../models/user.model';
import Participant, { IParticipant } from '../models/participant.model';
import Guardian from '../models/guardian.model';
import Worker, { IWorker } from '../models/worker.model';
import Coordinator from '../models/coordinator.model';
import { UserStatus } from '../types/user.types';
import { uploadProfileImage } from '../utils/cloudinary';
import ApiError from '../utils/api-error';
import logger from '../utils/logger';
import Admin, { IAdmin } from '../models/admin.model';


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
   * Update worker profile by ID
   */
  updateWorkerById: async (workerId: string, updateData: Partial<IWorker>): Promise<IWorker | null> => {
    try {
      // Validate workerId
      if (!mongoose.Types.ObjectId.isValid(workerId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid workerId');
      }

      // Check if user exists and is a worker
      const worker = await Worker.findById(workerId);
      if (!worker) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Worker not found');
      }

      // Process skills if provided - convert strings to ObjectIds
      if (updateData.skills) {
        updateData.skills = (updateData.skills as any[]).map(skillId => 
          new mongoose.Types.ObjectId(skillId)
        );
      }

      // Update worker with role-specific fields
      const updatedWorker = await Worker.findByIdAndUpdate(
        workerId,
        updateData,
        { new: true, runValidators: true }
      );

      return updatedWorker;
    } catch (error) {
      logger.error(`Error updating worker ${workerId}:`, error);
      throw error;
    }
  },

  /**
   * Complete worker onboarding
   */
  completeWorkerOnboarding: async (
    workerId: string,
    onboardingData: {
      bio: string;
      skills: string[];
      languages: string[];
      experience?: {
        title: string;
        organization: string;
        startDate: Date;
        endDate?: Date;
        description?: string;
      }[];
      shiftRates: {
        rateTimeBandId: string;
        hourlyRate: number;
      }[];
      availability: {
        weekdays: {
          day: string;
          available: boolean;
          slots?: {
            start: string;
            end: string;
          }[];
        }[];
        unavailableDates?: Date[];
      };
    }
  ): Promise<IWorker | null> => {
    try {
      // Validate workerId
      if (!mongoose.Types.ObjectId.isValid(workerId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid workerId');
      }

      // Check if user exists and is a worker
      const worker = await Worker.findById(workerId);
      if (!worker) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Worker not found');
      }

      // Check if user's email is verified
      if (!worker.isEmailVerified) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Email must be verified before onboarding');
      }

      // Check if onboarding is already complete
      if (worker.verificationStatus.onboardingComplete) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Onboarding already completed');
      }

      // Convert rateTimeBandId strings to ObjectIds
      const shiftRates = onboardingData.shiftRates.map(rate => ({
        rateTimeBandId: new mongoose.Types.ObjectId(rate.rateTimeBandId),
        hourlyRate: rate.hourlyRate
      }));

      // Convert skill strings to ObjectIds
      const skills = onboardingData.skills.map(skillId => new mongoose.Types.ObjectId(skillId));

      // Prepare update data
      const updateData: Partial<IWorker> = {
        bio: onboardingData.bio,
        skills,
        languages: onboardingData.languages,
        experience: onboardingData.experience || [],
        shiftRates,
        availability: {
          ...onboardingData.availability,
          unavailableDates: onboardingData.availability.unavailableDates || []
        },
        verificationStatus: {
          ...worker.verificationStatus,
          profileSetupComplete: true,
          onboardingComplete: true
        }
      };

      // Update worker with onboarding data
      const updatedWorker = await Worker.findByIdAndUpdate(
        workerId,
        updateData,
        { new: true, runValidators: true }
      )
      .populate('skills', 'name code')
      .populate('shiftRates.rateTimeBandId', 'name code startTime endTime');

      return updatedWorker;
    } catch (error) {
      logger.error(`Error completing worker onboarding ${workerId}:`, error);
      throw error;
    }
  },

  /**
   * Complete participant onboarding
   */
  completeParticipantOnboarding: async (
    participantId: string,
    onboardingData: {
      supportNeeds: string[];
      emergencyContact?: {
        name: string;
        relationship: string;
        phone: string;
      };
      planManager?: {
        name: string;
        email: string;
      };
      preferredLanguages?: string[];
      preferredGenders?: string[];
      notes?: string;
      ndisNumber?: string;
      requiresSupervision?: boolean;
      subscription?: {
        tier: string;
        paymentMethod?: string;
      };
    }
  ): Promise<IParticipant | null> => {
    try {
      // Validate participantId
      if (!mongoose.Types.ObjectId.isValid(participantId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid participantId');
      }

      // Check if user exists and is a participant
      const participant = await Participant.findById(participantId);
      if (!participant) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Participant not found');
      }

      // Check if user's email is verified
      if (!participant.isEmailVerified) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Email must be verified before onboarding');
      }

      // Check if onboarding is already complete
      if (participant.onboardingComplete) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Onboarding already completed');
      }

      // Convert supportNeeds strings to ObjectIds
      const supportNeeds = onboardingData.supportNeeds.map(serviceTypeId => 
        new mongoose.Types.ObjectId(serviceTypeId)
      );

      // Prepare update data
      const updateData: Partial<IParticipant> = {
        supportNeeds,
        emergencyContact: onboardingData.emergencyContact,
        planManager: onboardingData.planManager,
        preferredLanguages: onboardingData.preferredLanguages || [],
        preferredGenders: onboardingData.preferredGenders || [],
        notes: onboardingData.notes,
        ndisNumber: onboardingData.ndisNumber,
        requiresSupervision: onboardingData.requiresSupervision || false,
        onboardingComplete: true
      };

      // Update subscription if provided
      if (onboardingData.subscription) {
        updateData.subscription = {
          ...participant.subscription,
          tier: onboardingData.subscription.tier as any,
          paymentMethod: onboardingData.subscription.paymentMethod,
          isActive: true
        };
      }

      // Update participant with onboarding data
      const updatedParticipant = await Participant.findByIdAndUpdate(
        participantId,
        updateData,
        { new: true, runValidators: true }
      )
      .populate('supportNeeds', 'name code');

      return updatedParticipant;
    } catch (error) {
      logger.error(`Error completing participant onboarding ${participantId}:`, error);
      throw error;
    }
  },

  /**
   * Update participant profile by ID
   */
  updateParticipantById: async (
    participantId: string, updateData: Partial<IParticipant>
  ): Promise<IParticipant | null> => {
    try {
      // Similar implementation to updateWorkerById but for Participant model
      if (!mongoose.Types.ObjectId.isValid(participantId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid participantId');
      }

      const participant = await Participant.findById(participantId);
      if (!participant) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Participant not found');
      }

      // Process supportNeeds if provided - convert strings to ObjectIds
      if (updateData.supportNeeds) {
        updateData.supportNeeds = (updateData.supportNeeds as any[]).map(serviceTypeId => 
          new mongoose.Types.ObjectId(serviceTypeId)
        );
      }

      const updatedParticipant = await Participant.findByIdAndUpdate(
        participantId,
        updateData,
        { new: true, runValidators: true }
      )
      .populate('supportNeeds', 'name code');

      return updatedParticipant;
    } catch (error) {
      logger.error(`Error updating participant ${participantId}:`, error);
      throw error;
    }
  },

  /**
   * Update admin profile by ID
   */
  updateAdminById: async (
    adminId: string, updateData: Partial<IAdmin>): Promise<IAdmin | null> => {

    try {
      // Similar implementation for Admin model
      if (!mongoose.Types.ObjectId.isValid(adminId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid adminId');
      }

      const admin = await Admin.findById(adminId);
      if (!admin) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Admin not found');
      }

      const updatedAdmin = await Admin.findByIdAndUpdate(
        adminId,
        updateData,
        { new: true, runValidators: true }
      );

      return updatedAdmin;
    } catch (error) {
      logger.error(`Error updating admin ${adminId}:`, error);
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
      const participant = await Participant.findById(participantId)
        .populate('supportNeeds', 'name code');
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
      const worker = await Worker.findById(workerId)
        .populate('skills', 'name code')
        .populate('shiftRates.rateTimeBandId', 'name code startTime endTime');
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
