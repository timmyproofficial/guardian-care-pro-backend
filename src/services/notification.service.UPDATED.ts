/**
 * Notification service
 * Handles sending notifications to users for various events
 * Integrates with email service to send actual email notifications
 */

import mongoose from 'mongoose';
import { IShift } from '../models/shift.model';
import { ITimesheet } from '../models/timesheet.model';
import User from '../models/user.model';
import Shift from '../models/shift.model';
import logger from '../utils/logger';
import { WorkerAssignment } from '@/types/shift.types';
import moment from 'moment';
import { emailService } from './email.service';

/**
 * Type definition to accept either IShift document or plain object
 */
type ShiftLike = IShift | (Record<string, any> & {
  _id: mongoose.Types.ObjectId;
  participantId: mongoose.Types.ObjectId;
  workerId?: mongoose.Types.ObjectId;
  shiftId: string;
  startTime: Date;
  endTime: Date;
  isMultiWorkerShift?: boolean;
  workerAssignments?: WorkerAssignment[];
});

/**
 * Notification service implementation
 */
export class NotificationService {
  /**
   * Notify worker about a new shift assignment
   * Works for both single and multi-worker shifts
  */
  static async notifyWorkerOfNewShift(shift: ShiftLike): Promise<void> {
    try {
      // For multi-worker shifts, the workerId may be passed separately
      const workerId = shift.isMultiWorkerShift 
        ? shift.workerId // For multi-worker shifts when calling with a specific worker
        : shift.workerId; // For single-worker shifts
      
      if (!workerId) return;
      
      const worker = await User.findById(workerId);
      if (!worker) return;
      
      const participant = await User.findById(shift.participantId);
      const participantName = participant ? `${participant.firstName} ${participant.lastName}` : 'A participant';
      
      // Get full shift details with populated fields
      const fullShift = await Shift.findById(shift._id).populate('serviceTypeId');
      
      if (!fullShift) {
        logger.warn(`Shift ${shift._id} not found for notification`);
        return;
      }
      
      // Get service type name
      const serviceType = fullShift.serviceTypeId as any;
      const serviceTypeName = serviceType?.name || 'Care Service';
      
      // Format shift details for email
      const shiftDetails = {
        date: moment(shift.startTime).format('dddd, MMMM D, YYYY'),
        startTime: moment(shift.startTime).format('h:mm A'),
        endTime: moment(shift.endTime).format('h:mm A'),
        participantName,
        serviceType: serviceTypeName,
        location: fullShift.address || `${fullShift.locationType} location`
      };
      
      // Send email notification
      await emailService.sendShiftBookingEmail(
        worker.email,
        worker.firstName,
        shiftDetails
      );
      
      logger.info(`Shift booking email sent to worker ${worker._id.toString()}`);
    } catch (error) {
      logger.error('Error sending worker notification:', error);
    }
  }

  /**
 * Notify participant about a shift confirmation
 * Works for both single and multi-worker shifts
 */
  static async notifyParticipantOfShiftConfirmation(shift: ShiftLike): Promise<void> {
    try {
      const participant = await User.findById(shift.participantId);
      if (!participant) return;
      
      // For multi-worker shifts, the workerId may be passed separately
      const workerId = shift.isMultiWorkerShift 
        ? shift.workerId // For multi-worker shifts when calling with a specific worker
        : shift.workerId; // For single-worker shifts
      
      const worker = await User.findById(workerId);
      const workerName = worker ? `${worker.firstName} ${worker.lastName}` : 'A support worker';
      
      // Get full shift details with populated fields
      const fullShift = await Shift.findById(shift._id).populate('serviceTypeId');
      
      if (!fullShift) {
        logger.warn(`Shift ${shift._id} not found for notification`);
        return;
      }
      
      // Get service type name
      const serviceType = fullShift.serviceTypeId as any;
      const serviceTypeName = serviceType?.name || 'Care Service';
      
      // Format shift details for email
      const shiftDetails = {
        date: moment(shift.startTime).format('dddd, MMMM D, YYYY'),
        startTime: moment(shift.startTime).format('h:mm A'),
        endTime: moment(shift.endTime).format('h:mm A'),
        workerName,
        serviceType: serviceTypeName,
        location: fullShift.address || `${fullShift.locationType} location`
      };
      
      // Send email notification
      await emailService.sendShiftConfirmationEmail(
        participant.email,
        participant.firstName,
        shiftDetails
      );
      
      logger.info(`Shift confirmation email sent to participant ${participant._id.toString()}`);
    } catch (error) {
      logger.error('Error sending participant notification:', error);
    }
  }

