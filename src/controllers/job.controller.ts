/**
 * Job Controller
 * HTTP request handlers for job operations
 */

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import httpStatus from 'http-status';
import * as jobService from '../services/job.service';
import * as jobApplicationService from '../services/jobApplication.service';
import * as savedJobService from '../services/savedJob.service';
import logger from '../utils/logger';
import {
  CreateJobInput,
  UpdateJobInput,
  JobSearchParams,
  JobApplicationInput,
  IJobAttachment,
  JobRole,
  JobType,
  JobStatus,
  ApplicationStatus,
} from '../types/job.types';
import { UserRole } from '../types/user.types';
import ApiError from '../utils/api-error';
import catchAsync from '../utils/catchAsync';

// =============================================================================
// JOB CRUD OPERATIONS
// =============================================================================

/**
 * Create a new job
 * POST /api/jobs
 */
export const createJob = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!._id;
  const userRole = req.user!.role;

  // Determine poster type
  let postedByType: 'participant' | 'provider';
  if (userRole === UserRole.PARTICIPANT) {
    postedByType = 'participant';
  } else if (userRole === UserRole.PROVIDER) {
    postedByType = 'provider';
  } else {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only participants and providers can post jobs');
  }

  const input: CreateJobInput = {
    jobRole: req.body.jobRole,
    jobDescription: req.body.jobDescription,
    keyResponsibilities: req.body.keyResponsibilities,
    requiredCompetencies: req.body.requiredCompetencies,
    location: req.body.location,
    stateId: req.body.stateId,
    regionId: req.body.regionId,
    serviceAreaIds: req.body.serviceAreaIds,
    price: req.body.price,
    jobType: req.body.jobType,
    additionalNote: req.body.additionalNote,
    status: req.body.status || JobStatus.ACTIVE,
  };

  const job = await jobService.createJob(userId, postedByType, input);

  // Populate poster info before responding
  await job.populate([
    { path: 'postedBy', select: 'firstName lastName profileImage' },
    { path: 'stateId', select: 'name code' },
    { path: 'regionId', select: 'name code' },
    { path: 'serviceAreaIds', select: 'name code' },
  ]);

  res.status(httpStatus.CREATED).json({
    success: true,
    message: 'Job created successfully',
    data: { job },
  });
});

/**
 * Get all jobs with filters
 * GET /api/jobs
 */
export const getAllJobs = catchAsync(async (req: Request, res: Response) => {
  const params: JobSearchParams = {
    jobRole: req.query.jobRole as JobRole,
    jobType: req.query.jobType as JobType,
    location: req.query.location as string,
    minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
    maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
    status: (req.query.status as JobStatus) || JobStatus.ACTIVE,
    postedByType: req.query.postedByType as 'participant' | 'provider',
    search: req.query.search as string,
    limit: Math.min(Number(req.query.limit) || 20, 100),
    offset: Number(req.query.offset) || 0,
    sortBy: (req.query.sortBy as 'createdAt' | 'price' | 'applicationCount') || 'createdAt',
    sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
  };

  const stateIdQuery = req.query.stateId as string;
  const regionIdQuery = req.query.regionId as string;
  const serviceAreaIdsQuery = req.query.serviceAreaIds as string | string[];

  if (stateIdQuery) {
    params.stateId = new Types.ObjectId(stateIdQuery);
  }
  if (regionIdQuery) {
    params.regionId = new Types.ObjectId(regionIdQuery);
  }
  if (serviceAreaIdsQuery) {
    params.serviceAreaIds = Array.isArray(serviceAreaIdsQuery)
      ? serviceAreaIdsQuery.map((id) => new Types.ObjectId(id))
      : [new Types.ObjectId(serviceAreaIdsQuery)];
  }

  const result = await jobService.getAllJobs(params);

  res.status(httpStatus.OK).json({
    success: true,
    data: result,
  });
});

/**
 * Get a single job by ID
 * GET /api/jobs/:jobId
 */
export const getJobById = catchAsync(async (req: Request, res: Response) => {
  const { jobId } = req.params;

  const job = await jobService.getJobById(jobId);

  if (!job) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Job not found');
  }

  // Check if user has saved this job (if authenticated)
  let isSaved = false;
  let hasApplied = false;

  if (req.user) {
    const userId = req.user._id;
    [isSaved, hasApplied] = await Promise.all([
      savedJobService.isJobSaved(userId, jobId),
      jobApplicationService.hasUserApplied(jobId, userId),
    ]);
  }

  res.status(httpStatus.OK).json({
    success: true,
    data: {
      job,
      isSaved,
      hasApplied,
    },
  });
});

/**
 * Get jobs posted by the current user
 * GET /api/jobs/my-posts
 */
