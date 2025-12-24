/**
 * Job Routes
 * API endpoints for job operations
 */

import { Router } from 'express';
import * as jobController from '../controllers/job.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { uploadJobAttachments } from '../middlewares/upload.middleware';
import validate from '../middlewares/validate.middleware';
import { jobValidation } from '../utils/validation';
import { UserRole } from '../types/user.types';

const router = Router();

// =============================================================================
// PUBLIC ROUTES (No authentication required)
// =============================================================================

/**
 * @swagger
 * /api/jobs:
 *   get:
 *     summary: Get all jobs with filters
 *     description: Retrieve a paginated list of job postings with optional filters
 *     tags: [Jobs]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [OPEN, CLOSED, FILLED, CANCELLED]
 *         description: Filter by job status
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by location
 *       - in: query
 *         name: serviceType
 *         schema:
 *           type: string
 *         description: Filter by service type ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and description
 *     responses:
 *       200:
 *         description: Successfully retrieved jobs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 */
router.get('/', validate(jobValidation.queryJobs, 'query'), jobController.getAllJobs);

/**
 * @swagger
 * /api/jobs/{jobId}:
 *   get:
 *     summary: Get a single job by ID
 *     description: Retrieve detailed information about a specific job posting
 *     tags: [Jobs]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: The job ID
 *     responses:
 *       200:
 *         description: Successfully retrieved job
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *       404:
 *         description: Job not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:jobId', jobController.getJobById);

// =============================================================================
// AUTHENTICATED ROUTES
// =============================================================================

/**
 * @swagger
 * /api/jobs/user/my-posts:
 *   get:
 *     summary: Get jobs posted by the current user
 *     description: Retrieve all job postings created by the authenticated user
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved user's job posts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/user/my-posts',
  authenticate,
  authorize([UserRole.PARTICIPANT, UserRole.PROVIDER, UserRole.ADMIN]),
  jobController.getMyJobs
);

/**
 * @swagger
 * /api/jobs/user/my-applications:
 *   get:
 *     summary: Get user's job applications
 *     description: Retrieve all jobs the authenticated user has applied to
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved user's applications
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/user/my-applications',
  authenticate,
  jobController.getMyApplications
);

/**
 * @swagger
 * /api/jobs/user/saved:
 *   get:
 *     summary: Get user's saved jobs
 *     description: Retrieve all jobs saved by the authenticated user
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved saved jobs
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/user/saved',
  authenticate,
  jobController.getSavedJobs
);

/**
 * @swagger
 * /api/jobs:
 *   post:
 *     summary: Create a new job posting
 *     description: Create a new job posting (Participant or Provider only)
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - serviceType
 *               - location
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Personal Care Assistant Needed"
 *               description:
 *                 type: string
 *                 example: "Looking for a caring support worker to assist with daily activities"
 *               serviceType:
 *                 type: string
 *                 description: Service type ID
 *               location:
 *                 type: object
 *                 properties:
 *                   address:
 *                     type: string
 *                   suburb:
 *                     type: string
 *                   state:
 *                     type: string
 *                   postcode:
 *                     type: string
 *               requirements:
 *                 type: array
 *                 items:
 *                   type: string
 *               budget:
 *                 type: object
 *                 properties:
 *                   min:
 *                     type: number
 *                   max:
 *                     type: number
 *     responses:
 *       201:
 *         description: Job created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.post(
  '/',
  authenticate,
  authorize([UserRole.PARTICIPANT, UserRole.PROVIDER]),
  validate(jobValidation.createJob),
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
  validate(jobValidation.updateJob),
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
  validate(jobValidation.applyForJob),
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