  /**
   * Notify participant about a shift decline
   */
  static async notifyParticipantOfShiftDecline(shift: IShift, reason?: string): Promise<void> {
    try {
      const participant = await User.findById(shift.participantId);
      if (!participant) return;
      
      const worker = await User.findById(shift.workerId);
      const workerName = worker ? `${worker.firstName} ${worker.lastName}` : 'A support worker';
      
      // Get full shift details with populated fields
      const fullShift = await Shift.findById(shift._id).populate('serviceTypeId');
      
      if (!fullShift) {
        logger.warn(`Shift ${shift._id} not found for notification`);
        return;
      }
      
      // Get service type name
      const serviceType = fullShift.serviceTypeId as any;
      const serviceTypeName = serviceType?.name || 'Care Service';
      
      // Format shift details for email
      const shiftDetails = {
        date: moment(shift.startTime).format('dddd, MMMM D, YYYY'),
        startTime: moment(shift.startTime).format('h:mm A'),
        endTime: moment(shift.endTime).format('h:mm A'),
        workerName,
        serviceType: serviceTypeName,
        reason
      };
      
      // Send email notification
      await emailService.sendShiftDeclineEmail(
        participant.email,
        participant.firstName,
        shiftDetails
      );
      
      logger.info(`Shift decline email sent to participant ${participant._id.toString()}`);
    } catch (error) {
      logger.error('Error sending participant notification:', error);
    }
  }

  /**
 * Notify participant about a shift completion
 */
  static async notifyParticipantOfShiftCompletion(shift: ShiftLike): Promise<void> {
    try {
      const participant = await User.findById(shift.participantId);
      if (!participant) return;
      
      const workerId = shift.isMultiWorkerShift 
        ? shift.workerId // For multi-worker shifts when calling with a specific worker
        : shift.workerId; // For single-worker shifts
      
      const worker = await User.findById(workerId);
      const workerName = worker ? `${worker.firstName} ${worker.lastName}` : 'A support worker';
      
      // Get full shift details with populated fields
      const fullShift = await Shift.findById(shift._id).populate('serviceTypeId');
      
      if (!fullShift) {
        logger.warn(`Shift ${shift._id} not found for notification`);
        return;
      }
      
      // Get service type name
      const serviceType = fullShift.serviceTypeId as any;
      const serviceTypeName = serviceType?.name || 'Care Service';
      
      // Format shift details for email
      const shiftDetails = {
        date: moment(shift.startTime).format('dddd, MMMM D, YYYY'),
        workerName,
        serviceType: serviceTypeName,
        startTime: moment(shift.startTime).format('h:mm A'),
        endTime: moment(shift.endTime).format('h:mm A')
      };
      
      // Send email notification
      await emailService.sendShiftCompletionEmail(
        participant.email,
        participant.firstName,
        shiftDetails
      );
      
      logger.info(`Shift completion email sent to participant ${participant._id}`);
    } catch (error) {
      logger.error('Error sending participant notification:', error);
    }
  }

  /**
 * Notify participant about a shift cancellation
 */
  static async notifyParticipantOfShiftCancellation(shift: ShiftLike): Promise<void> {
    try {
      const participant = await User.findById(shift.participantId);
      if (!participant) return;
      
      const workerId = shift.isMultiWorkerShift 
        ? shift.workerId // For multi-worker shifts when calling with a specific worker
        : shift.workerId; // For single-worker shifts
      
      const worker = await User.findById(workerId);
      const workerName = worker ? `${worker.firstName} ${worker.lastName}` : 'A support worker';
      
      // Get full shift details with populated fields
      const fullShift = await Shift.findById(shift._id).populate('serviceTypeId');
      
      if (!fullShift) {
        logger.warn(`Shift ${shift._id} not found for notification`);
        return;
      }
      
      // Get service type name
      const serviceType = fullShift.serviceTypeId as any;
      const serviceTypeName = serviceType?.name || 'Care Service';
      
      // Format shift details for email
      const shiftDetails = {
        date: moment(shift.startTime).format('dddd, MMMM D, YYYY'),
        startTime: moment(shift.startTime).format('h:mm A'),
        endTime: moment(shift.endTime).format('h:mm A'),
        cancelledBy: workerName,
        serviceType: serviceTypeName,
        reason: shift.cancellationReason,
        note: shift.cancellationNote
      };
      
      // Send email notification
      await emailService.sendShiftCancellationEmail(
        participant.email,
        participant.firstName,
        shiftDetails,
        false // isWorker = false (this is for participant)
      );
      
      logger.info(`Shift cancellation email sent to participant ${participant._id}`);
    } catch (error) {
      logger.error('Error sending participant notification:', error);
    }
  }

