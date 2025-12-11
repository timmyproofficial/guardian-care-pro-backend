/**
 * Saved Job Service
 * Business logic for saved/bookmarked job operations
 */

import { Types } from 'mongoose';
import httpStatus from 'http-status';
import SavedJob, { ISavedJobDocument } from '../models/savedJob.model';
import Job from '../models/job.model';
import ApiError from '../utils/api-error';

/**
 * Save a job
 */
export async function saveJob(
  userId: Types.ObjectId,
  jobId: string | Types.ObjectId
): Promise<ISavedJobDocument> {
  // Check if job exists and is not deleted
  const job = await Job.findOne({ _id: jobId, isDeleted: false });

  if (!job) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Job not found');
  }

  // Check if already saved
  const existingSave = await SavedJob.findOne({ userId, jobId });

  if (existingSave) {
    throw new ApiError(httpStatus.CONFLICT, 'Job is already saved');
  }

  const savedJob = new SavedJob({
    userId,
    jobId,
    savedAt: new Date(),
  });

  await savedJob.save();
  return savedJob;
}

/**
 * Unsave a job
 */
export async function unsaveJob(
  userId: Types.ObjectId,
  jobId: string | Types.ObjectId
): Promise<void> {
  const result = await SavedJob.deleteOne({ userId, jobId });

  if (result.deletedCount === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Saved job not found');
  }
}

/**
 * Get all saved jobs for a user
 */
export async function getSavedJobs(
  userId: Types.ObjectId,
  limit: number = 20,
  offset: number = 0
): Promise<{
  savedJobs: ISavedJobDocument[];
  total: number;
}> {
  const [savedJobs, total] = await Promise.all([
    SavedJob.find({ userId })
      .sort({ savedAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate({
        path: 'jobId',
        match: { isDeleted: false },
        populate: {
          path: 'postedBy',
          select: 'firstName lastName profileImage',
        },
      }),
    SavedJob.countDocuments({ userId }),
  ]);

  // Filter out entries where job was deleted
  const filteredSavedJobs = savedJobs.filter((sj) => sj.jobId !== null);

  return {
    savedJobs: filteredSavedJobs,
    total,
  };
}

/**
 * Check if a job is saved by user
 */
export async function isJobSaved(
  userId: Types.ObjectId,
  jobId: string | Types.ObjectId
): Promise<boolean> {
  const savedJob = await SavedJob.findOne({ userId, jobId });
  return !!savedJob;
}

/**
 * Toggle save status for a job
 */
export async function toggleSaveJob(
  userId: Types.ObjectId,
  jobId: string | Types.ObjectId
): Promise<{ saved: boolean }> {
  const existingSave = await SavedJob.findOne({ userId, jobId });

  if (existingSave) {
    await SavedJob.deleteOne({ _id: existingSave._id });
    return { saved: false };
  } else {
    // Check if job exists
    const job = await Job.findOne({ _id: jobId, isDeleted: false });
    if (!job) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Job not found');
    }

    const savedJob = new SavedJob({
      userId,
      jobId,
      savedAt: new Date(),
    });
    await savedJob.save();
    return { saved: true };
  }
}

/**
 * Get saved job IDs for a user (for checking multiple jobs at once)
 */
export async function getSavedJobIds(userId: Types.ObjectId): Promise<Types.ObjectId[]> {
  const savedJobs = await SavedJob.find({ userId }).select('jobId').lean();
  return savedJobs.map((sj) => sj.jobId);
}

