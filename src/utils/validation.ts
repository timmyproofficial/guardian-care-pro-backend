/**
 * Validation schemas using Joi
 * Defines validation rules for API requests
 */

import Joi from 'joi';
import { UserRole, Gender, NotificationPreference } from '../types/user.types';
import {
  ShiftStatus,
  ShiftType,
  RecurrencePattern,
  CancellationReason,
  LocationType,
  TimesheetStatus,
} from '../types/shift.types';
import { SubscriptionTier } from '../types/payment.types';
import { password } from './custom-validators';
import { BatchFrequency } from '../models/batchInvoiceConfig.model';
// import mongoose from 'mongoose';
import ServiceTypeModel from '../models/serviceType.model';

/**
 * Authentication validation schemas
 */
export const authValidation = {
  // Register new user
  register: Joi.object({
    email: Joi.string().required().email(),
    password: password.required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    role: Joi.string()
      .required()
      .valid(UserRole.PARTICIPANT, UserRole.GUARDIAN, UserRole.SUPPORT_WORKER, UserRole.ADMIN),
    phone: Joi.string().required(),
  }),

  // Login with email/password
  login: Joi.object({
    email: Joi.string().required().email(),
    password: Joi.string().required(),
  }),

  // Refresh token
  refreshToken: Joi.object({
    refreshToken: Joi.string().required(),
  }),

  // Logout - now expects token in request body
  logout: Joi.object({
    refreshToken: Joi.string().required(),
  }),

  // Forgot password
  forgotPassword: Joi.object({
    email: Joi.string().required().email(),
  }),

  // Reset password
  resetPassword: Joi.object({
    userId: Joi.string()
      .required()
      .regex(/^[0-9a-fA-F]{24}$/),
    otpCode: Joi.string().required().length(6).pattern(/^\d+$/),
    password: password.required(),
  }),

  // Verify email
  verifyEmail: Joi.object({
    userId: Joi.string()
      .required()
      .regex(/^[0-9a-fA-F]{24}$/),
    otpCode: Joi.string().required().length(6).pattern(/^\d+$/),
  }),

  // Resend verification email
  resendVerification: Joi.object({
    email: Joi.string().required().email(),
  }),
};

/**
 * User validation schemas
 */
export const userValidation = {
  // Update user profile
  updateUser: Joi.object({
    firstName: Joi.string(),
    lastName: Joi.string(),
    phone: Joi.string(),
    gender: Joi.string().valid(...Object.values(Gender)),
    dateOfBirth: Joi.date(),
    // languages: Joi.array().items(Joi.string()),
    address: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      postalCode: Joi.string().required(),
      country: Joi.string().required(),
    }),
    notificationPreferences: Joi.string().valid(...Object.values(NotificationPreference)),
  }),

  // Update user password
  updatePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: password.required(),
  }),
};

/**
 * Participant validation schemas
 */
export const participantValidation = {
  // Create/update participant profile
  updateParticipant: Joi.object({
    supportNeeds: Joi.array().items(Joi.string().regex(/^[0-9a-fA-F]{24}$/)),
    emergencyContact: Joi.object({
      name: Joi.string().required(),
      relationship: Joi.string().required(),
      phone: Joi.string().required(),
    }),
    preferredLanguages: Joi.array().items(Joi.string()),
    preferredGenders: Joi.array().items(Joi.string()),
    notes: Joi.string(),
    ndisNumber: Joi.string().trim(),
    requiresSupervision: Joi.boolean(),
  }),

  // Participant onboarding
  onboarding: Joi.object({
    supportNeeds: Joi.array().items(Joi.string().required().regex(/^[0-9a-fA-F]{24}$/)).required().min(1),
    emergencyContact: Joi.object({
      name: Joi.string().required(),
      relationship: Joi.string().required(),
      phone: Joi.string().required(),
    }),
    planManager: Joi.object({
      name: Joi.string().required(),
      email: Joi.string().required().email(),
    }),
    coordinator: Joi.object({
      name: Joi.string().required(),
      email: Joi.string().required().email(),
    }),
    preferredLanguages: Joi.array().items(Joi.string()),
    ndisNumber: Joi.string().trim(),
  }),

  // Link guardian
  linkGuardian: Joi.object({
    guardianId: Joi.string()
      .required()
      .regex(/^[0-9a-fA-F]{24}$/),
  }),

  // Link support coordinator
  linkCoordinator: Joi.object({
    coordinatorId: Joi.string()
      .required()
      .regex(/^[0-9a-fA-F]{24}$/),
  }),
};