  /**
 * Notify worker about a shift cancellation
 */
  static async notifyWorkerOfShiftCancellation(shift: ShiftLike): Promise<void> {
    try {
      const workerId = shift.isMultiWorkerShift 
        ? shift.workerId // For multi-worker shifts when calling with a specific worker
        : shift.workerId; // For single-worker shifts
        
      if (!workerId) return;
      
      const worker = await User.findById(workerId);
      if (!worker) return;
      
      const participant = await User.findById(shift.participantId);
      const participantName = participant ? `${participant.firstName} ${participant.lastName}` : 'A participant';
      
      // Get full shift details with populated fields
      const fullShift = await Shift.findById(shift._id).populate('serviceTypeId');
      
      if (!fullShift) {
        logger.warn(`Shift ${shift._id} not found for notification`);
        return;
      }
      
      // Get service type name
      const serviceType = fullShift.serviceTypeId as any;
      const serviceTypeName = serviceType?.name || 'Care Service';
      
      // Format shift details for email
      const shiftDetails = {
        date: moment(shift.startTime).format('dddd, MMMM D, YYYY'),
        startTime: moment(shift.startTime).format('h:mm A'),
        endTime: moment(shift.endTime).format('h:mm A'),
        cancelledBy: participantName,
        serviceType: serviceTypeName,
        reason: shift.cancellationReason,
        note: shift.cancellationNote
      };
      
      // Send email notification
      await emailService.sendShiftCancellationEmail(
        worker.email,
        worker.firstName,
        shiftDetails,
        true // isWorker = true
      );
      
      logger.info(`Shift cancellation email sent to worker ${worker._id}`);
    } catch (error) {
      logger.error('Error sending worker notification:', error);
    }
  }

  /**
 * Notify worker about being removed from a shift
 */
  static async notifyWorkerOfShiftRemoval(shift: ShiftLike): Promise<void> {
    try {
      const workerId = shift.isMultiWorkerShift 
        ? shift.workerId // For multi-worker shifts when calling with a specific worker
        : shift.workerId; // For single-worker shifts
        
      if (!workerId) return;
      
      const worker = await User.findById(workerId);
      if (!worker) return;
      
      const participant = await User.findById(shift.participantId);
      const participantName = participant ? `${participant.firstName} ${participant.lastName}` : 'A participant';
      
      // Get full shift details with populated fields
      const fullShift = await Shift.findById(shift._id).populate('serviceTypeId');
      
      if (!fullShift) {
        logger.warn(`Shift ${shift._id} not found for notification`);
        return;
      }
      
      // Get service type name
      const serviceType = fullShift.serviceTypeId as any;
      const serviceTypeName = serviceType?.name || 'Care Service';
      
      // Format shift details for email (treat as cancellation)
      const shiftDetails = {
        date: moment(shift.startTime).format('dddd, MMMM D, YYYY'),
        startTime: moment(shift.startTime).format('h:mm A'),
        endTime: moment(shift.endTime).format('h:mm A'),
        cancelledBy: participantName,
        serviceType: serviceTypeName,
        reason: 'Worker removed from shift',
        note: 'You have been removed from this shift assignment.'
      };
      
      // Send email notification
      await emailService.sendShiftCancellationEmail(
        worker.email,
        worker.firstName,
        shiftDetails,
        true // isWorker = true
      );
      
      logger.info(`Shift removal email sent to worker ${worker._id}`);
    } catch (error) {
      logger.error('Error sending worker notification:', error);
    }
  }

