/**
 * Provider model definition
 * Schema for enterprise providers (aged care facilities, disability support agencies)
 * extending the base User model via discriminator pattern
 */

import mongoose, { Schema } from 'mongoose';
import User, { IUser } from './user.model';
import {
  ProviderType,
  ProviderSubscriptionTier,
  ProviderSubscriptionStatus,
  ProviderSettings,
  BusinessAddress
} from '../types/roster.types';

/**
 * Provider document interface
 * Extends the base User interface with provider-specific properties
 */
export interface IProvider extends IUser {
  // Organization details
  organizationName: string;
  abn: string;
  businessAddress: BusinessAddress;
  
  // Provider classification
  providerType: ProviderType;
  
  // Primary contact
  primaryContactName: string;
  primaryContactPhone: string;
  primaryContactEmail: string;
  
  // Service coverage
  stateIds: mongoose.Types.ObjectId[];
  regionIds: mongoose.Types.ObjectId[];
  
  // Configuration
  settings: ProviderSettings;
  
  // Statistics
  totalRostersUploaded: number;
  totalShiftsManaged: number;
  lastRosterUpload?: Date;
  
  // Subscription
  subscriptionTier: ProviderSubscriptionTier;
  subscriptionStatus: ProviderSubscriptionStatus;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
}

/**
 * Provider schema definition
 * Adds provider-specific fields to the base User schema
 */
const providerSchema = new Schema<IProvider>(
  {
    // Organization details
    organizationName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    abn: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
      validate: {
        validator: function(value: string) {
          // ABN validation (11 digits)
          return /^\d{11}$/.test(value.replace(/\s/g, ''));
        },
        message: 'ABN must be an 11-digit number'
      }
    },
    businessAddress: {
      street: {
        type: String,
        required: true,
        trim: true
      },
      city: {
        type: String,
        required: true,
        trim: true
      },
      state: {
        type: String,
        required: true,
        trim: true
      },
      postcode: {
        type: String,
        required: true,
        trim: true,
        validate: {
          validator: function(value: string) {
            // Australian postcode validation (4 digits)
            return /^\d{4}$/.test(value);
          },
          message: 'Postcode must be a 4-digit number'
        }
      }
    },
    
    // Provider classification
    providerType: {
      type: String,
      enum: Object.values(ProviderType),
      required: true
    },
    
    // Primary contact
    primaryContactName: {
      type: String,
      required: true,
      trim: true
    },
    primaryContactPhone: {
      type: String,
      required: true,
      trim: true
    },
    primaryContactEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    
    // Service coverage
    stateIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'State'
    }],
    regionIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Region'
    }],
    
    // Configuration
    settings: {
      autoCreateWorkers: {
        type: Boolean,
        default: true
      },
      autoCreateParticipants: {
        type: Boolean,
        default: true
      },
      requireWorkerApproval: {
        type: Boolean,
        default: false
      },
      enableAutoCancellationReplacement: {
        type: Boolean,
        default: true
      },
      smsNotifications: {
        type: Boolean,
        default: false
      }
    },
    
    // Statistics
    totalRostersUploaded: {
      type: Number,
      default: 0,
      min: 0
    },
    totalShiftsManaged: {
      type: Number,
      default: 0,
      min: 0
    },
    lastRosterUpload: {
      type: Date
    },
    
    // Subscription
    subscriptionTier: {
      type: String,
      enum: Object.values(ProviderSubscriptionTier),
      default: ProviderSubscriptionTier.TRIAL
    },
    subscriptionStatus: {
      type: String,
      enum: Object.values(ProviderSubscriptionStatus),
      default: ProviderSubscriptionStatus.ACTIVE
    },
    subscriptionStartDate: {
      type: Date
    },
    subscriptionEndDate: {
      type: Date
    }
  }
);

/**
 * Add indexes for faster queries
 */
providerSchema.index({ subscriptionStatus: 1 });
providerSchema.index({ organizationName: 'text' });
providerSchema.index({ providerType: 1 });
providerSchema.index({ stateIds: 1 });
providerSchema.index({ regionIds: 1 });
providerSchema.index({ lastRosterUpload: -1 });

/**
 * Create and export the Provider model
 * Uses the discriminator pattern to extend the User model
 */
const Provider = User.discriminator<IProvider>('provider', providerSchema);

export default Provider;