export const getMyJobs = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!._id;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = Number(req.query.offset) || 0;
  const includeDeleted = req.query.includeDeleted === 'true';

  const result = await jobService.getJobsByUser(userId, includeDeleted, limit, offset);

  res.status(httpStatus.OK).json({
    success: true,
    data: {
      jobs: result.jobs,
      total: result.total,
      pagination: {
        limit,
        offset,
        hasMore: offset + result.jobs.length < result.total,
      },
    },
  });
});

/**
 * Update a job
 * PUT /api/jobs/:jobId
 */
export const updateJob = catchAsync(async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const userId = req.user!._id;
  const isAdmin = req.user!.role === UserRole.ADMIN;

  const input: UpdateJobInput = {
    jobRole: req.body.jobRole,
    jobDescription: req.body.jobDescription,
    keyResponsibilities: req.body.keyResponsibilities,
    requiredCompetencies: req.body.requiredCompetencies,
    location: req.body.location,
    stateId: req.body.stateId,
    regionId: req.body.regionId,
    serviceAreaIds: req.body.serviceAreaIds,
    price: req.body.price,
    jobType: req.body.jobType,
    additionalNote: req.body.additionalNote,
    status: req.body.status,
  };

  // Remove undefined values
  Object.keys(input).forEach((key) => {
    if (input[key as keyof UpdateJobInput] === undefined) {
      delete input[key as keyof UpdateJobInput];
    }
  });

  const job = await jobService.updateJob(jobId, userId, input, isAdmin);

  await job.populate([
    { path: 'postedBy', select: 'firstName lastName profileImage' },
    { path: 'stateId', select: 'name code' },
    { path: 'regionId', select: 'name code' },
    { path: 'serviceAreaIds', select: 'name code' },
  ]);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Job updated successfully',
    data: { job },
  });
});

/**
 * Soft delete a job
 * DELETE /api/jobs/:jobId
 */
export const deleteJob = catchAsync(async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const userId = req.user!._id;
  const isAdmin = req.user!.role === UserRole.ADMIN;

  await jobService.deleteJob(jobId, userId, isAdmin);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Job deleted successfully',
  });
});

// =============================================================================
// JOB APPLICATION OPERATIONS
// =============================================================================

/**
 * Apply for a job
 * POST /api/jobs/:jobId/apply
 */
export const applyForJob = catchAsync(async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const applicantId = req.user?._id;

  const input: JobApplicationInput = {
    fullName: req.body.fullName,
    email: req.body.email,
    phone: req.body.phone,
    location: req.body.location,
  };

  // Process uploaded files from Cloudinary
  // multer-storage-cloudinary adds 'path' as the Cloudinary URL
  // Some versions may use 'secure_url' or 'url' instead
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  const attachments: IJobAttachment[] = [];

  // Log file upload details for debugging
  logger.info('Job application file upload', {
    hasFiles: !!files,
    fileFields: files ? Object.keys(files) : [],
    resumeCount: files?.resume?.length || 0,
    coverLetterCount: files?.coverLetter?.length || 0,
  });

  // Helper to extract Cloudinary URL from file object
  const getCloudinaryUrl = (file: any): string | undefined => {
    return file.path || file.secure_url || file.url || file.location;
  };

  if (files?.resume?.[0]) {
    const resumeFile = files.resume[0] as any;
    const fileUrl = getCloudinaryUrl(resumeFile);
    
    if (!fileUrl) {
      logger.error('Resume file upload failed - no URL returned from Cloudinary', { 
        fileKeys: Object.keys(resumeFile),
        filename: resumeFile.filename,
        originalname: resumeFile.originalname 
      });
      throw new ApiError(httpStatus.BAD_REQUEST, 'Resume upload failed. Please try again.');
    }
    
    attachments.push({
      fieldName: 'resume',
      fileName: resumeFile.originalname,
      fileUrl: fileUrl,
      fileType: resumeFile.mimetype,
      fileSize: resumeFile.size || 0,
      uploadedAt: new Date(),
    });
  }

  if (files?.coverLetter?.[0]) {
    const coverLetterFile = files.coverLetter[0] as any;
    const fileUrl = getCloudinaryUrl(coverLetterFile);
    
    if (!fileUrl) {
      logger.error('Cover letter file upload failed - no URL returned from Cloudinary', { 
        fileKeys: Object.keys(coverLetterFile),
        filename: coverLetterFile.filename,
        originalname: coverLetterFile.originalname 
      });
      throw new ApiError(httpStatus.BAD_REQUEST, 'Cover letter upload failed. Please try again.');
    }
    
    attachments.push({
      fieldName: 'coverLetter',
      fileName: coverLetterFile.originalname,
      fileUrl: fileUrl,
      fileType: coverLetterFile.mimetype,
      fileSize: coverLetterFile.size || 0,
      uploadedAt: new Date(),
    });
  }

  if (attachments.length === 0 || !attachments.some((a) => a.fieldName === 'resume')) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Resume is required');
  }

  const application = await jobApplicationService.applyForJob(
    jobId,
    input,
    attachments,
    applicantId
  );

  res.status(httpStatus.CREATED).json({
    success: true,
    message: 'Application submitted successfully',
    data: { application },
  });
});

