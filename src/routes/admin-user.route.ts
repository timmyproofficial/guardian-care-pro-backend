/**
 * Admin User Management Routes
 * Routes for managing participants, support workers, and admins
 */

import express from 'express';
import { adminUserController } from '../controllers/admin-user.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { UserRole } from '../types/user.types';

const router = express.Router();

/**
 * @swagger
 * /api/v1/admin/participants:
 *   get:
 *     summary: Get all participants with advanced filtering, sorting, and pagination
 *     description: Get all participants with advanced filtering, sorting, and pagination
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: string
 *         required: true
 *         schema:
 *           type: string
 *         description: {string} [status] - Filter by user status (active
 *       - in: query
 *         name: inactive
 *         required: true
 *         schema:
 *           type: string
 *         description: inactive
 *       - in: query
 *         name: pending
 *         required: true
 *         schema:
 *           type: string
 *         description: pending
 *       - in: query
 *         name: suspended
 *         required: true
 *         schema:
 *           type: string
 *         description: suspended)
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/participants',
  authenticate,
  authorize([UserRole.ADMIN]),
  adminUserController.getParticipants
);

/**
 * @swagger
 * /api/v1/admin/support-workers:
 *   get:
 *     summary: Get all support workers with advanced filtering, sorting, and pagination
 *     description: Get all support workers with advanced filtering, sorting, and pagination
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: string
 *         required: true
 *         schema:
 *           type: string
 *         description: {string} [status] - Filter by user status
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/support-workers',
  authenticate,
  authorize([UserRole.ADMIN]),
  adminUserController.getWorkers
);

/**
 * @swagger
 * /api/v1/admin/admins:
 *   get:
 *     summary: Get all administrators with advanced filtering, sorting, and pagination
 *     description: Get all administrators with advanced filtering, sorting, and pagination
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: string
 *         required: true
 *         schema:
 *           type: string
 *         description: {string} [status] - Filter by user status
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/admins',
  authenticate,
  authorize([UserRole.ADMIN]),
  adminUserController.getAdmins
);

/**
 * @swagger
 * /api/v1/admin/users/filter-options:
 *   get:
 *     summary: Get filter options for user management dropdowns
 *     description: Get filter options for user management dropdowns
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/users/filter-options',
  authenticate,
  authorize([UserRole.ADMIN]),
  adminUserController.getFilterOptions
);

/**
 * @swagger
 * /api/v1/admin/users/statistics:
 *   get:
 *     summary: Get user statistics for admin dashboard
 *     description: Get user statistics for admin dashboard
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/users/statistics',
  authenticate,
  authorize([UserRole.ADMIN]),
  adminUserController.getStatistics
);

export default router;