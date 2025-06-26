/**
 * Batch Invoice Configuration model definition
 * Schema for storing batch invoice generation settings
 */

import mongoose, { Document, Schema } from 'mongoose';

/**
 * Enum for batch frequency
 */
export enum BatchFrequency {
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly'
}

/**
 * Batch Invoice Config document interface
 */
export interface IBatchInvoiceConfig extends Document {
  _id: mongoose.Types.ObjectId;
  
  // Schedule configuration
  isEnabled: boolean;
  frequency: BatchFrequency;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  timeOfDay: string; // HH:MM format
  timezone: string;
  
  // Period configuration
  periodStartDay: number; // 0-6 (Sunday-Saturday)
  periodEndDay: number; // 0-6 (Sunday-Saturday)
  monthlyStartDate?: number; // 1-31
  monthlyEndDate?: number | string; // 1-31 or "last"
  
  // System configuration
  automaticEmailParticipant: boolean;
  automaticEmailWorker: boolean;
  
  // Timestamps
  lastRun?: Date;
  nextScheduledRun?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Batch Invoice Config schema definition
 */
const batchInvoiceConfigSchema = new Schema<IBatchInvoiceConfig>(
  {
    isEnabled: {
      type: Boolean,
      default: true
    },
    frequency: {
      type: String,
      enum: Object.values(BatchFrequency),
      default: BatchFrequency.WEEKLY
    },
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6,
      default: 2 // Tuesday
    },
    timeOfDay: {
      type: String,
      validate: {
        validator: (v: string) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(v),
        message: 'Time must be in HH:MM format'
      },
      default: '02:00' // 2 AM
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    periodStartDay: {
      type: Number,
      min: 0,
      max: 6,
      default: 0 // Sunday
    },
    periodEndDay: {
      type: Number,
      min: 0,
      max: 6,
      default: 6 // Saturday
    },
    monthlyStartDate: {
      type: Number,
      min: 1,
      max: 31
    },
    monthlyEndDate: {
      type: Schema.Types.Mixed, // Can be number or string "last"
      validate: {
        validator: function(v: any) {
          return v === 'last' || (Number.isInteger(v) && v >= 1 && v <= 31);
        },
        message: 'Monthly end date must be between 1-31 or "last"'
      }
    },
    automaticEmailParticipant: {
      type: Boolean,
      default: true
    },
    automaticEmailWorker: {
      type: Boolean,
      default: true
    },
    lastRun: {
      type: Date
    },
    nextScheduledRun: {
      type: Date
    }
  },
  {
    timestamps: true // Adds createdAt and updatedAt fields
  }
);

/**
 * Create and export the Batch Invoice Config model
 */
const BatchInvoiceConfig = mongoose.model<IBatchInvoiceConfig>('BatchInvoiceConfig', batchInvoiceConfigSchema);

export default BatchInvoiceConfig;