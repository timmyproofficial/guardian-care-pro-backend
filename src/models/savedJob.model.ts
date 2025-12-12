/**
 * Saved Job Model
 * MongoDB schema for saved/bookmarked jobs
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { ISavedJob } from '../types/job.types';

export interface ISavedJobDocument extends Omit<ISavedJob, '_id'>, Document {}

/**
 * Saved Job Schema
 */
const SavedJobSchema = new Schema<ISavedJobDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'Job ID is required'],
      index: true,
    },
    savedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete (ret as any).__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Ensure a user can only save a job once
SavedJobSchema.index({ userId: 1, jobId: 1 }, { unique: true });

// Index for efficient retrieval of user's saved jobs
SavedJobSchema.index({ userId: 1, savedAt: -1 });

const SavedJob: Model<ISavedJobDocument> = mongoose.model<ISavedJobDocument>('SavedJob', SavedJobSchema);

export default SavedJob;

