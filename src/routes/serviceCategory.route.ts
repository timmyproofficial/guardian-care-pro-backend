import { authenticate, authorize } from '../middlewares/auth.middleware';
import validate from '../middlewares/validate.middleware';
import express from 'express';
import { UserRole } from '../types/user.types';
import { serviceCategoryValidation } from '../utils/validation/serviceCategory.validation';
import serviceCategoryController from '../controllers/serviceCategory.controller';

const router: express.Router = express.Router();

/**
 * @swagger
 * /api/v1/service-categories:
 *   get:
 *     summary: Get all service categories
 *     description: Retrieve all service categories with optional filtering
 *     tags: [Service Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by category name
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Successfully retrieved service categories
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/',
  authenticate,
  validate(serviceCategoryValidation.queryParams.query, 'query'),
  serviceCategoryController.getAllServiceCategories,
);

/**
 * @swagger
 * /api/v1/service-categories/statistics:
 *   get:
 *     summary: Get service category statistics
 *     description: Retrieve statistics about service categories (Admin only)
 *     tags: [Service Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved statistics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get(
  '/statistics',
  authenticate,
  authorize([UserRole.ADMIN]),
  serviceCategoryController.getServiceCategoryStatistics,
);

/**
 * @swagger
 * /api/v1/service-categories/status/{status}:
 *   get:
 *     summary: Get service categories by status
 *     description: Retrieve service categories filtered by active or inactive status
 *     tags: [Service Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Category status
 *     responses:
 *       200:
 *         description: Successfully retrieved service categories
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/status/:status',
  authenticate,
  validate(serviceCategoryValidation.getServiceCategoriesByStatus.params, 'params'),
  serviceCategoryController.getServiceCategoriesByStatus,
);

/**
 * @swagger
 * /api/v1/service-categories/{id}:
 *   get:
 *     summary: Get service category by ID
 *     description: Retrieve detailed information about a specific service category
 *     tags: [Service Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service category ID
 *     responses:
 *       200:
 *         description: Successfully retrieved service category
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Service category not found
 */
router.get(
  '/:id',
  authenticate,
  validate(serviceCategoryValidation.getServiceCategoryById.params, 'params'),
  serviceCategoryController.getServiceCategoryById,
);

/**
 * @swagger
 * /api/v1/service-categories:
 *   post:
 *     summary: Create service category
 *     description: Create a new service category (Admin only)
 *     tags: [Service Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Personal Care"
 *               description:
 *                 type: string
 *                 example: "Assistance with daily personal care activities"
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 default: active
 *     responses:
 *       201:
 *         description: Service category created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.post(
  '/',
  authenticate,
  authorize([UserRole.ADMIN]),
  validate(serviceCategoryValidation.createServiceCategory.body),
  serviceCategoryController.createServiceCategory,
);

/**
 * @swagger
 * /api/v1/service-categories/{id}:
 *   put:
 *     summary: Update service category
 *     description: Update an existing service category (Admin only)
 *     tags: [Service Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       200:
 *         description: Service category updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Service category not found
 */
router.put(
  '/:id',
  authenticate,
  authorize([UserRole.ADMIN]),
  validate(serviceCategoryValidation.updateServiceCategory.params, 'params'),
  validate(serviceCategoryValidation.updateServiceCategory.body, 'body'),
  serviceCategoryController.updateServiceCategory,
);

/**
 * @swagger
 * /api/v1/service-categories/{id}:
 *   delete:
 *     summary: Delete service category
 *     description: Delete a service category (Admin only)
 *     tags: [Service Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service category ID
 *     responses:
 *       200:
 *         description: Service category deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Service category not found
 */
router.delete(
  '/:id',
  authenticate,
  authorize([UserRole.ADMIN]),
  validate(serviceCategoryValidation.deleteServiceCategory.params, 'params'),
  serviceCategoryController.deleteServiceCategory,
);

export default router;