/**
 * ServiceArea Model
 * Defines service coverage areas for support workers
 * Can represent suburbs, districts, or custom defined areas
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IServiceArea extends Document {
  name: string;
  code: string;
  regionId: mongoose.Types.ObjectId;
  stateId: mongoose.Types.ObjectId;
  suburbIds: mongoose.Types.ObjectId[];
  description?: string;
  // Optional: GeoJSON polygon for precise area definition
  boundaryPolygon?: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  // Optional: Center point for distance calculations
  centerPoint?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const serviceAreaSchema = new Schema<IServiceArea>(
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
    suburbIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Suburb'
    }],
    description: {
      type: String,
      trim: true
    },
    boundaryPolygon: {
      type: {
        type: String,
        enum: ['Polygon']
      },
      coordinates: {
        type: [[[Number]]] // Array of polygon rings
      }
    },
    centerPoint: {
      type: {
        type: String,
        enum: ['Point']
      },
      coordinates: {
        type: [Number] // [longitude, latitude]
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
serviceAreaSchema.index({ regionId: 1, isActive: 1 });
serviceAreaSchema.index({ stateId: 1, isActive: 1 });
serviceAreaSchema.index({ code: 1, regionId: 1 }, { unique: true });

// 2dsphere indexes for geospatial queries (sparse: only index docs with these fields)
serviceAreaSchema.index({ boundaryPolygon: '2dsphere' }, { sparse: true });
serviceAreaSchema.index({ centerPoint: '2dsphere' }, { sparse: true });

const ServiceArea = mongoose.model<IServiceArea>('ServiceArea', serviceAreaSchema);

export default ServiceArea;

