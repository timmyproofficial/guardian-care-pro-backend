/**
 * Notification service
 * Handles sending notifications to users for various events
 */

import { IShift } from '../models/shift.model';
import { ITimesheet } from '../models/timesheet.model';
import User from '../models/user.model';
import logger from '../utils/logger';

// This is a placeholder for an actual notification system
// In a real implementation, this would connect to a notification provider
// like Firebase Cloud Messaging, email service, SMS gateway, etc.

/**
 * Notification service implementation
 */
export class NotificationService {
  /**
   * Notify worker about a new shift assignment
   */
  static async notifyWorkerOfNewShift(shift: IShift): Promise<void> {
    try {
      if (!shift.workerId) return;
      
      const worker = await User.findById(shift.workerId);
      if (!worker) return;
      
      const participant = await User.findById(shift.participantId);
      const participantName = participant ? `${participant.firstName} ${participant.lastName}` : 'A participant';
      
      // Format shift details
      const startTime = new Date(shift.startTime).toLocaleString();
      const endTime = new Date(shift.endTime).toLocaleString();
      
      // Create notification message
      const message = `${participantName} has assigned you a new shift 
      (ID: ${shift.shiftId}) from ${startTime} to ${endTime}. 
      Please confirm or decline this shift.`;
      
      // Log notification for now (would be sent via actual notification system)
      logger.info(`Notification to worker ${worker._id}: ${message}`);
      
      // TODO: Implement actual notification sending
      // e.g. emailService.sendEmail(worker.email, 'New Shift Assignment', message)
      // or pushNotification.send(worker.deviceToken, { title: 'New Shift', body: message })
    } catch (error) {
      logger.error('Error sending worker notification:', error);
    }
  }

  /**
   * Notify participant about a shift confirmation
   */
  static async notifyParticipantOfShiftConfirmation(shift: IShift): Promise<void> {
    try {
      const participant = await User.findById(shift.participantId);
      if (!participant) return;
      
      const worker = await User.findById(shift.workerId);
      const workerName = worker ? `${worker.firstName} ${worker.lastName}` : 'A support worker';
      
      // Format shift details
      const startTime = new Date(shift.startTime).toLocaleString();
      
      // Create notification message
      const message = `${workerName} has confirmed your shift (ID: ${shift.shiftId}) on ${startTime}.`;
      
      // Log notification for now
      logger.info(`Notification to participant ${participant._id}: ${message}`);
      
      // TODO: Implement actual notification sending
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
      
      // Format shift details
      const startTime = new Date(shift.startTime).toLocaleString();
      
      // Create notification message
      let message = `${workerName} has declined your shift (ID: ${shift.shiftId}) on ${startTime}.`;
      
      if (reason) {
        message += ` Reason: ${reason}`;
      }
      
      // Log notification for now
      logger.info(`Notification to participant ${participant._id}: ${message}`);
      
      // TODO: Implement actual notification sending
    } catch (error) {
      logger.error('Error sending participant notification:', error);
    }
  }

  /**
   * Notify participant about a shift completion
   */
  static async notifyParticipantOfShiftCompletion(shift: IShift): Promise<void> {
    try {
      const participant = await User.findById(shift.participantId);
      if (!participant) return;
      
      const worker = await User.findById(shift.workerId);
      const workerName = worker ? `${worker.firstName} ${worker.lastName}` : 'A support worker';
      
      // Create notification message
      const message = `${workerName} has marked shift (ID: ${shift.shiftId}) 
      as completed. A timesheet will be submitted soon.`;
      
      // Log notification for now
      logger.info(`Notification to participant ${participant._id}: ${message}`);
      
      // TODO: Implement actual notification sending
    } catch (error) {
      logger.error('Error sending participant notification:', error);
    }
  }

  /**
   * Notify participant about a shift cancellation
   */
  static async notifyParticipantOfShiftCancellation(shift: IShift): Promise<void> {
    try {
      const participant = await User.findById(shift.participantId);
      if (!participant) return;
      
      const worker = await User.findById(shift.workerId);
      const workerName = worker ? `${worker.firstName} ${worker.lastName}` : 'A support worker';
      
      // Format shift details
      const startTime = new Date(shift.startTime).toLocaleString();
      
      // Create notification message
      let message = `${workerName} has cancelled shift (ID: ${shift.shiftId}) on ${startTime}.`;
      
      if (shift.cancellationReason) {
        message += ` Reason: ${shift.cancellationReason}`;
      }
      
      if (shift.cancellationNote) {
        message += ` Note: ${shift.cancellationNote}`;
      }
      
      // Log notification for now
      logger.info(`Notification to participant ${participant._id}: ${message}`);
      
      // TODO: Implement actual notification sending
    } catch (error) {
      logger.error('Error sending participant notification:', error);
    }
  }

