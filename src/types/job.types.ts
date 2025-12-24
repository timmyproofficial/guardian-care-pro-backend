/**
 * Job Module Types
 * Types and interfaces for the Job module
 */

import { Types } from 'mongoose';

/**
 * Job Role Enum
 */
export enum JobRole {
  SUPPORT_WORKER = 'Support Worker',
  YOUTH_WORKER = 'Youth Worker',
  NURSING_ASSISTANT = 'Nursing Assistant',
  CLEANER = 'Cleaner',
  HANDY_PERSON = 'Handy Person',
}

/**
 * Job Type Enum
 */
export enum JobType {
  FULL_TIME = 'fullTime',
  HYBRID = 'hybrid',
  CONTRACT = 'contract',
  REMOTE = 'remote',
}

/**
 * Job Status Enum
 */
export enum JobStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
  DRAFT = 'draft',
}

/**
 * Application Status Enum
 */
export enum ApplicationStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  SHORTLISTED = 'shortlisted',
  REJECTED = 'rejected',
  ACCEPTED = 'accepted',
}

/**
 * Required Competencies Interface
 * All fields are boolean checkboxes
 */
export interface IRequiredCompetencies {
  rightToWorkInAustralia: boolean;
  ndisWorkerScreeningCheck: boolean;
  wwcc: boolean;
  policeCheck: boolean;
  firstAid: boolean;
  cpr: boolean;
  ahpraRegistration: boolean;
  professionalIndemnityInsurance: boolean;
  covidVaccinationStatus: boolean;
}

/**
 * Job Attachment Interface
 */
export interface IJobAttachment {
  fieldName: string; // 'resume' or 'coverLetter'
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
}

/**
 * Job Interface
 */
import { IState } from '../models/location/state.model';
import { IRegion } from '../models/location/region.model';
import { IServiceArea } from '../models/location/serviceArea.model';

export interface IJob {
  _id: Types.ObjectId;
  postedBy: Types.ObjectId;
  postedByType: 'participant' | 'provider';
  jobRole: JobRole;
  jobDescription: string;
  keyResponsibilities: string; // Markdown content
  requiredCompetencies: IRequiredCompetencies;
  location: string;
  stateId: Types.ObjectId;
  regionId: Types.ObjectId;
  serviceAreaIds?: Types.ObjectId[]; // Optional array of service area IDs
  price: number;
  jobType: JobType;
  additionalNote?: string;
  status: JobStatus;
  isDeleted: boolean;
  deletedAt?: Date;
  applicationCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Job Application Interface
 */
export interface IJobApplication {
  _id: Types.ObjectId;
  jobId: Types.ObjectId;
  applicantId?: Types.ObjectId; // Optional - if user is logged in
  fullName: string;
  email: string;
  phone: string;
  location: string;
  attachments: IJobAttachment[];
  status: ApplicationStatus;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Saved Job Interface
 */
export interface ISavedJob {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  jobId: Types.ObjectId;
  savedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create Job Input
 */
export interface CreateJobInput {
  jobRole: JobRole;
  jobDescription: string;
  keyResponsibilities: string;
  requiredCompetencies: IRequiredCompetencies;
  location: string;
  stateId: Types.ObjectId;
  regionId: Types.ObjectId;
  serviceAreaIds?: Types.ObjectId[];
  price: number;
  jobType: JobType;
  additionalNote?: string;
  status?: JobStatus;
}

/**
 * Update Job Input
 */
export interface UpdateJobInput {
  jobRole?: JobRole;
  jobDescription?: string;
  keyResponsibilities?: string;
  requiredCompetencies?: Partial<IRequiredCompetencies>;
  location?: string;
  stateId?: Types.ObjectId;
  regionId?: Types.ObjectId;
  serviceAreaIds?: Types.ObjectId[];
  price?: number;
  jobType?: JobType;
  additionalNote?: string;
  status?: JobStatus;
}

/**
 * Job Application Input
 */
export interface JobApplicationInput {
  fullName: string;
  email: string;
  phone: string;
  location: string;
}

/**
 * Job Search/Filter Params
 */
export interface JobSearchParams {
  jobRole?: JobRole;
  jobType?: JobType;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: JobStatus;
  postedBy?: Types.ObjectId;
  postedByType?: 'participant' | 'provider';
  search?: string; // Search in description, responsibilities
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'price' | 'applicationCount';
  sortOrder?: 'asc' | 'desc';
  stateId?: Types.ObjectId;
  regionId?: Types.ObjectId;
  serviceAreaIds?: Types.ObjectId[];
}

/**
 * Job Response with Poster Info
 */
export interface JobWithPoster extends Omit<IJob, 'postedBy' | 'stateId' | 'regionId' | 'serviceAreaIds'> {
  postedBy: {
    _id: Types.ObjectId;
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
  state: IState;
  region: IRegion;
  serviceAreas?: IServiceArea[];
}

