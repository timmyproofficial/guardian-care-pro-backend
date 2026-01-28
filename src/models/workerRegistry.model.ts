/**
 * Worker Registry model definition
 * Lightweight worker entries auto-created from rosters
 * May not have full User accounts - designed for provider's external workers
 */

import mongoose, { Document, Schema } from 'mongoose';
import { RegistryStatus } from '../types/roster.types';

/**
 * Worker Registry document interface
 */
export interface IWorkerRegistry extends Document {
  _id: mongoose.Types.ObjectId;
  
  providerId: mongoose.Types.ObjectId;
  
  // Worker identification
  workerName: string;
  phone?: string;
  email?: string;
  externalWorkerId?: string;
  
  // Matching to existing Users
  matchedUserId?: mongoose.Types.ObjectId;
  status: RegistryStatus;
  matchConfidence?: number;
  
  // Skills/competencies (extracted from rosters over time)
  competencies: string[];
  qualifications: string[];

  // Availability and preferences
  availabilitySchedule: string[]; // e.g., ["Friday 5pm to 6pm", "Wednesday 2pm to 3pm"]

  // Rating and performance
  averageRating?: number; // Average rating from 0-5

  // Statistics
  totalShiftsAssigned: number;
  totalShiftsCancelled: number;
  lastShiftDate?: Date;
  
  // First seen
  firstSeenInSnapshot: mongoose.Types.ObjectId;
  firstSeenDate: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Worker Registry schema definition
 */
const workerRegistrySchema = new Schema<IWorkerRegistry>(
  {
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    
    // Worker identification
    workerName: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    externalWorkerId: {
      type: String,
      trim: true
    },
    
    // Matching to existing Users
    matchedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      sparse: true
    },
    status: {
      type: String,
      enum: Object.values(RegistryStatus),
      default: RegistryStatus.LIGHTWEIGHT,
      index: true
    },
    matchConfidence: {
      type: Number,
      min: 0,
      max: 1
    },
    
    // Skills/competencies
    competencies: [{
      type: String,
      trim: true
    }],
    qualifications: [{
      type: String,
      trim: true
    }],

    // Availability and preferences
    availabilitySchedule: [{
      type: String,
      trim: true
    }],

    // Rating and performance
    averageRating: {
      type: Number,
      min: 0,
      max: 5
    },

    // Statistics
    totalShiftsAssigned: {
      type: Number,
      default: 0,
      min: 0
    },
    totalShiftsCancelled: {
      type: Number,
      default: 0,
      min: 0
    },
    lastShiftDate: {
      type: Date
    },
    
    // First seen
    firstSeenInSnapshot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RosterSnapshot',
      required: true
    },
    firstSeenDate: {
      type: Date,
      required: true,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

/**
 * Add indexes for faster queries
 */
workerRegistrySchema.index({ providerId: 1, workerName: 1 });
workerRegistrySchema.index({ providerId: 1, phone: 1 }, { sparse: true });
workerRegistrySchema.index({ providerId: 1, email: 1 }, { sparse: true });
workerRegistrySchema.index({ providerId: 1, externalWorkerId: 1 }, { sparse: true });

// Text search for worker names
workerRegistrySchema.index({ workerName: 'text' });

// For competency-based queries
workerRegistrySchema.index({ competencies: 1 });

/**
 * Calculate reliability score based on statistics
 */
workerRegistrySchema.methods.getReliabilityScore = function(): number {
  const total = this.totalShiftsAssigned;
  if (total === 0) return 0.5; // Neutral score for new workers
  
  const completed = total - this.totalShiftsCancelled;
  return completed / total;
};

/**
 * Create and export the WorkerRegistry model
 */
const WorkerRegistry = mongoose.model<IWorkerRegistry>('WorkerRegistry', workerRegistrySchema);

export default WorkerRegistry;

