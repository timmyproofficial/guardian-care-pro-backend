/**
 * Worker search routes
 */

import express from 'express';
import { workerSearchController } from '../controllers/worker-search.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { UserRole } from '../types/user.types';

const router = express.Router();

/**
 * @swagger
 * /api/v1/workers/search:
 *   get:
 *     summary: Search for support workers with filtering and pagination
 *     description: Search for support workers with filtering and pagination
 *     tags: [Workers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: General
 *         required: true
 *         schema:
 *           type: array
 *         description: General filters: skills[]
 *       - in: query
 *         name: serviceAreas
 *         required: true
 *         schema:
 *           type: array
 *         description: serviceAreas[]
 *       - in: query
 *         name: languages
 *         required: true
 *         schema:
 *           type: array
 *         description: languages[]
 *       - in: query
 *         name: availabilityDays
 *         required: true
 *         schema:
 *           type: array
 *         description: availabilityDays[]
 *       - in: query
 *         name: availabilityStartTime
 *         required: true
 *         schema:
 *           type: string
 *         description: availabilityStartTime
 *       - in: query
 *         name: availabilityEndTime
 *         required: true
 *         schema:
 *           type: string
 *         description: availabilityEndTime
 *       - in: query
 *         name: availabilityDate
 *         required: true
 *         schema:
 *           type: string
 *         description: availabilityDate
 *       - in: query
 *         name: minRating
 *         required: true
 *         schema:
 *           type: string
 *         description: minRating
 *       - in: query
 *         name: maxHourlyRate
 *         required: true
 *         schema:
 *           type: string
 *         description: maxHourlyRate
 *       - in: query
 *         name: onlyVerified
 *         required: true
 *         schema:
 *           type: string
 *         description: onlyVerified
 *       - in: query
 *         name: keyword
 *         required: true
 *         schema:
 *           type: string
 *         description: keyword
 *       - in: query
 *         name: page
 *         required: true
 *         schema:
 *           type: string
 *         description: page
 *       - in: query
 *         name: limit
 *         required: true
 *         schema:
 *           type: string
 *         description: limit
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/search',
  authenticate,
  authorize([UserRole.PARTICIPANT]),
  workerSearchController.searchWorkers
);

/**
 * @swagger
 * /api/v1/workers/filter-options:
 *   get:
 *     summary: Get filter options for worker search
 *     description: Get filter options for worker search
 *     tags: [Workers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/filter-options',
  authenticate,
  authorize([UserRole.PARTICIPANT]),
  workerSearchController.getFilterOptions
);

/**
 * @swagger
 * /api/v1/workers/:workerId/profile:
 *   get:
 *     summary: Get worker profile details
 *     description: Get worker profile details
 *     tags: [Workers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workerId
 *         required: true
 *         schema:
 *           type: string
 *         description: The workerId
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.get(
  '/:workerId/profile',
  authenticate,
  authorize([UserRole.PARTICIPANT]),
  workerSearchController.getWorkerProfile
);

export default router;