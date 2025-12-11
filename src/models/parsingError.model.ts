/**
 * Parsing Error model definition
 * Captures parsing failures for manual review and quality improvement
 */

import mongoose, { Document, Schema } from 'mongoose';

/**
 * Parsing Error document interface
 */
export interface IParsingError extends Document {
  _id: mongoose.Types.ObjectId;
  
  snapshotId: mongoose.Types.ObjectId;
  
  // Error location
  rowNumber?: number;
  columnName?: string;
  rawValue?: string;
  
  // Error classification
  errorType: string;
  errorMessage: string;
  suggestedCorrection?: string;
  
  // Resolution
  manuallyReviewed: boolean;
  manuallyCorrectedValue?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  
  createdAt: Date;
}

/**
 * Common error types for classification
 */
export const PARSING_ERROR_TYPES = {
  DATE_FORMAT_INVALID: 'date_format_invalid',
  TIME_FORMAT_INVALID: 'time_format_invalid',
  WORKER_NOT_FOUND: 'worker_not_found',
  PARTICIPANT_NOT_FOUND: 'participant_not_found',
  AMBIGUOUS_TIME: 'ambiguous_time',
  AMBIGUOUS_DATE: 'ambiguous_date',
  OCR_CONFIDENCE_LOW: 'ocr_confidence_low',
  MISSING_REQUIRED_FIELD: 'missing_required_field',
  INVALID_PHONE_FORMAT: 'invalid_phone_format',
  INVALID_NDIS_NUMBER: 'invalid_ndis_number',
  DUPLICATE_SHIFT: 'duplicate_shift',
  OVERLAPPING_SHIFT: 'overlapping_shift',
  INVALID_DURATION: 'invalid_duration',
  UNKNOWN_SERVICE_TYPE: 'unknown_service_type',
  GENERAL_PARSE_ERROR: 'general_parse_error'
};

/**
 * Parsing Error schema definition
 */
const parsingErrorSchema = new Schema<IParsingError>(
  {
    snapshotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RosterSnapshot',
      required: true,
      index: true
    },
    
    // Error location
    rowNumber: {
      type: Number,
      min: 1
    },
    columnName: {
      type: String,
      trim: true
    },
    rawValue: {
      type: String,
      maxlength: 1000
    },
    
    // Error classification
    errorType: {
      type: String,
      required: true,
      trim: true
    },
    errorMessage: {
      type: String,
      required: true,
      maxlength: 2000
    },
    suggestedCorrection: {
      type: String,
      maxlength: 1000
    },
    
    // Resolution
    manuallyReviewed: {
      type: Boolean,
      default: false,
      index: true
    },
    manuallyCorrectedValue: {
      type: String,
      maxlength: 1000
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: {
      type: Date
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

/**
 * Add indexes for faster queries
 */
parsingErrorSchema.index({ snapshotId: 1, rowNumber: 1 });

// Partial index for unreviewed errors
parsingErrorSchema.index(
  { snapshotId: 1 },
  {
    partialFilterExpression: { manuallyReviewed: false },
    name: 'idx_unreviewed_errors'
  }
);

parsingErrorSchema.index({ errorType: 1 });

/**
 * Create and export the ParsingError model
 */
const ParsingError = mongoose.model<IParsingError>('ParsingError', parsingErrorSchema);

export default ParsingError;

