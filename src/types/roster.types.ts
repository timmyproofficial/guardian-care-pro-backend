/**
 * Roster Lookup Table (RLT) Type Definitions
 * For Support24 NDIS support coordination platform
 * 
 * This module defines types for:
 * - Provider user type
 * - Roster snapshots (uploaded files)
 * - Shift references (core lookup table)
 * - Shift events (audit trail)
 * - Worker/Participant registries
 */

import mongoose from 'mongoose';

// ═══════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════

/**
 * Provider organization type classification
 */
export enum ProviderType {
  AGED_CARE = 'AGED_CARE',
  DISABILITY_SUPPORT = 'DISABILITY_SUPPORT',
  HOME_CARE = 'HOME_CARE',
  COMMUNITY_SUPPORT = 'COMMUNITY_SUPPORT'
}

/**
 * Provider subscription tier
 */
export enum ProviderSubscriptionTier {
  TRIAL = 'TRIAL',
  BASIC = 'BASIC',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE'
}

/**
 * Provider subscription status
 */
export enum ProviderSubscriptionStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED'
}

/**
 * Roster file types supported for upload
 */
export enum RosterFileType {
  CSV = 'csv',
  EXCEL = 'excel',
  PDF = 'pdf',
  IMAGE = 'image'
}

/**
 * Processing status for roster snapshots
 */
export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PARTIALLY_COMPLETED = 'partially_completed'
}

/**
 * Shift reference status tracking
 */
export enum ShiftReferenceStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  REPLACED = 'replaced',
  COMPLETED = 'completed',
  NO_SHOW = 'noShow'
}

/**
 * Shift event types for audit trail
 */
export enum ShiftEventType {
  CANCELLATION_REPORTED = 'cancellation_reported',
  REPLACEMENT_REQUESTED = 'replacement_requested',
  WORKER_BROADCAST_SENT = 'worker_broadcast_sent',
  REPLACEMENT_ACCEPTED = 'replacement_accepted',
  REPLACEMENT_DECLINED = 'replacement_declined',
  ESCALATION_TRIGGERED = 'escalation_triggered',
  SHIFT_CONFIRMED = 'shift_confirmed',
  SHIFT_COMPLETED = 'shift_completed',
  MANUAL_OVERRIDE = 'manual_override'
}

/**
 * Event trigger source identification
 */
export enum EventTriggerSource {
  WORKER_SMS = 'worker_sms',
  WORKER_WHATSAPP = 'worker_whatsapp',
  WORKER_CALL = 'worker_call',
  PROVIDER_PORTAL = 'provider_portal',
  SYSTEM_AUTOMATION = 'system_automation'
}

/**
 * Event resolution status
 */
export enum ResolutionStatus {
  PENDING = 'pending',
  RESOLVED = 'resolved',
  ESCALATED = 'escalated',
  FAILED = 'failed'
}

/**
 * Registry entry status (worker/participant)
 */
export enum RegistryStatus {
  LIGHTWEIGHT = 'lightweight',
  MATCHED = 'matched',
  INVITED = 'invited',
  ACTIVE = 'active'
}

/**
 * Cancellation reason categories
 */
export enum CancellationReason {
  SICK = 'sick',
  EMERGENCY = 'emergency',
  UNAVAILABLE = 'unavailable',
  TRANSPORT = 'transport',
  OTHER = 'other'
}

// ═══════════════════════════════════════════════════════════════
// INTERFACES - Provider
// ═══════════════════════════════════════════════════════════════

export interface ProviderSettings {
  autoCreateWorkers: boolean;
  autoCreateParticipants: boolean;
  requireWorkerApproval: boolean;
  enableAutoCancellationReplacement: boolean;
  smsNotifications: boolean;
}

export interface BusinessAddress {
  street: string;
  city: string;
  state: string;
  postcode: string;
}

// ═══════════════════════════════════════════════════════════════
// INTERFACES - Roster Snapshot
// ═══════════════════════════════════════════════════════════════

export interface RosterSnapshotInput {
  file: Express.Multer.File;
  rosterPeriodStart?: Date;
  rosterPeriodEnd?: Date;
  notes?: string;
}

export interface RosterSnapshotStats {
  totalShiftsDetected: number;
  shiftsSuccessfullyParsed: number;
  shiftsFailedParsing: number;
  newWorkersCreated: number;
  newParticipantsCreated: number;
  existingWorkersMatched: number;
  existingParticipantsMatched: number;
}

