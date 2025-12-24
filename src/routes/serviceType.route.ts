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

/**
 * @swagger
 * /api/v1/service-types:
 *   get:
 *     summary: Get all service types
 *     description: Retrieve all service types (all authenticated users can read)
 *     tags: [Service Types]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved service types
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/',
  authenticate,
  serviceTypeController.getAllServiceTypes
);

/**
 * @swagger
 * /api/v1/service-types/active:
 *   get:
 *     summary: Get active service types
 *     description: Retrieve only active service types
 *     tags: [Service Types]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved active service types
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/active',
  authenticate,
  serviceTypeController.getActiveServiceTypes
);

/**
 * @swagger
 * /api/v1/service-types/{serviceTypeId}:
 *   get:
 *     summary: Get service type by ID
 *     description: Retrieve detailed information about a specific service type
 *     tags: [Service Types]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceTypeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Service type ID
 *     responses:
 *       200:
 *         description: Successfully retrieved service type
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Service type not found
 */
router.get(
  '/:serviceTypeId',
  authenticate,
  serviceTypeController.getServiceTypeById
);

/**
 * @swagger
 * /api/v1/service-types/code/{code}:
 *   get:
 *     summary: Get service type by code
 *     description: Retrieve service type using its unique code
 *     tags: [Service Types]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Service type code
 *     responses:
 *       200:
 *         description: Successfully retrieved service type
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Service type not found
 */
router.get(
  '/code/:code',
  authenticate,
  serviceTypeController.getServiceTypeByCode
);

/**
 * @swagger
 * /api/v1/service-types:
 *   post:
 *     summary: Create service type
 *     description: Create a new service type (Admin only)
 *     tags: [Service Types]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - name
 *               - categoryId
 *             properties:
 *               code:
 *                 type: string
 *                 example: "ASSIST_TRAVEL"
 *                 description: Unique service type code
 *               name:
 *                 type: string
 *                 example: "Assist Travel/Transport"
 *               description:
 *                 type: string
 *               categoryId:
 *                 type: string
 *                 description: Service category ID
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Service type created successfully
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
  validate(serviceTypeValidation.createServiceType),
  serviceTypeController.createServiceType
);

/**
 * @swagger
 * /api/v1/service-types/{serviceTypeId}:
 *   patch:
 *     summary: Update service type
 *     description: Update an existing service type (Admin only)
 *     tags: [Service Types]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceTypeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Service type ID
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
 *               isActive:
 *                 type: boolean
 *               categoryId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Service type updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Service type not found
 */
router.patch(
  '/:serviceTypeId',
  authenticate,
  authorize([UserRole.ADMIN]),
  validate(serviceTypeValidation.updateServiceType),
  serviceTypeController.updateServiceType
);

/**
 * @swagger
 * /api/v1/service-types/{serviceTypeId}:
 *   delete:
 *     summary: Delete service type
 *     description: Delete a service type (Admin only)
 *     tags: [Service Types]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceTypeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Service type ID
 *     responses:
 *       200:
 *         description: Service type deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Service type not found
 */
router.delete(
  '/:serviceTypeId',
  authenticate,
  authorize([UserRole.ADMIN]),
  serviceTypeController.deleteServiceType
);

export default router; 