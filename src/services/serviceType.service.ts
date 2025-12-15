/**
 * Service Type service
 * Handles operations related to service type management
 */

import httpStatus from 'http-status';
import mongoose from 'mongoose';
import ServiceType, { IServiceType, ServiceTypeStatus } from '../models/serviceType.model';
import ApiError from '../utils/api-error';
import logger from '../utils/logger';

/**
 * Interface for service type creation input
 */
interface CreateServiceTypeInput {
  name: string;
  code: string;
  status?: ServiceTypeStatus;
}

/**
 * Interface for service type update input
 */
interface UpdateServiceTypeInput {
  name?: string;
  code?: string;
  status?: ServiceTypeStatus;
}

/**
 * Service Type service implementation
 */
export const serviceTypeService = {
  /**
   * Create a new service type
   */
  createServiceType: async (serviceTypeData: CreateServiceTypeInput): Promise<IServiceType> => {
    try {
      // Check if code already exists
      const existingServiceType = await ServiceType.findOne({ 
        code: serviceTypeData.code.toUpperCase() 
      });
      
      if (existingServiceType) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Service type code already exists');
      }
      
      // Create the service type
      const serviceType = await ServiceType.create({
        name: serviceTypeData.name,
        code: serviceTypeData.code.toUpperCase(),
        status: serviceTypeData.status || ServiceTypeStatus.ACTIVE
      });
      
      logger.info(`Created service type: ${serviceType.name}`);
      
      return serviceType;
    } catch (error) {
      logger.error('Error creating service type:', error);
      throw error;
    }
  },

  /**
   * Get all service types with optional filtering
   */
  getAllServiceTypes: async (filter: {
    status?: ServiceTypeStatus;
    activeOnly?: boolean;
  } = {}): Promise<IServiceType[]> => {
    try {
      const query: any = {};
      
      // Apply status filter
      if (filter.status) {
        query.status = filter.status;
      } else if (filter.activeOnly) {
        query.status = ServiceTypeStatus.ACTIVE;
      }
      
      const serviceTypes = await ServiceType.find(query)
        .sort({ name: 1 });
      
      return serviceTypes;
    } catch (error) {
      logger.error('Error getting service types:', error);
      throw error;
    }
  },

  /**
   * Get service type by ID
   */
  getServiceTypeById: async (serviceTypeId: string): Promise<IServiceType> => {
    try {
      if (!mongoose.Types.ObjectId.isValid(serviceTypeId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid service type ID format');
      }

      const serviceType = await ServiceType.findById(serviceTypeId);
      
      if (!serviceType) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Service type not found');
      }
      
      return serviceType;
    } catch (error) {
      logger.error(`Error getting service type ${serviceTypeId}:`, error);
      throw error;
    }
  },

  /**
   * Get service type by code
   */
  getServiceTypeByCode: async (code: string): Promise<IServiceType> => {
    try {
      const serviceType = await ServiceType.findOne({ 
        code: code.toUpperCase() 
      });
      
      if (!serviceType) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Service type not found');
      }
      
      return serviceType;
    } catch (error) {
      logger.error(`Error getting service type by code ${code}:`, error);
      throw error;
    }
  },

  /**
   * Update service type
   */
  updateServiceType: async (
    serviceTypeId: string,
    updateData: UpdateServiceTypeInput
  ): Promise<IServiceType> => {
    try {
      if (!mongoose.Types.ObjectId.isValid(serviceTypeId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid service type ID format');
      }

      // Get the service type
      const serviceType = await ServiceType.findById(serviceTypeId);
      
      if (!serviceType) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Service type not found');
      }
      
      // Check if code is being updated and if it already exists
      if (updateData.code && updateData.code.toUpperCase() !== serviceType.code) {
        const existingServiceType = await ServiceType.findOne({ 
          code: updateData.code.toUpperCase(),
          _id: { $ne: serviceTypeId }
        });
        
        if (existingServiceType) {
          throw new ApiError(httpStatus.BAD_REQUEST, 'Service type code already exists');
        }
      }
      
      // Prepare update object
      const updateObj: any = {};
      
      if (updateData.name) updateObj.name = updateData.name;
      if (updateData.code) updateObj.code = updateData.code.toUpperCase();
      if (updateData.status) updateObj.status = updateData.status;
      
      // Update the service type
      const updatedServiceType = await ServiceType.findByIdAndUpdate(
        serviceTypeId,
        updateObj,
        { new: true, runValidators: true }
      );
      
      if (!updatedServiceType) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Service type not found');
      }
      
      logger.info(`Updated service type: ${updatedServiceType.name}`);
      return updatedServiceType;
    } catch (error) {
      logger.error(`Error updating service type ${serviceTypeId}:`, error);
      throw error;
    }
  },

  /**
   * Delete service type (soft delete by setting status to inactive)
   */
  deleteServiceType: async (serviceTypeId: string): Promise<IServiceType> => {
    try {
      if (!mongoose.Types.ObjectId.isValid(serviceTypeId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid service type ID format');
      }

      // Check if service type exists
      const serviceType = await ServiceType.findById(serviceTypeId);
      
      if (!serviceType) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Service type not found');
      }
      
      // TODO: Check if service type is being used in any shifts/bookings
      
      // Set status to inactive instead of hard delete
      const updatedServiceType = await ServiceType.findByIdAndUpdate(
        serviceTypeId,
        { status: ServiceTypeStatus.INACTIVE },
        { new: true }
      );
      
      if (!updatedServiceType) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Service type not found');
      }
      
      logger.info(`Soft deleted service type: ${updatedServiceType.name}`);
      return updatedServiceType;
    } catch (error) {
      logger.error(`Error deleting service type ${serviceTypeId}:`, error);
      throw error;
    }
  },

  /**
   * Get active service types for dropdown/selection
   */
  getActiveServiceTypes: async (): Promise<IServiceType[]> => {
    try {
      return await serviceTypeService.getAllServiceTypes({ activeOnly: true });
    } catch (error) {
      logger.error('Error getting active service types:', error);
      throw error;
    }
  }
};