/**
 * Admin User Management Service
 * Handles advanced user listing with filtering, sorting, search, and pagination
 */

// import mongoose from 'mongoose';
// import User from '../models/user.model';
import Participant from '../models/participant.model';
import Worker from '../models/worker.model';
import Admin from '../models/admin.model';
import { UserRole, UserStatus } from '../types/user.types';
import logger from '../utils/logger';

/**
 * Common filter interface for all user types
 */
export interface BaseUserFilters {
  status?: UserStatus;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  isEmailVerified?: boolean;
  hasProfileImage?: boolean;
}

/**
 * Participant-specific filters
 */
export interface ParticipantFilters extends BaseUserFilters {
  hasGuardian?: boolean;
  subscriptionTier?: string;
  subscriptionStatus?: 'active' | 'inactive';
  hasNdisNumber?: boolean;
  requiresSupervision?: boolean;
  hasOrganization?: boolean;
}

/**
 * Support Worker-specific filters
 */
export interface WorkerFilters extends BaseUserFilters {
  skills?: string[];
  serviceAreas?: string[];
  languages?: string[];
  verificationStatus?: {
    profileSetupComplete?: boolean;
    identityVerified?: boolean;
    policeCheckVerified?: boolean;
    ndisWorkerScreeningVerified?: boolean;
    onboardingComplete?: boolean;
    onboardingFeeReceived?: boolean;
  };
  hasAbn?: boolean;
  hasBankDetails?: boolean;
  minRating?: number;
  maxRating?: number;
  minHourlyRate?: number;
  maxHourlyRate?: number;
  hasQualifications?: boolean;
  hasExperience?: boolean;
  organizationCount?: {
    min?: number;
    max?: number;
  };
}

/**
 * Admin-specific filters
 */
export interface AdminFilters extends BaseUserFilters {
  adminType?: string;
  permissions?: {
    canManageUsers?: boolean;
    canManageWorkers?: boolean;
    canManageParticipants?: boolean;
    canApproveInvites?: boolean;
    canManageServiceAgreements?: boolean;
    canManageSubscriptions?: boolean;
    canAccessFinancials?: boolean;
    canManageAdmins?: boolean;
  };
  hasAssignedOrganizations?: boolean;
}

/**
 * Sorting options
 */
export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page: number;
  limit: number;
}

/**
 * Response interface for paginated results
 */
export interface PaginatedUserResponse<T> {
  users: T[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalResults: number;
    hasMore: boolean;
  };
  filters: Record<string, any>;
  sort: SortOptions;
}

/**
 * Admin User Management Service
 */
