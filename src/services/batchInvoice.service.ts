/**
 * Batch Invoice service
 * Handles operations related to batch invoice generation and management
 */

import httpStatus from 'http-status';
import mongoose from 'mongoose';
import moment from 'moment-timezone';
import { v4 as uuidv4 } from 'uuid';
import BatchInvoice, { BatchStatus, IBatchInvoice } from '../models/batchInvoice.model';
import BatchInvoiceConfig, { BatchFrequency, IBatchInvoiceConfig } from '../models/batchInvoiceConfig.model';
import BatchProcessingHistory, 
{ BatchRunStatus, BatchRunType, IBatchProcessingHistory } from '../models/batchProcessingHistory.model';
import Timesheet from '../models/timesheet.model';
import User from '../models/user.model';
// import Organization from '../models/organization.model';
import { TimesheetStatus } from '../types/shift.types';
import ApiError from '../utils/api-error';
import logger from '../utils/logger';
import { emailService } from './email.service';
import { generateInvoiceNumber } from '../utils/generators';
// import { generateInvoicePdf } from '../utils/pdf-generator';
import { NotificationService } from './notification.service';
import { generateBatchInvoicePdf } from '../utils/pdf-generator';

/**
 * Interface for batch generation options
 */
interface BatchGenerationOptions {
  startDate: Date;
  endDate: Date;
  workerId?: string;
  participantId?: string;
  initiatedBy?: string; // User ID who initiated the batch
  runType: BatchRunType;
  sendEmails?: boolean;
}

/**
 * Batch Invoice service implementation
 */