/**
 * Worker validation schemas
 */
export const workerValidation = {
  // Update worker profile
  updateWorker: Joi.object({
    skills: Joi.array().items(Joi.string().regex(/^[0-9a-fA-F]{24}$/)),
    bio: Joi.string().max(500),
    qualifications: Joi.array().items(
      Joi.object({
        title: Joi.string().required(),
        issuer: Joi.string().required(),
        issueDate: Joi.date().required(),
        expiryDate: Joi.date(),
        verified: Joi.boolean(),
      }),
    ),
    experience: Joi.array().items(
      Joi.object({
        title: Joi.string().required(),
        organization: Joi.string().required(),
        startDate: Joi.date().required(),
        endDate: Joi.date().allow(null),
        description: Joi.string(),
      }),
    ),
    hourlyRate: Joi.object({
      baseRate: Joi.number().required().min(0),
      weekendRate: Joi.number().min(0),
      holidayRate: Joi.number().min(0),
      overnightRate: Joi.number().min(0),
    }),
    serviceAreas: Joi.array().items(Joi.string()),
    languages: Joi.array().items(Joi.string()),
    abn: Joi.string().pattern(/^\d{11}$/),
    bankDetails: Joi.object({
      accountName: Joi.string().required(),
      bsb: Joi.string().required(),
      accountNumber: Joi.string().required(),
    }),
  }),

  // Worker onboarding
  onboarding: Joi.object({
    bio: Joi.string().max(500).required(),
    skills: Joi.array()
      .items(
        Joi.string()
          .required()
          .regex(/^[0-9a-fA-F]{24}$/),
      )
      .required()
      .min(1),
    languages: Joi.array().items(Joi.string().required()).required().min(1),
    experience: Joi.array()
      .items(
        Joi.object({
          title: Joi.string().required(),
          organization: Joi.string().required(),
          startDate: Joi.date().required(),
          endDate: Joi.date().allow(null),
          description: Joi.string(),
        }),
      )
      .optional(),
    shiftRates: Joi.array()
      .items(
        Joi.object({
          rateTimeBandId: Joi.string()
            .required()
            .regex(/^[0-9a-fA-F]{24}$/),
          hourlyRate: Joi.number().required().min(0),
        }),
      )
      .required()
      .min(1),
    availability: Joi.object({
      weekdays: Joi.array()
        .items(
          Joi.object({
            day: Joi.string()
              .required()
              .valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
            available: Joi.boolean().required(),
            slots: Joi.array().items(
              Joi.object({
                start: Joi.string()
                  .required()
                  .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
                end: Joi.string()
                  .required()
                  .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
              }),
            ),
          }),
        )
        .required(),
      unavailableDates: Joi.array().items(Joi.date()),
    }).required(),
  }),

  // Update availability
  updateAvailability: Joi.object({
    weekdays: Joi.array()
      .items(
        Joi.object({
          day: Joi.string()
            .required()
            .valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
          available: Joi.boolean().required(),
          slots: Joi.array().items(
            Joi.object({
              start: Joi.string()
                .required()
                .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
              end: Joi.string()
                .required()
                .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
            }),
          ),
        }),
      )
      .required(),
    unavailableDates: Joi.array().items(Joi.date()),
  }),
};

/**
 * Organization validation schemas
 */
