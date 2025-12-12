/**
 * Job Service
 * Business logic for job operations (CRUD)
 */

import { Types, FilterQuery } from 'mongoose';
import httpStatus from 'http-status';
import Job, { IJobDocument } from '../models/job.model';
import {
  CreateJobInput,
  UpdateJobInput,
  JobSearchParams,
  JobStatus,
  JobWithPoster,
} from '../types/job.types';
import ApiError from '../utils/api-error';

/**
 * Create a new job
 */
export async function createJob(
  userId: Types.ObjectId,
  userType: 'participant' | 'provider',
  input: CreateJobInput
): Promise<IJobDocument> {
  const job = new Job({
    postedBy: userId,
    postedByType: userType,
    ...input,
  });

  await job.save();
  return job;
}

/**
 * Get job by ID
 */
export async function getJobById(
  jobId: string | Types.ObjectId,
  includeDeleted: boolean = false
): Promise<IJobDocument | null> {
  const query: FilterQuery<IJobDocument> = { _id: jobId };

  if (!includeDeleted) {
    query.isDeleted = false;
  }

  const job = await Job.findOne(query).populate({
    path: 'postedBy',
    select: 'firstName lastName profileImage',
  });

  return job;
}

/**
 * Get all jobs with filters and pagination
 */
export async function getAllJobs(params: JobSearchParams): Promise<{
  jobs: JobWithPoster[];
  total: number;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}> {
  const {
    jobRole,
    jobType,
    location,
    minPrice,
    maxPrice,
    status,
    postedBy,
    postedByType,
    search,
    limit = 20,
    offset = 0,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = params;

  // Build query
  const query: FilterQuery<IJobDocument> = {
    isDeleted: false,
  };

  if (jobRole) query.jobRole = jobRole;
  if (jobType) query.jobType = jobType;
  if (location) query.location = { $regex: location, $options: 'i' };
  if (status) query.status = status;
  if (postedBy) query.postedBy = postedBy;
  if (postedByType) query.postedByType = postedByType;

  // Price range
  if (minPrice !== undefined || maxPrice !== undefined) {
    query.price = {};
    if (minPrice !== undefined) query.price.$gte = minPrice;
    if (maxPrice !== undefined) query.price.$lte = maxPrice;
  }

  // Text search
  if (search) {
    query.$text = { $search: search };
  }

  // Sort options
  const sortOptions: Record<string, 1 | -1> = {};
  sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Execute query
  const [jobs, total] = await Promise.all([
    Job.find(query)
      .populate({
        path: 'postedBy',
        select: 'firstName lastName profileImage',
      })
      .sort(sortOptions)
      .skip(offset)
      .limit(limit)
      .lean(),
    Job.countDocuments(query),
  ]);

  return {
    jobs: jobs as unknown as JobWithPoster[],
    total,
    pagination: {
      limit,
      offset,
      hasMore: offset + jobs.length < total,
    },
  };
}

/**
 * Get jobs posted by a specific user
 */
export async function getJobsByUser(
  userId: Types.ObjectId,
  includeDeleted: boolean = false,
  limit: number = 20,
  offset: number = 0
): Promise<{
  jobs: IJobDocument[];
  total: number;
}> {
  const query: FilterQuery<IJobDocument> = {
    postedBy: userId,
  };

  if (!includeDeleted) {
    query.isDeleted = false;
  }

  const [jobs, total] = await Promise.all([
    Job.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate({
        path: 'postedBy',
        select: 'firstName lastName profileImage',
      }),
    Job.countDocuments(query),
  ]);

  return { jobs, total };
}

/**
 * Update a job
 */
export async function updateJob(
  jobId: string | Types.ObjectId,
  userId: Types.ObjectId,
  input: UpdateJobInput,
  isAdmin: boolean = false
): Promise<IJobDocument> {
  const job = await Job.findOne({ _id: jobId, isDeleted: false });

  if (!job) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Job not found');
  }

  // Check ownership (unless admin)
  if (!isAdmin && !job.postedBy.equals(userId)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to update this job');
  }

  // Update fields
  if (input.jobRole !== undefined) job.jobRole = input.jobRole;
  if (input.jobDescription !== undefined) job.jobDescription = input.jobDescription;
  if (input.keyResponsibilities !== undefined) job.keyResponsibilities = input.keyResponsibilities;
  if (input.location !== undefined) job.location = input.location;
  if (input.price !== undefined) job.price = input.price;
  if (input.jobType !== undefined) job.jobType = input.jobType;
  if (input.additionalNote !== undefined) job.additionalNote = input.additionalNote;
  if (input.status !== undefined) job.status = input.status;

  // Handle requiredCompetencies partial update
  if (input.requiredCompetencies) {
    job.requiredCompetencies = {
      ...job.requiredCompetencies,
      ...input.requiredCompetencies,
    };
    job.markModified('requiredCompetencies');
  }

  await job.save();
  return job;
}

/**
 * Soft delete a job
 */
export async function deleteJob(
  jobId: string | Types.ObjectId,
  userId: Types.ObjectId,
  isAdmin: boolean = false
): Promise<IJobDocument> {
  const job = await Job.findOne({ _id: jobId, isDeleted: false });

  if (!job) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Job not found');
  }

  // Check ownership (unless admin)
  if (!isAdmin && !job.postedBy.equals(userId)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to delete this job');
  }

  job.isDeleted = true;
  job.deletedAt = new Date();
  job.status = JobStatus.CLOSED;

  await job.save();
  return job;
}

/**
 * Increment application count for a job
 */
export async function incrementApplicationCount(jobId: string | Types.ObjectId): Promise<void> {
  await Job.updateOne({ _id: jobId }, { $inc: { applicationCount: 1 } });
}

/**
 * Decrement application count for a job
 */
export async function decrementApplicationCount(jobId: string | Types.ObjectId): Promise<void> {
  await Job.updateOne(
    { _id: jobId, applicationCount: { $gt: 0 } },
    { $inc: { applicationCount: -1 } }
  );
}

