/**
 * Batch Invoice model definition
 * Schema for consolidated invoices generated from multiple timesheets
 */

import mongoose, { Document, Schema } from 'mongoose';

/**
 * Batch status enumeration
 */
export enum BatchStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PARTIALLY_COMPLETED = 'partiallyCompleted'
}

/**
 * Batch invoice document interface
 */
export interface IBatchInvoice extends Document {
  _id: mongoose.Types.ObjectId;
  batchNumber: string;              // Unique batch identifier
  workerId: mongoose.Types.ObjectId; // Worker this batch is for
  participantId: mongoose.Types.ObjectId; // Participant this batch is for
  
  // Batch details
  startDate: Date;                 // Start of the period covered
  endDate: Date;                   // End of the period covered
  
  // Invoice details
  invoiceNumber: string;           // Generated invoice number
  timesheetIds: mongoose.Types.ObjectId[]; // Timesheets included in this batch
  
  // Status tracking
  status: BatchStatus;
  generatedAt: Date;               // When the batch was processed
  failureReason?: string;          // If processing failed
  
  // Email status
  sentToParticipant: boolean;
  participantEmailSentAt?: Date;
  sentToWorker: boolean;
  workerEmailSentAt?: Date;
  
  // Totals
  subtotal: number;                // Services total
  travelExpenseTotal: number;      // Travel expenses total
  invoiceTotal: number;            // Total amount (subtotal + travel)
  additionalExpensesTotal: number; // Additional expenses (not included in invoice total)
  
  // File paths
  pdfPath?: string;                // Path to the generated PDF
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Batch Invoice schema definition
 */
const batchInvoiceSchema = new Schema<IBatchInvoice>(
  {
    batchNumber: {
      type: String,
      required: true,
      unique: true
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    invoiceNumber: {
      type: String,
      required: true
    },
    timesheetIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Timesheet',
      required: true
    }],
    status: {
      type: String,
      enum: Object.values(BatchStatus),
      default: BatchStatus.PENDING
    },
    generatedAt: {
      type: Date,
      default: Date.now
    },
    failureReason: {
      type: String
    },
    sentToParticipant: {
      type: Boolean,
      default: false
    },
    participantEmailSentAt: {
      type: Date
    },
    sentToWorker: {
      type: Boolean,
      default: false
    },
    workerEmailSentAt: {
      type: Date
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    travelExpenseTotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    invoiceTotal: {
      type: Number,
      required: true,
      min: 0
    },
    additionalExpensesTotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    pdfPath: {
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
batchInvoiceSchema.index({ batchNumber: 1 }, { unique: true });
batchInvoiceSchema.index({ workerId: 1 });
batchInvoiceSchema.index({ participantId: 1 });
batchInvoiceSchema.index({ status: 1 });
batchInvoiceSchema.index({ startDate: 1, endDate: 1 });

/**
 * Create and export the Batch Invoice model
 */
const BatchInvoice = mongoose.model<IBatchInvoice>('BatchInvoice', batchInvoiceSchema);

export default BatchInvoice;