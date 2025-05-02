/**
 * Admin model definition
 * Schema for administrators extending the base User model
 */

import mongoose, { Schema } from 'mongoose';
import User, { IUser } from './user.model';
import { AdminType } from '../types/user.types';

/**
 * Admin document interface
 * Extends the base User interface with admin-specific properties
 */
export interface IAdmin extends IUser {
  adminType: AdminType;
  permissions: {
    canManageUsers: boolean;
    canManageWorkers: boolean;
    canManageParticipants: boolean;
    canApproveInvites: boolean;
    canManageServiceAgreements: boolean;
    canManageSubscriptions: boolean;
    canAccessFinancials: boolean;
    canManageAdmins: boolean;
  };
  assignedOrganizations?: mongoose.Types.ObjectId[];
}

/**
 * Admin schema definition
 * Adds admin-specific fields to the base User schema
 */
const adminSchema = new Schema<IAdmin>(
  {
    // Admin type (coordinator, superAdmin, etc.)
    adminType: {
      type: String,
      enum: Object.values(AdminType),
      required: true
    },
    
    // Admin permissions
    permissions: {
      canManageUsers: {
        type: Boolean,
        default: true
      },
      canManageWorkers: {
        type: Boolean,
        default: true
      },
      canManageParticipants: {
        type: Boolean,
        default: true
      },
      canApproveInvites: {
        type: Boolean,
        default: true
      },
      canManageServiceAgreements: {
        type: Boolean,
        default: true
      },
      canManageSubscriptions: {
        type: Boolean,
        default: false
      },
      canAccessFinancials: {
        type: Boolean,
        default: false
      },
      canManageAdmins: {
        type: Boolean,
        default: false
      }
    },
    
    // Organizations this admin is responsible for
    assignedOrganizations: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization'
    }]
  }
);

/**
 * Add indexes for faster queries
 */
adminSchema.index({ adminType: 1 });
adminSchema.index({ assignedOrganizations: 1 });

/**
 * Create and export the Admin model
 * Uses the discriminator pattern to extend the User model
 */
const Admin = User.discriminator<IAdmin>('admin', adminSchema);

export default Admin;