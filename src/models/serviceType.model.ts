/**
 * Service Type model definition
 * Schema for managing service types in the system
 */

import mongoose, { Document, Schema } from 'mongoose';

/**
 * Service Type status enumeration
 */
export enum ServiceTypeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

/**
 * Service Type document interface
 */
export interface IServiceType extends Document {
  _id: mongoose.Types.ObjectId;
  name: string; // Display name (e.g., "Personal Care")
  code: string; // Unique code (e.g., "PERSONAL_CARE")
  category: mongoose.Types.ObjectId; // Reference to ServiceCategory
  status: ServiceTypeStatus; // Active or inactive status
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Service Type schema definition
 */
const serviceTypeSchema = new Schema<IServiceType>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 50,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceCategory',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(ServiceTypeStatus),
      default: ServiceTypeStatus.ACTIVE,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

/**
 * Add indexes for faster queries
 */
serviceTypeSchema.index({ status: 1 });
serviceTypeSchema.index({ name: 1 });
serviceTypeSchema.index({ category: 1 });

// Compound indexes for optimized queries
serviceTypeSchema.index(
  {
    status: 1,
    name: 1,
  },
  {
    name: 'idx_status_name_search',
    partialFilterExpression: { status: 'active' },
  },
);

serviceTypeSchema.index(
  {
    category: 1,
    status: 1,
  },
  {
    name: 'idx_category_status',
  },
);

/**
 * Create and export the ServiceType model
 */
const ServiceType = mongoose.model<IServiceType>('ServiceType', serviceTypeSchema);

export default ServiceType;
