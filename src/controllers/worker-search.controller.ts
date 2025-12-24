/**
 * Worker search controller
 * Handles HTTP requests related to worker search functionality
 */

import { Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { 
    WorkerSearchFilters, 
    searchWorkers, 
    getWorkerDetail, 
    getWorkerFilterOptions 
} from '../services/worker-search.service';
import { UserRole, SupportWorkerSkill } from '../types/user.types';
import { successResponse, errorResponse } from '../utils/api-response';

export const workerSearchController = {
  /**
   * Search for support workers with filtering and pagination
   * @route GET /api/v1/workers/search
   */
  searchWorkers: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      // Only participants can search for workers
      if (req.user.role !== UserRole.PARTICIPANT) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only participants can search for workers', httpStatus.FORBIDDEN)
        );
      }

      const participantId = req.user._id.toString();
      
      // Extract query parameters
      const {
        // Location filters (NEW)
        stateId,
        regionId,
        serviceAreaId,
        matchParticipantLocation,
        // Existing filters
        skills,
        serviceAreas,
        languages,
        availabilityDays,
        availabilityStartTime,
        availabilityEndTime,
        availabilityDate,
        minRating,
        maxHourlyRate,
        onlyVerified,
        keyword,
        page = '1',
        limit = '10'
      } = req.query;

      // Build location filter object (NEW)
      let locationFilters: {
        stateId?: string;
        regionId?: string;
        serviceAreaId?: string;
        matchParticipantLocation?: boolean;
      } | undefined;

      if (stateId || regionId || serviceAreaId || matchParticipantLocation === 'true') {
        locationFilters = {
          stateId: stateId as string | undefined,
          regionId: regionId as string | undefined,
          serviceAreaId: serviceAreaId as string | undefined,
          matchParticipantLocation: matchParticipantLocation === 'true'
        };
      }

      // Build filter object
      const filters: WorkerSearchFilters = {};

      if (skills) {
        filters.skills = Array.isArray(skills) 
          ? skills as SupportWorkerSkill[]
          : [skills as SupportWorkerSkill];
      }

      if (serviceAreas) {
        filters.serviceAreas = Array.isArray(serviceAreas)
          ? serviceAreas as string[]
          : [serviceAreas as string];
      }

      if (languages) {
        filters.languages = Array.isArray(languages)
          ? languages as string[]
          : [languages as string];
      }

      if (availabilityDays || availabilityStartTime || availabilityEndTime || availabilityDate) {
        filters.availability = {};
        
        if (availabilityDays) {
          filters.availability.days = Array.isArray(availabilityDays)
            ? availabilityDays as string[]
            : [availabilityDays as string];
        }
        
        if (availabilityStartTime) {
          filters.availability.startTime = availabilityStartTime as string;
        }
        
        if (availabilityEndTime) {
          filters.availability.endTime = availabilityEndTime as string;
        }
        
        if (availabilityDate) {
          filters.availability.date = new Date(availabilityDate as string);
        }
      }

      if (minRating) {
        filters.minRating = parseFloat(minRating as string);
      }

      if (maxHourlyRate) {
        filters.maxHourlyRate = parseFloat(maxHourlyRate as string);
      }

      if (onlyVerified === 'true') {
        filters.onlyVerified = true;
      }

      if (keyword) {
        filters.keyword = keyword as string;
      }

      // Parse pagination parameters
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      // Validate pagination parameters
      if (isNaN(pageNum) || pageNum < 1) {
        return res.status(httpStatus.BAD_REQUEST).json(
          errorResponse('Invalid page parameter', httpStatus.BAD_REQUEST)
        );
      }

      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return res.status(httpStatus.BAD_REQUEST).json(
          errorResponse('Invalid limit parameter (must be between 1 and 100)', httpStatus.BAD_REQUEST)
        );
      }

      // Execute search (now with location filters)
      const result = await searchWorkers(
        participantId,
        filters,
        locationFilters,
        pageNum,
        limitNum
      );

      return res.json(
        successResponse(
          { 
            workers: result.workers,
            pagination: {
              page: result.page,
              limit: result.limit,
              totalPages: result.totalPages,
              totalResults: result.totalResults,
              hasMore: result.hasMore
            }
          }, 
          'Workers retrieved successfully'
        )
      );
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get worker profile details
   * @route GET /api/v1/workers/:workerId/profile
   */
  getWorkerProfile: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      // Only participants can view worker profiles
      if (req.user.role !== UserRole.PARTICIPANT) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only participants can view worker profiles', httpStatus.FORBIDDEN)
        );
      }

      const { workerId } = req.params;
      const participantId = req.user._id.toString();

      const worker = await getWorkerDetail(workerId, participantId);

      if (!worker) {
        return res.status(httpStatus.NOT_FOUND).json(
          errorResponse('Worker not found', httpStatus.NOT_FOUND)
        );
      }

      return res.json(
        successResponse({ worker }, 'Worker profile retrieved successfully')
      );
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get filter options for worker search
   * @route GET /api/v1/workers/filter-options
   */
  getFilterOptions: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      // Only participants can get filter options
      if (req.user.role !== UserRole.PARTICIPANT) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only participants can access filter options', httpStatus.FORBIDDEN)
        );
      }

      const filterOptions = await getWorkerFilterOptions();

      return res.json(
        successResponse({ filterOptions }, 'Filter options retrieved successfully')
      );
    } catch (error) {
      return next(error);
    }
  }
};