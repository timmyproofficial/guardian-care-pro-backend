/**
 * Compliance service
 * Handles business logic for worker compliance submissions and reviews
 */

import mongoose from 'mongoose';
import httpStatus from 'http-status';
import WorkerCompliance, { IWorkerCompliance } from '../models/workerCompliance.model';
import Worker from '../models/worker.model';
import ApiError from '../utils/api-error';
import { 
  ComplianceStatus, 
  ComplianceDocumentType, 
  IComplianceAnswers,
  REQUIRED_DOCUMENTS 
} from '../types/compliance.types';
import { deleteComplianceDocument } from '../utils/cloudinary';

/**
 * Compliance service implementation
 */
export const complianceService = {
  /**
   * Get or create compliance record for a worker
   */
  async getOrCreateCompliance(workerId: string): Promise<IWorkerCompliance> {
    // Validate workerId
    if (!mongoose.Types.ObjectId.isValid(workerId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid workerId');
    }

    // Check if worker exists and has completed onboarding
    const worker = await Worker.findById(workerId);
    if (!worker) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Worker not found');
    }
    if (!worker.verificationStatus.onboardingComplete) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Worker must complete onboarding before submitting compliance');
    }

    // Get or create compliance record
    let compliance = await WorkerCompliance.findOne({ workerId });
    if (!compliance) {
      compliance = await WorkerCompliance.create({
        workerId: new mongoose.Types.ObjectId(workerId),
        documents: [],
        complianceAnswers: {
          ndisWorkerScreeningCheck: false,
          ndisWorkerOrientationModule: false,
          nationalPoliceCheck: false,
          workingWithChildrenCheck: false,
          firstAidCertification: false,
          cprCertification: false,
          covidVaccinationEvidence: false,
          influenzaVaccinationEvidence: false,
          relevantQualifications: false,
          ndisCodeOfConductAgreement: false,
          manualHandlingTraining: false,
          medicationAdministrationTraining: false,
          infectionControlTraining: false,
          publicLiabilityInsurance: false,
        },
        status: ComplianceStatus.DRAFT,
      });
    }

    return compliance;
  },

  /**
   * Get compliance by worker ID
   */
  async getComplianceByWorkerId(workerId: string): Promise<IWorkerCompliance | null> {
    if (!mongoose.Types.ObjectId.isValid(workerId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid workerId');
    }

    return WorkerCompliance.findOne({ workerId })
      .populate('workerId', 'firstName lastName email profileImage')
      .populate('reviewedBy', 'firstName lastName email');
  },

  /**
   * Update compliance answers
   */
  async updateComplianceAnswers(
    workerId: string,
    answers: Partial<IComplianceAnswers>
  ): Promise<IWorkerCompliance> {
    const compliance = await this.getOrCreateCompliance(workerId);

    // Don't allow updates if already approved
    if (compliance.status === ComplianceStatus.APPROVED) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot modify approved compliance');
    }

    // Update only provided answers
    Object.keys(answers).forEach((key) => {
      const answerKey = key as keyof IComplianceAnswers;
      if (answers[answerKey] !== undefined) {
        (compliance.complianceAnswers as any)[answerKey] = answers[answerKey];
      }
    });

    // Reset to draft if was rejected
    if (compliance.status === ComplianceStatus.REJECTED) {
      compliance.status = ComplianceStatus.DRAFT;
      compliance.rejectionReasons = [];
    }

    await compliance.save();
    return compliance;
  },

  /**
   * Add or update a document
   */
  async uploadDocument(
    workerId: string,
    documentType: ComplianceDocumentType,
    url: string,
    expiryDate?: Date
  ): Promise<IWorkerCompliance> {
    const compliance = await this.getOrCreateCompliance(workerId);

    // Don't allow updates if already approved
    if (compliance.status === ComplianceStatus.APPROVED) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot modify approved compliance');
    }

    // Check if document of this type already exists
    const existingDocIndex = compliance.documents.findIndex(
      (doc) => doc.type === documentType
    );

    const documentData = {
      type: documentType,
      url,
      uploadedAt: new Date(),
      expiryDate,
      isRequired: REQUIRED_DOCUMENTS.includes(documentType),
    };

    if (existingDocIndex >= 0) {
      // Update existing document
      compliance.documents[existingDocIndex] = documentData;
    } else {
      // Add new document
      compliance.documents.push(documentData);
    }

    // Reset to draft if was rejected
    if (compliance.status === ComplianceStatus.REJECTED) {
      compliance.status = ComplianceStatus.DRAFT;
      compliance.rejectionReasons = [];
    }

    await compliance.save();
    return compliance;
  },

  /**
   * Submit compliance with documents and answers in a single request
   */
  async submitComplianceWithDocuments(
    workerId: string,
    data: {
      complianceAnswers: IComplianceAnswers;
      documents: {
        type: ComplianceDocumentType;
        url: string;
        expiryDate?: Date;
      }[];
    }
  ): Promise<IWorkerCompliance> {
    const compliance = await this.getOrCreateCompliance(workerId);

    // Check if already pending or approved
    if (compliance.status === ComplianceStatus.PENDING) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Compliance already submitted and pending review');
    }
    if (compliance.status === ComplianceStatus.APPROVED) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Compliance already approved');
    }

    // Update compliance answers
    Object.keys(data.complianceAnswers).forEach((key) => {
      const answerKey = key as keyof IComplianceAnswers;
      if (data.complianceAnswers[answerKey] !== undefined) {
        (compliance.complianceAnswers as any)[answerKey] = data.complianceAnswers[answerKey];
      }
    });

    // Add/update documents
    for (const doc of data.documents) {
      const existingDocIndex = compliance.documents.findIndex(
        (existing) => existing.type === doc.type
      );

      const documentData = {
        type: doc.type,
        url: doc.url,
        uploadedAt: new Date(),
        expiryDate: doc.expiryDate,
        isRequired: REQUIRED_DOCUMENTS.includes(doc.type),
      };

      if (existingDocIndex >= 0) {
        compliance.documents[existingDocIndex] = documentData;
      } else {
        compliance.documents.push(documentData);
      }
    }

    // Validate all required documents are present
    const uploadedTypes = compliance.documents.map((doc) => doc.type);
    const missingDocs = REQUIRED_DOCUMENTS.filter(
      (type) => !uploadedTypes.includes(type)
    );

    if (missingDocs.length > 0) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Missing required documents: ${missingDocs.join(', ')}`
      );
    }

    // Update status to pending
    compliance.status = ComplianceStatus.PENDING;
    compliance.submittedAt = new Date();
    compliance.rejectionReasons = [];

    await compliance.save();

    // Update worker's compliance status
    await Worker.findByIdAndUpdate(workerId, {
      'verificationStatus.complianceStatus': 'pending',
    });

    const result = await WorkerCompliance.findById(compliance._id)
      .populate('workerId', 'firstName lastName email profileImage phone');
    return result!;
  },

  /**
   * Submit compliance for review (legacy - requires documents already uploaded)
   */
  async submitCompliance(workerId: string): Promise<IWorkerCompliance> {
    const compliance = await this.getOrCreateCompliance(workerId);

    // Check if already pending or approved
    if (compliance.status === ComplianceStatus.PENDING) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Compliance already submitted and pending review');
    }
    if (compliance.status === ComplianceStatus.APPROVED) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Compliance already approved');
    }

    // Validate all required documents are uploaded
    const uploadedTypes = compliance.documents.map((doc) => doc.type);
    const missingDocs = REQUIRED_DOCUMENTS.filter(
      (type) => !uploadedTypes.includes(type)
    );

    if (missingDocs.length > 0) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Missing required documents: ${missingDocs.join(', ')}`
      );
    }

    // Update status
    compliance.status = ComplianceStatus.PENDING;
    compliance.submittedAt = new Date();
    await compliance.save();

    // Update worker's compliance status
    await Worker.findByIdAndUpdate(workerId, {
      'verificationStatus.complianceStatus': 'pending',
    });

    return compliance;
  },

  /**
   * Get pending compliances (admin)
   */
  async getPendingCompliances(
    filter: {
      status?: ComplianceStatus;
      search?: string;
    } = {},
    options: {
      page?: number;
      limit?: number;
      sortBy?: string;
    } = {}
  ): Promise<{
    compliances: IWorkerCompliance[];
    page: number;
    limit: number;
    totalPages: number;
    totalResults: number;
  }> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};
    
    if (filter.status) {
      query.status = filter.status;
    } else {
      // Default to pending
      query.status = ComplianceStatus.PENDING;
    }

    // Get total count
    const totalResults = await WorkerCompliance.countDocuments(query);
    const totalPages = Math.ceil(totalResults / limit);

    // Get compliances
    let sortOption: any = { submittedAt: -1 };
    if (options.sortBy) {
      const [field, order] = options.sortBy.split(':');
      sortOption = { [field]: order === 'desc' ? -1 : 1 };
    }

    const compliances = await WorkerCompliance.find(query)
      .populate('workerId', 'firstName lastName email profileImage phone')
      .populate('reviewedBy', 'firstName lastName email')
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    return {
      compliances,
      page,
      limit,
      totalPages,
      totalResults,
    };
  },

  /**
   * Get compliance by ID (admin)
   */
  async getComplianceById(complianceId: string): Promise<IWorkerCompliance | null> {
    if (!mongoose.Types.ObjectId.isValid(complianceId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid complianceId');
    }

    return WorkerCompliance.findById(complianceId)
      .populate('workerId', 'firstName lastName email profileImage phone')
      .populate('reviewedBy', 'firstName lastName email');
  },

  /**
   * Review compliance (admin approve/reject)
   */
  async reviewCompliance(
    complianceId: string,
    adminId: string,
    decision: 'approved' | 'rejected',
    rejectionReasons?: string[],
    adminNotes?: string
  ): Promise<IWorkerCompliance> {
    if (!mongoose.Types.ObjectId.isValid(complianceId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid complianceId');
    }
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid adminId');
    }

    const compliance = await WorkerCompliance.findById(complianceId);
    if (!compliance) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Compliance not found');
    }

    // Only pending compliances can be reviewed
    if (compliance.status !== ComplianceStatus.PENDING) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Only pending compliances can be reviewed'
      );
    }

    // Rejection requires reasons
    if (decision === 'rejected' && (!rejectionReasons || rejectionReasons.length === 0)) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Rejection reasons are required when rejecting compliance'
      );
    }

    // Update compliance
    compliance.status = decision === 'approved' 
      ? ComplianceStatus.APPROVED 
      : ComplianceStatus.REJECTED;
    compliance.reviewedBy = new mongoose.Types.ObjectId(adminId);
    compliance.reviewedAt = new Date();
    
    if (decision === 'rejected') {
      compliance.rejectionReasons = rejectionReasons;
      
      // Delete all uploaded documents from Cloudinary
      // This allows the worker to upload fresh documents when resubmitting
      if (compliance.documents && compliance.documents.length > 0) {
        const deletePromises = compliance.documents.map(doc => 
          deleteComplianceDocument(doc.url).catch(err => {
            // Log but don't fail the entire operation if one document fails to delete
            console.error(`Failed to delete document ${doc.type}:`, err);
            return { result: 'error', error: err };
          })
        );
        await Promise.all(deletePromises);
        
        // Clear the documents array so worker can re-upload
        compliance.documents = [];
      }
    }
    if (adminNotes) {
      compliance.adminNotes = adminNotes;
    }

    await compliance.save();

    // Update worker's compliance status
    await Worker.findByIdAndUpdate(compliance.workerId, {
      'verificationStatus.complianceStatus': decision,
    });

    return WorkerCompliance.findById(complianceId)
      .populate('workerId', 'firstName lastName email profileImage phone')
      .populate('reviewedBy', 'firstName lastName email') as Promise<IWorkerCompliance>;
  },

  /**
   * Get compliance statistics (admin dashboard)
   */
  async getComplianceStatistics(): Promise<{
    total: number;
    draft: number;
    pending: number;
    approved: number;
    rejected: number;
  }> {
    const stats = await WorkerCompliance.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const result = {
      total: 0,
      draft: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
    };

    stats.forEach((stat) => {
      result[stat._id as keyof typeof result] = stat.count;
      result.total += stat.count;
    });

    return result;
  },
};
