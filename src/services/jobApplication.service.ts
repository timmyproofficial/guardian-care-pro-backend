/**
 * Job Application Service
 * Business logic for job application operations
 */

import { Types, FilterQuery } from 'mongoose';
import httpStatus from 'http-status';
import JobApplication, { IJobApplicationDocument } from '../models/jobApplication.model';
import Job from '../models/job.model';
import { JobApplicationInput, ApplicationStatus, IJobAttachment } from '../types/job.types';
import ApiError from '../utils/api-error';
import * as jobService from './job.service';

/**
 * Apply for a job
 */
export async function applyForJob(
  jobId: string | Types.ObjectId,
  input: JobApplicationInput,
  attachments: IJobAttachment[],
  applicantId?: Types.ObjectId
): Promise<IJobApplicationDocument> {
  // Check if job exists and is active
  const job = await Job.findOne({
    _id: jobId,
    isDeleted: false,
    status: 'active',
  });

  if (!job) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Job not found or no longer accepting applications');
  }

  // Check for duplicate application by email
  const existingApplication = await JobApplication.findOne({
    jobId,
    email: input.email.toLowerCase(),
    isDeleted: false,
  });

  if (existingApplication) {
    throw new ApiError(httpStatus.CONFLICT, 'You have already applied for this job');
  }

  // Create application
  const application = new JobApplication({
    jobId,
    applicantId,
    fullName: input.fullName,
    email: input.email.toLowerCase(),
    phone: input.phone,
    location: input.location,
    attachments,
  });

  await application.save();

  // Increment job application count
  await jobService.incrementApplicationCount(job._id as Types.ObjectId);

  return application;
}

/**
 * Get application by ID
 */
export async function getApplicationById(
  applicationId: string | Types.ObjectId,
  includeDeleted: boolean = false
): Promise<IJobApplicationDocument | null> {
  const query: FilterQuery<IJobApplicationDocument> = { _id: applicationId };

  if (!includeDeleted) {
    query.isDeleted = false;
  }

  const application = await JobApplication.findOne(query)
    .populate({
      path: 'jobId',
      select: 'jobRole jobDescription location price jobType status postedBy',
      populate: {
        path: 'postedBy',
        select: 'firstName lastName profileImage',
      },
    })
    .populate({
      path: 'applicantId',
      select: 'firstName lastName profileImage email',
    });

  return application;
}

/**
 * Get applications for a specific job
 */
export async function getApplicationsForJob(
  jobId: string | Types.ObjectId,
  userId: Types.ObjectId,
  isAdmin: boolean = false,
  limit: number = 20,
  offset: number = 0
): Promise<{
  applications: IJobApplicationDocument[];
  total: number;
}> {
  // Verify job ownership
  const job = await Job.findOne({ _id: jobId, isDeleted: false });

  if (!job) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Job not found');
  }

  if (!isAdmin && !job.postedBy.equals(userId)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to view applications for this job');
  }

  const query: FilterQuery<IJobApplicationDocument> = {
    jobId,
    isDeleted: false,
  };

  const [applications, total] = await Promise.all([
    JobApplication.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate({
        path: 'applicantId',
        select: 'firstName lastName profileImage email',
      }),
    JobApplication.countDocuments(query),
  ]);

  return { applications, total };
}

/**
 * Get applications submitted by a user (applied jobs)
 */
export async function getApplicationsByUser(
  userId: Types.ObjectId,
  limit: number = 20,
  offset: number = 0
): Promise<{
  applications: IJobApplicationDocument[];
  total: number;
}> {
  const query: FilterQuery<IJobApplicationDocument> = {
    applicantId: userId,
    isDeleted: false,
  };

  const [applications, total] = await Promise.all([
    JobApplication.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate({
        path: 'jobId',
        select: 'jobRole jobDescription location price jobType status postedBy postedByType isDeleted',
        populate: {
          path: 'postedBy',
          select: 'firstName lastName profileImage',
        },
      }),
    JobApplication.countDocuments(query),
  ]);

  return { applications, total };
}

/**
 * Update application status
 */
export async function updateApplicationStatus(
  applicationId: string | Types.ObjectId,
  userId: Types.ObjectId,
  status: ApplicationStatus,
  isAdmin: boolean = false
): Promise<IJobApplicationDocument> {
  const application = await JobApplication.findOne({
    _id: applicationId,
    isDeleted: false,
  }).populate('jobId');

  if (!application) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Application not found');
  }

  const job = application.jobId as any;

  // Check if user owns the job
  if (!isAdmin && !job.postedBy.equals(userId)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to update this application');
  }

  application.status = status;
  await application.save();

  return application;
}

/**
 * Soft delete an application
 */
export async function deleteApplication(
  applicationId: string | Types.ObjectId,
  userId: Types.ObjectId,
  isAdmin: boolean = false
): Promise<IJobApplicationDocument> {
  const application = await JobApplication.findOne({
    _id: applicationId,
    isDeleted: false,
  }).populate('jobId');

  if (!application) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Application not found');
  }

  const job = application.jobId as any;

  // Allow deletion by applicant or job owner
  const isApplicant = application.applicantId?.equals(userId);
  const isJobOwner = job.postedBy.equals(userId);

  if (!isAdmin && !isApplicant && !isJobOwner) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to delete this application');
  }

  application.isDeleted = true;
  application.deletedAt = new Date();
  await application.save();

  // Decrement job application count
  await jobService.decrementApplicationCount(job._id);

  return application;
}

/**
 * Check if user has already applied for a job
 */
export async function hasUserApplied(
  jobId: string | Types.ObjectId,
  userId: Types.ObjectId
): Promise<boolean> {
  const application = await JobApplication.findOne({
    jobId,
    applicantId: userId,
    isDeleted: false,
  });

  return !!application;
}

