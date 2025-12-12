/**
 * Job Application Model
 * MongoDB schema for job applications
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { IJobApplication, ApplicationStatus, IJobAttachment } from '../types/job.types';

export interface IJobApplicationDocument extends Omit<IJobApplication, '_id'>, Document {}

/**
 * Job Attachment Schema
 */
const JobAttachmentSchema = new Schema<IJobAttachment>(
  {
    fieldName: {
      type: String,
      enum: ['resume', 'coverLetter'],
      required: [true, 'Field name is required'],
    },
    fileName: {
      type: String,
      required: [true, 'File name is required'],
    },
    fileUrl: {
      type: String,
      required: [true, 'File URL is required'],
    },
    fileType: {
      type: String,
      required: [true, 'File type is required'],
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

/**
 * Job Application Schema
 */
const JobApplicationSchema = new Schema<IJobApplicationDocument>(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'Job ID is required'],
      index: true,
    },
    applicantId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    attachments: {
      type: [JobAttachmentSchema],
      validate: {
        validator: function (attachments: IJobAttachment[]) {
          // Ensure at least resume is uploaded
          return attachments.some((a) => a.fieldName === 'resume');
        },
        message: 'Resume attachment is required',
      },
    },
    status: {
      type: String,
      enum: Object.values(ApplicationStatus),
      default: ApplicationStatus.PENDING,
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

// Compound indexes
JobApplicationSchema.index({ jobId: 1, email: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
JobApplicationSchema.index({ jobId: 1, isDeleted: 1, createdAt: -1 });
JobApplicationSchema.index({ applicantId: 1, isDeleted: 1, createdAt: -1 });
JobApplicationSchema.index({ email: 1, isDeleted: 1 });

/**
 * Pre-save middleware
 */
JobApplicationSchema.pre('save', function (next) {
  if (this.isDeleted && !this.deletedAt) {
    this.deletedAt = new Date();
  }
  next();
});

/**
 * Instance method to soft delete
 */
JobApplicationSchema.methods.softDelete = async function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

const JobApplication: Model<IJobApplicationDocument> = mongoose.model<IJobApplicationDocument>(
  'JobApplication',
  JobApplicationSchema
);

export default JobApplication;

