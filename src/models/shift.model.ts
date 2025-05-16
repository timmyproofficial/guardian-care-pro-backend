/**
 * Shift model definition
 * Schema for shifts that connect participants with support workers
 */

import mongoose, { Document, Schema } from 'mongoose';
import { 
  ShiftStatus, 
  ShiftType, 
  RecurrencePattern, 
  ServiceType, 
  LocationType, 
  CancellationReason, 
  WorkerAssignment
} from '../types/shift.types';
import { generateShiftId } from '../utils/generators';

/**
 * Shift document interface
 * Defines the structure of a shift document
 */
export interface IShift extends Document {
  _id: mongoose.Types.ObjectId;
  shiftId: string;                           // Unique shift identifier
  organizationId: mongoose.Types.ObjectId;   // Organization this shift belongs to
  participantId: mongoose.Types.ObjectId;    // Participant who created the shift
  isMultiWorkerShift: boolean;               // Whether shift requires multiple workers
  workerId?: mongoose.Types.ObjectId;        // Support worker assigned to the shift (single-worker mode)
  workerAssignments?: WorkerAssignment[];    // Support workers assigned to the shift (multi-worker mode)
  serviceType: ServiceType;                  // Type of service requested
  startTime: Date;                           // Scheduled start time
  endTime: Date;                             // Scheduled end time
  
  // Location details
  locationType: LocationType;
  address?: string;                          // Required for in-person shifts
  
  // Shift configuration
  shiftType: ShiftType;                      // Direct booking or open request
  requiresSupervision: boolean;              // Whether supervision is required
  specialInstructions?: string;              // Any special notes or requirements
  
  // Status tracking
  status: ShiftStatus;                       // Current status of the shift
  cancelledBy?: mongoose.Types.ObjectId;     // User who cancelled the shift
  cancellationReason?: CancellationReason;   // Reason for cancellation
  cancellationNote?: string;                 // Additional notes for cancellation
  declineReason?: string;                    // Reason for worker declining
  
  // Recurrence for recurring shifts
  recurrence?: {
    pattern: RecurrencePattern;              // Recurrence pattern (daily, weekly, etc.)
    occurrences?: number;                    // Number of occurrences
    endDate?: Date;                          // End date for recurring shifts
    parentShiftId?: string;                  // Parent shift ID for recurring instances
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Shift schema definition
 */
const shiftSchema = new Schema<IShift>(
  {
    shiftId: {
      type: String,
      required: true,
      unique: true,
      default: generateShiftId
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    },
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isMultiWorkerShift: {
      type: Boolean,
      default: false
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    workerAssignments: [{
      workerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      status: {
        type: String,
        enum: Object.values(ShiftStatus),
        default: ShiftStatus.PENDING
      },
      declineReason: {
        type: String
      },
      responseDate: {
        type: Date
      },
      cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      cancellationReason: {
        type: String,
        enum: Object.values(CancellationReason)
      },
      cancellationNote: {
        type: String
      }
    }],
    serviceType: {
      type: String,
      enum: Object.values(ServiceType),
      required: true
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true,
      validate: {
        validator: function(this: IShift, value: Date) {
          return value > this.startTime;
        },
        message: 'End time must be after start time'
      }
    },
    locationType: {
      type: String,
      enum: Object.values(LocationType),
      required: true
    },
    address: {
      type: String,
      required: function(this: any) {
        return this.locationType === LocationType.IN_PERSON;
      }
    },
    shiftType: {
      type: String,
      enum: Object.values(ShiftType),
      required: true
    },
    requiresSupervision: {
      type: Boolean,
      default: false
    },
    specialInstructions: {
      type: String
    },
    status: {
      type: String,
      enum: Object.values(ShiftStatus),
      default: ShiftStatus.PENDING
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    cancellationReason: {
      type: String,
      enum: Object.values(CancellationReason)
    },
    cancellationNote: {
      type: String
    },
    declineReason: {
      type: String
    },
    recurrence: {
      pattern: {
        type: String,
        enum: Object.values(RecurrencePattern),
        default: RecurrencePattern.NONE
      },
      occurrences: {
        type: Number,
        min: 1
      },
      endDate: {
        type: Date
      },
      parentShiftId: {
        type: String
      }
    }
  },
  {
    timestamps: true // Adds createdAt and updatedAt fields
  }
);

/**
 * Add indexes for faster queries
 */
shiftSchema.index({ shiftId: 1 }, { unique: true });
shiftSchema.index({ participantId: 1 });
shiftSchema.index({ workerId: 1 });
shiftSchema.index({ 'workerAssignments.workerId': 1 }); // Add index for worker assignments
shiftSchema.index({ organizationId: 1 });
shiftSchema.index({ status: 1 });
shiftSchema.index({ startTime: 1 });
shiftSchema.index({ 'recurrence.parentShiftId': 1 });

/**
 * Create and export the Shift model
 */
const Shift = mongoose.model<IShift>('Shift', shiftSchema);

export default Shift;