/**
 * Guardian model definition
 * Schema for guardians (caregivers/nominees) extending the base User model
 */

import mongoose, { Schema } from 'mongoose';
import User, { IUser } from './user.model';

/**
 * Guardian document interface
 * Extends the base User interface with guardian-specific properties
 */
export interface IGuardian extends IUser {
  participants: mongoose.Types.ObjectId[];
  relationship: string;
  isLegalGuardian: boolean;
  organization?: string;
  isPrimaryContact: boolean;
}

/**
 * Guardian schema definition
 * Adds guardian-specific fields to the base User schema
 */
const guardianSchema = new Schema<IGuardian>(
  {
    // Reference to participants this guardian manages
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    
    // Relationship to the participant(s)
    relationship: {
      type: String,
      // required: true,
      enum: [
        'parent',
        'child',
        'sibling',
        'spouse',
        'relative',
        'friend',
        'legal guardian',
        'professional',
        'other'
      ],
    },
    
    // Whether this guardian has legal authority
    isLegalGuardian: {
      type: Boolean,
      default: false,
    },
    
    // Optional organization the guardian belongs to
    organization: {
      type: String,
    },
    
    // Whether this is the primary contact
    isPrimaryContact: {
      type: Boolean,
      default: true,
    },
  }
);

/**
 * Add indexes for faster queries
 */
guardianSchema.index({ participants: 1 });

/**
 * Create and export the Guardian model
 * Uses the discriminator pattern to extend the User model
 */
const Guardian = User.discriminator<IGuardian>('guardian', guardianSchema);

export default Guardian;