  /**
   * Notify worker about a shift cancellation
   */
  static async notifyWorkerOfShiftCancellation(shift: IShift): Promise<void> {
    try {
      if (!shift.workerId) return;
      
      const worker = await User.findById(shift.workerId);
      if (!worker) return;
      
      const participant = await User.findById(shift.participantId);
      const participantName = participant ? `${participant.firstName} ${participant.lastName}` : 'A participant';
      
      // Format shift details
      const startTime = new Date(shift.startTime).toLocaleString();
      
      // Create notification message
      let message = `${participantName} has cancelled shift (ID: ${shift.shiftId}) on ${startTime}.`;
      
      if (shift.cancellationReason) {
        message += ` Reason: ${shift.cancellationReason}`;
      }
      
      if (shift.cancellationNote) {
        message += ` Note: ${shift.cancellationNote}`;
      }
      
      // Log notification for now
      logger.info(`Notification to worker ${worker._id}: ${message}`);
      
      // TODO: Implement actual notification sending
    } catch (error) {
      logger.error('Error sending worker notification:', error);
    }
  }

  /**
   * Notify worker about being removed from a shift
   */
  static async notifyWorkerOfShiftRemoval(shift: IShift): Promise<void> {
    try {
      if (!shift.workerId) return;
      
      const worker = await User.findById(shift.workerId);
      if (!worker) return;
      
      const participant = await User.findById(shift.participantId);
      const participantName = participant ? `${participant.firstName} ${participant.lastName}` : 'A participant';
      
      // Format shift details
      const startTime = new Date(shift.startTime).toLocaleString();
      
      // Create notification message
      const message = `${participantName} has removed you from shift (ID: ${shift.shiftId}) on ${startTime}.`;
      
      // Log notification for now
      logger.info(`Notification to worker ${worker._id}: ${message}`);
      
      // TODO: Implement actual notification sending
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
      
      // Create notification message
      const message = `${workerName} has submitted a timesheet for shift 
      ${timesheet.shiftIdRef}. Please review and approve or reject it.`;
      
      // Log notification for now
      logger.info(`Notification to participant ${participant._id}: ${message}`);
      
      // TODO: Implement actual notification sending
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
      
      // Create notification message
      const message = `${participantName} 
      has approved your timesheet for shift ${timesheet.shiftIdRef}. 
      The payment will be processed accordingly.`;
      
      // Log notification for now
      logger.info(`Notification to worker ${worker._id}: ${message}`);
      
      // TODO: Implement actual notification sending
    } catch (error) {
      logger.error('Error sending worker notification:', error);
    }
  }

  /**
   * Notify worker about a timesheet rejection
   */
  static async notifyWorkerOfTimesheetRejection(timesheet: ITimesheet, reason?: string): Promise<void> {
    try {
      const worker = await User.findById(timesheet.workerId);
      if (!worker) return;
      
      const participant = await User.findById(timesheet.participantId);
      const participantName = participant ? `${participant.firstName} ${participant.lastName}` : 'A participant';
      
      // Create notification message
      let message = `${participantName} has rejected your timesheet for shift ${timesheet.shiftIdRef}.`;
      
      if (reason) {
        message += ` Reason: ${reason}. Please revise and resubmit the timesheet.`;
      }
      
      // Log notification for now
      logger.info(`Notification to worker ${worker._id}: ${message}`);
      
      // TODO: Implement actual notification sending
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
      
      // Create notification message
      const message = `${workerName} 
      has revised the timesheet for shift 
      ${timesheet.shiftIdRef}. Please review the updated timesheet.`;
      
      // Log notification for now
      logger.info(`Notification to participant ${participant._id}: ${message}`);
      
      // TODO: Implement actual notification sending
    } catch (error) {
      logger.error('Error sending participant notification:', error);
    }
  }
}