export const batchInvoiceService = {
  /**
   * Get or create default batch configuration
   */
  getOrCreateBatchConfig: async (): Promise<IBatchInvoiceConfig> => {
    try {
      // Find existing config or create default
      let config = await BatchInvoiceConfig.findOne();
      
      if (!config) {
        config = await BatchInvoiceConfig.create({
          isEnabled: true,
          frequency: BatchFrequency.WEEKLY,
          dayOfWeek: 2, // Tuesday
          timeOfDay: '02:00', // 2 AM
          timezone: 'UTC',
          periodStartDay: 0, // Sunday
          periodEndDay: 6, // Saturday
          automaticEmailParticipant: true,
          automaticEmailWorker: true
        });
        
        logger.info('Created default batch invoice configuration');
      }
      
      return config;
    } catch (error) {
      logger.error('Error getting or creating batch config:', error);
      throw error;
    }
  },

  /**
   * Update batch configuration
   */
  updateBatchConfig: async (
    updateData: Partial<IBatchInvoiceConfig>
  ): Promise<IBatchInvoiceConfig> => {
    try {
      // Get existing config or create default
      const config = await batchInvoiceService.getOrCreateBatchConfig();
      
      // Update fields
      Object.assign(config, updateData);
      
      // Calculate next scheduled run
      if (config.isEnabled) {
        const nextRun = batchInvoiceService.calculateNextRunDate(config);
        config.nextScheduledRun = nextRun;
      } else {
        config.nextScheduledRun = undefined;
      }
      
      // Save updates
      await config.save();
      
      return config;
    } catch (error) {
      logger.error('Error updating batch config:', error);
      throw error;
    }
  },

  /**
   * Calculate next scheduled run date based on configuration
   */
  calculateNextRunDate: (config: IBatchInvoiceConfig): Date => {
    // Create moment object with timezone
    const now = moment().tz(config.timezone);
    
    // Parse hour and minute from timeOfDay
    const [hour, minute] = config.timeOfDay.split(':').map(Number);
    
    // Create a moment for the next run
    let nextRun = moment().tz(config.timezone).day(config.dayOfWeek).hour(hour).minute(minute).second(0).millisecond(0);
    
    // If this day has already passed this week, move to next week
    if (nextRun.isBefore(now)) {
      nextRun = nextRun.add(1, 'week');
    }
    
    // Handle biweekly frequency
    if (config.frequency === BatchFrequency.BIWEEKLY) {
      // Check if we're in an "off" week and need to add another week
      // This assumes we want to run on even or odd weeks from a starting point
      // For simplicity, we'll use the week number of the year
      const weekNumber = nextRun.week();
      if (weekNumber % 2 !== 0) { // Adjust this condition based on your desired biweekly pattern
        nextRun = nextRun.add(1, 'week');
      }
    }
    
    // Handle monthly frequency
    if (config.frequency === BatchFrequency.MONTHLY) {
      // For monthly, we ignore dayOfWeek and use the day of month
      // If monthlyStartDate is specified, use that date
      if (config.monthlyStartDate) {
        nextRun = 
        moment().tz(config.timezone).date(config.monthlyStartDate).hour(hour).minute(minute).second(0).millisecond(0);
        
        // If this day has already passed this month, move to next month
        if (nextRun.isBefore(now)) {
          nextRun = nextRun.add(1, 'month');
        }
      }
    }
    
    return nextRun.toDate();
  },

  /**
   * Get all batch processing history with optional filtering
   */
  getBatchProcessingHistory: async (
    filter: {
      runType?: BatchRunType;
      status?: BatchRunStatus;
      startDate?: Date;
      endDate?: Date;
    } = {},
    options: {
      limit?: number;
      page?: number;
      sortBy?: string;
    } = {}
  ): Promise<{
    history: IBatchProcessingHistory[];
    page: number;
    limit: number;
    totalPages: number;
    totalResults: number;
  }> => {
    try {
      const { limit = 10, page = 1, sortBy = '-processingStartTime' } = options;
      const skip = (page - 1) * limit;
      
      // Build filter
      const query: any = {};
      
      if (filter.runType) {
        query.runType = filter.runType;
      }
      
      if (filter.status) {
        query.status = filter.status;
      }
      
      if (filter.startDate || filter.endDate) {
        query.processingStartTime = {};
        
        if (filter.startDate) {
          query.processingStartTime.$gte = filter.startDate;
        }
        
        if (filter.endDate) {
          query.processingStartTime.$lte = filter.endDate;
        }
      }
      
      // Parse sort option
      const sort: any = {};
      if (sortBy) {
        const [field, order] = sortBy.split(':');
        sort[field.replace('-', '')] = order === 'desc' || field.startsWith('-') ? -1 : 1;
      }
      
      // Execute query
      const history = await BatchProcessingHistory.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('initiatedBy', 'firstName lastName email');
      
      // Get total count
      const totalResults = await BatchProcessingHistory.countDocuments(query);
      
      return {
        history,
        page,
        limit,
        totalPages: Math.ceil(totalResults / limit),
        totalResults
      };
    } catch (error) {
      logger.error('Error getting batch processing history:', error);
      throw error;
    }
  },

  /**
   * Get batch invoices with optional filtering
   */
  getBatchInvoices: async (
    filter: {
      workerId?: string;
      participantId?: string;
      status?: BatchStatus;
      startDate?: Date;
      endDate?: Date;
    } = {},
    options: {
      limit?: number;
      page?: number;
      sortBy?: string;
    } = {}
  ): Promise<{
    batchInvoices: IBatchInvoice[];
    page: number;
    limit: number;
    totalPages: number;
    totalResults: number;
  }> => {
    try {
      const { limit = 10, page = 1, sortBy = '-createdAt' } = options;
      const skip = (page - 1) * limit;
      
      // Build filter
      const query: any = {};
      
      if (filter.workerId) {
        query.workerId = new mongoose.Types.ObjectId(filter.workerId);
      }
      
      if (filter.participantId) {
        query.participantId = new mongoose.Types.ObjectId(filter.participantId);
      }
      
      if (filter.status) {
        query.status = filter.status;
      }
      
      if (filter.startDate || filter.endDate) {
        query.startDate = {};
        
        if (filter.startDate) {
          query.startDate.$gte = filter.startDate;
        }
        
        if (filter.endDate) {
          query.endDate.$lte = filter.endDate;
        }
      }
      
      // Parse sort option
      const sort: any = {};
      if (sortBy) {
        const [field, order] = sortBy.split(':');
        sort[field.replace('-', '')] = order === 'desc' || field.startsWith('-') ? -1 : 1;
      }
      
      // Execute query
      const batchInvoices = await BatchInvoice.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate([
          {
            path: 'workerId',
            select: 'firstName lastName email phone'
          },
          {
            path: 'participantId',
            select: 'firstName lastName email phone'
          },
          {
            path: 'timesheetIds',
            select: 'shiftId actualStartTime actualEndTime subtotal distanceTravelAmount',
            populate: {
              path: 'shiftId',
              select: 'shiftId serviceTypeId',
              populate: {
                path: 'serviceTypeId',
                select: 'name code status'
              }
            }
          }
        ]);
      
      // Get total count
      const totalResults = await BatchInvoice.countDocuments(query);
      
      return {
        batchInvoices,
        page,
        limit,
        totalPages: Math.ceil(totalResults / limit),
        totalResults
      };
    } catch (error) {
      logger.error('Error getting batch invoices:', error);
      throw error;
    }
  },

  /**
   * Get batch invoice by ID
   */
  getBatchInvoiceById: async (batchInvoiceId: string): Promise<IBatchInvoice> => {
    try {
      const batchInvoice = await BatchInvoice.findById(batchInvoiceId)
        .populate([
          {
            path: 'workerId',
            select: 'firstName lastName email phone'
          },
          {
            path: 'participantId',
            select: 'firstName lastName email phone'
          },
          {
            path: 'timesheetIds',
            select: 'shiftId actualStartTime actualEndTime subtotal distanceTravelAmount',
            populate: {
              path: 'shiftId',
              select: 'shiftId serviceTypeId',
              populate: {
                path: 'serviceTypeId',
                select: 'name code status'
              }
            }
          }
        ]);
      
      if (!batchInvoice) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Batch invoice not found');
      }
      
      return batchInvoice;
    } catch (error) {
      logger.error(`Error getting batch invoice ${batchInvoiceId}:`, error);
      throw error;
    }
  },

  /**
   * Manually trigger batch invoice generation
   */
  triggerBatchGeneration: async (options: BatchGenerationOptions): Promise<IBatchProcessingHistory> => {
    try {
      // Create processing history record
      const runId = `batch-${uuidv4()}`;
      const processingHistory = await BatchProcessingHistory.create({
        runId,
        runType: options.runType,
        startDate: options.startDate,
        endDate: options.endDate,
        initiatedBy: options.initiatedBy ? new mongoose.Types.ObjectId(options.initiatedBy) : undefined,
        processingStartTime: new Date(),
        status: BatchRunStatus.STARTED,
        totalTimesheetsProcessed: 0,
        totalBatchesGenerated: 0,
        totalWorkers: 0,
        totalParticipants: 0,
        totalErrors: 0,
        processingLog: [`Batch processing started at ${new Date().toISOString()}`]
      });
      
      // Start processing in the background
      batchInvoiceService.processBatch(processingHistory._id.toString(), options)
        .catch(error => {
          logger.error(`Error in background batch processing for run ${runId}:`, error);
        });
      
      return processingHistory;
    } catch (error) {
      logger.error('Error triggering batch generation:', error);
      throw error;
    }
  },

  /**
   * Process batch in the background
   * This is the main processing function that generates batch invoices
   */
  processBatch: async (
    processingHistoryId: string,
    options: BatchGenerationOptions
  ): Promise<void> => {
    const updateHistory = async (
      updates: Partial<IBatchProcessingHistory>,
      logMessage?: string
    ) => {
      try {
        const history = await BatchProcessingHistory.findById(processingHistoryId);
        if (!history) return;
        
        Object.assign(history, updates);
        
        if (logMessage) {
          if (!history.processingLog) history.processingLog = [];
          history.processingLog.push(`${new Date().toISOString()}: ${logMessage}`);
        }
        
        await history.save();
      } catch (error) {
        logger.error(`Error updating processing history ${processingHistoryId}:`, error);
      }
    };
    
    const logError = async (errorMessage: string) => {
      try {
        const history = await BatchProcessingHistory.findById(processingHistoryId);
        if (!history) return;
        
        if (!history.errorDetails) history.errorDetails = [];
        history.errorDetails.push(errorMessage);
        history.totalErrors += 1;
        
        await history.save();
      } catch (error) {
        logger.error(`Error logging batch error to history ${processingHistoryId}:`, error);
      }
    };
    
    try {
      // Update history with processing started message
      await updateHistory({}, 'Processing started');
      
      // Build query to find approved timesheets not yet included in a batch
      const query: any = {
        status: TimesheetStatus.APPROVED,
        includedInBatch: false,
        actualStartTime: {
          $gte: options.startDate,
          $lte: options.endDate
        }
      };
      
      // Add worker filter if specified
      if (options.workerId) {
        query.workerId = new mongoose.Types.ObjectId(options.workerId);
      }
      
      // Add participant filter if specified
      if (options.participantId) {
        query.participantId = new mongoose.Types.ObjectId(options.participantId);
      }
      
      // Find all eligible timesheets
      const timesheets = await Timesheet.find(query)
        .populate([
          {
            path: 'shiftId',
            select: 'serviceType'
          },
          {
            path: 'rateCalculations.rateTimeBandId',
            select: 'name code'
          }
        ]);
      
      await updateHistory({}, `Found ${timesheets.length} eligible timesheets`);
      
      // If no eligible timesheets, mark as completed with zero results
      if (timesheets.length === 0) {
        await updateHistory({
          status: BatchRunStatus.COMPLETED,
          processingEndTime: new Date()
        }, 'No eligible timesheets found. Batch processing completed.');
        return;
      }
      
      // Group timesheets by worker and participant
      const groupedTimesheets: { [workerId: string]: { [participantId: string]: any[] } } = {};
      
      timesheets.forEach(timesheet => {
        const workerId = timesheet.workerId.toString();
        const participantId = timesheet.participantId.toString();
        
        if (!groupedTimesheets[workerId]) {
          groupedTimesheets[workerId] = {};
        }
        
        if (!groupedTimesheets[workerId][participantId]) {
          groupedTimesheets[workerId][participantId] = [];
        }
        
        groupedTimesheets[workerId][participantId].push(timesheet);
      });
      
      const workerIds = Object.keys(groupedTimesheets);
      await updateHistory({ totalWorkers: workerIds.length }, `Processing ${workerIds.length} workers`);
      
      // Track overall statistics
      let totalBatchesGenerated = 0;
      let totalTimesheetsProcessed = 0;
      let totalParticipants = 0;
      
      // Process each worker-participant group
      for (const workerId of workerIds) {
        const participantIds = Object.keys(groupedTimesheets[workerId]);
        totalParticipants += participantIds.length;
        
        await updateHistory({}, `Processing worker ${workerId} with ${participantIds.length} participants`);
        
        for (const participantId of participantIds) {
          const workerTimesheets = groupedTimesheets[workerId][participantId];
          
          try {
            // Generate batch invoice
            const batchInvoice = await batchInvoiceService.generateBatchInvoice(
              workerId,
              participantId,
              workerTimesheets,
              options.startDate,
              options.endDate
            );
            
            totalBatchesGenerated++;
            totalTimesheetsProcessed += workerTimesheets.length;
            
            await updateHistory({}, `Generated batch invoice 
                ${batchInvoice.batchNumber} for worker ${workerId} and participant 
                ${participantId} with ${workerTimesheets.length} timesheets`);
            
            // Send emails if configured
            if (options.sendEmails) {
              // Get batch config to check email settings
              const config = await batchInvoiceService.getOrCreateBatchConfig();
              
              // Send to participant if enabled
              if (config.automaticEmailParticipant) {
                try {
                  await batchInvoiceService.sendBatchInvoiceEmail(batchInvoice._id.toString(), true, false);
                  await updateHistory({}, `Sent batch invoice email to participant ${participantId}`);
                } catch (error: unknown) {
                //   await logError(`Error sending email to participant ${participantId}: ${error.message}`);
                    const err = error instanceof Error ? error.message : String(error);
                    await logError(`Error sending email to participant ${participantId}: ${err}`);
                }
              }
              
              // Send to worker if enabled
              if (config.automaticEmailWorker) {
                try {
                  await batchInvoiceService.sendBatchInvoiceEmail(batchInvoice._id.toString(), false, true);
                  await updateHistory({}, `Sent batch invoice email to worker ${workerId}`);
                } catch (error: unknown) {
                  const err  = error instanceof Error ? error.message : String(error);
                  await logError(`Error sending email to worker ${workerId}: ${err}`);
                }
              }
            }
          } catch (error: unknown) {
            const err = error instanceof Error ? error.message : String(error);
            await logError(`Error generating batch invoice for worker 
                ${workerId} and participant ${participantId}: ${err}`);
          }
        }
      }
      
      // Update final processing statistics
      await updateHistory({
        status: BatchRunStatus.COMPLETED,
        processingEndTime: new Date(),
        totalBatchesGenerated,
        totalTimesheetsProcessed,
        totalParticipants
      }, `Batch processing completed. Generated 
      ${totalBatchesGenerated} batch invoices for ${totalTimesheetsProcessed} timesheets.`);
      
    } catch (error: unknown) {
      const err = error instanceof Error ? error.message : String(error);
      logger.error(`Error processing batch ${processingHistoryId}:`, err);
      
      // Update history with error
      await updateHistory({
        status: BatchRunStatus.FAILED,
        processingEndTime: new Date(),
        totalErrors: 1,
        errorDetails: [`Fatal error: ${err}`]
      }, `Batch processing failed: ${err}`);
    }
  },

  /**
   * Generate a batch invoice for a specific worker-participant pair
   */
  generateBatchInvoice: async (
    workerId: string,
    participantId: string,
    timesheets: any[],
    startDate: Date,
    endDate: Date
  ): Promise<IBatchInvoice> => {
    try {
      // Sort timesheets by date
      timesheets.sort((a, b) => 
        new Date(a.actualStartTime).getTime() - new Date(b.actualStartTime).getTime()
      );
      
      // Get worker and participant details
      const worker = await User.findById(workerId);
      const participant = await User.findById(participantId);
      
      if (!worker || !participant) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Worker or participant not found');
      }
      
      // Generate invoice number and batch number
      const invoiceNumber = generateInvoiceNumber();
      const batchNumber = `BATCH-${moment().format('YYYYMMDD')}-${workerId.slice(-4)}-${participantId.slice(-4)}`;
      
      // Calculate totals
      let subtotal = 0;
      let travelExpenseTotal = 0;
      let additionalExpensesTotal = 0;
      
      // Calculate subtotal (services) and travel expenses
      timesheets.forEach(timesheet => {
        subtotal += timesheet.subtotal || 0;
        travelExpenseTotal += timesheet.distanceTravelAmount || 0;
        
        // Sum expenses but don't add to invoice total
        if (timesheet.expenses && timesheet.expenses.length > 0) {
          timesheet.expenses.forEach((expense: any) => {
            additionalExpensesTotal += expense.amount || 0;
          });
        }
      });
      
      // Calculate invoice total (subtotal + travel, but NOT expenses)
      const invoiceTotal = subtotal + travelExpenseTotal;
      
      // Create batch invoice
      const batchInvoice = await BatchInvoice.create({
        batchNumber,
        workerId: new mongoose.Types.ObjectId(workerId),
        participantId: new mongoose.Types.ObjectId(participantId),
        startDate,
        endDate,
        invoiceNumber,
        timesheetIds: timesheets.map(ts => ts._id),
        status: BatchStatus.PENDING,
        generatedAt: new Date(),
        subtotal,
        travelExpenseTotal,
        invoiceTotal,
        additionalExpensesTotal
      });
      
      // Update all timesheets to mark as included in batch
      await Timesheet.updateMany(
        { _id: { $in: timesheets.map(ts => ts._id) } },
        { 
          includedInBatch: true,
          batchInvoiceId: batchInvoice._id
        }
      );
      
      // Generate PDF invoice (implement this based on your PDF generation logic)
      try {
        const pdfPath = await batchInvoiceService.generateBatchInvoicePdf(batchInvoice._id.toString());
        
        // Update batch invoice with PDF path
        await BatchInvoice.findByIdAndUpdate(
          batchInvoice._id,
          { pdfPath }
        );
      } catch (error) {
        logger.error(`Error generating PDF for batch invoice ${batchInvoice._id}:`, error);
        // Continue without PDF - will be generated on demand if needed
      }
      
      return batchInvoice;
    } catch (error) {
      logger.error(`Error generating batch invoice for worker ${workerId} and participant ${participantId}:`, error);
      throw error;
    }
  },

  /**
   * Generate PDF for a batch invoice
   */
  generateBatchInvoicePdf: async (batchInvoiceId: string): Promise<string> => {
    try {
      const batchInvoice = await batchInvoiceService.getBatchInvoiceById(batchInvoiceId);
      
      // Fetch all timesheets for this batch
      const timesheets = await Timesheet.find({
        _id: { $in: batchInvoice.timesheetIds }
      }).populate([
        {
          path: 'shiftId',
          select: 'serviceType'
        },
        {
          path: 'rateCalculations.rateTimeBandId',
          select: 'name code'
        }
      ]);
      
      // Sort timesheets by date
      timesheets.sort((a, b) => 
        new Date(a.actualStartTime).getTime() - new Date(b.actualStartTime).getTime()
      );
      
      // Get worker and participant details
      const worker = await User.findById(batchInvoice.workerId);
      const participant = await User.findById(batchInvoice.participantId);
      
      if (!worker || !participant) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Worker or participant not found');
      }
      
      // Format data for template
      const templateData = {
        invoiceNumber: batchInvoice.invoiceNumber,
        batchNumber: batchInvoice.batchNumber,
        dateRange: {
          start: moment(batchInvoice.startDate).format('DD/MM/YYYY'),
          end: moment(batchInvoice.endDate).format('DD/MM/YYYY')
        },
        worker: {
          name: `${worker.firstName} ${worker.lastName}`,
          email: worker.email,
          phone: worker.phone || '',
          // Add other worker details as needed
        },
        participant: {
          name: `${participant.firstName} ${participant.lastName}`,
          email: participant.email,
          phone: participant.phone || '',
          // Add other participant details as needed
        },
        timesheets: timesheets.map(ts => ({
          date: moment(ts.actualStartTime).format('DD/MM/YYYY'),
          startTime: moment(ts.actualStartTime).format('HH:mm'),
          endTime: moment(ts.actualEndTime).format('HH:mm'),
          hours: moment(ts.actualEndTime).diff(moment(ts.actualStartTime), 'hours', true).toFixed(2),
          serviceType: (ts.shiftId as { serviceType?: string })?.serviceType || 'Support Service',
          rateItems: ts.rateCalculations.map(rate => ({
            name: (rate.rateTimeBandId as { name?: string })?.name || 'Standard Rate',
            code: (rate.rateTimeBandId as { code?: string })?.code || 'STD',
            hourlyRate: rate.hourlyRate,
            hours: rate.hours,
            amount: rate.amount
          })),
          travel: {
            km: ts.distanceTravelKm || 0,
            rate: ts.distanceTravelRate || 0,
            amount: ts.distanceTravelAmount || 0
          },
          expenses: ts.expenses || [],
          subtotal: ts.subtotal || 0
        })),
        totals: {
          subtotal: batchInvoice.subtotal,
          travelExpenseTotal: batchInvoice.travelExpenseTotal,
          invoiceTotal: batchInvoice.invoiceTotal,
          additionalExpensesTotal: batchInvoice.additionalExpensesTotal
        }
      };
      
      // Generate PDF using your existing PDF generation utility
      // This would depend on your PDF generation implementation
      // For example:
      const pdfFileName = `invoice-batch-${batchInvoice.batchNumber}.pdf`;
      
      // Use a template for batch invoices
      // This is a placeholder - implement with your actual PDF generation code
      const pdfPath = await generateBatchInvoicePdf(templateData, pdfFileName);
      
      return pdfPath;
    } catch (error) {
      logger.error(`Error generating batch invoice PDF for ${batchInvoiceId}:`, error);
      throw error;
    }
  },

  /**
   * Send batch invoice email
   */
  sendBatchInvoiceEmail: async (
    batchInvoiceId: string,
    sendToParticipant: boolean = true,
    sendToWorker: boolean = false
  ): Promise<void> => {
    try {
      const batchInvoice = await batchInvoiceService.getBatchInvoiceById(batchInvoiceId);
      
      // Get worker and participant details
      const worker = await User.findById(batchInvoice.workerId);
      const participant = await User.findById(batchInvoice.participantId);
      
      if (!worker || !participant) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Worker or participant not found');
      }
      
      const now = new Date();
      const updates: any = {};
      
      // Send to participant if requested
      if (sendToParticipant && !batchInvoice.sentToParticipant) {
        await emailService.sendBatchInvoiceEmail(
          participant.email,
          participant.firstName,
          {
            invoiceNumber: batchInvoice.invoiceNumber,
            workerName: `${worker.firstName} ${worker.lastName}`,
            startDate: moment(batchInvoice.startDate).format('MMMM D, YYYY'),
            endDate: moment(batchInvoice.endDate).format('MMMM D, YYYY'),
            totalAmount: batchInvoice.invoiceTotal.toFixed(2),
            batchNumber: batchInvoice.batchNumber,
            // In a real implementation, you'd include the PDF as an attachment
            // or a link to download it
          }
        );
        
        // Update batch invoice
        updates.sentToParticipant = true;
        updates.participantEmailSentAt = now;
        
        // Notify worker that invoice was sent to participant
        await NotificationService.notifyWorkerOfBatchInvoiceSent(
          worker._id.toString(),
          participant._id.toString(),
          batchInvoice.invoiceNumber
        );
      }
      
      // Send to worker if requested
      if (sendToWorker && !batchInvoice.sentToWorker) {
        await emailService.sendWorkerBatchInvoiceEmail(
          worker.email,
          worker.firstName,
          {
            invoiceNumber: batchInvoice.invoiceNumber,
            participantName: `${participant.firstName} ${participant.lastName}`,
            startDate: moment(batchInvoice.startDate).format('MMMM D, YYYY'),
            endDate: moment(batchInvoice.endDate).format('MMMM D, YYYY'),
            totalAmount: batchInvoice.invoiceTotal.toFixed(2),
            batchNumber: batchInvoice.batchNumber,
            // In a real implementation, you'd include the PDF as an attachment
            // or a link to download it
          }
        );
        
        // Update batch invoice
        updates.sentToWorker = true;
        updates.workerEmailSentAt = now;
      }
      
      // Update batch invoice if needed
      if (Object.keys(updates).length > 0) {
        await BatchInvoice.findByIdAndUpdate(
          batchInvoice._id,
          updates
        );
      }
    } catch (error) {
      logger.error(`Error sending batch invoice email for ${batchInvoiceId}:`, error);
      throw error;
    }
  },

  /**
   * Run scheduled batch generation
   * This should be called by your scheduler (cron)
   */
  runScheduledBatchGeneration: async (): Promise<void> => {
    try {
      // Get configuration
      const config = await batchInvoiceService.getOrCreateBatchConfig();
      
      // Check if batch processing is enabled
      if (!config.isEnabled) {
        logger.info('Scheduled batch processing is disabled');
        return;
      }
      
      // Calculate date range based on configuration
    //   const now = moment().tz(config.timezone);
      let startDate: Date;
      let endDate: Date;
      
      if (config.frequency === BatchFrequency.WEEKLY) {
        // Weekly: Get previous week from Sunday to Saturday
        startDate = moment().tz(config.timezone)
          .day(config.periodStartDay) // Start of period (e.g., Sunday)
          .subtract(1, 'week') // Previous week
          .startOf('day')
          .toDate();
        
        endDate = moment().tz(config.timezone)
          .day(config.periodEndDay) // End of period (e.g., Saturday)
          .subtract(1, 'week') // Previous week
          .endOf('day')
          .toDate();
      } else if (config.frequency === BatchFrequency.BIWEEKLY) {
        // Biweekly: Get previous two weeks
        startDate = moment().tz(config.timezone)
          .day(config.periodStartDay) // Start of period (e.g., Sunday)
          .subtract(2, 'week') // Two weeks ago
          .startOf('day')
          .toDate();
        
        endDate = moment().tz(config.timezone)
          .day(config.periodEndDay) // End of period (e.g., Saturday)
          .subtract(1, 'week') // Previous week
          .endOf('day')
          .toDate();
      } else if (config.frequency === BatchFrequency.MONTHLY) {
        // Monthly: Get previous month
        if (config.monthlyStartDate) {
          // If specific start date is configured
          startDate = moment().tz(config.timezone)
            .subtract(1, 'month')
            .date(config.monthlyStartDate)
            .startOf('day')
            .toDate();
            
          // For end date, check if it's "last" or a specific date
          if (config.monthlyEndDate === 'last') {
            endDate = moment().tz(config.timezone)
              .subtract(1, 'month')
              .endOf('month')
              .endOf('day')
              .toDate();
          } else if (typeof config.monthlyEndDate === 'number') {
            endDate = moment().tz(config.timezone)
              .subtract(1, 'month')
              .date(config.monthlyEndDate)
              .endOf('day')
              .toDate();
          } else {
            // Default to end of month
            endDate = moment().tz(config.timezone)
              .subtract(1, 'month')
              .endOf('month')
              .endOf('day')
              .toDate();
          }
        } else {
          // Default to previous calendar month
          startDate = moment().tz(config.timezone)
            .subtract(1, 'month')
            .startOf('month')
            .toDate();
            
          endDate = moment().tz(config.timezone)
            .subtract(1, 'month')
            .endOf('month')
            .toDate();
        }
      } else {
        // Default to previous week
        startDate = moment().tz(config.timezone)
          .day(0) // Sunday
          .subtract(1, 'week')
          .startOf('day')
          .toDate();
          
        endDate = moment().tz(config.timezone)
          .day(6) // Saturday
          .subtract(1, 'week')
          .endOf('day')
          .toDate();
      }
      
      // Trigger batch processing
      const options: BatchGenerationOptions = {
        startDate,
        endDate,
        runType: BatchRunType.SCHEDULED,
        sendEmails: true
      };
      
      await batchInvoiceService.triggerBatchGeneration(options);
      
      // Update last run time
      config.lastRun = new Date();
      config.nextScheduledRun = batchInvoiceService.calculateNextRunDate(config);
      await config.save();
      
    } catch (error) {
      logger.error('Error running scheduled batch generation:', error);
    }
  }
};