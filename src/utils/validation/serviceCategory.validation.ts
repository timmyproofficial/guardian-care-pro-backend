import Joi from 'joi';
import { ServiceCategoryStatus } from '../../models/serviceCategory.model';

/**
 * Validation schemas for service category operations
 */
export const serviceCategoryValidation = {
  /**
   * Validation for creating a service category
   */
  createServiceCategory: {
    body: Joi.object({
      name: Joi.string().trim().max(100).required().messages({
        'string.empty': 'Service category name is required',
        'string.max': 'Service category name cannot exceed 100 characters',
      }),

      status: Joi.string()
        .valid(...Object.values(ServiceCategoryStatus))
        .default(ServiceCategoryStatus.ACTIVE)
        .messages({
          'any.only': 'Invalid status value',
        }),
      
      description: Joi.string().trim().max(500).messages({
        'string.max': 'Description cannot exceed 500 characters',
      }),
    }),
  },

  /**
   * Validation for updating a service category
   */
  updateServiceCategory: {
    params: Joi.object({
      id: Joi.string().hex().length(24).required().messages({
        'string.hex': 'Invalid service category ID format',
        'string.length': 'Invalid service category ID length',
      }),
    }),
    body: Joi.object({
      name: Joi.string().trim().max(100).messages({
        'string.max': 'Service category name cannot exceed 100 characters',
      }),
      status: Joi.string()
        .valid(...Object.values(ServiceCategoryStatus))
        .messages({
          'any.only': 'Invalid status value',
        }),
      description: Joi.string().trim().max(500).messages({
        'string.max': 'Description cannot exceed 500 characters',
      }),
    }).min(1),
  },

  /**
   * Validation for getting service category by ID
   */
  getServiceCategoryById: {
    params: Joi.object({
      id: Joi.string().hex().length(24).required().messages({
        'string.hex': 'Invalid service category ID format',
        'string.length': 'Invalid service category ID length',
      }),
    }),
  },

  /**
   * Validation for getting service categories by status
   */
  getServiceCategoriesByStatus: {
    params: Joi.object({
      status: Joi.string()
        .valid(...Object.values(ServiceCategoryStatus))
        .required()
        .messages({
          'any.only': 'Invalid status value',
          'string.empty': 'Status is required',
        }),
    }),
  },

  /**
   * Validation for deleting a service category
   */
  deleteServiceCategory: {
    params: Joi.object({
      id: Joi.string().hex().length(24).required().messages({
        'string.hex': 'Invalid service category ID format',
        'string.length': 'Invalid service category ID length',
      }),
    }),
  },

  /**
   * Validation for query parameters
   */
  queryParams: {
    query: Joi.object({
      status: Joi.string().valid(...Object.values(ServiceCategoryStatus)),
      name: Joi.string().trim(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      sortBy: Joi.string().valid('name', 'status', 'createdAt', 'updatedAt').default('createdAt'),
      sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    }),
  },
};