export const adminUserService = {
  /**
   * Get participants with advanced filtering
   */
  getParticipants: async (
    filters: ParticipantFilters = {},
    sort: SortOptions = { field: 'createdAt', direction: 'desc' },
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<PaginatedUserResponse<any>> => {
    try {
      const query: any = { role: UserRole.PARTICIPANT };

      // Apply base filters
      adminUserService.applyBaseFilters(query, filters);

      // Apply participant-specific filters
      if (filters.hasGuardian !== undefined) {
        if (filters.hasGuardian) {
          query.guardianId = { $exists: true, $ne: null };
        } else {
          query.$or = [
            { guardianId: { $exists: false } },
            { guardianId: null }
          ];
        }
      }

      if (filters.subscriptionTier) {
        query['subscription.tier'] = filters.subscriptionTier;
      }

      if (filters.subscriptionStatus) {
        query['subscription.isActive'] = filters.subscriptionStatus === 'active';
      }

      if (filters.hasNdisNumber !== undefined) {
        if (filters.hasNdisNumber) {
        //   query.ndisNumber = { $exists: true, $ne: null, $ne: '' };
        query.$and = [
            { ndisNumber: { $exists: true } },
            { ndisNumber: { $ne: null } },
            { ndisNumber: { $ne: '' } }
        ];
        } else {
          query.$or = [
            { ndisNumber: { $exists: false } },
            { ndisNumber: null },
            { ndisNumber: '' }
          ];
        }
      }

      if (filters.requiresSupervision !== undefined) {
        query.requiresSupervision = filters.requiresSupervision;
      }

      // Calculate pagination
      const skip = (pagination.page - 1) * pagination.limit;

      // Build sort object
      const sortObj: Record<string, 1 | -1> = {};
      sortObj[sort.field] = sort.direction === 'asc' ? 1 : -1;

      // Execute query with aggregation to include organization info
      const pipeline = [
        { $match: query },
        {
          $lookup: {
            from: 'organizations',
            localField: '_id',
            foreignField: 'participantId',
            as: 'organization'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'guardianId',
            foreignField: '_id',
            as: 'guardian'
          }
        },
        {
          $addFields: {
            hasOrganization: { $gt: [{ $size: '$organization' }, 0] },
            organizationCount: { $size: '$organization' },
            guardianInfo: { $arrayElemAt: ['$guardian', 0] }
          }
        }
      ];

      // Apply hasOrganization filter if specified
      if (filters.hasOrganization !== undefined) {
        pipeline.push({
          $match: { hasOrganization: filters.hasOrganization }
        } as any);
      }

      // Add sorting and pagination
      pipeline.push(
        { $sort: sortObj } as any,
        { $skip: skip } as any,
        { $limit: pagination.limit } as any
      );

      // Project fields to exclude sensitive data
      pipeline.push({
        $project: {
          password: 0,
          emailVerificationToken: 0,
          emailVerificationExpires: 0,
          passwordResetToken: 0,
          passwordResetExpires: 0,
          'guardian.password': 0,
          'guardian.emailVerificationToken': 0,
          'guardian.emailVerificationExpires': 0,
          'guardian.passwordResetToken': 0,
          'guardian.passwordResetExpires': 0
        }
      } as any);

      const [participants, totalCount] = await Promise.all([
        Participant.aggregate(pipeline),
        Participant.countDocuments(query)
      ]);

      const totalPages = Math.ceil(totalCount / pagination.limit);

      return {
        users: participants,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          totalPages,
          totalResults: totalCount,
          hasMore: pagination.page < totalPages
        },
        filters,
        sort
      };
    } catch (error) {
      logger.error('Error getting participants:', error);
      throw error;
    }
  },

  /**
   * Get support workers with advanced filtering
   */
  getWorkers: async (
    filters: WorkerFilters = {},
    sort: SortOptions = { field: 'createdAt', direction: 'desc' },
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<PaginatedUserResponse<any>> => {
    try {
      const query: any = { role: UserRole.SUPPORT_WORKER };

      // Apply base filters
      adminUserService.applyBaseFilters(query, filters);

      // Apply worker-specific filters
      if (filters.skills && filters.skills.length > 0) {
        query.skills = { $in: filters.skills };
      }

      if (filters.serviceAreas && filters.serviceAreas.length > 0) {
        query.serviceAreas = { $in: filters.serviceAreas };
      }

      if (filters.languages && filters.languages.length > 0) {
        query.languages = { $in: filters.languages };
      }

      // Verification status filters
      if (filters.verificationStatus) {
        Object.entries(filters.verificationStatus).forEach(([key, value]) => {
          if (value !== undefined) {
            query[`verificationStatus.${key}`] = value;
          }
        });
      }

      if (filters.hasAbn !== undefined) {
        if (filters.hasAbn) {
        //   query.abn = { $exists: true, $ne: null, $ne: '' };
        query.$and = [
            { abn: { $exists: true } },
            { abn: { $ne: null } },
            { abn: { $ne: '' } }
        ];
        } else {
          query.$or = [
            { abn: { $exists: false } },
            { abn: null },
            { abn: '' }
          ];
        }
      }

      if (filters.hasBankDetails !== undefined) {
        if (filters.hasBankDetails) {
        //   query['bankDetails.accountName'] = { $exists: true, $ne: null, $ne: '' };
        query['bankDetails.accountName'] = {
            $exists: true,
            $nin: [null, '']
        };
        } else {
          query.$or = [
            { 'bankDetails.accountName': { $exists: false } },
            { 'bankDetails.accountName': null },
            { 'bankDetails.accountName': '' }
          ];
        }
      }

      if (filters.minRating !== undefined) {
        query['ratings.average'] = { $gte: filters.minRating };
      }

      if (filters.maxRating !== undefined) {
        query['ratings.average'] = { ...query['ratings.average'], $lte: filters.maxRating };
      }

      if (filters.minHourlyRate !== undefined) {
        query['hourlyRate.baseRate'] = { $gte: filters.minHourlyRate };
      }

      if (filters.maxHourlyRate !== undefined) {
        query['hourlyRate.baseRate'] = { ...query['hourlyRate.baseRate'], $lte: filters.maxHourlyRate };
      }

      if (filters.hasQualifications !== undefined) {
        if (filters.hasQualifications) {
          query.qualifications = { $exists: true, $not: { $size: 0 } };
        } else {
          query.$or = [
            { qualifications: { $exists: false } },
            { qualifications: { $size: 0 } }
          ];
        }
      }

      if (filters.hasExperience !== undefined) {
        if (filters.hasExperience) {
          query.experience = { $exists: true, $not: { $size: 0 } };
        } else {
          query.$or = [
            { experience: { $exists: false } },
            { experience: { $size: 0 } }
          ];
        }
      }

      // Calculate pagination
      const skip = (pagination.page - 1) * pagination.limit;

      // Build sort object
      const sortObj: Record<string, 1 | -1> = {};
      sortObj[sort.field] = sort.direction === 'asc' ? 1 : -1;

      // Execute query with aggregation to include organization count
      const pipeline = [
        { $match: query },
        {
          $lookup: {
            from: 'organizations',
            localField: '_id',
            foreignField: 'workers.workerId',
            as: 'workerOrganizations'
          }
        },
        {
          $addFields: {
            organizationCount: { $size: '$workerOrganizations' }
          }
        }
      ];

      // Apply organization count filter if specified
      if (filters.organizationCount) {
        const orgCountMatch: any = {};
        if (filters.organizationCount.min !== undefined) {
          orgCountMatch.organizationCount = { $gte: filters.organizationCount.min };
        }
        if (filters.organizationCount.max !== undefined) {
          orgCountMatch.organizationCount = { 
            ...orgCountMatch.organizationCount, 
            $lte: filters.organizationCount.max 
          };
        }
        pipeline.push({ $match: orgCountMatch } as any);
      }

      // Add sorting and pagination
      pipeline.push(
        { $sort: sortObj } as any,
        { $skip: skip } as any,
        { $limit: pagination.limit } as any
      );

      // Project fields to exclude sensitive data
      pipeline.push({
        $project: {
          password: 0,
          emailVerificationToken: 0,
          emailVerificationExpires: 0,
          passwordResetToken: 0,
          passwordResetExpires: 0,
          workerOrganizations: 0 // Remove the full organization data, keep only count
        }
      } as any);

      const [workers, totalCount] = await Promise.all([
        Worker.aggregate(pipeline),
        Worker.countDocuments(query)
      ]);

      const totalPages = Math.ceil(totalCount / pagination.limit);

      return {
        users: workers,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          totalPages,
          totalResults: totalCount,
          hasMore: pagination.page < totalPages
        },
        filters,
        sort
      };
    } catch (error) {
      logger.error('Error getting workers:', error);
      throw error;
    }
  },

  /**
   * Get admins with advanced filtering
   */
  getAdmins: async (
    filters: AdminFilters = {},
    sort: SortOptions = { field: 'createdAt', direction: 'desc' },
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<PaginatedUserResponse<any>> => {
    try {
      const query: any = { role: UserRole.ADMIN };

      // Apply base filters
      adminUserService.applyBaseFilters(query, filters);

      // Apply admin-specific filters
      if (filters.adminType) {
        query.adminType = filters.adminType;
      }

      // Permissions filters
      if (filters.permissions) {
        Object.entries(filters.permissions).forEach(([key, value]) => {
          if (value !== undefined) {
            query[`permissions.${key}`] = value;
          }
        });
      }

      if (filters.hasAssignedOrganizations !== undefined) {
        if (filters.hasAssignedOrganizations) {
          query.assignedOrganizations = { $exists: true, $not: { $size: 0 } };
        } else {
          query.$or = [
            { assignedOrganizations: { $exists: false } },
            { assignedOrganizations: { $size: 0 } }
          ];
        }
      }

      // Calculate pagination
      const skip = (pagination.page - 1) * pagination.limit;

      // Build sort object
      const sortObj: Record<string, 1 | -1> = {};
      sortObj[sort.field] = sort.direction === 'asc' ? 1 : -1;

      // Execute query with aggregation to include assigned organization details
      const pipeline = [
        { $match: query },
        {
          $lookup: {
            from: 'organizations',
            localField: 'assignedOrganizations',
            foreignField: '_id',
            as: 'assignedOrgDetails'
          }
        },
        {
          $addFields: {
            assignedOrganizationCount: { $size: '$assignedOrgDetails' }
          }
        },
        { $sort: sortObj } as any,
        { $skip: skip } as any,
        { $limit: pagination.limit } as any,
        {
          $project: {
            password: 0,
            emailVerificationToken: 0,
            emailVerificationExpires: 0,
            passwordResetToken: 0,
            passwordResetExpires: 0,
            'assignedOrgDetails.workers': 0, // Don't include full worker details
            'assignedOrgDetails.pendingInvites': 0 // Don't include invite details
          }
        } as any
      ];

      const [admins, totalCount] = await Promise.all([
        Admin.aggregate(pipeline),
        Admin.countDocuments(query)
      ]);

      const totalPages = Math.ceil(totalCount / pagination.limit);

      return {
        users: admins,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          totalPages,
          totalResults: totalCount,
          hasMore: pagination.page < totalPages
        },
        filters,
        sort
      };
    } catch (error) {
      logger.error('Error getting admins:', error);
      throw error;
    }
  },

  /**
   * Apply base filters common to all user types
   */
  applyBaseFilters: (query: any, filters: BaseUserFilters): void => {
    // Status filter
    if (filters.status) {
      query.status = filters.status;
    }

    // Search filter (firstName, lastName, email)
    if (filters.search) {
      const searchRegex = { $regex: filters.search, $options: 'i' };
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex }
      ];
    }

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) {
        query.createdAt.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        query.createdAt.$lte = filters.dateTo;
      }
    }

    // Email verification filter
    if (filters.isEmailVerified !== undefined) {
      query.isEmailVerified = filters.isEmailVerified;
    }

    // Profile image filter
    if (filters.hasProfileImage !== undefined) {
      if (filters.hasProfileImage) {
        // query.profileImage = { $exists: true, $ne: null, $ne: '' };
        query.profileImage = {
            $exists: true,
            $nin: [null, '']
        };
      } else {
        query.$or = [
          { profileImage: { $exists: false } },
          { profileImage: null },
          { profileImage: '' }
        ];
      }
    }
  },

  /**
   * Get filter options for frontend dropdowns
   */
  getFilterOptions: async (): Promise<{
    skills: string[];
    serviceAreas: string[];
    languages: string[];
    subscriptionTiers: string[];
    adminTypes: string[];
    userStatuses: string[];
  }> => {
    try {
      const [
        skills,
        serviceAreas,
        languages,
        subscriptionTiers,
        adminTypes
      ] = await Promise.all([
        Worker.distinct('skills'),
        Worker.distinct('serviceAreas'),
        Worker.distinct('languages'),
        Participant.distinct('subscription.tier'),
        Admin.distinct('adminType')
      ]);

      return {
        skills: skills.filter(Boolean),
        serviceAreas: serviceAreas.filter(Boolean),
        languages: languages.filter(Boolean),
        subscriptionTiers: subscriptionTiers.filter(Boolean),
        adminTypes: adminTypes.filter(Boolean),
        userStatuses: Object.values(UserStatus)
      };
    } catch (error) {
      logger.error('Error getting filter options:', error);
      throw error;
    }
  }
};