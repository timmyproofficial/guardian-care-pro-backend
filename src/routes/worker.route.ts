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
 * @query General filters: skills[], serviceAreas[], languages[], availabilityDays[], availabilityStartTime, availabilityEndTime, availabilityDate, minRating, maxHourlyRate, onlyVerified, keyword, page, limit
 * @query Location filters: stateId, regionId, serviceAreaId, matchParticipantLocation
 * @access Private (Participants only - uses authenticated user's ID)
 * @example GET /api/workers/search?skills[]=skill1&skills[]=skill2&page=1&limit=10
 * @example GET /api/workers/search?regionId=456&minRating=4&page=1
 * @example GET /api/workers/search?matchParticipantLocation=true&skills[]=skill1
 * @example GET /api/workers/search?stateId=123&languages[]=English&onlyVerified=true
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