/**
 * Organization model definition
 * Schema for organizations that represent a participant and have support workers
 */

import mongoose, { Document, Schema } from 'mongoose';

/**
 * Organization document interface
 */
export interface IOrganization extends Document {
  name: string;
  participants: mongoose.Types.ObjectId[];
  supportWorkers: mongoose.Types.ObjectId[];
  contactPerson: {
    name: string;
    email: string;
    phone: string;
  };
  address?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  isVerified: boolean;
  ndisRegistered: boolean;
  ndisRegistrationNumber?: string;
  abn: string; // Australian Business Number
  description?: string;
  logo?: string;
  website?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Organization schema definition
 */
const organizationSchema = new Schema<IOrganization>(
  {
    // Organization name
    name: {
      type: String,
      required: true,
      trim: true,
    },
    
    // Participants associated with this organization
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    
    // Support workers associated with this organization
    supportWorkers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    
    // Primary contact person
    contactPerson: {
      name: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
    },
    
    // Physical address
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    
    // Verification status
    isVerified: {
      type: Boolean,
      default: false,
    },
    
    // NDIS registration information
    ndisRegistered: {
      type: Boolean,
      default: false,
    },
    
    ndisRegistrationNumber: {
      type: String,
    },
    
    // Australian Business Number
    abn: {
      type: String,
      required: true,
      validate: {
        validator: function(value: string) {
          // ABN validation (11 digits)
          return /^\d{11}$/.test(value);
        },
        message: 'ABN must be an 11-digit number',
      },
    },
    
    // Organization description
    description: {
      type: String,
    },
    
    // Logo URL
    logo: {
      type: String,
    },
    
    // Website URL
    website: {
      type: String,
      validate: {
        validator: (value: string) => {
          // Simple URL validation
          try {
            new URL(value);
            return true;
          } catch (err) {
            return false;
          }
        },
        message: 'Website must be a valid URL',
      },
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

/**
 * Add indexes for faster queries
 */
organizationSchema.index({ name: 1 });
organizationSchema.index({ participants: 1 });
organizationSchema.index({ supportWorkers: 1 });
organizationSchema.index({ ndisRegistered: 1 });

/**
 * Create and export the Organization model
 */
const Organization = mongoose.model<IOrganization>('Organization', organizationSchema);

export default Organization;