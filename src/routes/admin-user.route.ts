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
 * @route GET /api/admin/participants
 * @desc Get all participants with advanced filtering, sorting, and pagination
 * @access Private (Admin only)
 * @query {string} [status] - Filter by user status (active, inactive, pending, suspended)
 * @query {string} [search] - Search by name or email
 * @query {string} [dateFrom] - Filter by creation date from (ISO string)
 * @query {string} [dateTo] - Filter by creation date to (ISO string)
 * @query {boolean} [isEmailVerified] - Filter by email verification status
 * @query {boolean} [hasProfileImage] - Filter by profile image presence
 * @query {boolean} [hasGuardian] - Filter by guardian presence
 * @query {string} [subscriptionTier] - Filter by subscription tier
 * @query {string} [subscriptionStatus] - Filter by subscription status (active, inactive)
 * @query {boolean} [hasNdisNumber] - Filter by NDIS number presence
 * @query {boolean} [requiresSupervision] - Filter by supervision requirement
 * @query {boolean} [hasOrganization] - Filter by organization presence
 * @query {string} [sortField] - Field to sort by (default: createdAt)
 * @query {string} [sortDirection] - Sort direction: asc or desc (default: desc)
 * @query {number} [page] - Page number (default: 1)
 * @query {number} [limit] - Items per page (default: 20, max: 100)
 */
router.get(
  '/participants',
  authenticate,
  authorize([UserRole.ADMIN]),
  adminUserController.getParticipants
);

/**
 * @route GET /api/admin/support-workers
 * @desc Get all support workers with advanced filtering, sorting, and pagination
 * @access Private (Admin only)
 * @query {string} [status] - Filter by user status
 * @query {string} [search] - Search by name or email
 * @query {string} [dateFrom] - Filter by creation date from
 * @query {string} [dateTo] - Filter by creation date to
 * @query {boolean} [isEmailVerified] - Filter by email verification status
 * @query {boolean} [hasProfileImage] - Filter by profile image presence
 * @query {string} [skills] - Comma-separated list of skills to filter by
 * @query {string} [serviceAreas] - Comma-separated list of service areas
 * @query {string} [languages] - Comma-separated list of languages
 * @query {boolean} [hasAbn] - Filter by ABN presence
 * @query {boolean} [hasBankDetails] - Filter by bank details presence
 * @query {number} [minRating] - Minimum rating filter
 * @query {number} [maxRating] - Maximum rating filter
 * @query {number} [minHourlyRate] - Minimum hourly rate filter
 * @query {number} [maxHourlyRate] - Maximum hourly rate filter
 * @query {boolean} [hasQualifications] - Filter by qualifications presence
 * @query {boolean} [hasExperience] - Filter by experience presence
 * @query {boolean} [profileSetupComplete] - Filter by profile setup completion
 * @query {boolean} [identityVerified] - Filter by identity verification
 * @query {boolean} [policeCheckVerified] - Filter by police check verification
 * @query {boolean} [ndisWorkerScreeningVerified] - Filter by NDIS screening verification
 * @query {boolean} [onboardingComplete] - Filter by onboarding completion
 * @query {boolean} [onboardingFeeReceived] - Filter by onboarding fee status
 * @query {number} [minOrganizations] - Minimum number of organizations
 * @query {number} [maxOrganizations] - Maximum number of organizations
 * @query {string} [sortField] - Field to sort by (default: createdAt)
 * @query {string} [sortDirection] - Sort direction: asc or desc (default: desc)
 * @query {number} [page] - Page number (default: 1)
 * @query {number} [limit] - Items per page (default: 20, max: 100)
 */
router.get(
  '/support-workers',
  authenticate,
  authorize([UserRole.ADMIN]),
  adminUserController.getWorkers
);

/**
 * @route GET /api/admin/admins
 * @desc Get all administrators with advanced filtering, sorting, and pagination
 * @access Private (Admin only)
 * @query {string} [status] - Filter by user status
 * @query {string} [search] - Search by name or email
 * @query {string} [dateFrom] - Filter by creation date from
 * @query {string} [dateTo] - Filter by creation date to
 * @query {boolean} [isEmailVerified] - Filter by email verification status
 * @query {boolean} [hasProfileImage] - Filter by profile image presence
 * @query {string} [adminType] - Filter by admin type
 * @query {boolean} [hasAssignedOrganizations] - Filter by assigned organizations presence
 * @query {boolean} [canManageUsers] - Filter by user management permission
 * @query {boolean} [canManageWorkers] - Filter by worker management permission
 * @query {boolean} [canManageParticipants] - Filter by participant management permission
 * @query {boolean} [canApproveInvites] - Filter by invite approval permission
 * @query {boolean} [canManageServiceAgreements] - Filter by service agreement permission
 * @query {boolean} [canManageSubscriptions] - Filter by subscription management permission
 * @query {boolean} [canAccessFinancials] - Filter by financial access permission
 * @query {boolean} [canManageAdmins] - Filter by admin management permission
 * @query {string} [sortField] - Field to sort by (default: createdAt)
 * @query {string} [sortDirection] - Sort direction: asc or desc (default: desc)
 * @query {number} [page] - Page number (default: 1)
 * @query {number} [limit] - Items per page (default: 20, max: 100)
 */
router.get(
  '/admins',
  authenticate,
  authorize([UserRole.ADMIN]),
  adminUserController.getAdmins
);

/**
 * @route GET /api/admin/users/filter-options
 * @desc Get filter options for user management dropdowns
 * @access Private (Admin only)
 */
router.get(
  '/users/filter-options',
  authenticate,
  authorize([UserRole.ADMIN]),
  adminUserController.getFilterOptions
);

/**
 * @route GET /api/admin/users/statistics
 * @desc Get user statistics for admin dashboard
 * @access Private (Admin only)
 */
router.get(
  '/users/statistics',
  authenticate,
  authorize([UserRole.ADMIN]),
  adminUserController.getStatistics
);

export default router;