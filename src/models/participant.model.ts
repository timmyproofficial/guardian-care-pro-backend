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
  supportNeeds: string[];
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
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
}

/**
 * Participant schema definition
 * Adds participant-specific fields to the base User schema
 */
const participantSchema = new Schema<IParticipant>(
  {
    supportNeeds: {
      type: [String],
      // required: true,
    },
    emergencyContact: {
      name: { type: String },
      relationship: { type: String },
      phone: { type: String }
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
      validate: {
        validator: function(value: string) {
          // Simple validation for NDIS number format
          return /^\d{9}$/.test(value);
        },
        message: 'NDIS number must be a 9-digit number'
      }
    },
    requiresSupervision: {
      type: Boolean,
      default: false,
    }
  }
);

/**
 * Add indexes for faster queries
 */
participantSchema.index({ guardianId: 1 });
participantSchema.index({ supportCoordinators: 1 });
participantSchema.index({ 'subscription.isActive': 1 });

/**
 * Create and export the Participant model
 * Uses the discriminator pattern to extend the User model
 */
const Participant = User.discriminator<IParticipant>('participant', participantSchema);

export default Participant;