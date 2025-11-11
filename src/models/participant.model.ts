/**
 * Participant model definition
 * Schema for participants (care recipients) extending the base User model
 */

import mongoose, { Schema } from 'mongoose';
import User, { IUser } from './user.model';
import { SubscriptionTier } from '../types/payment.types';

/**
 * Participant document interface
 * Extends the base User interface with participant-specific properties
 */
export interface IParticipant extends IUser {
  supportNeeds: mongoose.Types.ObjectId[];
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  planManager?: {
    name: string;
    email: string;
  };
  coordinator?: {
    name: string;
    email: string;
  };
  guardianId?: mongoose.Types.ObjectId;
  subscription: {
    tier: SubscriptionTier;
    startDate: Date;
    endDate?: Date;
    isActive: boolean;
    autoRenew: boolean;
    paymentMethod?: string;
  };
  supportCoordinators: mongoose.Types.ObjectId[];
  preferredLanguages?: string[];
  preferredGenders?: string[];
  notes?: string;
  ndisNumber?: string;
  requiresSupervision: boolean;
  onboardingComplete: boolean;
  // Location fields
  stateId?: mongoose.Types.ObjectId;
  regionId?: mongoose.Types.ObjectId;
  suburbId?: mongoose.Types.ObjectId;
  serviceAreaId?: mongoose.Types.ObjectId;
  participantLocation?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  address?: string;
}

/**
 * Participant schema definition
 * Adds participant-specific fields to the base User schema
 */
const participantSchema = new Schema<IParticipant>(
  {
    supportNeeds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceType',
      required: true
    }],
    emergencyContact: {
      name: { type: String },
      relationship: { type: String },
      phone: { type: String }
    },
    planManager: {
      name: { type: String },
      email: { 
        type: String,
        validate: {
          validator: function(value: string) {
            // Email validation
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
          },
          message: 'Please provide a valid email address for plan manager'
        }
      }
    },
    coordinator: {
      name: { type: String },
      email: { 
        type: String,
        validate: {
          validator: function(value: string) {
            // Email validation
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
          },
          message: 'Please provide a valid email address for coordinator'
        }
      }
    },
    guardianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    subscription: {
      tier: {
        type: String,
        enum: Object.values(SubscriptionTier),
        default: SubscriptionTier.BASIC,
      },
      startDate: {
        type: Date,
        default: Date.now,
      },
      endDate: {
        type: Date,
      },
      isActive: {
        type: Boolean,
        default: false,
      },
      autoRenew: {
        type: Boolean,
        default: true,
      },
      paymentMethod: {
        type: String,
      },
    },
    supportCoordinators: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    preferredLanguages: [String],
    preferredGenders: [String],
    notes: {
      type: String,
    },
    ndisNumber: {
      type: String,
      trim: true,
    },
    requiresSupervision: {
      type: Boolean,
      default: false,
    },
    onboardingComplete: {
      type: Boolean,
      default: false,
    },
    // Location fields
    stateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'State'
    },
    regionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Region'
    },
    suburbId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Suburb'
    },
    serviceAreaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceArea'
    },
    participantLocation: {
      type: {
        type: String,
        enum: ['Point']
      },
      coordinates: {
        type: [Number] // [longitude, latitude]
      }
    },
    address: {
      type: String,
      trim: true
    }
  }
);

/**
 * Add indexes for faster queries
 */
participantSchema.index({ guardianId: 1 });
participantSchema.index({ supportCoordinators: 1 });
participantSchema.index({ supportNeeds: 1 });
participantSchema.index({ 'subscription.isActive': 1 });

// Location indexes
participantSchema.index({ stateId: 1 });
participantSchema.index({ regionId: 1 });
participantSchema.index({ suburbId: 1 });
participantSchema.index({ serviceAreaId: 1 });
// Sparse 2dsphere index - only indexes documents with complete location data
participantSchema.index({ participantLocation: '2dsphere' }, { sparse: true });

/**
 * Create and export the Participant model
 * Uses the discriminator pattern to extend the User model
 */
const Participant = User.discriminator<IParticipant>('participant', participantSchema);

export default Participant;