  /**
   * Notify participant about a timesheet submission
   */
  static async notifyParticipantOfTimesheetSubmission(timesheet: ITimesheet): Promise<void> {
    try {
      const participant = await User.findById(timesheet.participantId);
      if (!participant) return;
      
      const worker = await User.findById(timesheet.workerId);
      const workerName = worker ? `${worker.firstName} ${worker.lastName}` : 'A support worker';
      
      // Calculate hours from timesheet
      const hours = Number(((moment(timesheet.actualEndTime).diff(moment(timesheet.actualStartTime), 'minutes')) / 60).toFixed(2));
      
      // Format timesheet details for email
      const timesheetDetails = {
        shiftDate: moment(timesheet.actualStartTime).format('dddd, MMMM D, YYYY'),
        workerName,
        hours,
        amount: `$${timesheet.grandTotal.toFixed(2)}`
      };
      
      // Send email notification
      await emailService.sendTimesheetSubmissionEmail(
        participant.email,
        participant.firstName,
        timesheetDetails
      );
      
      logger.info(`Timesheet submission email sent to participant ${participant._id}`);
    } catch (error) {
      logger.error('Error sending participant notification:', error);
    }
  }

  /**
   * Notify worker about a timesheet approval
   */
  static async notifyWorkerOfTimesheetApproval(timesheet: ITimesheet): Promise<void> {
    try {
      const worker = await User.findById(timesheet.workerId);
      if (!worker) return;
      
      const participant = await User.findById(timesheet.participantId);
      const participantName = participant ? `${participant.firstName} ${participant.lastName}` : 'A participant';
      const workerName = `${worker.firstName} ${worker.lastName}`;
      
      // Format timesheet details for email
      const timesheetDetails = {
        date: moment(timesheet.actualStartTime).format('dddd, MMMM D, YYYY'),
        participantName,
        workerName,
        hours: Number(((timesheet.grandTotal || 0) / 50).toFixed(2)), // Approximate hours based on total
        status: 'approved'
      };
      
      // Send email notification
      await emailService.sendTimesheetApprovalEmail(
        worker.email,
        worker.firstName,
        timesheetDetails
      );
      
      logger.info(`Timesheet approval email sent to worker ${worker._id}`);
    } catch (error) {
      logger.error('Error sending worker notification:', error);
    }
  }

  /**
   * Notify worker about a timesheet rejection
   */
  static async notifyWorkerOfTimesheetRejection(timesheet: ITimesheet, _reason?: string): Promise<void> {
    try {
      const worker = await User.findById(timesheet.workerId);
      if (!worker) return;
      
      const participant = await User.findById(timesheet.participantId);
      const participantName = participant ? `${participant.firstName} ${participant.lastName}` : 'A participant';
      const workerName = `${worker.firstName} ${worker.lastName}`;
      
      // Format timesheet details for email
      // Note: Rejection reason is stored in timesheet.rejectionReason and visible in the dashboard
      const timesheetDetails = {
        date: moment(timesheet.actualStartTime).format('dddd, MMMM D, YYYY'),
        participantName,
        workerName,
        hours: Number(((timesheet.grandTotal || 0) / 50).toFixed(2)), // Approximate hours
        status: 'rejected'
      };
      
      // Send email notification
      await emailService.sendTimesheetApprovalEmail(
        worker.email,
        worker.firstName,
        timesheetDetails
      );
      
      logger.info(`Timesheet rejection email sent to worker ${worker._id}`);
    } catch (error) {
      logger.error('Error sending worker notification:', error);
    }
  }

  /**
   * Notify participant about a timesheet revision
   */
  static async notifyParticipantOfTimesheetRevision(timesheet: ITimesheet): Promise<void> {
    try {
      const participant = await User.findById(timesheet.participantId);
      if (!participant) return;
      
      const worker = await User.findById(timesheet.workerId);
      const workerName = worker ? `${worker.firstName} ${worker.lastName}` : 'A support worker';
      
      // Calculate hours from timesheet
      const hours = Number(((moment(timesheet.actualEndTime).diff(moment(timesheet.actualStartTime), 'minutes')) / 60).toFixed(2));
      
      // Format timesheet details for email
      const timesheetDetails = {
        shiftDate: moment(timesheet.actualStartTime).format('dddd, MMMM D, YYYY'),
        workerName,
        hours,
        amount: `$${timesheet.grandTotal.toFixed(2)}`
      };
      
      // Send email notification
      await emailService.sendTimesheetRevisionEmail(
        participant.email,
        participant.firstName,
        timesheetDetails
      );
      
      logger.info(`Timesheet revision email sent to participant ${participant._id}`);
    } catch (error) {
      logger.error('Error sending participant notification:', error);
    }
  }

