/**
 * Batch Invoice controller
 * Handles HTTP requests related to batch invoice management
 */

import { Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { batchInvoiceService } from '../services/batchInvoice.service';
import BatchInvoice from '../models/batchInvoice.model';
import { BatchRunType } from '../models/batchProcessingHistory.model';
import { UserRole } from '../types/user.types';
import { successResponse, errorResponse } from '../utils/api-response';
import logger from '../utils/logger';
// import path from 'path';
import fs from 'fs';

export const batchInvoiceController = {
  /**
   * Get batch configuration
   * @route GET /api/batch-invoices/config
   */
  getBatchConfig: async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const config = await batchInvoiceService.getOrCreateBatchConfig();
      return res.json(successResponse({ config }, 'Batch configuration retrieved successfully'));
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Update batch configuration
   * @route PUT /api/batch-invoices/config
   */
  updateBatchConfig: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      // Only admin can update batch configuration
      if (req.user.role !== UserRole.ADMIN) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only administrators can update batch configuration', httpStatus.FORBIDDEN)
        );
      }
      
      const config = await batchInvoiceService.updateBatchConfig(req.body);
      return res.json(successResponse({ config }, 'Batch configuration updated successfully'));
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get batch processing history
   * @route GET /api/batch-invoices/history
   */
  getBatchHistory: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      // Only admin can view batch history
      if (req.user.role !== UserRole.ADMIN) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only administrators can view batch history', httpStatus.FORBIDDEN)
        );
      }
      
      const {
        runType,
        status,
        startDate,
        endDate,
        limit,
        page,
        sortBy
      } = req.query;
      
      const result = await batchInvoiceService.getBatchProcessingHistory(
        {
          runType: runType as any,
          status: status as any,
          startDate: startDate ? new Date(startDate as string) : undefined,
          endDate: endDate ? new Date(endDate as string) : undefined
        },
        {
          limit: limit ? parseInt(limit as string) : undefined,
          page: page ? parseInt(page as string) : undefined,
          sortBy: sortBy as string
        }
      );
      
      return res.json(successResponse(result, 'Batch processing history retrieved successfully'));
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get batch invoices
   * @route GET /api/batch-invoices
   */
  getBatchInvoices: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      const {
        workerId,
        participantId,
        status,
        startDate,
        endDate,
        limit,
        page,
        sortBy
      } = req.query;
      
      // Build filter based on user role
      const filter: any = {};
      
      if (req.user.role === UserRole.SUPPORT_WORKER) {
        // Workers can only see their own invoices
        filter.workerId = req.user._id.toString();
        
        // Apply optional participant filter
        if (participantId) {
          filter.participantId = participantId as string;
        }
      } else if (req.user.role === UserRole.PARTICIPANT) {
        // Participants can only see their own invoices
        filter.participantId = req.user._id.toString();
        
        // Apply optional worker filter
        if (workerId) {
          filter.workerId = workerId as string;
        }
      } else if (req.user.role === UserRole.ADMIN) {
        // Admins can filter by any criteria
        if (workerId) {
          filter.workerId = workerId as string;
        }
        
        if (participantId) {
          filter.participantId = participantId as string;
        }
      } else {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Role not authorized to view batch invoices', httpStatus.FORBIDDEN)
        );
      }
      
      // Apply common filters
      if (status) {
        filter.status = status;
      }
      
      if (startDate || endDate) {
        filter.startDate = startDate ? new Date(startDate as string) : undefined;
        filter.endDate = endDate ? new Date(endDate as string) : undefined;
      }
      
      const result = await batchInvoiceService.getBatchInvoices(
        filter,
        {
          limit: limit ? parseInt(limit as string) : undefined,
          page: page ? parseInt(page as string) : undefined,
          sortBy: sortBy as string
        }
      );
      
      return res.json(successResponse(result, 'Batch invoices retrieved successfully'));
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get batch invoice by ID
   * @route GET /api/batch-invoices/:batchInvoiceId
   */
  getBatchInvoiceById: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      const { batchInvoiceId } = req.params;
      const batchInvoice = await batchInvoiceService.getBatchInvoiceById(batchInvoiceId);
      
      // Check permissions to view invoice
      if (
        req.user.role === UserRole.PARTICIPANT && 
        batchInvoice.participantId.toString() !== req.user._id.toString()
      ) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('You do not have permission to view this batch invoice', httpStatus.FORBIDDEN)
        );
      }
      
      if (
        req.user.role === UserRole.SUPPORT_WORKER && 
        batchInvoice.workerId.toString() !== req.user._id.toString()
      ) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('You do not have permission to view this batch invoice', httpStatus.FORBIDDEN)
        );
      }
      
      return res.json(successResponse({ batchInvoice }, 'Batch invoice retrieved successfully'));
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Trigger batch invoice generation
   * @route POST /api/batch-invoices/trigger
   */
  triggerBatchGeneration: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      // Only admin can trigger batch generation
      if (req.user.role !== UserRole.ADMIN) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only administrators can trigger batch generation', httpStatus.FORBIDDEN)
        );
      }
      
      const {
        startDate,
        endDate,
        workerId,
        participantId,
        sendEmails
      } = req.body;
      
      if (!startDate || !endDate) {
        return res.status(httpStatus.BAD_REQUEST).json(
          errorResponse('Start date and end date are required', httpStatus.BAD_REQUEST)
        );
      }
      
      const processingHistory = await batchInvoiceService.triggerBatchGeneration({
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        workerId,
        participantId,
        initiatedBy: req.user._id.toString(),
        runType: BatchRunType.MANUAL,
        sendEmails: sendEmails !== false
      });
      
      return res.json(
        successResponse(
          { processingHistory }, 
          'Batch generation triggered successfully. Processing in background.'
        )
      );
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Download batch invoice PDF
   * @route GET /api/batch-invoices/:batchInvoiceId/download
   */
  downloadBatchInvoice: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      const { batchInvoiceId } = req.params;
      
      // Get the batch invoice first to check permissions
      const batchInvoice = await batchInvoiceService.getBatchInvoiceById(batchInvoiceId);
      
      // Check permissions to download invoice
      if (
        req.user.role === UserRole.PARTICIPANT && 
        batchInvoice.participantId.toString() !== req.user._id.toString()
      ) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('You do not have permission to download this batch invoice', httpStatus.FORBIDDEN)
        );
      }
      
      if (
        req.user.role === UserRole.SUPPORT_WORKER && 
        batchInvoice.workerId.toString() !== req.user._id.toString()
      ) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('You do not have permission to download this batch invoice', httpStatus.FORBIDDEN)
        );
      }
      
      // Check if PDF exists
      if (!batchInvoice.pdfPath || !fs.existsSync(batchInvoice.pdfPath)) {
        // Generate PDF if it doesn't exist
        try {
          const pdfPath = await batchInvoiceService.generateBatchInvoicePdf(batchInvoiceId);
          
          // Update batch invoice with PDF path
          await BatchInvoice.findByIdAndUpdate(
            batchInvoiceId,
            { pdfPath }
          );
          
          batchInvoice.pdfPath = pdfPath;
        } catch (error) {
          logger.error(`Error generating PDF for batch invoice ${batchInvoiceId}:`, error);
          return res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
            errorResponse('Error generating PDF', httpStatus.INTERNAL_SERVER_ERROR)
          );
        }
      }
      
      // Set headers for download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=invoice-batch-${batchInvoice.batchNumber}.pdf`);
      
      // Send the file
      res.sendFile(batchInvoice.pdfPath, err => {
        if (err) {
          next(err);
        }
      });
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Send batch invoice email
   * @route POST /api/batch-invoices/:batchInvoiceId/send
   */
  sendBatchInvoice: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      const { batchInvoiceId } = req.params;
      const { sendToParticipant, sendToWorker } = req.body;
      
      // Validate at least one recipient
      if (!sendToParticipant && !sendToWorker) {
        return res.status(httpStatus.BAD_REQUEST).json(
          errorResponse('Must specify at least one recipient (participant or worker)', httpStatus.BAD_REQUEST)
        );
      }
      
      // Get the batch invoice first to check permissions
      const batchInvoice = await batchInvoiceService.getBatchInvoiceById(batchInvoiceId);
      
      // Check permissions to send invoice
      // Only the worker who created the invoice or an admin can send it
      if (
        req.user.role === UserRole.SUPPORT_WORKER && 
        batchInvoice.workerId.toString() !== req.user._id.toString()
      ) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('You do not have permission to send this batch invoice', httpStatus.FORBIDDEN)
        );
      }
      
      // Don't allow participants to send invoices to themselves
      if (req.user.role === UserRole.PARTICIPANT) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Participants cannot send batch invoices', httpStatus.FORBIDDEN)
        );
      }
      
      // Send the batch invoice
      await batchInvoiceService.sendBatchInvoiceEmail(
        batchInvoiceId,
        sendToParticipant,
        sendToWorker
      );
      
      return res.json(
        successResponse(
          {}, 
          'Batch invoice sent successfully'
        )
      );
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Run scheduled batch generation manually
   * @route POST /api/batch-invoices/run-scheduled
   */
  runScheduledBatch: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      // Only admin can run scheduled batch
      if (req.user.role !== UserRole.ADMIN) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only administrators can run scheduled batch generation', httpStatus.FORBIDDEN)
        );
      }
      
      // Run scheduled batch in the background
      batchInvoiceService.runScheduledBatchGeneration()
        .catch(error => {
          logger.error('Error running scheduled batch generation:', error);
        });
      
      return res.json(
        successResponse(
          {}, 
          'Scheduled batch generation triggered successfully. Processing in background.'
        )
      );
    } catch (error) {
      return next(error);
    }
  }
};