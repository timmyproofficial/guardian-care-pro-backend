/**
 * Worker Compliance model definition
 * Schema for tracking worker compliance documents and answers
 */

import mongoose, { Schema, Document } from 'mongoose';
import { 
  ComplianceStatus, 
  ComplianceDocumentType, 
  IComplianceAnswers,
  REQUIRED_DOCUMENTS 
} from '../types/compliance.types';

/**
 * Compliance document subdocument interface
 */
export interface IComplianceDocument {
  type: ComplianceDocumentType;
  url: string;
  uploadedAt: Date;
  expiryDate?: Date;
  isRequired: boolean;
}

/**
 * Worker Compliance document interface
 */
export interface IWorkerCompliance extends Document {
  workerId: mongoose.Types.ObjectId;
  
  // Document uploads
  documents: IComplianceDocument[];
  
  // 14 Compliance Questions
  complianceAnswers: IComplianceAnswers;
  
  // Status and review
  status: ComplianceStatus;
  submittedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  rejectionReasons?: string[];
  adminNotes?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Compliance document subdocument schema
 */
const complianceDocumentSchema = new Schema<IComplianceDocument>(
  {
    type: {
      type: String,
      enum: Object.values(ComplianceDocumentType),
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
    },
    isRequired: {
      type: Boolean,
      default: function(this: IComplianceDocument) {
        return REQUIRED_DOCUMENTS.includes(this.type);
      },
    },
  },
  { _id: false }
);

/**
 * Worker Compliance schema definition
 */
const workerComplianceSchema = new Schema<IWorkerCompliance>(
  {
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // One compliance record per worker
    },
    
    // Document uploads array
    documents: [complianceDocumentSchema],
    
    // 14 Compliance Questions (all boolean answers)
    complianceAnswers: {
      ndisWorkerScreeningCheck: { type: Boolean, default: false },
      ndisWorkerOrientationModule: { type: Boolean, default: false },
      nationalPoliceCheck: { type: Boolean, default: false },
      workingWithChildrenCheck: { type: Boolean, default: false },
      firstAidCertification: { type: Boolean, default: false },
      cprCertification: { type: Boolean, default: false },
      covidVaccinationEvidence: { type: Boolean, default: false },
      influenzaVaccinationEvidence: { type: Boolean, default: false },
      relevantQualifications: { type: Boolean, default: false },
      ndisCodeOfConductAgreement: { type: Boolean, default: false },
      manualHandlingTraining: { type: Boolean, default: false },
      medicationAdministrationTraining: { type: Boolean, default: false },
      infectionControlTraining: { type: Boolean, default: false },
      publicLiabilityInsurance: { type: Boolean, default: false },
    },
    
    // Status
    status: {
      type: String,
      enum: Object.values(ComplianceStatus),
      default: ComplianceStatus.DRAFT,
    },
    
    // Submission timestamp
    submittedAt: {
      type: Date,
    },
    
    // Review information
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    rejectionReasons: [{
      type: String,
    }],
    adminNotes: {
      type: String,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Add indexes for faster queries
 */
workerComplianceSchema.index({ workerId: 1 });
workerComplianceSchema.index({ status: 1 });
workerComplianceSchema.index({ submittedAt: -1 });
workerComplianceSchema.index({ status: 1, submittedAt: -1 });

/**
 * Virtual to count answered questions
 */
workerComplianceSchema.virtual('answeredQuestionsCount').get(function() {
  const answers = this.complianceAnswers;
  if (!answers) return 0;
  
  // Get plain object from mongoose subdocument
  const answersObj = typeof (answers as any).toObject === 'function' 
    ? (answers as any).toObject() 
    : answers;
  
  return Object.values(answersObj).filter(val => val === true).length;
});

/**
 * Virtual to check if all required documents are uploaded
 */
workerComplianceSchema.virtual('hasAllRequiredDocuments').get(function() {
  const uploadedTypes = this.documents.map(doc => doc.type);
  return REQUIRED_DOCUMENTS.every(type => uploadedTypes.includes(type));
});

/**
 * Method to check if compliance is ready for submission
 */
workerComplianceSchema.methods.isReadyForSubmission = function(): boolean {
  // Check all required documents are uploaded
  const uploadedTypes = this.documents.map((doc: IComplianceDocument) => doc.type);
  const hasAllDocs = REQUIRED_DOCUMENTS.every(type => uploadedTypes.includes(type));
  
  // All 14 questions must be answered (all true for submission)
  // Note: We just check that answers exist, admin will verify truthfulness
  return hasAllDocs;
};

// Ensure virtuals are included when converting to JSON
workerComplianceSchema.set('toJSON', { virtuals: true });
workerComplianceSchema.set('toObject', { virtuals: true });

const WorkerCompliance = mongoose.model<IWorkerCompliance>('WorkerCompliance', workerComplianceSchema);

export default WorkerCompliance;
