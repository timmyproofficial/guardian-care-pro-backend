/**
 * Participant Registry model definition
 * Lightweight participant entries auto-created from rosters
 * May not have full User accounts - designed for provider's external participants
 */

import mongoose, { Document, Schema } from 'mongoose';
import { RegistryStatus } from '../types/roster.types';

/**
 * Participant Registry document interface
 */
export interface IParticipantRegistry extends Document {
  _id: mongoose.Types.ObjectId;
  
  providerId: mongoose.Types.ObjectId;
  
  // Participant identification
  participantName: string;
  phone?: string;
  ndisNumber?: string;
  externalParticipantId?: string;
  
  // Matching to existing Users
  matchedUserId?: mongoose.Types.ObjectId;
  status: RegistryStatus;
  matchConfidence?: number;
  
  // Support needs (extracted from rosters)
  supportNeeds: string[];
  preferredGender?: string;
  preferredLanguages: string[];
  
  // Location
  address?: string;
  postcode?: string;
  
  // Statistics
  totalShiftsScheduled: number;
  lastShiftDate?: Date;
  
  // First seen
  firstSeenInSnapshot: mongoose.Types.ObjectId;
  firstSeenDate: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Participant Registry schema definition
 */
const participantRegistrySchema = new Schema<IParticipantRegistry>(
  {
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    
    // Participant identification
    participantName: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    ndisNumber: {
      type: String,
      trim: true
    },
    externalParticipantId: {
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
    
    // Support needs
    supportNeeds: [{
      type: String,
      trim: true
    }],
    preferredGender: {
      type: String,
      trim: true
    },
    preferredLanguages: [{
      type: String,
      trim: true
    }],
    
    // Location
    address: {
      type: String,
      trim: true
    },
    postcode: {
      type: String,
      trim: true
    },
    
    // Statistics
    totalShiftsScheduled: {
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
participantRegistrySchema.index({ providerId: 1, participantName: 1 });
participantRegistrySchema.index({ providerId: 1, ndisNumber: 1 }, { sparse: true });
participantRegistrySchema.index({ providerId: 1, externalParticipantId: 1 }, { sparse: true });

// Text search for participant names
participantRegistrySchema.index({ participantName: 'text' });

// For support needs queries
participantRegistrySchema.index({ supportNeeds: 1 });

/**
 * Create and export the ParticipantRegistry model
 */
const ParticipantRegistry = mongoose.model<IParticipantRegistry>('ParticipantRegistry', participantRegistrySchema);

export default ParticipantRegistry;