  /**
 * Notify worker that invoice has been sent to participant
 * Note: These invoice notifications are informational logs only
 * The actual invoice emails are sent via invoice.service.ts
 */
static async notifyWorkerOfInvoiceSent(
  workerId: string,
  participantId: string,
  invoiceNumber: string
): Promise<void> {
  try {
    const worker = await User.findById(workerId);
    if (!worker) return;
    
    const participant = await User.findById(participantId);
    const participantName = participant ? `${participant.firstName} ${participant.lastName}` : 'A participant';
    
    // Log notification (invoice email already sent by invoice.service.ts)
    logger.info(`Invoice ${invoiceNumber} notification logged for worker ${worker._id} - invoice sent to ${participantName}`);
  } catch (error) {
    logger.error('Error sending worker notification:', error);
  }
}

/**
 * Notify worker that batch invoices have been sent to participant
 * Note: These invoice notifications are informational logs only
 * The actual invoice emails are sent via invoice.service.ts
 */
static async notifyWorkerOfBatchInvoicesSent(
  workerId: string,
  participantId: string,
  invoiceNumbers: string[]
): Promise<void> {
  try {
    const worker = await User.findById(workerId);
    if (!worker) return;
    
    const participant = await User.findById(participantId);
    const participantName = participant ? `${participant.firstName} ${participant.lastName}` : 'A participant';
    
    // Log notification (invoice emails already sent by invoice.service.ts)
    logger.info(`${invoiceNumbers.length} batch invoices notification logged for worker ${worker._id} - invoices sent to ${participantName}`);
  } catch (error) {
    logger.error('Error sending worker notification:', error);
  }
}

/**
 * Notify participant that a new invoice has been generated
 * Note: These invoice notifications are informational logs only
 * The actual invoice emails are sent via invoice.service.ts
 */
static async notifyParticipantOfInvoiceGenerated(
  participantId: string,
  workerId: string,
  invoiceNumber: string,
  amount: number
): Promise<void> {
  try {
    const participant = await User.findById(participantId);
    if (!participant) return;
    
    const worker = await User.findById(workerId);
    const workerName = worker ? `${worker.firstName} ${worker.lastName}` : 'A support worker';
    
    // Log notification (invoice email already sent by invoice.service.ts)
    logger.info(`Invoice ${invoiceNumber} generated notification logged for participant ${participant._id} - $${amount.toFixed(2)} from ${workerName}`);
  } catch (error) {
    logger.error('Error sending participant notification:', error);
  }
}

/**
 * Notify worker that a batch invoice has been sent to participant
 * Note: These invoice notifications are informational logs only
 * The actual invoice emails are sent via invoice.service.ts
 */
static async notifyWorkerOfBatchInvoiceSent(
  workerId: string,
  participantId: string,
  invoiceNumber: string
): Promise<void> {
  try {
    const worker = await User.findById(workerId);
    if (!worker) return;
    
    const participant = await User.findById(participantId);
    const participantName = participant ? `${participant.firstName} ${participant.lastName}` : 'A participant';
    
    // Log notification (invoice email already sent by batchInvoice.service.ts)
    logger.info(`Batch invoice ${invoiceNumber} notification logged for worker ${worker._id} - invoice sent to ${participantName}`);
  } catch (error) {
    logger.error('Error sending worker notification:', error);
  }
}

/**
 * Notify participant that a batch invoice has been generated
 * Note: These invoice notifications are informational logs only
 * The actual invoice emails are sent via invoice.service.ts
 */
static async notifyParticipantOfBatchInvoiceGenerated(
  participantId: string,
  workerId: string,
  batchInvoiceNumber: string,
  startDate: Date,
  endDate: Date,
  amount: number
): Promise<void> {
  try {
    const participant = await User.findById(participantId);
    if (!participant) return;
    
    const worker = await User.findById(workerId);
    const workerName = worker ? `${worker.firstName} ${worker.lastName}` : 'A support worker';
    
    const startDateFormatted = moment(startDate).format('MMM D, YYYY');
    const endDateFormatted = moment(endDate).format('MMM D, YYYY');
    
    // Log notification (invoice email already sent by batchInvoice.service.ts)
    logger.info(`Batch invoice ${batchInvoiceNumber} generated notification logged for participant ${participant._id} - $${amount.toFixed(2)} from ${workerName} (${startDateFormatted} to ${endDateFormatted})`);
  } catch (error) {
    logger.error('Error sending participant notification:', error);
  }
}
}

