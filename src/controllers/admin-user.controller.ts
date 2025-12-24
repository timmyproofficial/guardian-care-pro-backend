/**
 * Admin User Management Controller
 * Handles HTTP requests for admin user management operations
 */

import { Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { 
  adminUserService,
  ParticipantFilters,
  WorkerFilters,
  AdminFilters,
  SortOptions,
  PaginationOptions
} from '../services/admin-user.service';
import { successResponse, errorResponse } from '../utils/api-response';
import { UserRole } from '../types/user.types';

export const adminUserController = {
  /**
   * Get participants with advanced filtering
   * @route GET /api/v1/admin/participants
   */
  getParticipants: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      // Only admins can access this endpoint
      if (req.user.role !== UserRole.ADMIN) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only administrators can access this endpoint', httpStatus.FORBIDDEN)
        );
      }

      // Parse filters from query parameters
      const filters: ParticipantFilters = {
        status: req.query.status as any,
        search: req.query.search as string,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        isEmailVerified: req.query.isEmailVerified === 'true' ? true : 
                        req.query.isEmailVerified === 'false' ? false : undefined,
        hasProfileImage: req.query.hasProfileImage === 'true' ? true : 
                        req.query.hasProfileImage === 'false' ? false : undefined,
        hasGuardian: req.query.hasGuardian === 'true' ? true : 
                    req.query.hasGuardian === 'false' ? false : undefined,
        subscriptionTier: req.query.subscriptionTier as string,
        subscriptionStatus: req.query.subscriptionStatus as 'active' | 'inactive',
        hasNdisNumber: req.query.hasNdisNumber === 'true' ? true : 
                      req.query.hasNdisNumber === 'false' ? false : undefined,
        requiresSupervision: req.query.requiresSupervision === 'true' ? true : 
                            req.query.requiresSupervision === 'false' ? false : undefined,
        hasOrganization: req.query.hasOrganization === 'true' ? true : 
                        req.query.hasOrganization === 'false' ? false : undefined
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => 
        filters[key as keyof ParticipantFilters] === undefined && 
        delete filters[key as keyof ParticipantFilters]
      );

      // Parse sorting options
      const sort: SortOptions = {
        field: req.query.sortField as string || 'createdAt',
        direction: (req.query.sortDirection as 'asc' | 'desc') || 'desc'
      };

      // Parse pagination options
      const pagination: PaginationOptions = {
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 20, 100) // Max 100 per page
      };

      const result = await adminUserService.getParticipants(filters, sort, pagination);

      return res.json(successResponse(result, 'Participants retrieved successfully'));
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get support workers with advanced filtering
   * @route GET /api/v1/admin/support-workers
   */
  getWorkers: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      // Only admins can access this endpoint
      if (req.user.role !== UserRole.ADMIN) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only administrators can access this endpoint', httpStatus.FORBIDDEN)
        );
      }

      // Parse filters from query parameters
      const filters: WorkerFilters = {
        status: req.query.status as any,
        search: req.query.search as string,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        isEmailVerified: req.query.isEmailVerified === 'true' ? true : 
                        req.query.isEmailVerified === 'false' ? false : undefined,
        hasProfileImage: req.query.hasProfileImage === 'true' ? true : 
                        req.query.hasProfileImage === 'false' ? false : undefined,
        skills: req.query.skills ? (req.query.skills as string).split(',') : undefined,
        serviceAreas: req.query.serviceAreas ? (req.query.serviceAreas as string).split(',') : undefined,
        languages: req.query.languages ? (req.query.languages as string).split(',') : undefined,
        hasAbn: req.query.hasAbn === 'true' ? true : 
               req.query.hasAbn === 'false' ? false : undefined,
        hasBankDetails: req.query.hasBankDetails === 'true' ? true : 
                       req.query.hasBankDetails === 'false' ? false : undefined,
        minRating: req.query.minRating ? parseFloat(req.query.minRating as string) : undefined,
        maxRating: req.query.maxRating ? parseFloat(req.query.maxRating as string) : undefined,
        minHourlyRate: req.query.minHourlyRate ? parseFloat(req.query.minHourlyRate as string) : undefined,
        maxHourlyRate: req.query.maxHourlyRate ? parseFloat(req.query.maxHourlyRate as string) : undefined,
        hasQualifications: req.query.hasQualifications === 'true' ? true : 
                          req.query.hasQualifications === 'false' ? false : undefined,
        hasExperience: req.query.hasExperience === 'true' ? true : 
                      req.query.hasExperience === 'false' ? false : undefined
      };

      // Parse verification status filters
      if (req.query.profileSetupComplete !== undefined) {
        filters.verificationStatus = filters.verificationStatus || {};
        filters.verificationStatus.profileSetupComplete = req.query.profileSetupComplete === 'true';
      }
      if (req.query.identityVerified !== undefined) {
        filters.verificationStatus = filters.verificationStatus || {};
        filters.verificationStatus.identityVerified = req.query.identityVerified === 'true';
      }
      if (req.query.policeCheckVerified !== undefined) {
        filters.verificationStatus = filters.verificationStatus || {};
        filters.verificationStatus.policeCheckVerified = req.query.policeCheckVerified === 'true';
      }
      if (req.query.ndisWorkerScreeningVerified !== undefined) {
        filters.verificationStatus = filters.verificationStatus || {};
        filters.verificationStatus.ndisWorkerScreeningVerified = req.query.ndisWorkerScreeningVerified === 'true';
      }
      if (req.query.onboardingComplete !== undefined) {
        filters.verificationStatus = filters.verificationStatus || {};
        filters.verificationStatus.onboardingComplete = req.query.onboardingComplete === 'true';
      }
      if (req.query.onboardingFeeReceived !== undefined) {
        filters.verificationStatus = filters.verificationStatus || {};
        filters.verificationStatus.onboardingFeeReceived = req.query.onboardingFeeReceived === 'true';
      }

      // Parse organization count filters
      if (req.query.minOrganizations !== undefined || req.query.maxOrganizations !== undefined) {
        filters.organizationCount = {};
        if (req.query.minOrganizations !== undefined) {
          filters.organizationCount.min = parseInt(req.query.minOrganizations as string);
        }
        if (req.query.maxOrganizations !== undefined) {
          filters.organizationCount.max = parseInt(req.query.maxOrganizations as string);
        }
      }

      // Remove undefined values
      Object.keys(filters).forEach(key => 
        filters[key as keyof WorkerFilters] === undefined && 
        delete filters[key as keyof WorkerFilters]
      );

      // Parse sorting options
      const sort: SortOptions = {
        field: req.query.sortField as string || 'createdAt',
        direction: (req.query.sortDirection as 'asc' | 'desc') || 'desc'
      };

      // Parse pagination options
      const pagination: PaginationOptions = {
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 20, 100) // Max 100 per page
      };

      const result = await adminUserService.getWorkers(filters, sort, pagination);

      return res.json(successResponse(result, 'Support workers retrieved successfully'));
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get admins with advanced filtering
   * @route GET /api/v1/admin/admins
   */
  getAdmins: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      // Only admins can access this endpoint
      if (req.user.role !== UserRole.ADMIN) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only administrators can access this endpoint', httpStatus.FORBIDDEN)
        );
      }

      // Parse filters from query parameters
      const filters: AdminFilters = {
        status: req.query.status as any,
        search: req.query.search as string,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        isEmailVerified: req.query.isEmailVerified === 'true' ? true : 
                        req.query.isEmailVerified === 'false' ? false : undefined,
        hasProfileImage: req.query.hasProfileImage === 'true' ? true :
                        req.query.hasProfileImage === 'false' ? false : undefined,
        adminType: req.query.adminType as string,
        hasAssignedOrganizations: req.query.hasAssignedOrganizations === 'true' ? true :
                                  req.query.hasAssignedOrganizations === 'false' ? false : undefined
      };

      // Parse permissions filters
      if (req.query.canManageUsers !== undefined ||
          req.query.canManageWorkers !== undefined ||
          req.query.canManageParticipants !== undefined ||
          req.query.canApproveInvites !== undefined ||
          req.query.canManageServiceAgreements !== undefined ||
          req.query.canManageSubscriptions !== undefined ||
          req.query.canAccessFinancials !== undefined ||
          req.query.canManageAdmins !== undefined) {
        
        filters.permissions = {};
        
        if (req.query.canManageUsers !== undefined) {
          filters.permissions.canManageUsers = req.query.canManageUsers === 'true';
        }
        if (req.query.canManageWorkers !== undefined) {
          filters.permissions.canManageWorkers = req.query.canManageWorkers === 'true';
        }
        if (req.query.canManageParticipants !== undefined) {
          filters.permissions.canManageParticipants = req.query.canManageParticipants === 'true';
        }
        if (req.query.canApproveInvites !== undefined) {
          filters.permissions.canApproveInvites = req.query.canApproveInvites === 'true';
        }
        if (req.query.canManageServiceAgreements !== undefined) {
          filters.permissions.canManageServiceAgreements = req.query.canManageServiceAgreements === 'true';
        }
        if (req.query.canManageSubscriptions !== undefined) {
          filters.permissions.canManageSubscriptions = req.query.canManageSubscriptions === 'true';
        }
        if (req.query.canAccessFinancials !== undefined) {
          filters.permissions.canAccessFinancials = req.query.canAccessFinancials === 'true';
        }
        if (req.query.canManageAdmins !== undefined) {
          filters.permissions.canManageAdmins = req.query.canManageAdmins === 'true';
        }
      }

      // Remove undefined values
      Object.keys(filters).forEach(key => 
        filters[key as keyof AdminFilters] === undefined && 
        delete filters[key as keyof AdminFilters]
      );

      // Parse sorting options
      const sort: SortOptions = {
        field: req.query.sortField as string || 'createdAt',
        direction: (req.query.sortDirection as 'asc' | 'desc') || 'desc'
      };

      // Parse pagination options
      const pagination: PaginationOptions = {
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 20, 100) // Max 100 per page
      };

      const result = await adminUserService.getAdmins(filters, sort, pagination);

      return res.json(successResponse(result, 'Administrators retrieved successfully'));
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get filter options for frontend dropdowns
   * @route GET /api/v1/admin/users/filter-options
   */
  getFilterOptions: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      // Only admins can access this endpoint
      if (req.user.role !== UserRole.ADMIN) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only administrators can access this endpoint', httpStatus.FORBIDDEN)
        );
      }

      const filterOptions = await adminUserService.getFilterOptions();

      return res.json(successResponse({ filterOptions }, 'Filter options retrieved successfully'));
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get user statistics for admin dashboard
   * @route GET /api/v1/admin/users/statistics
   */
  getStatistics: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      // Only admins can access this endpoint
      if (req.user.role !== UserRole.ADMIN) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only administrators can access this endpoint', httpStatus.FORBIDDEN)
        );
      }

      // Get basic counts for each user type
      const [
        participantStats,
        workerStats,
        adminStats
      ] = await Promise.all([
        adminUserService.getParticipants({}, { field: 'createdAt', direction: 'desc' }, { page: 1, limit: 1 }),
        adminUserService.getWorkers({}, { field: 'createdAt', direction: 'desc' }, { page: 1, limit: 1 }),
        adminUserService.getAdmins({}, { field: 'createdAt', direction: 'desc' }, { page: 1, limit: 1 })
      ]);

      // Get verified vs unverified counts
      const [
        verifiedParticipants,
        unverifiedParticipants,
        verifiedWorkers,
        unverifiedWorkers,
        verifiedAdmins,
        unverifiedAdmins
      ] = await Promise.all([
        adminUserService.getParticipants(
            { isEmailVerified: true }, { field: 'createdAt', direction: 'desc' }, { page: 1, limit: 1 }
        ),
        adminUserService.getParticipants(
            { isEmailVerified: false }, { field: 'createdAt', direction: 'desc' }, { page: 1, limit: 1 }
        ),
        adminUserService.getWorkers(
            { isEmailVerified: true }, { field: 'createdAt', direction: 'desc' }, { page: 1, limit: 1 }
        ),
        adminUserService.getWorkers(
            { isEmailVerified: false }, { field: 'createdAt', direction: 'desc' }, { page: 1, limit: 1 }
        ),
        adminUserService.getAdmins(
            { isEmailVerified: true }, { field: 'createdAt', direction: 'desc' }, { page: 1, limit: 1 }
        ),
        adminUserService.getAdmins(
            { isEmailVerified: false }, { field: 'createdAt', direction: 'desc' }, { page: 1, limit: 1 }
        )
      ]);

      // Get worker verification statistics
      const [
        completelyVerifiedWorkers,
        partiallyVerifiedWorkers,
        unverifiedWorkers2
      ] = await Promise.all([
        adminUserService.getWorkers({
          verificationStatus: {
            profileSetupComplete: true,
            identityVerified: true,
            policeCheckVerified: true,
            ndisWorkerScreeningVerified: true,
            onboardingComplete: true
          }
        }, { field: 'createdAt', direction: 'desc' }, { page: 1, limit: 1 }),
        adminUserService.getWorkers({
          verificationStatus: {
            profileSetupComplete: true,
            onboardingComplete: false
          }
        }, { field: 'createdAt', direction: 'desc' }, { page: 1, limit: 1 }),
        adminUserService.getWorkers({
          verificationStatus: {
            profileSetupComplete: false
          }
        }, { field: 'createdAt', direction: 'desc' }, { page: 1, limit: 1 })
      ]);

      const statistics = {
        overview: {
          totalUsers: 
            participantStats.pagination.totalResults + 
            workerStats.pagination.totalResults + 
            adminStats.pagination.totalResults,
          totalParticipants: participantStats.pagination.totalResults,
          totalWorkers: workerStats.pagination.totalResults,
          totalAdmins: adminStats.pagination.totalResults
        },
        verification: {
          participants: {
            verified: verifiedParticipants.pagination.totalResults,
            unverified: unverifiedParticipants.pagination.totalResults
          },
          workers: {
            verified: verifiedWorkers.pagination.totalResults,
            unverified: unverifiedWorkers.pagination.totalResults,
            completelyVerified: completelyVerifiedWorkers.pagination.totalResults,
            partiallyVerified: partiallyVerifiedWorkers.pagination.totalResults,
            notStarted: unverifiedWorkers2.pagination.totalResults
          },
          admins: {
            verified: verifiedAdmins.pagination.totalResults,
            unverified: unverifiedAdmins.pagination.totalResults
          }
        }
      };

      return res.json(successResponse({ statistics }, 'User statistics retrieved successfully'));
    } catch (error) {
      return next(error);
    }
  }
};