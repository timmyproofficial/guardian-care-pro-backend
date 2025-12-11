/**
 * Shift Event model definition
 * Comprehensive audit trail for all shift lifecycle events
 * NDIS compliance - 7 years retention
 */

import mongoose, { Document, Schema } from 'mongoose';
import {
  ShiftEventType,
  EventTriggerSource,
  ResolutionStatus,
  EventPayload
} from '../types/roster.types';

/**
 * Shift Event document interface
 */
export interface IShiftEvent extends Document {
  _id: mongoose.Types.ObjectId;
  
  shiftReferenceId: mongoose.Types.ObjectId;
  providerId: mongoose.Types.ObjectId;
  
  // Event classification
  eventType: ShiftEventType;
  eventTimestamp: Date;
  
  // Event trigger
  triggeredBy?: EventTriggerSource;
  triggeredByUserId?: mongoose.Types.ObjectId;
  
  // Event payload (flexible structure)
  eventPayload: EventPayload;
  
  // Outcome
  resolutionStatus: ResolutionStatus;
  resolutionTimestamp?: Date;
  resolutionNotes?: string;
  
  createdAt: Date;
}

/**
 * Shift Event schema definition
 */
const shiftEventSchema = new Schema<IShiftEvent>(
  {
    shiftReferenceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ShiftReference',
      required: true,
      index: true
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    
    // Event classification
    eventType: {
      type: String,
      enum: Object.values(ShiftEventType),
      required: true,
      index: true
    },
    eventTimestamp: {
      type: Date,
      default: Date.now,
      index: true
    },
    
    // Event trigger
    triggeredBy: {
      type: String,
      enum: Object.values(EventTriggerSource)
    },
    triggeredByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    
    // Event payload (flexible structure for different event types)
    eventPayload: {
      type: Schema.Types.Mixed,
      default: {}
    },
    
    // Outcome
    resolutionStatus: {
      type: String,
      enum: Object.values(ResolutionStatus),
      default: ResolutionStatus.PENDING
    },
    resolutionTimestamp: {
      type: Date
    },
    resolutionNotes: {
      type: String,
      maxlength: 2000
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false } // Only createdAt for audit
  }
);

/**
 * Add indexes for faster queries
 */
shiftEventSchema.index({ shiftReferenceId: 1, eventTimestamp: -1 });
shiftEventSchema.index({ resolutionStatus: 1, eventTimestamp: -1 });

// Partial index for pending events
shiftEventSchema.index(
  { eventTimestamp: -1 },
  { 
    partialFilterExpression: { resolutionStatus: 'pending' },
    name: 'idx_pending_events'
  }
);

// For audit queries
shiftEventSchema.index({ providerId: 1, eventTimestamp: -1 });
shiftEventSchema.index({ providerId: 1, eventType: 1, eventTimestamp: -1 });

/**
 * Create and export the ShiftEvent model
 */
const ShiftEvent = mongoose.model<IShiftEvent>('ShiftEvent', shiftEventSchema);

export default ShiftEvent;

