/**
 * Shift Reference model definition
 * THE CORE TABLE - Lightweight shift lookup index for fast cancellation matching
 * and replacement finding
 */

import mongoose, { Document, Schema } from 'mongoose';
import { ShiftReferenceStatus, GeoJSONPoint, ParsingWarning } from '../types/roster.types';

/**
 * Shift Reference document interface
 */
export interface IShiftReference extends Document {
  _id: mongoose.Types.ObjectId;
  
  // References
  snapshotId: mongoose.Types.ObjectId;
  providerId: mongoose.Types.ObjectId;
  externalShiftId?: string;
  
  // Temporal data (for cancellation matching)
  shiftDate: Date;
  shiftStartTime: string;
  shiftEndTime: string;
  shiftDurationMinutes: number;
  
  // Worker assignment (lightweight - may not be full User)
  assignedWorkerId?: mongoose.Types.ObjectId;
  assignedWorkerName: string;
  assignedWorkerPhone?: string;
  assignedWorkerEmail?: string;
  
  // Participant (lightweight - may not be full User)
  participantId?: mongoose.Types.ObjectId;
  participantName: string;
  participantPhone?: string;
  participantNdisNumber?: string;
  
  // Location
  locationName?: string;
  locationAddress?: string;
  locationPostcode?: string;
  locationGeoJSON?: GeoJSONPoint;
  
  // Shift details
  shiftType?: string;
  supportCategory?: string;
  billingRate?: number;
  
  // Requirements (for replacement matching)
  requiredCompetencies: string[];
  specialRequirements?: string;
  behaviouralSupportRequired: boolean;
  
  // Status tracking
  currentStatus: ShiftReferenceStatus;
  statusUpdatedAt: Date;
  
  // Cancellation/replacement tracking
  cancellationEventId?: mongoose.Types.ObjectId;
  replacementWorkerId?: mongoose.Types.ObjectId;
  replacementRequestedAt?: Date;
  replacementCompletedAt?: Date;
  
  // Link to actual Shift (if created in main system)
  linkedShiftId?: mongoose.Types.ObjectId;
  
  // Parsing metadata
  parsingConfidenceScore?: number;
  parsingWarnings?: ParsingWarning[];
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Shift Reference schema definition
 */
const shiftReferenceSchema = new Schema<IShiftReference>(
  {
    // References
    snapshotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RosterSnapshot',
      required: true,
      index: true
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    externalShiftId: {
      type: String,
      trim: true
    },
    
    // Temporal data
    shiftDate: {
      type: Date,
      required: true,
      index: true
    },
    shiftStartTime: {
      type: String,
      required: true,
      validate: {
        validator: function(value: string) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
        },
        message: 'Start time must be in HH:MM format (24-hour)'
      }
    },
    shiftEndTime: {
      type: String,
      required: true,
      validate: {
        validator: function(value: string) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
        },
        message: 'End time must be in HH:MM format (24-hour)'
      }
    },
    shiftDurationMinutes: {
      type: Number,
      required: true,
      min: 0
    },
    
    // Worker assignment
    assignedWorkerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    assignedWorkerName: {
      type: String,
      required: true,
      trim: true
    },
    assignedWorkerPhone: {
      type: String,
      trim: true
      // Index defined separately via schema.index() for SMS lookup
    },
    assignedWorkerEmail: {
      type: String,
      trim: true,
      lowercase: true
    },
    
    // Participant
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    participantName: {
      type: String,
      required: true,
      trim: true
    },
    participantPhone: {
      type: String,
      trim: true
    },
    participantNdisNumber: {
      type: String,
      trim: true
    },
    
    // Location
    locationName: {
      type: String,
      trim: true
    },
    locationAddress: {
      type: String,
      trim: true
    },
    locationPostcode: {
      type: String,
      trim: true,
      index: true
    },
    locationGeoJSON: {
      type: {
        type: String,
        enum: ['Point']
      },
      coordinates: {
        type: [Number] // [longitude, latitude]
      }
    },
    
    // Shift details
    shiftType: {
      type: String,
      trim: true
    },
    supportCategory: {
      type: String,
      trim: true
    },
    billingRate: {
      type: Number,
      min: 0
    },
    
    // Requirements
    requiredCompetencies: [{
      type: String,
      trim: true
    }],
    specialRequirements: {
      type: String,
      maxlength: 2000
    },
    behaviouralSupportRequired: {
      type: Boolean,
      default: false
    },
    
    // Status tracking
    currentStatus: {
      type: String,
      enum: Object.values(ShiftReferenceStatus),
      default: ShiftReferenceStatus.SCHEDULED
    },
    statusUpdatedAt: {
      type: Date,
      default: Date.now
    },
    
    // Cancellation/replacement tracking
    cancellationEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ShiftEvent'
    },
    replacementWorkerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    replacementRequestedAt: {
      type: Date
    },
    replacementCompletedAt: {
      type: Date
    },
    
    // Link to actual Shift
    linkedShiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift'
    },
    
    // Parsing metadata
    parsingConfidenceScore: {
      type: Number,
      min: 0,
      max: 1
    },
    parsingWarnings: [{
      field: String,
      issue: String,
      originalValue: String
    }]
  },
  {
    timestamps: true
  }
);

/**
 * Critical indexes for performance
 * Target < 5ms for cancellation lookup
 */

// Composite index for cancellation lookup (MOST IMPORTANT)
shiftReferenceSchema.index(
  { providerId: 1, assignedWorkerId: 1, shiftDate: 1, currentStatus: 1 },
  { name: 'idx_cancellation_lookup' }
);

// For date/time queries
shiftReferenceSchema.index({ shiftDate: 1, shiftStartTime: 1 });

// For SMS-based cancellation lookup
shiftReferenceSchema.index({ assignedWorkerPhone: 1 });

// Text search for participant/worker names
shiftReferenceSchema.index(
  { participantName: 'text', assignedWorkerName: 'text' },
  { name: 'idx_name_search' }
);

// For competency matching
shiftReferenceSchema.index({ requiredCompetencies: 1 });

// For location-based queries
shiftReferenceSchema.index({ locationGeoJSON: '2dsphere' }, { sparse: true });

// For status queries
shiftReferenceSchema.index({ currentStatus: 1, shiftDate: 1 });

// For provider dashboard queries
shiftReferenceSchema.index(
  { providerId: 1, currentStatus: 1, shiftDate: 1 },
  { name: 'idx_provider_dashboard' }
);

/**
 * Pre-save hook to update statusUpdatedAt
 */
shiftReferenceSchema.pre('save', function(next) {
  if (this.isModified('currentStatus')) {
    this.statusUpdatedAt = new Date();
  }
  next();
});

/**
 * Create and export the ShiftReference model
 */
const ShiftReference = mongoose.model<IShiftReference>('ShiftReference', shiftReferenceSchema);

export default ShiftReference;