export const organizationValidation = {
  // Create organization
  createOrganization: Joi.object({
    name: Joi.string().required(),
    description: Joi.string(),
  }),

  // Invite worker
  inviteWorker: Joi.object({
    workerId: Joi.string()
      .required()
      .regex(/^[0-9a-fA-F]{24}$/),
    proposedRates: Joi.object({
      baseHourlyRate: Joi.number().required().min(0),
      shiftRates: Joi.array()
        .items(
          Joi.object({
            rateTimeBandId: Joi.string()
              .required()
              .regex(/^[0-9a-fA-F]{24}$/),
            hourlyRate: Joi.number().required().min(0),
          }),
        )
        .required(),
      distanceTravelRate: Joi.number().min(0).required(),
    }).required(),
    notes: Joi.string(),
  }),

  // Process invite
  processInvite: Joi.object({
    status: Joi.string().required().valid('accepted', 'declined'),
    adminNotes: Joi.string(),
    declineReason: Joi.string().when('status', {
      is: 'declined',
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    serviceAgreement: Joi.object({
      baseHourlyRate: Joi.number().required().min(0),
      shiftRates: Joi.array()
        .items(
          Joi.object({
            rateTimeBandId: Joi.string()
              .required()
              .regex(/^[0-9a-fA-F]{24}$/),
            hourlyRate: Joi.number().required().min(0),
          }),
        )
        .required(),
      distanceTravelRate: Joi.number().min(0).required(), // Add distance travel rate
      startDate: Joi.date().required(),
      endDate: Joi.date(),
      termsAccepted: Joi.boolean().required().valid(true),
      additionalTerms: Joi.string(),
    }).when('status', {
      is: 'accepted',
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  }),
};

/**
 * RateTimeBand validation schemas
 */
export const rateTimeBandValidation = {
  // Create rate time band
  createRateTimeBand: Joi.object({
    name: Joi.string().required(),
    code: Joi.string().required().uppercase(),
    startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    description: Joi.string(),
    isWeekend: Joi.boolean(),
    isPublicHoliday: Joi.boolean(),
    isSleepover: Joi.boolean(),
    baseRateMultiplier: Joi.number().min(1),
  }),

  // Update rate time band
  updateRateTimeBand: Joi.object({
    name: Joi.string(),
    code: Joi.string().uppercase(),
    startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    description: Joi.string(),
    isWeekend: Joi.boolean(),
    isPublicHoliday: Joi.boolean(),
    isSleepover: Joi.boolean(),
    baseRateMultiplier: Joi.number().min(1),
    isActive: Joi.boolean(),
  }),
};

/**
 * Custom Joi validation for MongoDB ObjectId
 */
const objectId = Joi.string()
  .regex(/^[0-9a-fA-F]{24}$/)
  .message('Invalid ObjectId format');

/**
 * Custom Joi validation for ServiceType ObjectId
 * Validates that the serviceTypeId exists and is active in the database
 */
const serviceTypeId = Joi.string()
  .regex(/^[0-9a-fA-F]{24}$/)
  .message('Invalid ServiceType ID format')
  .external(async (value) => {
    // Skip external validation if value is not provided, empty, or invalid
    if (!value || typeof value !== 'string' || value.trim() === '' || value.length !== 24) {
      return value;
    }

    try {
      const serviceType = await ServiceTypeModel.findOne({
        _id: value.trim(),
        status: 'active',
      });

      if (!serviceType) {
        throw new Error('Service type not found or inactive');
      }

      return value;
    } catch (error) {
      if (error instanceof Error && error.message === 'Service type not found or inactive') {
        throw error;
      }
      // Handle any database connection or other errors gracefully
      throw new Error('Error validating service type');
    }
  });

/**
 * Shift validation schemas
 */
export const shiftValidation = {
  // Create shift
  createShift: Joi.object({
    organizationId: objectId.required(),
    isMultiWorkerShift: Joi.boolean().default(false),
    workerId: Joi.when('isMultiWorkerShift', {
      is: false,
      then: objectId,
      otherwise: Joi.forbidden(),
    }),
    workerIds: Joi.when('isMultiWorkerShift', {
      is: true,
      then: Joi.array().items(objectId).min(1).max(3).required(),
      otherwise: Joi.forbidden(),
    }),
    serviceTypeId: serviceTypeId.required(),
    startTime: Joi.date().required(),
    endTime: Joi.date().greater(Joi.ref('startTime')).required(),
    locationType: Joi.string()
      .valid(...Object.values(LocationType))
      .required(),
    address: Joi.when('locationType', {
      is: LocationType.IN_PERSON,
      then: Joi.string().required(),
      otherwise: Joi.string().optional(),
    }),
    shiftType: Joi.string()
      .valid(...Object.values(ShiftType))
      .required(),
    requiresSupervision: Joi.boolean().default(false),
    specialInstructions: Joi.string().optional(),
    recurrence: Joi.object({
      pattern: Joi.string()
        .valid(...Object.values(RecurrencePattern))
        .required(),
      occurrences: Joi.number().integer().min(1).max(100),
      endDate: Joi.date().greater(Joi.ref('....startTime')),
    }).optional(),
  }),

  // Update shift
  updateShift: Joi.object({
    workerId: objectId.optional(),
    workerIds: Joi.array().items(objectId).min(1).max(3).optional(),
    serviceTypeId: serviceTypeId.optional(),
    startTime: Joi.date().optional(),
    endTime: Joi.date()
      .when('startTime', {
        is: Joi.exist(),
        then: Joi.date().greater(Joi.ref('startTime')),
        otherwise: Joi.date(),
      })
      .optional(),
    locationType: Joi.string()
      .valid(...Object.values(LocationType))
      .optional(),
    address: Joi.string().optional(),
    requiresSupervision: Joi.boolean().optional(),
    specialInstructions: Joi.string().optional(),
    status: Joi.string()
      .valid(...Object.values(ShiftStatus))
      .optional(),
    updateRecurring: Joi.boolean().default(false),
  }),

  // Respond to shift
  respondToShift: Joi.object({
    accept: Joi.boolean().required(),
    declineReason: Joi.when('accept', {
      is: false,
      then: Joi.string().required(),
      otherwise: Joi.forbidden(),
    }),
  }),

  // Cancel shift
  cancelShift: Joi.object({
    reason: Joi.string()
      .valid(...Object.values(CancellationReason))
      .required(),
    note: Joi.string().optional(),
  }),
};

/**
 * Timesheet validation schemas
 */
export const timesheetValidation = {
  // Submit timesheet
  submitTimesheet: Joi.object({
    shiftId: Joi.string()
      .required()
      .regex(/^[0-9a-fA-F]{24}$/),
    actualStartTime: Joi.date().required(),
    actualEndTime: Joi.date().required().greater(Joi.ref('actualStartTime')),
    distanceTravelKm: Joi.number().min(0),
    notes: Joi.string(),
    expenses: Joi.array().items(
      Joi.object({
        title: Joi.string().required(),
        description: Joi.string().required(),
        amount: Joi.number().required().min(0),
        payer: Joi.string().valid('participant', 'supportWorker').required(),
        receiptUrl: Joi.string().uri(),
      }),
    ),
  }),

  // Reject timesheet
  rejectTimesheet: Joi.object({
    reason: Joi.string().required(),
  }),

  // Revise timesheet
  reviseTimesheet: Joi.object({
    actualStartTime: Joi.date(),
    actualEndTime: Joi.date().greater(Joi.ref('actualStartTime')),
    distanceTravelKm: Joi.number().min(0),
    notes: Joi.string(),
    expenses: Joi.array().items(
      Joi.object({
        title: Joi.string().required(),
        description: Joi.string().required(),
        amount: Joi.number().required().min(0),
        payer: Joi.string().valid('participant', 'supportWorker').required(),
        receiptUrl: Joi.string().uri(),
      }),
    ),
  }).custom((value, helpers) => {
    // Ensure at least one field is being updated
    if (
      !value.actualStartTime &&
      !value.actualEndTime &&
      value.distanceTravelKm === undefined &&
      !value.notes &&
      !value.expenses
    ) {
      return helpers.error('At least one field must be updated');
    }
    return value;
  }),

  // Admin update timesheet status
  adminUpdateTimesheet: Joi.object({
    status: Joi.string().valid(...Object.values(TimesheetStatus)),
    reason: Joi.string().when('status', {
      is: TimesheetStatus.REJECTED,
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    isPaid: Joi.boolean(),
  }).custom((value, helpers) => {
    // Ensure at least one field is being updated
    if (value.status === undefined && value.isPaid === undefined) {
      return helpers.error('At least one field must be provided for update');
    }
    return value;
  }),
};

/**
 * Chat validation schemas
 */
export const chatValidation = {
  // Create conversation
  createConversation: Joi.object({
    type: Joi.string().required().valid('direct', 'group'),
    name: Joi.string().min(1).max(100).when('type', {
      is: 'group',
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    description: Joi.string().max(500),
    memberIds: Joi.array()
      .items(Joi.string().regex(/^[0-9a-fA-F]{24}$/))
      .min(1)
      .max(10)
      .required(),
    organizationId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
  }),

  // Send message
  sendMessage: Joi.object({
    type: Joi.string().valid('text', 'image', 'file', 'audio', 'video').default('text'),
    content: Joi.string().max(4000).when('type', {
      is: 'text',
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    replyTo: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    mentions: Joi.array()
      .items(Joi.string().regex(/^[0-9a-fA-F]{24}$/))
      .max(20),
  }),

  // Mark messages as read
  markAsRead: Joi.object({
    messageIds: Joi.array()
      .items(Joi.string().regex(/^[0-9a-fA-F]{24}$/))
      .min(1)
      .max(100)
      .required(),
  }),

  // Add reaction
  addReaction: Joi.object({
    emoji: Joi.string().required().min(1).max(10),
  }),

  // Add members
  addMembers: Joi.object({
    memberIds: Joi.array()
      .items(Joi.string().regex(/^[0-9a-fA-F]{24}$/))
      .min(1)
      .max(10)
      .required(),
  }),
};

/**
 * Invoice validation schemas
 */
export const invoiceValidation = {
  // Send batch invoices
  sendBatchInvoices: Joi.object({
    participantId: Joi.string()
      .required()
      .regex(/^[0-9a-fA-F]{24}$/),
    invoiceIds: Joi.array()
      .items(Joi.string().regex(/^[0-9a-fA-F]{24}$/))
      .min(1)
      .required(),
  }),
};

/**
 * Batch Invoice validation schemas
 */
export const batchInvoiceValidation = {
  // Update batch configuration
  updateBatchConfig: Joi.object({
    isEnabled: Joi.boolean(),
    frequency: Joi.string().valid(...Object.values(BatchFrequency)),
    dayOfWeek: Joi.number().min(0).max(6),
    timeOfDay: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
    timezone: Joi.string(),
    periodStartDay: Joi.number().min(0).max(6),
    periodEndDay: Joi.number().min(0).max(6),
    monthlyStartDate: Joi.number().min(1).max(31),
    monthlyEndDate: Joi.alternatives().try(Joi.number().min(1).max(31), Joi.string().valid('last')),
    automaticEmailParticipant: Joi.boolean(),
    automaticEmailWorker: Joi.boolean(),
  }),

  // Trigger batch generation
  triggerBatch: Joi.object({
    startDate: Joi.date().required(),
    endDate: Joi.date().required().min(Joi.ref('startDate')),
    workerId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    participantId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    sendEmails: Joi.boolean(),
  }),

  // Send batch invoice
  sendBatchInvoice: Joi.object({
    sendToParticipant: Joi.boolean(),
    sendToWorker: Joi.boolean(),
  }).custom((value, helpers) => {
    if (!value.sendToParticipant && !value.sendToWorker) {
      return helpers.error('At least one recipient (participant or worker) must be specified');
    }
    return value;
  }),
};

/**
 * Subscription validation schemas
 */
export const subscriptionValidation = {
  // Create/update subscription
  createSubscription: Joi.object({
    tier: Joi.string()
      .required()
      .valid(...Object.values(SubscriptionTier)),
    paymentMethod: Joi.string().required().valid('creditCard', 'directDebit', 'bankTransfer', 'paypal', 'ndis'),
    autoRenew: Joi.boolean().required(),
    paymentToken: Joi.string().when('paymentMethod', {
      is: 'creditCard',
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  }),
};

/**
 * Incident validation schemas
 */
export const incidentValidation = {
  // Create incident
  createIncident: Joi.object({
    shiftId: Joi.string()
      .required()
      .regex(/^SHIFT-[A-Z0-9]{10}$/),
    // reportedAgainst: Joi.string().regex(/^[0-9a-fA-F]{24}$/), b
    title: Joi.string().required().trim().min(5).max(200),
    description: Joi.string().required().min(10).max(2000),
    severity: Joi.string().valid('LOW', 'MEDIUM', 'HIGH').default('LOW'),
    urlLinks: Joi.array()
      .items(Joi.string().uri({ scheme: ['http', 'https'] }))
      .max(10),
  }),

  // Update incident (for reporters to modify before review)
  updateIncident: Joi.object({
    title: Joi.string().trim().min(5).max(200),
    description: Joi.string().min(10).max(2000),
    severity: Joi.string().valid('LOW', 'MEDIUM', 'HIGH'),
    urlLinks: Joi.array()
      .items(Joi.string().uri({ scheme: ['http', 'https'] }))
      .max(10),
  }).custom((value, helpers) => {
    // Ensure at least one field is being updated
    if (!value.title && !value.description && !value.severity && !value.urlLinks) {
      return helpers.error('At least one field must be updated');
    }
    return value;
  }),

  // Resolve incident
  resolveIncident: Joi.object({
    resolutionNote: Joi.string().required().min(10).max(1000),
    resolvedBy: Joi.string()
      .required()
      .regex(/^[0-9a-fA-F]{24}$/),
  }),

  // Admin review incident
  reviewIncident: Joi.object({
    status: Joi.string().required().valid('IN_REVIEW', 'RESOLVED', 'REJECTED'),
    resolutionNote: Joi.string()
      .min(10)
      .max(1000)
      .when('status', {
        is: Joi.valid('RESOLVED', 'REJECTED'),
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
  }),

  // Admin update incident status
  updateIncidentStatus: Joi.object({
    status: Joi.string().required().valid('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED'),
    updatedBy: Joi.string()
      .regex(/^[0-9a-fA-F]{24}$/)
      .optional(),
    resolutionNote: Joi.string()
      .min(10)
      .max(1000)
      .when('status', {
        is: Joi.valid('RESOLVED', 'REJECTED'),
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
  }),

  // Query incidents (for filtering/searching)
  queryIncidents: Joi.object({
    shiftId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    reportedBy: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    reportedAgainst: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    severity: Joi.string().valid('LOW', 'MEDIUM', 'HIGH'),
    status: Joi.string().valid('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED'),
    resolvedBy: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    startDate: Joi.date(),
    endDate: Joi.date().greater(Joi.ref('startDate')),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'severity', 'status').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),

  // Bulk update incidents (admin only)
  bulkUpdateIncidents: Joi.object({
    incidentIds: Joi.array()
      .items(Joi.string().regex(/^[0-9a-fA-F]{24}$/))
      .min(1)
      .max(50)
      .required(),
    status: Joi.string().valid('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED'),
    resolutionNote: Joi.string()
      .min(10)
      .max(1000)
      .when('status', {
        is: Joi.valid('RESOLVED', 'REJECTED'),
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
  }).custom((value, helpers) => {
    // Ensure at least status is being updated
    if (!value.status) {
      return helpers.error('Status must be provided for bulk update');
    }
    return value;
  }),

  // Add comment/note to incident
  addIncidentComment: Joi.object({
    comment: Joi.string().required().min(5).max(1000),
    isInternal: Joi.boolean().default(false), // Internal comments only visible to admins
  }),

  // Get incident statistics
  getIncidentStats: Joi.object({
    organizationId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    startDate: Joi.date(),
    endDate: Joi.date().greater(Joi.ref('startDate')),
    groupBy: Joi.string().valid('day', 'week', 'month', 'severity', 'status').default('status'),
  }),
};

/**
 * Service Type validation schemas
 */
export const serviceTypeValidation = {
  // Create service type
  createServiceType: Joi.object({
    name: Joi.string().required().trim().min(2).max(100),
    code: Joi.string().required().trim().min(2).max(50).uppercase(),
    status: Joi.string().valid('active', 'inactive').default('active'),
  }),

  // Update service type
  updateServiceType: Joi.object({
    name: Joi.string().trim().min(2).max(100),
    code: Joi.string().trim().min(2).max(50).uppercase(),
    status: Joi.string().valid('active', 'inactive'),
  }).custom((value, helpers) => {
    // Ensure at least one field is being updated
    if (!value.name && !value.code && !value.status) {
      return helpers.error('At least one field must be updated');
    }
    return value;
  }),
};
