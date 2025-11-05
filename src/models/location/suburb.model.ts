/**
 * Suburb Model
 * Reference data for suburbs within regions
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface ISuburb extends Document {
  name: string;
  postcode: string;
  regionId: mongoose.Types.ObjectId;
  stateId: mongoose.Types.ObjectId;
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const suburbSchema = new Schema<ISuburb>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    postcode: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    regionId: {
      type: Schema.Types.ObjectId,
      ref: 'Region',
      required: true,
      index: true
    },
    stateId: {
      type: Schema.Types.ObjectId,
      ref: 'State',
      required: true,
      index: true
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: false
      }
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
suburbSchema.index({ regionId: 1, isActive: 1 });
suburbSchema.index({ stateId: 1, isActive: 1 });
suburbSchema.index({ postcode: 1, stateId: 1 });
suburbSchema.index({ name: 1, postcode: 1, stateId: 1 });

// 2dsphere index for geospatial queries
suburbSchema.index({ location: '2dsphere' });

const Suburb = mongoose.model<ISuburb>('Suburb', suburbSchema);

export default Suburb;

