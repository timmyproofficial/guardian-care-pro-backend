/**
 * Service Category controller
 * Handles HTTP requests related to service category management
 */

import { Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import { serviceCategoryService } from '../services/serviceCategory.service';
import { successResponse } from '../utils/api-response';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { ServiceCategoryStatus } from '../models/serviceCategory.model';

const serviceCategoryController = {
  /**
   * Create a new service category
   * @route POST /api/v1/service-categories
   */
  createServiceCategory: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { name, status, description } = req.body;

      const category = await serviceCategoryService.createServiceCategory(
        {
          name,
          status,
          description,
        },
        { id: req.user!.id, role: req.user!.role },
      );

      res.status(httpStatus.CREATED).json(successResponse(category, 'Service category created successfully'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get all service categories with filtering and pagination
   * @route GET /api/v1/service-categories
   */
  getAllServiceCategories: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const allowedStatuses = Object.values(ServiceCategoryStatus);
      const statusQuery = req.query.status as string | undefined;

      const filters = {
        status: allowedStatuses.includes(statusQuery as ServiceCategoryStatus)
          ? (statusQuery as ServiceCategoryStatus)
          : undefined,
        name: req.query.name as string,
      };

      const pagination = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
      };

      const result = await serviceCategoryService.getAllServiceCategories(filters, pagination);

      res.json(successResponse(result, 'Service categories retrieved successfully'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get a single service category by ID
   * @route GET /api/v1/service-categories/:id
   */
  getServiceCategoryById: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const category = await serviceCategoryService.getServiceCategoryById(id);

      res.json(successResponse(category, 'Service category retrieved successfully'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get service categories by status
   * @route GET /api/v1/service-categories/status/:status
   */
  getServiceCategoriesByStatus: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { status } = req.params;
      const categories = await serviceCategoryService.getServiceCategoriesByStatus(status as ServiceCategoryStatus);

      res.json(successResponse(categories, 'Service categories retrieved successfully'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update a service category
   * @route PUT /api/v1/service-categories/:id
   */
  updateServiceCategory: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const updatedCategory = await serviceCategoryService.updateServiceCategory(
        id,
        req.body,
        { id: req.user!.id, role: req.user!.role },
      );

      res.json(successResponse(updatedCategory, 'Service category updated successfully'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete a service category
   * @route DELETE /api/v1/service-categories/:id
   */
  deleteServiceCategory: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await serviceCategoryService.deleteServiceCategory(id, { id: req.user!.id, role: req.user!.role });

      res.json(successResponse({}, 'Service category deleted successfully'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get service category statistics
   * @route GET /api/v1/service-categories/statistics
   */
  getServiceCategoryStatistics: async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const statistics = await serviceCategoryService.getServiceCategoryStatistics();

      res.json(successResponse(statistics, 'Service category statistics retrieved successfully'));
    } catch (error) {
      next(error);
    }
  },
};

export default serviceCategoryController;