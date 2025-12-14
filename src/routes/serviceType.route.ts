/**
 * Service Type routes
 */

import express from 'express';
import { serviceTypeController } from '../controllers/serviceType.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import validate from '../middlewares/validate.middleware';
import { serviceTypeValidation } from '../utils/validation';
import { UserRole } from '../types/user.types';

const router = express.Router();

// Get all service types (all authenticated users can read)
router.get(
  '/',
  authenticate,
  serviceTypeController.getAllServiceTypes
);

// Get service types grouped by category (all authenticated users can read)
router.get(
  '/by-category',
  authenticate,
  serviceTypeController.getServiceTypesGroupedByCategory
);

// Get active service types (all authenticated users can read)
router.get(
  '/active',
  authenticate,
  serviceTypeController.getActiveServiceTypes
);

// Get service type by ID (all authenticated users can read)
router.get(
  '/:serviceTypeId',
  authenticate,
  serviceTypeController.getServiceTypeById
);

// Get service type by code (all authenticated users can read)
router.get(
  '/code/:code',
  authenticate,
  serviceTypeController.getServiceTypeByCode
);

// Create service type (Admin only)
router.post(
  '/',
  authenticate,
  authorize([UserRole.ADMIN]),
  validate(serviceTypeValidation.createServiceType),
  serviceTypeController.createServiceType
);

// Update service type (Admin only)
router.patch(
  '/:serviceTypeId',
  authenticate,
  authorize([UserRole.ADMIN]),
  validate(serviceTypeValidation.updateServiceType),
  serviceTypeController.updateServiceType
);

// Delete service type (Admin only)
router.delete(
  '/:serviceTypeId',
  authenticate,
  authorize([UserRole.ADMIN]),
  serviceTypeController.deleteServiceType
);

export default router; 