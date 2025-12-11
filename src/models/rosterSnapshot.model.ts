/**
 * Roster Snapshot model definition
 * Tracks uploaded roster files and processing status
 */

import mongoose, { Document, Schema } from 'mongoose';
import { RosterFileType, ProcessingStatus } from '../types/roster.types';

/**
 * Roster Snapshot document interface
 */
export interface IRosterSnapshot extends Document {
  _id: mongoose.Types.ObjectId;
  providerId: mongoose.Types.ObjectId;
  
  // File metadata
  fileName: string;
  fileType: RosterFileType;
  fileSizeBytes: number;
  fileStoragePath: string;
  
  // Processing status
  processingStatus: ProcessingStatus;
  processingStartedAt?: Date;
  processingCompletedAt?: Date;
  processingErrorMessage?: string;
  
  // Parsing results
  totalShiftsDetected: number;
  shiftsSuccessfullyParsed: number;
  shiftsFailedParsing: number;
  newWorkersCreated: number;
  newParticipantsCreated: number;
  existingWorkersMatched: number;
  existingParticipantsMatched: number;
  
  // Roster period
  rosterPeriodStart?: Date;
  rosterPeriodEnd?: Date;
  notes?: string;
  
  // Uploaded by
  uploadedBy: mongoose.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Roster Snapshot schema definition
 */
const rosterSnapshotSchema = new Schema<IRosterSnapshot>(
  {
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    
    // File metadata
    fileName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    fileType: {
      type: String,
      enum: Object.values(RosterFileType),
      required: true
    },
    fileSizeBytes: {
      type: Number,
      required: true,
      min: 0
    },
    fileStoragePath: {
      type: String,
      required: true
    },
    
    // Processing status
    processingStatus: {
      type: String,
      enum: Object.values(ProcessingStatus),
      default: ProcessingStatus.PENDING
    },
    processingStartedAt: {
      type: Date
    },
    processingCompletedAt: {
      type: Date
    },
    processingErrorMessage: {
      type: String,
      maxlength: 2000
    },
    
    // Parsing results
    totalShiftsDetected: {
      type: Number,
      default: 0,
      min: 0
    },
    shiftsSuccessfullyParsed: {
      type: Number,
      default: 0,
      min: 0
    },
    shiftsFailedParsing: {
      type: Number,
      default: 0,
      min: 0
    },
    newWorkersCreated: {
      type: Number,
      default: 0,
      min: 0
    },
    newParticipantsCreated: {
      type: Number,
      default: 0,
      min: 0
    },
    existingWorkersMatched: {
      type: Number,
      default: 0,
      min: 0
    },
    existingParticipantsMatched: {
      type: Number,
      default: 0,
      min: 0
    },
    
    // Roster period
    rosterPeriodStart: {
      type: Date
    },
    rosterPeriodEnd: {
      type: Date
    },
    notes: {
      type: String,
      maxlength: 1000
    },
    
    // Uploaded by
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

/**
 * Add indexes for faster queries
 */
rosterSnapshotSchema.index({ providerId: 1, createdAt: -1 });
rosterSnapshotSchema.index({ processingStatus: 1 });
rosterSnapshotSchema.index({ rosterPeriodStart: 1, rosterPeriodEnd: 1 });

/**
 * Create and export the RosterSnapshot model
 */
const RosterSnapshot = mongoose.model<IRosterSnapshot>('RosterSnapshot', rosterSnapshotSchema);

export default RosterSnapshot;

