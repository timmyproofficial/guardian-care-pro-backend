/**
 * Event Model
 * MongoDB schema for events created by providers
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { IEvent, EventStatus } from '../types/event.types';

export interface IEventDocument extends Omit<IEvent, '_id'>, Document {}

/**
 * Event Schema
 */
const EventSchema = new Schema<IEventDocument>(
  {
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by is required'],
      index: true,
    },
    eventImage: {
      type: String,
      trim: true,
    },
    eventName: {
      type: String,
      required: [true, 'Event name is required'],
      trim: true,
    },
    eventStartTime: {
      type: String,
      required: [true, 'Event start time is required'],
      trim: true,
    },
    eventEndTime: {
      type: String,
      required: [true, 'Event end time is required'],
      trim: true,
    },
    eventLocation: {
      type: String,
      required: [true, 'Event location is required'],
      trim: true,
      index: true,
    },
    eventStartDate: {
      type: Date,
      required: [true, 'Event start date is required'],
      index: true,
    },
    eventEndDate: {
      type: Date,
      required: [true, 'Event end date is required'],
    },
    eventDescr: {
      type: String,
      required: [true, 'Event description is required'],
    },
    status: {
      type: String,
      enum: Object.values(EventStatus),
      default: EventStatus.PUBLISHED,
      index: true,
    },
    registrationCount: {
      type: Number,
      default: 0,
      min: 0,
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

// Compound indexes for common queries
EventSchema.index({ isDeleted: 1, status: 1, eventStartDate: -1 });
EventSchema.index({ createdBy: 1, isDeleted: 1, createdAt: -1 });
EventSchema.index({ eventStartDate: 1, eventEndDate: 1, isDeleted: 1 });

// Text index for search
EventSchema.index(
  { eventName: 'text', eventDescr: 'text', eventLocation: 'text' },
  { name: 'event_text_search' }
);

/**
 * Pre-save middleware
 */
EventSchema.pre('save', function (next) {
  if (this.isDeleted && !this.deletedAt) {
    this.deletedAt = new Date();
  }
  next();
});

/**
 * Instance method to soft delete
 */
EventSchema.methods.softDelete = async function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.status = EventStatus.CANCELLED;
  return this.save();
};

const Event: Model<IEventDocument> = mongoose.model<IEventDocument>('Event', EventSchema);

export default Event;

