/**
 * Invoice model definition
 * Schema for invoices generated from approved timesheets
 */

import mongoose, { Document, Schema } from 'mongoose';

/**
 * Work item interface
 * Represents a billable line item on an invoice
 */
export interface WorkItem {
  description: string;
  rateTimeBandId: mongoose.Types.ObjectId;
  rateTimeBandName: string;
  rateTimeBandCode: string;
  serviceType: string;
  serviceTypeName?: string;
  serviceTypeCode?: string;
  hourlyRate: number;
  hours: number;
  amount: number;
}

/**
 * Travel expense interface
 * For distance travel charges
 */
export interface TravelExpense {
  distanceTravelKm: number;
  distanceTravelRate: number;
  distanceTravelAmount: number;
}

/**
 * Expense item interface
 * For additional expenses on the invoice
 */
export interface ExpenseItem {
  title: string;
  description: string;
  amount: number;
  receiptUrl?: string;
}

/**
 * Invoice document interface
 * Defines the structure of an invoice document
 */
export interface IInvoice extends Document {
  _id: mongoose.Types.ObjectId;
  invoiceNumber: string;             // Unique invoice identifier (e.g., INV-20250620-A1B2C)
  timesheetId: mongoose.Types.ObjectId; // Reference to the timesheet
  shiftId: mongoose.Types.ObjectId;  // Reference to the shift
  organizationId: mongoose.Types.ObjectId; // Reference to the organization
  
  // Invoice participants
  participantId: mongoose.Types.ObjectId;  // Invoice recipient
  participantDetails: {
    name: string;               // Full name
    email: string;
    phone: string;
    ndisNumber?: string;        // NDIS number if available
    address?: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
  
  workerId: mongoose.Types.ObjectId;  // Service provider
  workerDetails: {
    name: string;               // Full name
    email: string;
    phone: string;
    abn?: string;               // ABN if available
    bankDetails?: {
      accountName: string;
      bsb: string;
      accountNumber: string;
    };
  };
  
  // Invoice details
  invoiceDate: Date;            // Date invoice was generated
  dueDate?: Date;               // Optional payment due date
  
  // Line items
  workItems: WorkItem[];        // Billable work items
  travelExpense?: TravelExpense; // Distance travel expenses
  expenses?: ExpenseItem[];      // Additional expenses
  
  // Totals
  subtotal: number;             // Total for services before expenses
  expensesTotal?: number;        // Total expenses amount
  totalAmount: number;          // Grand total
  
  // Status tracking
  sentToParticipant: boolean;   // Whether invoice has been sent
  sentDate?: Date;              // When the invoice was sent
  
  // Notes
  notes?: string;               // Any additional notes
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Invoice schema definition
 */
const invoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true
    },
    timesheetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Timesheet',
      required: true
    },
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift',
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
    participantDetails: {
      name: {
        type: String,
        required: true
      },
      email: {
        type: String,
        required: true
      },
      phone: {
        type: String,
        required: true
      },
      ndisNumber: {
        type: String
      },
      address: {
        street: String,
        city: String,
        state: String,
        postalCode: String,
        country: String
      }
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    workerDetails: {
      name: {
        type: String,
        required: true
      },
      email: {
        type: String,
        required: true
      },
      phone: {
        type: String,
        required: true
      },
      abn: {
        type: String
      },
      bankDetails: {
        accountName: String,
        bsb: String,
        accountNumber: String
      }
    },
    invoiceDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    dueDate: {
      type: Date
    },
    workItems: [{
      description: {
        type: String,
        required: true
      },
      rateTimeBandId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RateTimeBand',
        required: true
      },
      rateTimeBandName: {
        type: String,
        required: true
      },
      rateTimeBandCode: {
        type: String,
        required: true
      },
      serviceType: {
        type: String,
        required: true
      },
      serviceTypeName: {
        type: String
      },
      serviceTypeCode: {
        type: String
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
    travelExpense: {
      distanceTravelKm: {
        type: Number,
        min: 0
      },
      distanceTravelRate: {
        type: Number,
        min: 0
      },
      distanceTravelAmount: {
        type: Number,
        min: 0
      }
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
      }
    }],
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    expensesTotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    sentToParticipant: {
      type: Boolean,
      default: false
    },
    sentDate: {
      type: Date
    },
    notes: {
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
invoiceSchema.index({ invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ timesheetId: 1 }, { unique: true });
invoiceSchema.index({ participantId: 1 });
invoiceSchema.index({ workerId: 1 });
invoiceSchema.index({ organizationId: 1 });
invoiceSchema.index({ invoiceDate: 1 });
invoiceSchema.index({ sentToParticipant: 1 });

/**
 * Create and export the Invoice model
 */
const Invoice = mongoose.model<IInvoice>('Invoice', invoiceSchema);

export default Invoice;