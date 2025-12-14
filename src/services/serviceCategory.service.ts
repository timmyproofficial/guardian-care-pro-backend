/**
 * Service Category service
 * Handles service category-related business logic and database operations
 */

import httpStatus from 'http-status';
import mongoose from 'mongoose';
import { ServiceCategory, IServiceCategory, ServiceCategoryStatus } from '../models/serviceCategory.model';
import ApiError from '../utils/api-error';
import logger from '../utils/logger';
import { UserRole } from '../types/user.types';

/**
 * Interface for service category creation input
 */
interface CreateServiceCategoryInput {
  name: string;
  status?: ServiceCategoryStatus;
  subCategories: string[];
}

/**
 * Interface for service category filter options
 */
interface ServiceCategoryFilterOptions {
  status?: ServiceCategoryStatus;
  name?: string;
}

/**
 * Interface for pagination options
 */
interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Service Category service implementation
 */
export const serviceCategoryService = {
  /**
   * Create a new service category (Admin only)
   */
  createServiceCategory: async (
    categoryData: CreateServiceCategoryInput,
    user: { id: string; role: UserRole },
  ): Promise<IServiceCategory> => {
    try {
      // Check if user is admin
      if (user.role !== UserRole.ADMIN) {
        throw new ApiError(httpStatus.FORBIDDEN, 'Only admins can create service categories');
      }

      // Create service category
      const category = await ServiceCategory.create({
        ...categoryData,
      });

      // Populate subCategories
      /**
       * The service category document with populated subcategories.
       * Retrieves the full category data including all associated subcategory documents.
       * @returns A promise that resolves to the populated ServiceCategory document or null if not found.
       */
      const populatedCategory = await ServiceCategory.findById(category._id).populate('subCategories');

      logger.info(`New service category created: ${category._id}`);
      return populatedCategory!;
    } catch (error) {
      logger.error('Error creating service category:', error);
      throw error;
    }
  },

  /**
   * Get all service categories with filtering and pagination
   */
  getAllServiceCategories: async (
    filters: ServiceCategoryFilterOptions = {},
    pagination: PaginationOptions = {},
  ) => {
    try {
      // Build filter query
      const query: any = {};

      if (filters.status) query.status = filters.status;
      if (filters.name) query.name = { $regex: filters.name, $options: 'i' };

      // Pagination setup
      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const skip = (page - 1) * limit;

      // Sorting setup
      const sortBy = pagination.sortBy || 'createdAt';
      const sortOrder = pagination.sortOrder === 'asc' ? 1 : -1;
      const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder };

      // Execute query with pagination
      const [categories, totalCount] = await Promise.all([
        ServiceCategory.find(query)
          .populate('subCategories')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        ServiceCategory.countDocuments(query),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        categories,
        totalCount,
        totalPages,
        currentPage: page,
      };
    } catch (error) {
      logger.error('Error fetching all service categories:', error);
      throw error;
    }
  },

  /**
   * Get a single service category by ID
   */
  getServiceCategoryById: async (categoryId: string): Promise<IServiceCategory> => {
    try {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid service category ID format');
      }

      const category = await ServiceCategory.findById(categoryId).populate('subCategories');

      if (!category) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Service category not found');
      }

      return category;
    } catch (error) {
      logger.error(`Error fetching service category with ID ${categoryId}:`, error);
      throw error;
    }
  },

  /**
   * Get service categories by status
   */
  getServiceCategoriesByStatus: async (status: ServiceCategoryStatus): Promise<IServiceCategory[]> => {
    try {
      const categories = await ServiceCategory.find({ status })
        .populate('subCategories')
        .sort({ name: 1 });

      return categories;
    } catch (error) {
      logger.error(`Error fetching service categories by status ${status}:`, error);
      throw error;
    }
  },

  /**
   * Update a service category (Admin only)
   */
  updateServiceCategory: async (
    categoryId: string,
    data: Partial<CreateServiceCategoryInput>,
    user: { id: string; role: UserRole },
  ): Promise<IServiceCategory> => {
    try {
      // Check if user is admin
      if (user.role !== UserRole.ADMIN) {
        throw new ApiError(httpStatus.FORBIDDEN, 'Only admins can update service categories');
      }

      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid service category ID');
      }

      const category = await ServiceCategory.findById(categoryId);
      if (!category) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Service category not found');
      }

      // Prepare update data
      const updateData: any = {
        ...(data.name && { name: data.name }),
        ...(data.status && { status: data.status }),
        ...(data.subCategories && { subCategories: data.subCategories }),
        updatedAt: new Date(),
      };

      // Find and return the updated document
      const updatedCategory = await ServiceCategory.findByIdAndUpdate(
        categoryId,
        updateData,
        { new: true, runValidators: true },
      ).populate('subCategories');

      if (!updatedCategory) {
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to update service category');
      }

      logger.info(`Service category ${categoryId} updated by user ${user.id}`);
      return updatedCategory;
    } catch (error) {
      logger.error('Error updating service category:', error);
      throw error;
    }
  },

  /**
   * Delete a service category (Admin only)
   */
  deleteServiceCategory: async (categoryId: string, user: { id: string; role: UserRole }): Promise<void> => {
    try {
      // Check if user is admin
      if (user.role !== UserRole.ADMIN) {
        throw new ApiError(httpStatus.FORBIDDEN, 'Only admins can delete service categories');
      }

      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid service category ID');
      }

      const category = await ServiceCategory.findById(categoryId);
      if (!category) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Service category not found');
      }

      await ServiceCategory.findByIdAndDelete(categoryId);

      logger.info(`Service category ${categoryId} deleted by user ${user.id}`);
    } catch (error) {
      logger.error('Error deleting service category:', error);
      throw error;
    }
  },

  /**
   * Get service category statistics
   */
  getServiceCategoryStatistics: async (): Promise<{
    totalCategories: number;
    byStatus: Record<string, number>;
    totalSubCategories: number;
  }> => {
    try {
      const [totalCategories, statusStats, subCategoryStats] = await Promise.all([
        ServiceCategory.countDocuments(),

        ServiceCategory.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),

        ServiceCategory.aggregate([
          { $unwind: '$subCategories' },
          { $group: { _id: null, count: { $sum: 1 } } },
        ]),
      ]);

      // Format statistics
      const byStatus = statusStats.reduce(
        (acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        },
        {} as Record<string, number>,
      );

      const totalSubCategories = subCategoryStats[0]?.count || 0;

      return {
        totalCategories,
        byStatus,
        totalSubCategories,
      };
    } catch (error) {
      logger.error('Error fetching service category statistics:', error);
      throw error;
    }
  },
};