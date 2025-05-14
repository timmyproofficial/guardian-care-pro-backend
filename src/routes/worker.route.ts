/**
 * Worker search routes
 */

import express from 'express';
import { workerSearchController } from '../controllers/worker-search.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { UserRole } from '../types/user.types';

const router = express.Router();

/**
 * @route GET /api/workers/search
 * @desc Search for support workers with filtering and pagination
 * @access Private (Participants only)
 */
router.get(
  '/search',
  authenticate,
  authorize([UserRole.PARTICIPANT]),
  workerSearchController.searchWorkers
);

/**
 * @route GET /api/workers/filter-options
 * @desc Get filter options for worker search
 * @access Private (Participants only)
 */
router.get(
  '/filter-options',
  authenticate,
  authorize([UserRole.PARTICIPANT]),
  workerSearchController.getFilterOptions
);

/**
 * @route GET /api/workers/:workerId/profile
 * @desc Get worker profile details
 * @access Private (Participants only)
 */
router.get(
  '/:workerId/profile',
  authenticate,
  authorize([UserRole.PARTICIPANT]),
  workerSearchController.getWorkerProfile
);

export default router;