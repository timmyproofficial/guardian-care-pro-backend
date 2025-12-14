import { authenticate, authorize } from '../middlewares/auth.middleware';
import validate from '../middlewares/validate.middleware';
import express from 'express';
import { UserRole } from '../types/user.types';
import { serviceCategoryValidation } from '../utils/validation/serviceCategory.validation';
import serviceCategoryController from '../controllers/serviceCategory.controller';

const router: express.Router = express.Router();

// Public routes (authenticated users can view)
router.get(
  '/',
  authenticate,
  validate(serviceCategoryValidation.queryParams.query, 'query'),
  serviceCategoryController.getAllServiceCategories,
);

router.get(
  '/statistics',
  authenticate,
  authorize([UserRole.ADMIN]),
  serviceCategoryController.getServiceCategoryStatistics,
);

router.get(
  '/status/:status',
  authenticate,
  validate(serviceCategoryValidation.getServiceCategoriesByStatus.params, 'params'),
  serviceCategoryController.getServiceCategoriesByStatus,
);

router.get(
  '/:id',
  authenticate,
  validate(serviceCategoryValidation.getServiceCategoryById.params, 'params'),
  serviceCategoryController.getServiceCategoryById,
);

// Admin-only routes
router.post(
  '/',
  authenticate,
  authorize([UserRole.ADMIN]),
  validate(serviceCategoryValidation.createServiceCategory.body),
  serviceCategoryController.createServiceCategory,
);

router.put(
  '/:id',
  authenticate,
  authorize([UserRole.ADMIN]),
  validate(serviceCategoryValidation.updateServiceCategory.params, 'params'),
  validate(serviceCategoryValidation.updateServiceCategory.body, 'body'),
  serviceCategoryController.updateServiceCategory,
);

router.delete(
  '/:id',
  authenticate,
  authorize([UserRole.ADMIN]),
  validate(serviceCategoryValidation.deleteServiceCategory.params, 'params'),
  serviceCategoryController.deleteServiceCategory,
);

export default router;