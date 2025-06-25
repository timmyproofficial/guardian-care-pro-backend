/**
 * Batch Processing History model definition
 * Schema for tracking batch invoice generation runs
 */

import mongoose, { Document, Schema } from 'mongoose';

/**
 * Batch run type enumeration
 */
export enum BatchRunType {
  SCHEDULED = 'scheduled',
  MANUAL = 'manual'
}

/**
 * Batch run status enumeration
 */
export enum BatchRunStatus {
  STARTED = 'started',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PARTIALLY_COMPLETED = 'partiallyCompleted'
}

/**
 * Batch processing history document interface
 */
export interface IBatchProcessingHistory extends Document {
  _id: mongoose.Types.ObjectId;
  
  // Run details
  runId: string;                   // Unique run identifier
  runType: BatchRunType;           // Scheduled or manual
  startDate: Date;                 // Period start date
  endDate: Date;                   // Period end date
  initiatedBy?: mongoose.Types.ObjectId; // User who initiated (for manual runs)
  
  // Processing details
  processingStartTime: Date;       // When processing started
  processingEndTime?: Date;        // When processing completed
  status: BatchRunStatus;          // Current status
  
  // Results
  totalTimesheetsProcessed: number;
  totalBatchesGenerated: number;
  totalWorkers: number;
  totalParticipants: number;
  totalErrors: number;
  
  // Errors and logs
  errorDetails?: string[];         // List of error messages
  processingLog?: string[];        // Processing log entries
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Batch Processing History schema definition
 */
const batchProcessingHistorySchema = new Schema<IBatchProcessingHistory>(
  {
    runId: {
      type: String,
      required: true,
      unique: true
    },
    runType: {
      type: String,
      enum: Object.values(BatchRunType),
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
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    processingStartTime: {
      type: Date,
      required: true,
      default: Date.now
    },
    processingEndTime: {
      type: Date
    },
    status: {
      type: String,
      enum: Object.values(BatchRunStatus),
      default: BatchRunStatus.STARTED
    },
    totalTimesheetsProcessed: {
      type: Number,
      default: 0
    },
    totalBatchesGenerated: {
      type: Number,
      default: 0
    },
    totalWorkers: {
      type: Number,
      default: 0
    },
    totalParticipants: {
      type: Number,
      default: 0
    },
    totalErrors: {
      type: Number,
      default: 0
    },
    errorDetails: [String],
    processingLog: [String]
  },
  {
    timestamps: true // Adds createdAt and updatedAt fields
  }
);

/**
 * Add indexes for faster queries
 */
batchProcessingHistorySchema.index({ runId: 1 }, { unique: true });
batchProcessingHistorySchema.index({ runType: 1 });
batchProcessingHistorySchema.index({ status: 1 });
batchProcessingHistorySchema.index({ processingStartTime: 1 });

/**
 * Create and export the Batch Processing History model
 */
const BatchProcessingHistory = 
    mongoose.model<IBatchProcessingHistory>('BatchProcessingHistory', batchProcessingHistorySchema);

export default BatchProcessingHistory;