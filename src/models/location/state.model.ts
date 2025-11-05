/**
 * State Model
 * Reference data for Australian states and territories
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IState extends Document {
  name: string;
  code: string; // e.g., "NSW", "VIC", "QLD"
  country: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const stateSchema = new Schema<IState>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    country: {
      type: String,
      required: true,
      default: 'Australia'
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes for efficient queries
stateSchema.index({ code: 1, isActive: 1 });
stateSchema.index({ name: 1, isActive: 1 });

const State = mongoose.model<IState>('State', stateSchema);

export default State;

