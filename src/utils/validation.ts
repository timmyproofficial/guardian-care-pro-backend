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
  ServiceType,
  LocationType,
  TimesheetStatus
} from '../types/shift.types';
import { SubscriptionTier } from '../types/payment.types';
import { password } from './custom-validators';

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
      .valid(
        UserRole.PARTICIPANT,
        UserRole.GUARDIAN, 
        UserRole.SUPPORT_WORKER,
        UserRole.ADMIN
      ),
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

  // Forgot password
  forgotPassword: Joi.object({
    email: Joi.string().required().email(),
  }),

  // Reset password
  resetPassword: Joi.object({
    userId: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
    otpCode: Joi.string().required().length(6).pattern(/^\d+$/),
    password: password.required(),
  }),

  // Verify email
  verifyEmail: Joi.object({
    userId: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
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
    supportNeeds: Joi.array().items(Joi.string()),
    emergencyContact: Joi.object({
      name: Joi.string().required(),
      relationship: Joi.string().required(),
      phone: Joi.string().required(),
    }),
    preferredLanguages: Joi.array().items(Joi.string()),
    preferredGenders: Joi.array().items(Joi.string()),
    notes: Joi.string(),
    ndisNumber: Joi.string().pattern(/^\d{9}$/),
    requiresSupervision: Joi.boolean(),
  }),

  // Link guardian
  linkGuardian: Joi.object({
    guardianId: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
  }),

  // Link support coordinator
  linkCoordinator: Joi.object({
    coordinatorId: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
  }),
};

/**
 * Worker validation schemas
 */
export const workerValidation = {
  // Update worker profile
  updateWorker: Joi.object({
    skills: Joi.array().items(Joi.string()),
    bio: Joi.string().max(500),
    qualifications: Joi.array().items(
      Joi.object({
        title: Joi.string().required(),
        issuer: Joi.string().required(),
        issueDate: Joi.date().required(),
        expiryDate: Joi.date(),
        verified: Joi.boolean(),
      })
    ),
    experience: Joi.array().items(
      Joi.object({
        title: Joi.string().required(),
        organization: Joi.string().required(),
        startDate: Joi.date().required(),
        endDate: Joi.date(),
        description: Joi.string(),
      })
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

  // Update availability
  updateAvailability: Joi.object({
    weekdays: Joi.array().items(
      Joi.object({
        day: Joi.string()
          .required()
          .valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
        available: Joi.boolean().required(),
        slots: Joi.array().items(
          Joi.object({
            start: Joi.string().required().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
            end: Joi.string().required().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
          })
        ),
      })
    ).required(),
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
    workerId: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
    proposedRates: Joi.object({
      baseHourlyRate: Joi.number().required().min(0),
      shiftRates: Joi.array().items(
        Joi.object({
          rateTimeBandId: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
          hourlyRate: Joi.number().required().min(0)
        })
      ).required(),
      distanceTravelRate: Joi.number().min(0).required()
    }).required(),
    notes: Joi.string()
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
      shiftRates: Joi.array().items(
        Joi.object({
          rateTimeBandId: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
          hourlyRate: Joi.number().required().min(0)
        })
      ).required(),
      distanceTravelRate: Joi.number().min(0).required(), // Add distance travel rate
      startDate: Joi.date().required(),
      endDate: Joi.date(),
      termsAccepted: Joi.boolean().required().valid(true),
      additionalTerms: Joi.string(),
    }).when('status', {
      is: 'accepted',
      then: Joi.required(),
      otherwise: Joi.optional(),
    })
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
    baseRateMultiplier: Joi.number().min(1)
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
    isActive: Joi.boolean()
  })
};

/**
 * Shift validation schemas
 */
export const shiftValidation = {
  // Create shift
  createShift: Joi.object({
    organizationId: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
    workerId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    serviceType: Joi.string().required().valid(...Object.values(ServiceType)),
    startTime: Joi.date().required(),
    endTime: Joi.date().required().greater(Joi.ref('startTime')),
    locationType: Joi.string().required().valid(...Object.values(LocationType)),
    address: Joi.string().when('locationType', {
      is: LocationType.IN_PERSON,
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    shiftType: Joi.string().required().valid(...Object.values(ShiftType)),
    requiresSupervision: Joi.boolean(),
    specialInstructions: Joi.string(),
    recurrence: Joi.object({
      pattern: Joi.string().required().valid(...Object.values(RecurrencePattern)),
      occurrences: Joi.number().integer().min(1).max(50),
      endDate: Joi.date().greater(Joi.ref('...startTime')),
    }).custom((value, helpers) => {
      if (value.pattern !== RecurrencePattern.NONE && !value.occurrences && !value.endDate) {
        return helpers.error('Recurrence must include either occurrences or endDate');
      }
      return value;
    }),
  }),

  // Update shift
  updateShift: Joi.object({
    workerId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    serviceType: Joi.string().valid(...Object.values(ServiceType)),
    startTime: Joi.date(),
    endTime: Joi.date(),
    locationType: Joi.string().valid(...Object.values(LocationType)),
    address: Joi.string(),
    requiresSupervision: Joi.boolean(),
    specialInstructions: Joi.string(),
    status: Joi.string().valid(...Object.values(ShiftStatus)),
    updateRecurring: Joi.boolean(),
  }).custom((value, helpers) => {
    if (value.endTime && value.startTime && new Date(value.endTime) <= new Date(value.startTime)) {
      return helpers.error('End time must be after start time');
    }
    return value;
  }),

  // Respond to shift
  respondToShift: Joi.object({
    accept: Joi.boolean().required(),
    declineReason: Joi.string().when('accept', {
      is: false,
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  }),

  // Cancel shift
  cancelShift: Joi.object({
    reason: Joi.string().required().valid(...Object.values(CancellationReason)),
    note: Joi.string(),
  }),
};

/**
 * Timesheet validation schemas
 */
export const timesheetValidation = {
  // Submit timesheet
  submitTimesheet: Joi.object({
    shiftId: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
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
      })
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
      })
    ),
  }).custom((value, helpers) => {
    // Ensure at least one field is being updated
    if (!value.actualStartTime && !value.actualEndTime && 
        value.distanceTravelKm === undefined && !value.notes && !value.expenses) {
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
 * Subscription validation schemas
 */
export const subscriptionValidation = {
  // Create/update subscription
  createSubscription: Joi.object({
    tier: Joi.string().required().valid(...Object.values(SubscriptionTier)),
    paymentMethod: Joi.string().required().valid('creditCard', 'directDebit', 'bankTransfer', 'paypal', 'ndis'),
    autoRenew: Joi.boolean().required(),
    paymentToken: Joi.string().when('paymentMethod', {
      is: 'creditCard',
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  }),
};