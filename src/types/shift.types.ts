/**
 * Type definitions for shift-related entities
 * Includes enums and interfaces for shift management
 */

/**
 * Shift status enumeration
 * Defines the possible status values for shifts
 */
export enum ShiftStatus {
    OPEN = 'open',               // Shift is posted but not assigned
    PENDING = 'pending',         // Shift request sent, awaiting response
    CONFIRMED = 'confirmed',     // Shift is booked and confirmed
    IN_PROGRESS = 'inProgress',  // Shift is currently in progress
    COMPLETED = 'completed',     // Shift is finished
    CANCELLED = 'cancelled',     // Shift was cancelled
    NO_SHOW = 'noShow'           // Worker didn't show up
}
  
  /**
   * Shift type enumeration
   * Differentiates between direct bookings and open requests
   */
  export enum ShiftType {
    DIRECT_BOOKING = 'directBooking',  // Specific worker was requested
    OPEN_REQUEST = 'openRequest'       // Open to eligible workers
  }
  
  /**
   * Recurrence pattern enumeration
   * For recurring shifts
   */
  export enum RecurrencePattern {
    NONE = 'none',
    DAILY = 'daily',
    WEEKLY = 'weekly',
    BIWEEKLY = 'biweekly',
    MONTHLY = 'monthly'
  }
  
  /**
   * Service type enumeration
   * Types of services that can be requested in a shift
   */
  export enum ServiceType {
    PERSONAL_CARE = 'personalCare',
    HOUSEHOLD_TASKS = 'householdTasks',
    SOCIAL_SUPPORT = 'socialSupport',
    TRANSPORT = 'transport',
    MEAL_PREPARATION = 'mealPreparation',
    MEDICATION_SUPPORT = 'medicationSupport',
    MOBILITY_ASSISTANCE = 'mobilityAssistance',
    THERAPY_SUPPORT = 'therapySupport',
    BEHAVIOR_SUPPORT = 'behaviorSupport',
    COMMUNITY_ACCESS = 'communityAccess'
  }
  
  /**
   * Cancellation reason enumeration
   * Reasons for shift cancellation
   */
  export enum CancellationReason {
    PARTICIPANT_REQUEST = 'participantRequest',
    WORKER_UNAVAILABLE = 'workerUnavailable',
    EMERGENCY = 'emergency',
    SCHEDULING_ERROR = 'schedulingError',
    OTHER = 'other'
  }
  
  /**
   * Shift location type enumeration
   * Whether the shift is in-person or virtual
   */
  export enum LocationType {
    IN_PERSON = 'inPerson',  // At participant's address or specified location
    VIRTUAL = 'virtual'      // Online/video call
  }
  
  /**
   * Shift input interface
   * Data required for creating a shift
   */
  export interface ShiftInput {
    // Basic information
    participantId: string;
    workerId?: string;               // Optional for open requests
    serviceType: ServiceType;
    startTime: Date;
    endTime: Date;
    
    // Location details
    locationType: LocationType;
    address?: string;                // Required for in-person shifts
    virtualLink?: string;            // Required for virtual shifts
    
    // Shift configuration
    shiftType: ShiftType;
    requiresSupervision: boolean;    // Whether agency oversight is required
    specialInstructions?: string;    // Any notes or requirements
    
    // Recurrence (for recurring shifts)
    recurrence?: {
      pattern: RecurrencePattern;
      occurrences?: number;          // Number of occurrences
      endDate?: Date;                // End date for recurring shifts
    };
  }
  
  /**
   * Timesheet status enumeration
   * Status of timesheet submissions
   */
  export enum TimesheetStatus {
    PENDING = 'pending',           // Submitted but not approved
    APPROVED = 'approved',         // Approved by participant/guardian
    REJECTED = 'rejected',         // Rejected, requires revision
    REVISED = 'revised',           // Revised after rejection
    PROCESSED = 'processed'        // Processed for payment
  }
  
  /**
   * Timesheet input interface
   * Data required for creating a timesheet
   */
  export interface TimesheetInput {
    shiftId: string;
    actualStartTime: Date;
    actualEndTime: Date;
    notes?: string;
    expenses?: {
      description: string;
      amount: number;
      receiptUrl?: string;
    }[];
    incidentReport?: {
      description: string;
      severity: 'low' | 'medium' | 'high';
      interventionTaken: string;
    };
  }