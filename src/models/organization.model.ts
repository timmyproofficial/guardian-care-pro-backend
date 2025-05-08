/**
 * Organization model definition
 * Schema for participant-centric organizations that connect with support workers
 */

import mongoose, { Document, Schema } from 'mongoose';

export enum InviteStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined'
}

export interface ServiceAgreement {
  // Used for shift without specific rate
  baseHourlyRate: number;
  shiftRates: {
    rateTimeBandId: mongoose.Types.ObjectId;
    hourlyRate: number;
  }[];
  startDate: Date;
  endDate?: Date;
  termsAccepted: boolean;
  additionalTerms?: string;
}

export interface ProposedRate {
  baseHourlyRate: number;
  shiftRates: {
    rateTimeBandId: mongoose.Types.ObjectId;
    hourlyRate: number;
  }[];
}

export interface WorkerInvite {
  _id?: mongoose.Types.ObjectId; // Add this line to explicitly define _id
  workerId: mongoose.Types.ObjectId;
  inviteDate: Date;
  status: InviteStatus;

  proposedRates: ProposedRate;

  notes?: string;
  adminNotes?: string;
  adminId?: mongoose.Types.ObjectId;
  responseDate?: Date;
  declineReason?: string;
  serviceAgreement?: ServiceAgreement;
}

/**
 * Organization document interface
 */
export interface IOrganization extends Document {
  name: string;
  participantId: mongoose.Types.ObjectId;
  workers: {
    workerId: mongoose.Types.ObjectId;
    serviceAgreement: ServiceAgreement;
    joinedDate: Date;
  }[];
  pendingInvites: WorkerInvite[];
  description?: string;
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
    
    // Participant who owns this organization
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    
    // Support workers connected to this organization
    workers: [{
      workerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      serviceAgreement: {
        baseHourlyRate: {
          type: Number,
          required: true,
          min: 0
        },
        shiftRates: [{
          rateTimeBandId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'RateTimeBand',
            required: true
          },
          hourlyRate: {
            type: Number,
            required: true,
            min: 0
          }
        }],
        startDate: {
          type: Date,
          required: true,
          default: Date.now
        },
        endDate: {
          type: Date
        },
        termsAccepted: {
          type: Boolean,
          required: true,
          default: false
        },
        additionalTerms: {
          type: String
        }
      },
      joinedDate: {
        type: Date,
        required: true,
        default: Date.now
      }
    }],
    
    // Pending invites to support workers
    pendingInvites: [{
      workerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      inviteDate: {
        type: Date,
        required: true,
        default: Date.now
      },
      status: {
        type: String,
        enum: Object.values(InviteStatus),
        default: InviteStatus.PENDING
      },
      proposedRates: {
        baseHourlyRate: {
          type: Number,
          required: true,
          min: 0
        },
        shiftRates: [{
          rateTimeBandId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'RateTimeBand',
            required: true
          },
          hourlyRate: {
            type: Number,
            required: true,
            min: 0
          }
        }]
      },
      notes: {
        type: String
      },
      adminNotes: {
        type: String
      },
      adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      responseDate: {
        type: Date
      },
      declineReason: {
        type: String
      },
      serviceAgreement: {
        baseHourlyRate: Number,
        shiftRates: [{
          rateTimeBandId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'RateTimeBand'
          },
          hourlyRate: Number
        }],
        startDate: Date,
        endDate: Date,
        termsAccepted: Boolean,
        additionalTerms: String
      }
    }],
    
    // Organization description
    description: {
      type: String
    }
  },
  {
    timestamps: true // Adds createdAt and updatedAt fields
  }
);

/**
 * Add indexes for faster queries
 */
organizationSchema.index({ participantId: 1 });
organizationSchema.index({ 'workers.workerId': 1 });
organizationSchema.index({ 'pendingInvites.workerId': 1 });
organizationSchema.index({ 'pendingInvites.status': 1 });

/**
 * Create and export the Organization model
 */
const Organization = mongoose.model<IOrganization>('Organization', organizationSchema);

export default Organization;