// ═══════════════════════════════════════════════════════════════
// INTERFACES - Shift Reference
// ═══════════════════════════════════════════════════════════════

export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface ParsingWarning {
  field: string;
  issue: string;
  originalValue?: string;
}

export interface ShiftReferenceSearchParams {
  providerId?: string;
  workerId?: string;
  workerName?: string;
  workerPhone?: string;
  participantId?: string;
  participantName?: string;
  shiftDate?: Date;
  shiftDateStart?: Date;
  shiftDateEnd?: Date;
  status?: ShiftReferenceStatus;
  locationPostcode?: string;
  requiredCompetencies?: string[];
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ═══════════════════════════════════════════════════════════════
// INTERFACES - Shift Events
// ═══════════════════════════════════════════════════════════════

export interface AIParsedEntity {
  value: string;
  confidence: number;
}

export interface AIParsedEntities {
  confidence: number;
  extractedDate?: AIParsedEntity;
  extractedTime?: AIParsedEntity;
  extractedParticipant?: AIParsedEntity;
}

export interface CancellationInput {
  shiftReferenceId?: string;
  workerPhone?: string;
  workerName?: string;
  participantName?: string;
  shiftDate?: string;
  shiftTime?: string;
  cancellationReason: CancellationReason;
  cancellationMessage?: string;
  noticeHours?: number;
  triggeredBy: EventTriggerSource;
  triggeredByPhone?: string;
  aiParsedEntities?: AIParsedEntities;
  autoTriggerReplacement?: boolean;
}

export interface EventPayload {
  cancellationReason?: string;
  noticeHours?: number;
  messageContent?: string;
  replacementWorkerId?: mongoose.Types.ObjectId;
  notificationsSentTo?: string[];
  aiParsingConfidence?: number;
  aiParsedEntities?: AIParsedEntities;
  [key: string]: any;
}

// ═══════════════════════════════════════════════════════════════
// INTERFACES - Replacement Finding
// ═══════════════════════════════════════════════════════════════

export interface ReplacementPreferences {
  excludeWorkerIds?: string[];
  maxDistanceKm?: number;
  minReliabilityScore?: number;
  preferPastExperience?: boolean;
  requireAllCompetencies?: boolean;
}

export interface FindReplacementInput {
  shiftReferenceId: string;
  preferences?: ReplacementPreferences;
  limit?: number;
}

export interface MatchBreakdown {
  competencies: number;
  location: number;
  availability: number;
  pastExperience: number;
  reliability: number;
}

export interface ReplacementCandidateDetails {
  distanceKm?: number;
  hasWorkedWithParticipant: boolean;
  pastShiftsWithParticipant?: number;
  lastShiftWithParticipant?: string;
  competencies: string[];
  isAvailable: boolean;
  conflictingShifts: string[];
  reliabilityScore?: number;
  totalShiftsCompleted?: number;
  totalShiftsCancelled?: number;
}

export interface ReplacementCandidate {
  workerId: string;
  workerName: string;
  phone?: string;
  email?: string;
  matchScore: number;
  matchBreakdown: MatchBreakdown;
  details: ReplacementCandidateDetails;
  recommendation: string;
}

// ═══════════════════════════════════════════════════════════════
// INTERFACES - Parsed Roster Data
// ═══════════════════════════════════════════════════════════════

export interface ParsedShiftRow {
  rowNumber: number;
  shiftDate?: Date;
  shiftStartTime?: string;
  shiftEndTime?: string;
  workerName?: string;
  workerPhone?: string;
  workerEmail?: string;
  workerExternalId?: string;
  participantName?: string;
  participantPhone?: string;
  participantNdis?: string;
  participantExternalId?: string;
  locationName?: string;
  locationAddress?: string;
  locationPostcode?: string;
  shiftType?: string;
  supportCategory?: string;
  notes?: string;
  requiredCompetencies?: string[];
  billingRate?: number;
  rawData: Record<string, any>;
  parsingWarnings: ParsingWarning[];
  isValid: boolean;
  validationErrors: string[];
}

export interface RosterParseResult {
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  parsedShifts: ParsedShiftRow[];
  errors: Array<{
    rowNumber?: number;
    columnName?: string;
    rawValue?: string;
    errorType: string;
    errorMessage: string;
  }>;
}

// ═══════════════════════════════════════════════════════════════
// COLUMN MAPPING CONFIGURATION
// ═══════════════════════════════════════════════════════════════

/**
 * Flexible column mapping configuration
 * Maps common column name variations to our internal field names
 * Case-insensitive matching
 */
export const COLUMN_MAPPINGS: Record<string, string[]> = {
  shiftDate: [
    'date', 'shift_date', 'day', 'roster_date', 'service_date', 
    'work_date', 'shift date', 'roster date', 'service date'
  ],
  shiftStart: [
    'start', 'start_time', 'from', 'shift_start', 'time_start', 
    'begin', 'start time', 'shift start', 'time start', 'begins'
  ],
  shiftEnd: [
    'end', 'end_time', 'to', 'finish', 'shift_end', 'time_end', 
    'end time', 'shift end', 'time end', 'finishes', 'until'
  ],
  workerName: [
    'worker', 'staff', 'support_worker', 'employee', 'worker_name', 
    'staff_name', 'carer', 'support worker', 'employee name', 
    'staff member', 'assigned worker', 'assigned_worker'
  ],
  workerPhone: [
    'worker_phone', 'staff_phone', 'phone', 'mobile', 'worker_mobile',
    'staff_mobile', 'worker phone', 'staff phone', 'contact number',
    'worker contact', 'employee phone'
  ],
  workerEmail: [
    'worker_email', 'staff_email', 'email', 'worker email', 
    'staff email', 'employee email', 'work email'
  ],
  workerExternalId: [
    'worker_id', 'staff_id', 'employee_id', 'worker id', 
    'staff id', 'employee id', 'emp_id', 'emp id'
  ],
  participantName: [
    'participant', 'client', 'customer', 'participant_name', 
    'client_name', 'patient', 'resident', 'consumer', 
    'participant name', 'client name', 'service user'
  ],
  participantPhone: [
    'participant_phone', 'client_phone', 'client_mobile',
    'participant phone', 'client phone', 'client contact'
  ],
  participantNdis: [
    'ndis', 'ndis_number', 'ndis_id', 'ndis number', 'ndis id',
    'participant_ndis', 'client_ndis', 'ndis no', 'ndis#'
  ],
  participantExternalId: [
    'participant_id', 'client_id', 'customer_id', 'participant id',
    'client id', 'patient_id', 'resident_id'
  ],
  locationName: [
    'location', 'venue', 'site', 'place', 'location_name',
    'service_location', 'location name', 'service location'
  ],
  locationAddress: [
    'address', 'location_address', 'street_address', 'full_address',
    'service_address', 'location address', 'street address'
  ],
  locationPostcode: [
    'postcode', 'post_code', 'zip', 'zip_code', 'postal_code',
    'post code', 'zip code', 'postal code'
  ],
  shiftType: [
    'shift_type', 'service_type', 'support_type', 'category',
    'type', 'shift type', 'service type', 'support type',
    'service_category', 'support_category'
  ],
  supportCategory: [
    'support_category', 'ndis_category', 'funding_category',
    'support category', 'ndis category', 'budget_category'
  ],
  notes: [
    'notes', 'comments', 'special_requirements', 'instructions',
    'remarks', 'special requirements', 'special notes', 'memo'
  ],
  requiredCompetencies: [
    'competencies', 'skills', 'requirements', 'required_skills',
    'qualifications', 'required skills', 'skill requirements'
  ],
  billingRate: [
    'rate', 'hourly_rate', 'billing_rate', 'price', 
    'hourly rate', 'billing rate', 'charge_rate', 'cost'
  ]
};

/**
 * Required fields for a valid shift entry
 */
export const REQUIRED_SHIFT_FIELDS = [
  'shiftDate',
  'shiftStart',
  'workerName',
  'participantName'
];

/**
 * Date format patterns to try when parsing dates
 */
export const DATE_FORMAT_PATTERNS = [
  'YYYY-MM-DD',
  'DD/MM/YYYY',
  'DD-MM-YYYY',
  'MM/DD/YYYY',
  'D/M/YYYY',
  'D/M/YY',
  'DD/MM/YY',
  'YYYY/MM/DD',
  'DD MMM YYYY',
  'D MMM YYYY',
  'MMM D, YYYY',
  'MMMM D, YYYY'
];

/**
 * Time format patterns to try when parsing times
 */
export const TIME_FORMAT_PATTERNS = [
  'HH:mm',
  'HH:mm:ss',
  'H:mm',
  'h:mm A',
  'h:mm a',
  'hA',
  'ha',
  'h:mmA',
  'h:mma',
  'HHmm'
];

