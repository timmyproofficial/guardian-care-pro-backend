/**
 * Location Controller
 * Handles HTTP requests for location reference data and worker geospatial searches
 */

import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { locationService } from '../services/location.service';
import { 
  searchWorkersNearby, 
  searchWorkersByRegion as searchWorkersByRegionService,
  WorkerSearchFilters 
} from '../services/worker-search.service';
import ApiError from '../utils/api-error';
import logger from '../utils/logger';

/**
 * Get all states
 */
export const getStates = async (_req: Request, res: Response): Promise<void> => {
  try {
    const states = await locationService.getAllStates();
    res.status(httpStatus.OK).json({
      success: true,
      data: states
    });
  } catch (error) {
    logger.error('Error in getStates controller:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch states'
    });
  }
};

/**
 * Get regions by state
 */
export const getRegions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { stateId } = req.params;
    const regions = await locationService.getRegionsByState(stateId);
    res.status(httpStatus.OK).json({
      success: true,
      data: regions
    });
  } catch (error: any) {
    logger.error('Error in getRegions controller:', error);
    const statusCode = error instanceof ApiError ? error.statusCode : httpStatus.INTERNAL_SERVER_ERROR;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch regions'
    });
  }
};

/**
 * Get suburbs by region
 */
export const getSuburbsByRegion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { regionId } = req.params;
    const suburbs = await locationService.getSuburbsByRegion(regionId);
    res.status(httpStatus.OK).json({
      success: true,
      data: suburbs
    });
  } catch (error: any) {
    logger.error('Error in getSuburbsByRegion controller:', error);
    const statusCode = error instanceof ApiError ? error.statusCode : httpStatus.INTERNAL_SERVER_ERROR;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch suburbs'
    });
  }
};

/**
 * Get suburbs by state
 */
export const getSuburbsByState = async (req: Request, res: Response): Promise<void> => {
  try {
    const { stateId } = req.params;
    const suburbs = await locationService.getSuburbsByState(stateId);
    res.status(httpStatus.OK).json({
      success: true,
      data: suburbs
    });
  } catch (error: any) {
    logger.error('Error in getSuburbsByState controller:', error);
    const statusCode = error instanceof ApiError ? error.statusCode : httpStatus.INTERNAL_SERVER_ERROR;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch suburbs'
    });
  }
};

/**
 * Search suburbs
 */
export const searchSuburbs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, stateId, limit } = req.query;
    
    if (!query || typeof query !== 'string') {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Search query is required');
    }

    const suburbs = await locationService.searchSuburbs(
      query,
      stateId as string | undefined,
      limit ? parseInt(limit as string) : 20
    );
    
    res.status(httpStatus.OK).json({
      success: true,
      data: suburbs
    });
  } catch (error: any) {
    logger.error('Error in searchSuburbs controller:', error);
    const statusCode = error instanceof ApiError ? error.statusCode : httpStatus.INTERNAL_SERVER_ERROR;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to search suburbs'
    });
  }
};

/**
 * Get service areas by region
 */
export const getServiceAreasByRegion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { regionId } = req.params;
    const serviceAreas = await locationService.getServiceAreasByRegion(regionId);
    res.status(httpStatus.OK).json({
      success: true,
      data: serviceAreas
    });
  } catch (error: any) {
    logger.error('Error in getServiceAreasByRegion controller:', error);
    const statusCode = error instanceof ApiError ? error.statusCode : httpStatus.INTERNAL_SERVER_ERROR;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch service areas'
    });
  }
};

/**
 * Get service areas by state
 */
export const getServiceAreasByState = async (req: Request, res: Response): Promise<void> => {
  try {
    const { stateId } = req.params;
    const serviceAreas = await locationService.getServiceAreasByState(stateId);
    res.status(httpStatus.OK).json({
      success: true,
      data: serviceAreas
    });
  } catch (error: any) {
    logger.error('Error in getServiceAreasByState controller:', error);
    const statusCode = error instanceof ApiError ? error.statusCode : httpStatus.INTERNAL_SERVER_ERROR;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch service areas'
    });
  }
};

/**
 * Get all service areas
 */
export const getAllServiceAreas = async (_req: Request, res: Response): Promise<void> => {
  try {
    const serviceAreas = await locationService.getAllServiceAreas();
    res.status(httpStatus.OK).json({
      success: true,
      data: serviceAreas
    });
  } catch (error) {
    logger.error('Error in getAllServiceAreas controller:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch service areas'
    });
  }
};

/**
 * Get location hierarchy for a suburb
 */
export const getLocationHierarchy = async (req: Request, res: Response): Promise<void> => {
  try {
    const { suburbId } = req.params;
    const hierarchy = await locationService.getLocationHierarchy(suburbId);
    res.status(httpStatus.OK).json({
      success: true,
      data: hierarchy
    });
  } catch (error: any) {
    logger.error('Error in getLocationHierarchy controller:', error);
    const statusCode = error instanceof ApiError ? error.statusCode : httpStatus.INTERNAL_SERVER_ERROR;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch location hierarchy'
    });
  }
};

