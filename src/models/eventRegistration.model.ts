/**
 * Event Registration Model
 * MongoDB schema for event registrations
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { IEventRegistration, RegistrationStatus } from '../types/event.types';

export interface IEventRegistrationDocument extends Omit<IEventRegistration, '_id'>, Document {}

/**
 * Event Registration Schema
 */
const EventRegistrationSchema = new Schema<IEventRegistrationDocument>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event ID is required'],
      index: true,
    },
    userId: {
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
    reason: {
      type: String,
      required: [true, 'Reason for registration is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(RegistrationStatus),
      default: RegistrationStatus.PENDING,
      index: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
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
// Prevent duplicate registrations by email per event
EventRegistrationSchema.index(
  { eventId: 1, email: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);
EventRegistrationSchema.index({ eventId: 1, status: 1, isDeleted: 1 });
EventRegistrationSchema.index({ eventId: 1, isDeleted: 1, createdAt: -1 });
EventRegistrationSchema.index({ userId: 1, isDeleted: 1, createdAt: -1 });

/**
 * Pre-save middleware
 */
EventRegistrationSchema.pre('save', function (next) {
  if (this.isDeleted && !this.deletedAt) {
    this.deletedAt = new Date();
  }
  next();
});

/**
 * Instance method to soft delete
 */
EventRegistrationSchema.methods.softDelete = async function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

const EventRegistration: Model<IEventRegistrationDocument> = mongoose.model<IEventRegistrationDocument>(
  'EventRegistration',
  EventRegistrationSchema
);

export default EventRegistration;

