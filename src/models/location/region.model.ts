/**
 * Region Model
 * Reference data for regions within states (e.g., Greater Sydney, Metropolitan Melbourne)
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IRegion extends Document {
  name: string;
  code: string;
  stateId: mongoose.Types.ObjectId;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const regionSchema = new Schema<IRegion>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true
    },
    stateId: {
      type: Schema.Types.ObjectId,
      ref: 'State',
      required: true,
      index: true
    },
    description: {
      type: String,
      trim: true
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

// Compound indexes for efficient queries
regionSchema.index({ stateId: 1, isActive: 1 });
regionSchema.index({ code: 1, stateId: 1 }, { unique: true });
regionSchema.index({ name: 1, stateId: 1 });

const Region = mongoose.model<IRegion>('Region', regionSchema);

export default Region;

