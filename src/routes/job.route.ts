/**
 * Job Routes
 * API endpoints for job operations
 */

import { Router } from 'express';
import * as jobController from '../controllers/job.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { uploadJobAttachments } from '../middlewares/upload.middleware';
import { UserRole } from '../types/user.types';

const router = Router();

// =============================================================================
// PUBLIC ROUTES (No authentication required)
// =============================================================================

/**
 * @route   GET /api/jobs
 * @desc    Get all jobs with filters
 * @access  Public
 */
router.get('/', jobController.getAllJobs);

/**
 * @route   GET /api/jobs/:jobId
 * @desc    Get a single job by ID
 * @access  Public (but extra info if authenticated)
 */
router.get('/:jobId', jobController.getJobById);

// =============================================================================
// AUTHENTICATED ROUTES
// =============================================================================

/**
 * @route   GET /api/jobs/user/my-posts
 * @desc    Get jobs posted by the current user
 * @access  Private (Participant, Provider)
 */
router.get(
  '/user/my-posts',
  authenticate,
  authorize([UserRole.PARTICIPANT, UserRole.PROVIDER, UserRole.ADMIN]),
  jobController.getMyJobs
);

/**
 * @route   GET /api/jobs/user/my-applications
 * @desc    Get user's applied jobs
 * @access  Private
 */
router.get(
  '/user/my-applications',
  authenticate,
  jobController.getMyApplications
);

/**
 * @route   GET /api/jobs/user/saved
 * @desc    Get user's saved jobs
 * @access  Private
 */
router.get(
  '/user/saved',
  authenticate,
  jobController.getSavedJobs
);

/**
 * @route   POST /api/jobs
 * @desc    Create a new job
 * @access  Private (Participant, Provider only)
 */
router.post(
  '/',
  authenticate,
  authorize([UserRole.PARTICIPANT, UserRole.PROVIDER]),
  jobController.createJob
);

/**
 * @route   PUT /api/jobs/:jobId
 * @desc    Update a job
 * @access  Private (Owner or Admin)
 */
router.put(
  '/:jobId',
  authenticate,
  authorize([UserRole.PARTICIPANT, UserRole.PROVIDER, UserRole.ADMIN]),
  jobController.updateJob
);

/**
 * @route   DELETE /api/jobs/:jobId
 * @desc    Soft delete a job
 * @access  Private (Owner or Admin)
 */
router.delete(
  '/:jobId',
  authenticate,
  authorize([UserRole.PARTICIPANT, UserRole.PROVIDER, UserRole.ADMIN]),
  jobController.deleteJob
);

// =============================================================================
// JOB APPLICATION ROUTES
// =============================================================================

/**
 * @route   POST /api/jobs/:jobId/apply
 * @desc    Apply for a job (multipart/form-data with resume and coverLetter)
 * @access  Public (but tracks applicantId if authenticated)
 */
router.post(
  '/:jobId/apply',
  uploadJobAttachments(),
  jobController.applyForJob
);

/**
 * @route   GET /api/jobs/:jobId/applications
 * @desc    Get applications for a job (job owner only)
 * @access  Private (Job owner or Admin)
 */
router.get(
  '/:jobId/applications',
  authenticate,
  authorize([UserRole.PARTICIPANT, UserRole.PROVIDER, UserRole.ADMIN]),
  jobController.getJobApplications
);

/**
 * @route   GET /api/jobs/applications/:applicationId
 * @desc    Get a single application
 * @access  Private
 */
router.get(
  '/applications/:applicationId',
  authenticate,
  jobController.getApplicationById
);

/**
 * @route   PATCH /api/jobs/applications/:applicationId/status
 * @desc    Update application status
 * @access  Private (Job owner or Admin)
 */
router.patch(
  '/applications/:applicationId/status',
  authenticate,
  authorize([UserRole.PARTICIPANT, UserRole.PROVIDER, UserRole.ADMIN]),
  jobController.updateApplicationStatus
);

/**
 * @route   DELETE /api/jobs/applications/:applicationId
 * @desc    Delete an application (soft delete)
 * @access  Private (Applicant, Job owner, or Admin)
 */
router.delete(
  '/applications/:applicationId',
  authenticate,
  jobController.deleteApplication
);

// =============================================================================
// SAVED JOB ROUTES
// =============================================================================

/**
 * @route   POST /api/jobs/:jobId/save
 * @desc    Save a job
 * @access  Private
 */
router.post(
  '/:jobId/save',
  authenticate,
  jobController.saveJob
);

/**
 * @route   DELETE /api/jobs/:jobId/save
 * @desc    Unsave a job
 * @access  Private
 */
router.delete(
  '/:jobId/save',
  authenticate,
  jobController.unsaveJob
);

/**
 * @route   POST /api/jobs/:jobId/toggle-save
 * @desc    Toggle save status for a job
 * @access  Private
 */
router.post(
  '/:jobId/toggle-save',
  authenticate,
  jobController.toggleSaveJob
);

/**
 * @route   GET /api/jobs/:jobId/is-saved
 * @desc    Check if a job is saved
 * @access  Private
 */
router.get(
  '/:jobId/is-saved',
  authenticate,
  jobController.isJobSaved
);

export default router;

