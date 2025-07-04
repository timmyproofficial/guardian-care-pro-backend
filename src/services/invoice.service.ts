/**
 * Invoice service
 * Handles operations related to invoice generation and management
 */

import httpStatus from 'http-status';
import path from 'path';
import mongoose from 'mongoose';
import moment from 'moment';
import Invoice, { IInvoice, WorkItem, ExpenseItem, TravelExpense } from '../models/invoice.model';
import Timesheet from '../models/timesheet.model';
// import Shift from '../models/shift.model';
import User from '../models/user.model';
import Worker from '../models/worker.model';
import Participant from '../models/participant.model';
import { generateInvoiceNumber } from '../utils/generators';
import ApiError from '../utils/api-error';
import logger from '../utils/logger';
import { emailService } from './email.service';
import { NotificationService } from './notification.service';
import { generateInvoicePdf } from '../utils/pdf-generator';

/**
 * Invoice service implementation
 */
export const invoiceService = {
  /**
   * Generate invoice from an approved timesheet
   * This is called automatically when a timesheet is approved
   */
  generateInvoice: async (timesheetId: string): Promise<IInvoice> => {
    try {
      // Check if an invoice already exists for this timesheet
      const existingInvoice = await Invoice.findOne({ timesheetId: new mongoose.Types.ObjectId(timesheetId) });
      
      if (existingInvoice) {
        return existingInvoice; // Return existing invoice if found
      }
      
      // Fetch the timesheet with populated references
      const timesheet = await Timesheet.findById(timesheetId)
        .populate([
          {
            path: 'shiftId',
            select: 'serviceTypeId isMultiWorkerShift',
            populate: {
              path: 'serviceTypeId',
              select: 'name code'
            }
          },
          {
            path: 'rateCalculations.rateTimeBandId',
            select: 'name code baseRateMultiplier isWeekend isPublicHoliday'
          }
        ]);
      
      if (!timesheet) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Timesheet not found');
      }
      
      // Fetch participant details
      const participant = await Participant.findById(timesheet.participantId);
      if (!participant) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Participant not found');
      }
      
      // Fetch worker details
      const worker = await Worker.findById(timesheet.workerId);
      if (!worker) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Worker not found');
      }
      
      // Fetch base user info for both participant and worker
      const participantUser = await User.findById(timesheet.participantId);
      const workerUser = await User.findById(timesheet.workerId);
      
      if (!participantUser || !workerUser) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User data not found');
      }
      
      // Generate unique invoice number
      const invoiceNumber = generateInvoiceNumber();
      
      // Calculate due date (e.g., 14 days from invoice date)
      const invoiceDate = new Date();
      const dueDate = moment(invoiceDate).add(14, 'days').toDate();
      
      // Format participant details
      const participantDetails = {
        name: `${participantUser.firstName} ${participantUser.lastName}`,
        email: participantUser.email,
        phone: participantUser.phone || '',
        ndisNumber: participant.ndisNumber,
        address: participantUser.address
      };
      
      // Format worker details
      const workerDetails = {
        name: `${workerUser.firstName} ${workerUser.lastName}`,
        email: workerUser.email,
        phone: workerUser.phone || '',
        abn: worker.abn,
        bankDetails: worker.bankDetails
      };
      
      // Get service type from related shift
      const shift = timesheet.shiftId as any;
      const serviceTypeData = shift?.serviceTypeId;
      const serviceType = serviceTypeData?.name || 'Personal Care';
      const serviceTypeName = serviceTypeData?.name || 'Personal Care';
      const serviceTypeCode = serviceTypeData?.code || 'PC';
      
      // Format work items from rate calculations
      const workItems: WorkItem[] = timesheet.rateCalculations.map(calc => ({
        description: `${serviceTypeName} (${serviceTypeCode}) - ${(calc.rateTimeBandId as any)?.name || 'Standard Rate'}`,
        rateTimeBandId: calc.rateTimeBandId,
        rateTimeBandName: (calc.rateTimeBandId as any)?.name || 'Standard Rate',
        rateTimeBandCode: (calc.rateTimeBandId as any)?.code || 'STD',
        serviceType,
        serviceTypeName,
        serviceTypeCode,
        hourlyRate: calc.hourlyRate,
        hours: calc.hours,
        amount: calc.amount
      }));
      
      // Format travel expense if applicable
      let travelExpense: TravelExpense | undefined;
      if (timesheet.distanceTravelKm > 0) {
        travelExpense = {
          distanceTravelKm: timesheet.distanceTravelKm,
          distanceTravelRate: timesheet.distanceTravelRate,
          distanceTravelAmount: timesheet.distanceTravelAmount
        };
      }
      
      // Format additional expenses
      const expenses: ExpenseItem[] = timesheet.expenses.map(exp => ({
        title: exp.title,
        description: exp.description,
        amount: exp.amount,
        receiptUrl: exp.receiptUrl
      }));
      
      // Calculate totals
      const subtotal = timesheet.subtotal;
      const expensesTotal = timesheet.totalExpenses;
      const totalAmount = timesheet.grandTotal;
      
      // Create the invoice
      const invoice = await Invoice.create({
        invoiceNumber,
        timesheetId: timesheet._id,
        shiftId: timesheet.shiftId,
        organizationId: timesheet.organizationId,
        participantId: timesheet.participantId,
        participantDetails,
        workerId: timesheet.workerId,
        workerDetails,
        invoiceDate,
        dueDate,
        workItems,
        travelExpense,
        expenses,
        subtotal,
        expensesTotal,
        totalAmount,
        sentToParticipant: false, // Will be sent separately
        notes: timesheet.notes
      });
      
      // Update the timesheet with the invoice reference
      await Timesheet.findByIdAndUpdate(
        timesheetId,
        { invoiceId: invoice._id }
      );
      
      return invoice;
    } catch (error) {
      logger.error(`Error generating invoice for timesheet ${timesheetId}:`, error);
      throw error;
    }
  },

  /**
   * Get invoice by ID
   */
  getInvoiceById: async (invoiceId: string): Promise<IInvoice> => {
    try {
      const invoice = await Invoice.findById(invoiceId);
      
      if (!invoice) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Invoice not found');
      }
      
      return invoice;
    } catch (error) {
      logger.error(`Error getting invoice ${invoiceId}:`, error);
      throw error;
    }
  },

  /**
   * Get invoice by invoice number
   */
  getInvoiceByNumber: async (invoiceNumber: string): Promise<IInvoice> => {
    try {
      const invoice = await Invoice.findOne({ invoiceNumber });
      
      if (!invoice) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Invoice not found');
      }
      
      return invoice;
    } catch (error) {
      logger.error(`Error getting invoice by number ${invoiceNumber}:`, error);
      throw error;
    }
  },

  /**
   * Get invoice by timesheet ID
   */
  getInvoiceByTimesheetId: async (timesheetId: string): Promise<IInvoice> => {
    try {
      const invoice = await Invoice.findOne({ 
        timesheetId: new mongoose.Types.ObjectId(timesheetId) 
      });
      
      if (!invoice) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Invoice not found');
      }
      
      return invoice;
    } catch (error) {
      logger.error(`Error getting invoice by timesheet ID ${timesheetId}:`, error);
      throw error;
    }
  },

  /**
   * Get invoices for a participant
   */
  getParticipantInvoices: async (
    participantId: string,
    filter: {
      startDate?: Date;
      endDate?: Date;
      workerId?: string;
      sent?: boolean;
    } = {}
  ): Promise<IInvoice[]> => {
    try {
      const query: any = { 
        participantId: new mongoose.Types.ObjectId(participantId) 
      };
      
      // Apply filters
      if (filter.workerId) {
        query.workerId = new mongoose.Types.ObjectId(filter.workerId);
      }
      
      if (filter.sent !== undefined) {
        query.sentToParticipant = filter.sent;
      }
      
      if (filter.startDate || filter.endDate) {
        query.invoiceDate = {};
        
        if (filter.startDate) {
          query.invoiceDate.$gte = filter.startDate;
        }
        
        if (filter.endDate) {
          query.invoiceDate.$lte = filter.endDate;
        }
      }
      
      const invoices = await Invoice.find(query)
        .sort({ invoiceDate: -1 })
        .populate([
          {
            path: 'shiftId',
            select: 'shiftId serviceTypeId',
            populate: {
              path: 'serviceTypeId',
              select: 'name code status'
            }
          },
          {
            path: 'workerId',
            select: 'firstName lastName email'
          },
          {
            path: 'organizationId',
            select: 'name'
          }
        ]);
      
      return invoices;
    } catch (error) {
      logger.error(`Error getting invoices for participant ${participantId}:`, error);
      throw error;
    }
  },

  /**
   * Get invoices for a worker
   */
  getWorkerInvoices: async (
    workerId: string,
    filter: {
      startDate?: Date;
      endDate?: Date;
      participantId?: string;
      sent?: boolean;
    } = {}
  ): Promise<IInvoice[]> => {
    try {
      const query: any = { 
        workerId: new mongoose.Types.ObjectId(workerId) 
      };
      
      // Apply filters
      if (filter.participantId) {
        query.participantId = new mongoose.Types.ObjectId(filter.participantId);
      }
      
      if (filter.sent !== undefined) {
        query.sentToParticipant = filter.sent;
      }
      
      if (filter.startDate || filter.endDate) {
        query.invoiceDate = {};
        
        if (filter.startDate) {
          query.invoiceDate.$gte = filter.startDate;
        }
        
        if (filter.endDate) {
          query.invoiceDate.$lte = filter.endDate;
        }
      }
      
      const invoices = await Invoice.find(query)
        .sort({ invoiceDate: -1 })
        .populate([
          {
            path: 'shiftId',
            select: 'shiftId serviceTypeId',
            populate: {
              path: 'serviceTypeId',
              select: 'name code status'
            }
          },
          {
            path: 'participantId',
            select: 'firstName lastName email'
          },
          {
            path: 'organizationId',
            select: 'name'
          }
        ]);
      
      return invoices;
    } catch (error) {
      logger.error(`Error getting invoices for worker ${workerId}:`, error);
      throw error;
    }
  },

  /**
   * Send invoice to participant
   */
  sendInvoiceToParticipant: async (invoiceId: string): Promise<IInvoice> => {
    try {
      const invoice = await Invoice.findById(invoiceId);
      
      if (!invoice) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Invoice not found');
      }
      
      // Get participant and worker details
      const participant = await User.findById(invoice.participantId);
      const worker = await User.findById(invoice.workerId);
      
      if (!participant || !worker) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User data not found');
      }
      
      // Send email to participant
      await emailService.sendInvoiceEmail(
        participant.email,
        participant.firstName,
        {
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: moment(invoice.invoiceDate).format('MMMM D, YYYY'),
          dueDate: invoice.dueDate ? moment(invoice.dueDate).format('MMMM D, YYYY') : 'N/A',
          workerName: invoice.workerDetails.name,
          amount: invoice.totalAmount.toFixed(2),
          // Note: In a real implementation, you'd want to include the actual PDF invoice
          // as an attachment or a link to download it from the system
        }
      );
      
      // Update invoice as sent
      invoice.sentToParticipant = true;
      invoice.sentDate = new Date();
      await invoice.save();
      
      // Notify worker that invoice was sent
      // Note: This assumes you have a notification for invoice sent to participant
      // You may need to create this notification type
      await NotificationService.notifyWorkerOfInvoiceSent(
        worker._id.toString(),
        participant._id.toString(),
        invoice.invoiceNumber
      );
      
      return invoice;
    } catch (error) {
      logger.error(`Error sending invoice ${invoiceId} to participant:`, error);
      throw error;
    }
  },

  /**
   * Send batch invoices to participant
   */
  sendBatchInvoicesToParticipant: async (
    participantId: string, 
    invoiceIds: string[]
  ): Promise<number> => {
    try {
      // Validate all invoices belong to the participant
      const invoices = await Invoice.find({
        _id: { $in: invoiceIds.map(id => new mongoose.Types.ObjectId(id)) },
        participantId: new mongoose.Types.ObjectId(participantId)
      });
      
      if (invoices.length !== invoiceIds.length) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'Some invoices do not belong to this participant or were not found'
        );
      }
      
      // Get participant details
      const participant = await User.findById(participantId);
      
      if (!participant) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Participant not found');
      }
      
      // Calculate total amount
      const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
      
      // Send batch email
      await emailService.sendBatchInvoicesEmail(
        participant.email,
        participant.firstName,
        {
          invoiceCount: invoices.length,
          invoiceNumbers: invoices.map(inv => inv.invoiceNumber).join(', '),
          totalAmount: totalAmount.toFixed(2),
          startDate: moment(invoices[0].invoiceDate).format('MMMM D, YYYY'),
          endDate: moment(invoices[invoices.length - 1].invoiceDate).format('MMMM D, YYYY'),
          // Note: In a real implementation, you'd want to include a ZIP of all PDFs
          // or links to download them from the system
        }
      );
      
      // Update all invoices as sent
      const now = new Date();
      await Invoice.updateMany(
        { _id: { $in: invoiceIds.map(id => new mongoose.Types.ObjectId(id)) } },
        { sentToParticipant: true, sentDate: now }
      );
      
      // Notify all workers that their invoices were sent
      const workerIds = [...new Set(invoices.map(inv => inv.workerId.toString()))];
      
      for (const workerId of workerIds) {
        const workerInvoices = invoices.filter(inv => inv.workerId.toString() === workerId);
        
        await NotificationService.notifyWorkerOfBatchInvoicesSent(
          workerId,
          participantId,
          workerInvoices.map(inv => inv.invoiceNumber)
        );
      }
      
      return invoices.length;
    } catch (error) {
      logger.error(`Error sending batch invoices to participant ${participantId}:`, error);
      throw error;
    }
  },

  /**
 * Generate PDF for an invoice
 * @param invoiceId - ID of the invoice to generate PDF for
 * @returns Path to the generated PDF file
 */
generateInvoicePdf: async (invoiceId: string): Promise<{ filePath: string; fileName: string }> => {
  try {
    // Get the invoice
    const invoice = await Invoice.findById(invoiceId);
    
    if (!invoice) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Invoice not found');
    }
    
    // Import PDF generator
    // const { generateInvoicePdf } = require('../utils/pdf-generator');
    
    // Generate PDF
    const pdfPath = await generateInvoicePdf(invoice);
    
    // Get filename from path
    const fileName = path.basename(pdfPath);
    
    return { 
      filePath: pdfPath,
      fileName: fileName
    };
  } catch (error) {
    logger.error(`Error generating PDF for invoice ${invoiceId}:`, error);
    throw error;
  }
}
};