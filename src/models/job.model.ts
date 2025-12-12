/**
 * Job Model
 * MongoDB schema for jobs posted by participants or providers
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { IJob, JobRole, JobType, JobStatus, IRequiredCompetencies } from '../types/job.types';

export interface IJobDocument extends Omit<IJob, '_id'>, Document {}

/**
 * Required Competencies Schema
 */
const RequiredCompetenciesSchema = new Schema<IRequiredCompetencies>(
  {
    rightToWorkInAustralia: {
      type: Boolean,
      default: false,
    },
    ndisWorkerScreeningCheck: {
      type: Boolean,
      default: false,
    },
    wwcc: {
      type: Boolean,
      default: false,
    },
    policeCheck: {
      type: Boolean,
      default: false,
    },
    firstAid: {
      type: Boolean,
      default: false,
    },
    cpr: {
      type: Boolean,
      default: false,
    },
    ahpraRegistration: {
      type: Boolean,
      default: false,
    },
    professionalIndemnityInsurance: {
      type: Boolean,
      default: false,
    },
    covidVaccinationStatus: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

/**
 * Job Schema
 */
const JobSchema = new Schema<IJobDocument>(
  {
    postedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Posted by is required'],
      index: true,
    },
    postedByType: {
      type: String,
      enum: ['participant', 'provider'],
      required: [true, 'Posted by type is required'],
      index: true,
    },
    jobRole: {
      type: String,
      enum: Object.values(JobRole),
      required: [true, 'Job role is required'],
      index: true,
    },
    jobDescription: {
      type: String,
      required: [true, 'Job description is required'],
      trim: true,
    },
    keyResponsibilities: {
      type: String,
      required: [true, 'Key responsibilities is required'],
      // Stores Markdown content as-is
    },
    requiredCompetencies: {
      type: RequiredCompetenciesSchema,
      required: [true, 'Required competencies is required'],
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
      index: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    jobType: {
      type: String,
      enum: Object.values(JobType),
      required: [true, 'Job type is required'],
      index: true,
    },
    additionalNote: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(JobStatus),
      default: JobStatus.ACTIVE,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
    },
    applicationCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Compound indexes for common queries
JobSchema.index({ isDeleted: 1, status: 1, createdAt: -1 });
JobSchema.index({ postedBy: 1, isDeleted: 1, createdAt: -1 });
JobSchema.index({ jobRole: 1, jobType: 1, isDeleted: 1 });
JobSchema.index({ location: 1, isDeleted: 1, status: 1 });

// Text index for search
JobSchema.index(
  { jobDescription: 'text', keyResponsibilities: 'text', additionalNote: 'text' },
  { name: 'job_text_search' }
);

/**
 * Pre-save middleware
 */
JobSchema.pre('save', function (next) {
  if (this.isDeleted && !this.deletedAt) {
    this.deletedAt = new Date();
  }
  next();
});

/**
 * Static method to find active jobs (not deleted)
 */
JobSchema.statics.findActive = function () {
  return this.find({ isDeleted: false });
};

/**
 * Instance method to soft delete
 */
JobSchema.methods.softDelete = async function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.status = JobStatus.CLOSED;
  return this.save();
};

const Job: Model<IJobDocument> = mongoose.model<IJobDocument>('Job', JobSchema);

export default Job;

