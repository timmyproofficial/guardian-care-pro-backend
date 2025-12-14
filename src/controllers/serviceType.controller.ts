/**
 * Service Type controller
 * Handles HTTP requests related to service type management
 */

import { Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { serviceTypeService } from '../services/serviceType.service';
import { successResponse, errorResponse } from '../utils/api-response';
import { ServiceTypeStatus } from '../models/serviceType.model';

export const serviceTypeController = {
  /**
   * Create a new service type
   * @route POST /api/service-types
   * @body { name, code, categoryId, status }
   */
  createServiceType: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      const { name, code, categoryId, status } = req.body;
      
      // Validate required fields
      if (!name || !code || !categoryId) {
        return res.status(httpStatus.BAD_REQUEST).json(
          errorResponse('Missing required fields: name, code, categoryId', httpStatus.BAD_REQUEST)
        );
      }
      
      const serviceType = await serviceTypeService.createServiceType({
        name,
        code,
        categoryId,
        status
      });
      
      return res.status(httpStatus.CREATED).json(
        successResponse({ serviceType }, 'Service type created successfully')
      );
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get all service types with optional filtering
   * @route GET /api/service-types
   * @query status, categoryId, activeOnly
   */
  getAllServiceTypes: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      const { status, categoryId, activeOnly } = req.query;
      
      const serviceTypes = await serviceTypeService.getAllServiceTypes({
        status: status as ServiceTypeStatus,
        categoryId: categoryId as string,
        activeOnly: activeOnly === 'true'
      });
      
      return res.json(successResponse({ serviceTypes }, 'Service types retrieved successfully'));
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get service types grouped by category
   * @route GET /api/service-types/by-category
   */
  getServiceTypesGroupedByCategory: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      const grouped = await serviceTypeService.getServiceTypesGroupedByCategory();
      
      return res.json(
        successResponse(
          { categories: grouped }, 
          'Service types grouped by category retrieved successfully'
        )
      );
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get active service types (for dropdowns/selection)
   * @route GET /api/service-types/active
   */
  getActiveServiceTypes: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      const serviceTypes = await serviceTypeService.getActiveServiceTypes();
      
      return res.json(successResponse({ serviceTypes }, 'Active service types retrieved successfully'));
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get service type by ID
   * @route GET /api/service-types/:serviceTypeId
   */
  getServiceTypeById: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      const { serviceTypeId } = req.params;
      const serviceType = await serviceTypeService.getServiceTypeById(serviceTypeId);
      
      return res.json(successResponse({ serviceType }, 'Service type retrieved successfully'));
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get service type by code
   * @route GET /api/service-types/code/:code
   */
  getServiceTypeByCode: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      const { code } = req.params;
      const serviceType = await serviceTypeService.getServiceTypeByCode(code);
      
      return res.json(successResponse({ serviceType }, 'Service type retrieved successfully'));
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Update service type
   * @route PATCH /api/service-types/:serviceTypeId
   * @body { name?, code?, categoryId?, status? }
   */
  updateServiceType: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      const { serviceTypeId } = req.params;
      const { name, code, categoryId, status } = req.body;
      
      const serviceType = await serviceTypeService.updateServiceType(serviceTypeId, {
        name,
        code,
        categoryId,
        status
      });
      
      return res.json(successResponse({ serviceType }, 'Service type updated successfully'));
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Delete service type (soft delete - set status to inactive)
   * @route DELETE /api/service-types/:serviceTypeId
   */
  deleteServiceType: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      const { serviceTypeId } = req.params;
      const serviceType = await serviceTypeService.deleteServiceType(serviceTypeId);
      
      return res.json(successResponse({ serviceType }, 'Service type deleted successfully'));
    } catch (error) {
      return next(error);
    }
  }
};