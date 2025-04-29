/**
 * Support Worker model definition
 * Schema for Independent Support Workers (ISWs) extending the base User model
 */

import mongoose, { Schema } from 'mongoose';
import User, { IUser } from './user.model';
import { SupportWorkerSkill } from '../types/user.types';

/**
 * Support Worker document interface
 * Extends the base User interface with worker-specific properties
 */
export interface IWorker extends IUser {
  skills?: SupportWorkerSkill[];
  qualifications: {
    title: string;
    issuer: string;
    issueDate: Date;
    expiryDate?: Date;
    verified: boolean;
  }[];
  experience: {
    title: string;
    organization: string;
    startDate: Date;
    endDate?: Date;
    description: string;
  }[];
  hourlyRate: {
    baseRate: number;
    weekendRate?: number;
    holidayRate?: number;
    overnightRate?: number;
  };
  availability: {
    weekdays: {
      day: string;
      available: boolean;
      slots?: {
        start: string; // Time in HH:MM format
        end: string;
      }[];
    }[];
    unavailableDates: Date[];
  };
  serviceAreas: string[]; // Postcodes/regions
  languages: string[];
  ratings: {
    average: number;
    count: number;
  };
  verificationStatus: {
    identityVerified: boolean;
    policeCheckVerified: boolean;
    ndisWorkerScreeningVerified: boolean;
    onboardingComplete: boolean;
    onboardingFeeReceived: boolean;
  };
  organizations: mongoose.Types.ObjectId[];
  abn?: string; // Australian Business Number
  bankDetails?: {
    accountName: string;
    bsb: string;
    accountNumber: string;
  };
}

/**
 * Support Worker schema definition
 * Adds worker-specific fields to the base User schema
 */
const workerSchema = new Schema<IWorker>(
  {
    // Skills and services offered
    skills: {
      type: [{
        type: String,
        enum: Object.values(SupportWorkerSkill),
      }],
      // required: true,
    },
    
    // Formal qualifications
    qualifications: [{
      title: { type: String, required: true },
      issuer: { type: String, required: true },
      issueDate: { type: Date, required: true },
      expiryDate: { type: Date },
      verified: { type: Boolean, default: false },
    }],
    
    // Work experience
    experience: [{
      title: { 
        type: String, 
        // required: true 
      },
      organization: { 
        type: String, 
        // required: true 
      },
      startDate: { 
        type: Date, 
        // required: true 
      },
      endDate: { type: Date },
      description: { type: String },
    }],
    
    // Hourly rates
    hourlyRate: {
      baseRate: { 
        type: Number, 
        // required: true 
      },
      weekendRate: { type: Number },
      holidayRate: { type: Number },
      overnightRate: { type: Number },
    },
    
    // Availability schedule
    availability: {
      weekdays: [{
        day: {
          type: String,
          enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
          // required: true,
        },
        available: { type: Boolean, default: true },
        slots: [{
          start: { type: String }, // HH:MM format
          end: { type: String },
        }],
      }],
      unavailableDates: [{ type: Date }],
    },
    
    // Geographic service areas
    serviceAreas: [{ type: String }],
    
    // Languages spoken
    languages: [{ type: String }],
    
    // Rating summary
    ratings: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    
    // Verification status
    verificationStatus: {
      identityVerified: { type: Boolean, default: false },
      policeCheckVerified: { type: Boolean, default: false },
      ndisWorkerScreeningVerified: { type: Boolean, default: false },
      onboardingComplete: { type: Boolean, default: false },
      onboardingFeeReceived: { type: Boolean, default: false },
    },
    
    // Organizations the worker is associated with
    organizations: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    }],
    
    // Australian Business Number
    abn: {
      type: String,
      validate: {
        validator: function(value: string) {
          // ABN validation (11 digits)
          return /^\d{11}$/.test(value);
        },
        message: 'ABN must be an 11-digit number',
      },
    },
    
    // Bank details for payments
    bankDetails: {
      accountName: { type: String },
      bsb: { type: String },
      accountNumber: { type: String },
    },
  }
);

/**
 * Add indexes for faster queries
 */
workerSchema.index({ skills: 1 });
workerSchema.index({ serviceAreas: 1 });
workerSchema.index({ 'hourlyRate.baseRate': 1 });
workerSchema.index({ 'verificationStatus.onboardingComplete': 1 });
workerSchema.index({ organizations: 1 });

/**
 * Create and export the Support Worker model
 * Uses the discriminator pattern to extend the User model
 */
const Worker = User.discriminator<IWorker>('supportWorker', workerSchema);

export default Worker;