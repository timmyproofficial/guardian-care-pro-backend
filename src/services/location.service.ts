/**
 * Location Service
 * Handles location reference data queries (States, Regions, Suburbs, ServiceAreas)
 */

import mongoose from 'mongoose';
import httpStatus from 'http-status';
import { State, Region, Suburb, ServiceArea } from '../models/location';
import ApiError from '../utils/api-error';
import logger from '../utils/logger';

/**
 * Get all active states
 */
export const getAllStates = async (): Promise<any[]> => {
  try {
    const states = await State.find({ isActive: true })
      .select('_id name code')
      .sort({ name: 1 })
      .lean();
    return states;
  } catch (error) {
    logger.error('Error getting states:', error);
    throw error;
  }
};

/**
 * Get regions by state ID
 */
export const getRegionsByState = async (stateId: string): Promise<any[]> => {
  try {
    if (!mongoose.Types.ObjectId.isValid(stateId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid state ID');
    }

    const regions = await Region.find({
      stateId: new mongoose.Types.ObjectId(stateId),
      isActive: true
    })
      .select('_id name code description')
      .populate('stateId', 'name code')
      .sort({ name: 1 })
      .lean();

    return regions;
  } catch (error) {
    logger.error(`Error getting regions for state ${stateId}:`, error);
    throw error;
  }
};

/**
 * Get suburbs by region ID
 */
export const getSuburbsByRegion = async (regionId: string): Promise<any[]> => {
  try {
    if (!mongoose.Types.ObjectId.isValid(regionId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid region ID');
    }

    const suburbs = await Suburb.find({
      regionId: new mongoose.Types.ObjectId(regionId),
      isActive: true
    })
      .select('_id name postcode location')
      .populate('regionId', 'name code')
      .populate('stateId', 'name code')
      .sort({ name: 1 })
      .lean();

    return suburbs;
  } catch (error) {
    logger.error(`Error getting suburbs for region ${regionId}:`, error);
    throw error;
  }
};

/**
 * Get suburbs by state ID
 */
export const getSuburbsByState = async (stateId: string): Promise<any[]> => {
  try {
    if (!mongoose.Types.ObjectId.isValid(stateId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid state ID');
    }

    const suburbs = await Suburb.find({
      stateId: new mongoose.Types.ObjectId(stateId),
      isActive: true
    })
      .select('_id name postcode regionId')
      .populate('regionId', 'name code')
      .sort({ name: 1 })
      .lean();

    return suburbs;
  } catch (error) {
    logger.error(`Error getting suburbs for state ${stateId}:`, error);
    throw error;
  }
};

/**
 * Search suburbs by name or postcode
 */
export const searchSuburbs = async (
  query: string,
  stateId?: string,
  limit: number = 20
): Promise<any[]> => {
  try {
    const searchFilter: any = {
      isActive: true,
      $or: [
        { name: new RegExp(query, 'i') },
        { postcode: new RegExp(query, 'i') }
      ]
    };

    if (stateId && mongoose.Types.ObjectId.isValid(stateId)) {
      searchFilter.stateId = new mongoose.Types.ObjectId(stateId);
    }

    const suburbs = await Suburb.find(searchFilter)
      .select('_id name postcode location')
      .populate('stateId', 'name code')
      .populate('regionId', 'name code')
      .limit(limit)
      .sort({ name: 1 })
      .lean();

    return suburbs;
  } catch (error) {
    logger.error(`Error searching suburbs with query ${query}:`, error);
    throw error;
  }
};

/**
 * Get service areas by region ID
 */
export const getServiceAreasByRegion = async (regionId: string): Promise<any[]> => {
  try {
    if (!mongoose.Types.ObjectId.isValid(regionId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid region ID');
    }

    const serviceAreas = await ServiceArea.find({
      regionId: new mongoose.Types.ObjectId(regionId),
      isActive: true
    })
      .select('_id name code description centerPoint')
      .populate('regionId', 'name code')
      .populate('stateId', 'name code')
      .sort({ name: 1 })
      .lean();

    return serviceAreas;
  } catch (error) {
    logger.error(`Error getting service areas for region ${regionId}:`, error);
    throw error;
  }
};

/**
 * Get service areas by state ID
 */
export const getServiceAreasByState = async (stateId: string): Promise<any[]> => {
  try {
    if (!mongoose.Types.ObjectId.isValid(stateId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid state ID');
    }

    const serviceAreas = await ServiceArea.find({
      stateId: new mongoose.Types.ObjectId(stateId),
      isActive: true
    })
      .select('_id name code description regionId')
      .populate('regionId', 'name code')
      .sort({ name: 1 })
      .lean();

    return serviceAreas;
  } catch (error) {
    logger.error(`Error getting service areas for state ${stateId}:`, error);
    throw error;
  }
};

/**
 * Get all service areas
 */
export const getAllServiceAreas = async (): Promise<any[]> => {
  try {
    const serviceAreas = await ServiceArea.find({ isActive: true })
      .select('_id name code description')
      .populate('stateId', 'name code')
      .populate('regionId', 'name code')
      .sort({ name: 1 })
      .lean();

    return serviceAreas;
  } catch (error) {
    logger.error('Error getting all service areas:', error);
    throw error;
  }
};

/**
 * Get suburb by postcode and state
 */
export const getSuburbByPostcode = async (
  postcode: string,
  stateId?: string
): Promise<any | null> => {
  try {
    const query: any = {
      postcode: postcode.trim(),
      isActive: true
    };

    if (stateId && mongoose.Types.ObjectId.isValid(stateId)) {
      query.stateId = new mongoose.Types.ObjectId(stateId);
    }

    const suburb = await Suburb.findOne(query)
      .populate('stateId', 'name code')
      .populate('regionId', 'name code')
      .lean();

    return suburb;
  } catch (error) {
    logger.error(`Error getting suburb by postcode ${postcode}:`, error);
    throw error;
  }
};

/**
 * Get complete location hierarchy for a suburb
 */
export const getLocationHierarchy = async (suburbId: string): Promise<any> => {
  try {
    if (!mongoose.Types.ObjectId.isValid(suburbId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid suburb ID');
    }

    const suburb = await Suburb.findById(suburbId)
      .populate('regionId')
      .populate('stateId')
      .lean();

    if (!suburb) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Suburb not found');
    }

    // Get service areas for this region
    const serviceAreas = await ServiceArea.find({
      regionId: suburb.regionId,
      suburbIds: new mongoose.Types.ObjectId(suburbId),
      isActive: true
    })
      .select('_id name code')
      .lean();

    return {
      suburb: {
        _id: suburb._id,
        name: suburb.name,
        postcode: suburb.postcode,
        location: suburb.location
      },
      region: suburb.regionId,
      state: suburb.stateId,
      serviceAreas
    };
  } catch (error) {
    logger.error(`Error getting location hierarchy for suburb ${suburbId}:`, error);
    throw error;
  }
};

/**
 * Geocode address to get coordinates (placeholder for geocoding service integration)
 * In production, integrate with Google Maps Geocoding API or similar
 */
export const geocodeAddress = async (address: {
  street?: string;
  suburb: string;
  postcode: string;
  state: string;
}): Promise<{ longitude: number; latitude: number } | null> => {
  try {
    // First, try to find suburb in database
    const suburb = await Suburb.findOne({
      name: new RegExp(`^${address.suburb}$`, 'i'),
      postcode: address.postcode,
      isActive: true
    })
      .populate('stateId', 'code')
      .lean();

    if (suburb && suburb.location && suburb.location.coordinates) {
      return {
        longitude: suburb.location.coordinates[0],
        latitude: suburb.location.coordinates[1]
      };
    }

    // If not found or no coordinates, return null
    // In production, call external geocoding service here
    logger.warn(`No coordinates found for address: ${JSON.stringify(address)}`);
    return null;
  } catch (error) {
    logger.error('Error geocoding address:', error);
    throw error;
  }
};

export const locationService = {
  getAllStates,
  getRegionsByState,
  getSuburbsByRegion,
  getSuburbsByState,
  searchSuburbs,
  getServiceAreasByRegion,
  getServiceAreasByState,
  getAllServiceAreas,
  getSuburbByPostcode,
  getLocationHierarchy,
  geocodeAddress
};

