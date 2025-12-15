import mongoose, { Document, Schema } from 'mongoose';

export enum ServiceCategoryStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export interface IServiceCategory extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  status: ServiceCategoryStatus;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Main service category model for onboarding participants and support
 */
const serviceCategorySchema = new Schema<IServiceCategory>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    status: {
      type: String,
      enum: Object.values(ServiceCategoryStatus),
      default: ServiceCategoryStatus.ACTIVE,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  },
);

serviceCategorySchema.index({ status: 1, name: 1 });

export const ServiceCategory = mongoose.model<IServiceCategory>('ServiceCategory', serviceCategorySchema);
