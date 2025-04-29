/**
 * Support Coordinator model definition
 * Schema for Support Coordinators extending the base User model
 */

import mongoose, { Schema } from 'mongoose';
import User, { IUser } from './user.model';

/**
 * Support Coordinator document interface
 * Extends the base User interface with coordinator-specific properties
 */
export interface ICoordinator extends IUser {
  participants: mongoose.Types.ObjectId[];
  organization?: string;
  registrationNumber?: string;
  position?: string;
  specialties?: string[];
  permissions: {
    canBookOnBehalf: boolean;
    canApproveTimesheets: boolean;
    canAccessBilling: boolean;
  };
}

/**
 * Support Coordinator schema definition
 * Adds coordinator-specific fields to the base User schema
 */
const coordinatorSchema = new Schema<ICoordinator>(
  {
    // Participants this coordinator manages
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    
    // Organization the coordinator works for
    organization: {
      type: String,
    },
    
    // Professional registration number
    registrationNumber: {
      type: String,
    },
    
    // Job title/position
    position: {
      type: String,
    },
    
    // Areas of specialty
    specialties: [{
      type: String,
    }],
    
    // Permission settings
    permissions: {
      // Whether they can book shifts on behalf of participants
      canBookOnBehalf: {
        type: Boolean,
        default: true,
      },
      
      // Whether they can approve timesheets
      canApproveTimesheets: {
        type: Boolean,
        default: false,
      },
      
      // Whether they can access billing information
      canAccessBilling: {
        type: Boolean,
        default: false,
      },
    },
  }
);

/**
 * Add indexes for faster queries
 */
coordinatorSchema.index({ participants: 1 });
coordinatorSchema.index({ organization: 1 });

/**
 * Create and export the Support Coordinator model
 * Uses the discriminator pattern to extend the User model
 */
const Coordinator = User.discriminator<ICoordinator>('supportCoordinator', coordinatorSchema);

export default Coordinator;