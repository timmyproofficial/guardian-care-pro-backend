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
 * /api/v1/jobs:
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
 * /api/v1/jobs/{jobId}:
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
 * /api/v1/jobs/user/my-posts:
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
 * /api/v1/jobs/user/my-applications:
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
 * /api/v1/jobs/user/saved:
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
 * /api/v1/jobs:
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
 * @swagger
 * /api/v1/jobs/:jobId:
 *   put:
 *     summary: Update a job
 *     description: Update a job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: The jobId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Successfully updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.put(
  '/:jobId',
  authenticate,
  authorize([UserRole.PARTICIPANT, UserRole.PROVIDER, UserRole.ADMIN]),
  validate(jobValidation.updateJob),
  jobController.updateJob
);

/**
 * @swagger
 * /api/v1/jobs/:jobId:
 *   delete:
 *     summary: Soft delete a job
 *     description: Soft delete a job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: The jobId
 *     responses:
 *       200:
 *         description: Successfully deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
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
 * @swagger
 * /api/v1/jobs/:jobId/apply:
 *   post:
 *     summary: Apply for a job (multipart/form-data with resume and coverLetter)
 *     description: Apply for a job (multipart/form-data with resume and coverLetter)
 *     tags: [Jobs]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: The jobId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Successfully created
 *       404:
 *         description: Resource not found
 */
router.post(
  '/:jobId/apply',
  uploadJobAttachments(),
  validate(jobValidation.applyForJob),
  jobController.applyForJob
);

/**
 * @swagger
 * /api/v1/jobs/:jobId/applications:
 *   get:
 *     summary: Get applications for a job (job owner only)
 *     description: Get applications for a job (job owner only)
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: The jobId
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.get(
  '/:jobId/applications',
  authenticate,
  authorize([UserRole.PARTICIPANT, UserRole.PROVIDER, UserRole.ADMIN]),
  jobController.getJobApplications
);

/**
 * @swagger
 * /api/v1/jobs/applications/:applicationId:
 *   get:
 *     summary: Get a single application
 *     description: Get a single application
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema:
 *           type: string
 *         description: The applicationId
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.get(
  '/applications/:applicationId',
  authenticate,
  jobController.getApplicationById
);

/**
 * @swagger
 * /api/v1/jobs/applications/:applicationId/status:
 *   patch:
 *     summary: Update application status
 *     description: Update application status
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema:
 *           type: string
 *         description: The applicationId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Successfully updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.patch(
  '/applications/:applicationId/status',
  authenticate,
  authorize([UserRole.PARTICIPANT, UserRole.PROVIDER, UserRole.ADMIN]),
  jobController.updateApplicationStatus
);

/**
 * @swagger
 * /api/v1/jobs/applications/:applicationId:
 *   delete:
 *     summary: Delete an application (soft delete)
 *     description: Delete an application (soft delete)
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema:
 *           type: string
 *         description: The applicationId
 *     responses:
 *       200:
 *         description: Successfully deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
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
 * @swagger
 * /api/v1/jobs/:jobId/save:
 *   post:
 *     summary: Save a job
 *     description: Save a job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: The jobId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Successfully created
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.post(
  '/:jobId/save',
  authenticate,
  jobController.saveJob
);

/**
 * @swagger
 * /api/v1/jobs/:jobId/save:
 *   delete:
 *     summary: Unsave a job
 *     description: Unsave a job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: The jobId
 *     responses:
 *       200:
 *         description: Successfully deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.delete(
  '/:jobId/save',
  authenticate,
  jobController.unsaveJob
);

/**
 * @swagger
 * /api/v1/jobs/:jobId/toggle-save:
 *   post:
 *     summary: Toggle save status for a job
 *     description: Toggle save status for a job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: The jobId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Successfully created
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.post(
  '/:jobId/toggle-save',
  authenticate,
  jobController.toggleSaveJob
);

/**
 * @swagger
 * /api/v1/jobs/:jobId/is-saved:
 *   get:
 *     summary: Check if a job is saved
 *     description: Check if a job is saved
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: The jobId
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.get(
  '/:jobId/is-saved',
  authenticate,
  jobController.isJobSaved
);

export default router;