/**
 * Get applications for a job (job owner only)
 * GET /api/jobs/:jobId/applications
 */
export const getJobApplications = catchAsync(async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const userId = req.user!._id;
  const isAdmin = req.user!.role === UserRole.ADMIN;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = Number(req.query.offset) || 0;

  const result = await jobApplicationService.getApplicationsForJob(
    jobId,
    userId,
    isAdmin,
    limit,
    offset
  );

  res.status(httpStatus.OK).json({
    success: true,
    data: {
      applications: result.applications,
      total: result.total,
      pagination: {
        limit,
        offset,
        hasMore: offset + result.applications.length < result.total,
      },
    },
  });
});

/**
 * Get user's applied jobs
 * GET /api/jobs/my-applications
 */
export const getMyApplications = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!._id;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = Number(req.query.offset) || 0;

  const result = await jobApplicationService.getApplicationsByUser(userId, limit, offset);

  res.status(httpStatus.OK).json({
    success: true,
    data: {
      applications: result.applications,
      total: result.total,
      pagination: {
        limit,
        offset,
        hasMore: offset + result.applications.length < result.total,
      },
    },
  });
});

/**
 * Get a single application
 * GET /api/jobs/applications/:applicationId
 */
export const getApplicationById = catchAsync(async (req: Request, res: Response) => {
  const { applicationId } = req.params;

  const application = await jobApplicationService.getApplicationById(applicationId);

  if (!application) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Application not found');
  }

  res.status(httpStatus.OK).json({
    success: true,
    data: { application },
  });
});

/**
 * Update application status
 * PATCH /api/jobs/applications/:applicationId/status
 */
export const updateApplicationStatus = catchAsync(async (req: Request, res: Response) => {
  const { applicationId } = req.params;
  const userId = req.user!._id;
  const isAdmin = req.user!.role === UserRole.ADMIN;
  const { status } = req.body;

  if (!Object.values(ApplicationStatus).includes(status)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid application status');
  }

  const application = await jobApplicationService.updateApplicationStatus(
    applicationId,
    userId,
    status,
    isAdmin
  );

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Application status updated successfully',
    data: { application },
  });
});

/**
 * Delete an application (soft delete)
 * DELETE /api/jobs/applications/:applicationId
 */
export const deleteApplication = catchAsync(async (req: Request, res: Response) => {
  const { applicationId } = req.params;
  const userId = req.user!._id;
  const isAdmin = req.user!.role === UserRole.ADMIN;

  await jobApplicationService.deleteApplication(applicationId, userId, isAdmin);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Application deleted successfully',
  });
});

// =============================================================================
// SAVED JOB OPERATIONS
// =============================================================================

/**
 * Save a job
 * POST /api/jobs/:jobId/save
 */
export const saveJob = catchAsync(async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const userId = req.user!._id;

  const savedJob = await savedJobService.saveJob(userId, jobId);

  res.status(httpStatus.CREATED).json({
    success: true,
    message: 'Job saved successfully',
    data: { savedJob },
  });
});

/**
 * Unsave a job
 * DELETE /api/jobs/:jobId/save
 */
export const unsaveJob = catchAsync(async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const userId = req.user!._id;

  await savedJobService.unsaveJob(userId, jobId);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Job unsaved successfully',
  });
});

/**
 * Toggle save status for a job
 * POST /api/jobs/:jobId/toggle-save
 */
export const toggleSaveJob = catchAsync(async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const userId = req.user!._id;

  const result = await savedJobService.toggleSaveJob(userId, jobId);

  res.status(httpStatus.OK).json({
    success: true,
    message: result.saved ? 'Job saved successfully' : 'Job unsaved successfully',
    data: result,
  });
});

/**
 * Get user's saved jobs
 * GET /api/jobs/saved
 */
export const getSavedJobs = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!._id;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = Number(req.query.offset) || 0;

  const result = await savedJobService.getSavedJobs(userId, limit, offset);

  res.status(httpStatus.OK).json({
    success: true,
    data: {
      savedJobs: result.savedJobs,
      total: result.total,
      pagination: {
        limit,
        offset,
        hasMore: offset + result.savedJobs.length < result.total,
      },
    },
  });
});

/**
 * Check if a job is saved
 * GET /api/jobs/:jobId/is-saved
 */
export const isJobSaved = catchAsync(async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const userId = req.user!._id;

  const isSaved = await savedJobService.isJobSaved(userId, jobId);

  res.status(httpStatus.OK).json({
    success: true,
    data: { isSaved },
  });
});

