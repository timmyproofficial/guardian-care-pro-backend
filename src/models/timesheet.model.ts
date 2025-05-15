/**
 * Timesheet model definition
 * Schema for timesheets submitted after shift completion
 */

import mongoose, { Document, Schema } from 'mongoose';
import { TimesheetStatus } from '../types/shift.types';

/**
 * Enum for expense payer type
 * Tracks who paid for an expense
 */
export enum ExpensePayer {
  PARTICIPANT = 'participant',
  SUPPORT_WORKER = 'supportWorker'
}

/**
 * Expense interface
 * Structure for tracking expenses during a shift
 */
export interface Expense {
  title: string;
  description: string;
  amount: number;
  receiptUrl?: string;
  payer: ExpensePayer; // Who paid for the expense
}

/**
 * Rate calculation interface
 * For storing the rate breakdown of a shift
 */
export interface RateCalculation {
  rateTimeBandId: mongoose.Types.ObjectId;
  name: string;
  hourlyRate: number;
  hours: number;
  amount: number;
}

/**
 * Timesheet document interface
 * Defines the structure of a timesheet document
 */
export interface ITimesheet extends Document {
  _id: mongoose.Types.ObjectId;
  shiftId: mongoose.Types.ObjectId;          // Reference to the completed shift
  shiftIdRef: string;                         // Unique shift identifier
  organizationId: mongoose.Types.ObjectId;    // Organization this timesheet belongs to
  participantId: mongoose.Types.ObjectId;     // Participant who created the shift
  workerId: mongoose.Types.ObjectId;          // Support worker who completed the shift
  
  // Time tracking
  scheduledStartTime: Date;                   // Original scheduled start time
  scheduledEndTime: Date;                     // Original scheduled end time
  actualStartTime: Date;                      // Actual time the shift started
  actualEndTime: Date;                        // Actual time the shift ended
  extraTime: number;                          // Additional minutes beyond scheduled end time
  
  // Distance Travel
  distanceTravelKm: number;                   // Distance traveled in kilometers
  distanceTravelRate: number;                 // Rate per kilometer as per service agreement
  distanceTravelAmount: number;               // Total amount for distance travel
  
  // Notes and feedback
  notes?: string;                             // Notes about the shift
  
  // Expenses
  expenses: Expense[];                        // List of expenses incurred
  participantExpensesTotal: number;           // Sum of expenses paid by participant
  workerExpensesTotal: number;                // Sum of expenses paid by worker
  totalExpenses: number;                      // Sum of all expenses
  
  // Payment calculation
  rateCalculations: RateCalculation[];        // Breakdown of rate calculations
  subtotal: number;                           // Total for services before expenses
  totalAmount: number;                        // Total amount including service fees and distance travel
  grandTotal: number;                         // Total amount including expenses
  
  // Status tracking
  status: TimesheetStatus;                    // Status of the timesheet
  rejectionReason?: string;                   // Reason for rejection if rejected
  approvedBy?: mongoose.Types.ObjectId;       // User who approved the timesheet
  approvedAt?: Date;                          // When the timesheet was approved
  
  // Invoice tracking
  invoiceId?: mongoose.Types.ObjectId;        // Reference to invoice if included in one
  isPaid: boolean;                            // Whether the timesheet has been paid
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Timesheet schema definition
 */
const timesheetSchema = new Schema<ITimesheet>(
  {
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift',
      required: true
    },
    shiftIdRef: {
      type: String,
      required: true
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
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    scheduledStartTime: {
      type: Date,
      required: true
    },
    scheduledEndTime: {
      type: Date,
      required: true
    },
    actualStartTime: {
      type: Date,
      required: true
    },
    actualEndTime: {
      type: Date,
      required: true,
      validate: {
        validator: function(this: ITimesheet, value: Date) {
          return value > this.actualStartTime;
        },
        message: 'Actual end time must be after actual start time'
      }
    },
    extraTime: {
      type: Number, // in minutes
      default: 0,
      min: 0
    },
    distanceTravelKm: {
      type: Number,
      default: 0,
      min: 0
    },
    distanceTravelRate: {
      type: Number,
      default: 0,
      min: 0
    },
    distanceTravelAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    notes: {
      type: String
    },
    expenses: [{
      title: {
        type: String,
        required: true
      },
      description: {
        type: String,
        required: true
      },
      amount: {
        type: Number,
        required: true,
        min: 0
      },
      receiptUrl: {
        type: String
      },
      payer: {
        type: String,
        enum: Object.values(ExpensePayer),
        required: true,
        default: ExpensePayer.PARTICIPANT
      }
    }],
    participantExpensesTotal: {
      type: Number,
      default: 0,
      min: 0
    },
    workerExpensesTotal: {
      type: Number,
      default: 0,
      min: 0
    },
    totalExpenses: {
      type: Number,
      default: 0,
      min: 0
    },
    rateCalculations: [{
      rateTimeBandId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RateTimeBand',
        required: true
      },
      name: {
        type: String,
        required: true
      },
      hourlyRate: {
        type: Number,
        required: true,
        min: 0
      },
      hours: {
        type: Number,
        required: true,
        min: 0
      },
      amount: {
        type: Number,
        required: true,
        min: 0
      }
    }],
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: Object.values(TimesheetStatus),
      default: TimesheetStatus.PENDING
    },
    rejectionReason: {
      type: String
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: {
      type: Date
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice'
    },
    isPaid: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true // Adds createdAt and updatedAt fields
  }
);

/**
 * Add indexes for faster queries
 */
timesheetSchema.index({ shiftId: 1 }, { unique: true });
timesheetSchema.index({ shiftIdRef: 1 });
timesheetSchema.index({ participantId: 1 });
timesheetSchema.index({ workerId: 1 });
timesheetSchema.index({ organizationId: 1 });
timesheetSchema.index({ status: 1 });
timesheetSchema.index({ invoiceId: 1 });
timesheetSchema.index({ isPaid: 1 });
timesheetSchema.index({ actualStartTime: 1 });

/**
 * Create and export the Timesheet model
 */
const Timesheet = mongoose.model<ITimesheet>('Timesheet', timesheetSchema);

export default Timesheet;