/**
 * Search for workers nearby participant's location (geospatial)
 * GET /api/workers/nearby
 */
export const searchNearbyWorkers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { participantId } = req.query;
    const { maxDistanceKm, page, limit, ...filters } = req.query;

    if (!participantId || typeof participantId !== 'string') {
      throw new ApiError(httpStatus.BAD_REQUEST, 'participantId is required');
    }

    // Parse query parameters
    const searchFilters: Partial<WorkerSearchFilters> = {};
    
    if (filters.skills) {
      searchFilters.skills = Array.isArray(filters.skills) 
        ? filters.skills as string[] 
        : [filters.skills as string];
    }
    if (filters.languages) {
      searchFilters.languages = Array.isArray(filters.languages)
        ? filters.languages as string[]
        : [filters.languages as string];
    }
    if (filters.minRating) {
      searchFilters.minRating = parseFloat(filters.minRating as string);
    }
    if (filters.maxHourlyRate) {
      searchFilters.maxHourlyRate = parseFloat(filters.maxHourlyRate as string);
    }
    if (filters.onlyVerified === 'true') {
      searchFilters.onlyVerified = true;
    }
    if (filters.keyword) {
      searchFilters.keyword = filters.keyword as string;
    }

    const result = await searchWorkersNearby(
      participantId,
      maxDistanceKm ? parseFloat(maxDistanceKm as string) : 50,
      searchFilters,
      page ? parseInt(page as string) : 1,
      limit ? parseInt(limit as string) : 10
    );

    res.status(httpStatus.OK).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    logger.error('Error in searchNearbyWorkers controller:', error);
    const statusCode = error instanceof ApiError ? error.statusCode : httpStatus.INTERNAL_SERVER_ERROR;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to search nearby workers'
    });
  }
};

/**
 * Search for workers by region/state/service area
 * GET /api/workers/by-region
 */
export const searchWorkersByRegion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { participantId } = req.query;
    const { 
      stateId, 
      regionId, 
      serviceAreaId, 
      matchParticipantLocation,
      page, 
      limit,
      ...filters 
    } = req.query;

    if (!participantId || typeof participantId !== 'string') {
      throw new ApiError(httpStatus.BAD_REQUEST, 'participantId is required');
    }

    // Location filters
    const locationFilters = {
      stateId: stateId as string | undefined,
      regionId: regionId as string | undefined,
      serviceAreaId: serviceAreaId as string | undefined,
      matchParticipantLocation: matchParticipantLocation === 'true'
    };

    // Parse additional search filters
    const searchFilters: Partial<WorkerSearchFilters> = {};
    
    if (filters.skills) {
      searchFilters.skills = Array.isArray(filters.skills)
        ? filters.skills as string[]
        : [filters.skills as string];
    }
    if (filters.serviceAreas) {
      searchFilters.serviceAreas = Array.isArray(filters.serviceAreas)
        ? filters.serviceAreas as string[]
        : [filters.serviceAreas as string];
    }
    if (filters.languages) {
      searchFilters.languages = Array.isArray(filters.languages)
        ? filters.languages as string[]
        : [filters.languages as string];
    }
    if (filters.minRating) {
      searchFilters.minRating = parseFloat(filters.minRating as string);
    }
    if (filters.maxHourlyRate) {
      searchFilters.maxHourlyRate = parseFloat(filters.maxHourlyRate as string);
    }
    if (filters.onlyVerified === 'true') {
      searchFilters.onlyVerified = true;
    }
    if (filters.keyword) {
      searchFilters.keyword = filters.keyword as string;
    }

    const result = await searchWorkersByRegionService(
      participantId,
      locationFilters,
      searchFilters,
      page ? parseInt(page as string) : 1,
      limit ? parseInt(limit as string) : 10
    );

    res.status(httpStatus.OK).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    logger.error('Error in searchWorkersByRegion controller:', error);
    const statusCode = error instanceof ApiError ? error.statusCode : httpStatus.INTERNAL_SERVER_ERROR;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to search workers by region'
    });
  }
};

/**
 * Geocode address to coordinates
 */
export const geocodeAddress = async (req: Request, res: Response): Promise<void> => {
  try {
    const { street, suburb, postcode, state } = req.body;

    if (!suburb || !postcode || !state) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'suburb, postcode, and state are required');
    }

    const coordinates = await locationService.geocodeAddress({
      street,
      suburb,
      postcode,
      state
    });

    if (!coordinates) {
      res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: 'Could not find coordinates for the provided address'
      });
      return;
    }

    res.status(httpStatus.OK).json({
      success: true,
      data: coordinates
    });
  } catch (error: any) {
    logger.error('Error in geocodeAddress controller:', error);
    const statusCode = error instanceof ApiError ? error.statusCode : httpStatus.INTERNAL_SERVER_ERROR;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to geocode address'
    });
  }
};

