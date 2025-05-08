/**
 * RateTimeBand model definition
 * Defines standard time periods and their rate multipliers for pricing and scheduling
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IRateTimeBand extends Document {
  name: string;
  code: string;
  startTime?: string; // Format: HH:MM (24-hour)
  endTime?: string;   // Format: HH:MM (24-hour)
  description?: string;
  isWeekend: boolean;
  isPublicHoliday: boolean;
  isSleepover: boolean;
  isActive: boolean;
  baseRateMultiplier: number; // Multiplier relative to standard rate (e.g., 1.5 for evening)
  createdAt: Date;
  updatedAt: Date;
}

const rateTimeBandSchema = new Schema<IRateTimeBand>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    startTime: {
      type: String,
      validate: {
        validator: function(value: string) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
        },
        message: 'Start time must be in the format HH:MM (24-hour)'
      }
    },
    endTime: {
      type: String,
      validate: {
        validator: function(value: string) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
        },
        message: 'End time must be in the format HH:MM (24-hour)'
      }
    },
    description: {
      type: String,
    },
    isWeekend: {
      type: Boolean,
      default: false
    },
    isPublicHoliday: {
      type: Boolean,
      default: false
    },
    isSleepover: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    baseRateMultiplier: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    }
  },
  {
    timestamps: true
  }
);

// Add indexes
rateTimeBandSchema.index({ code: 1 });
rateTimeBandSchema.index({ isActive: 1 });

const RateTimeBand = mongoose.model<IRateTimeBand>('RateTimeBand', rateTimeBandSchema);

export default RateTimeBand;