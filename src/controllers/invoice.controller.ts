/**
 * Invoice controller
 * Handles HTTP requests related to invoice management
 */

import { Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { invoiceService } from '../services/invoice.service';
import { UserRole } from '../types/user.types';
import { successResponse, errorResponse } from '../utils/api-response';
import logger from '../utils/logger';
// import path from 'path';

export const invoiceController = {
  /**
   * Get invoice by ID
   * @route GET /api/invoices/:invoiceId
   */
  getInvoiceById: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      const { invoiceId } = req.params;
      const invoice = await invoiceService.getInvoiceById(invoiceId);
      
      // Check permissions to view invoice
      if (
        req.user.role === UserRole.PARTICIPANT && 
        invoice.participantId.toString() !== req.user._id.toString()
      ) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('You do not have permission to view this invoice', httpStatus.FORBIDDEN)
        );
      }
      
      if (
        req.user.role === UserRole.SUPPORT_WORKER && 
        invoice.workerId.toString() !== req.user._id.toString()
      ) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('You do not have permission to view this invoice', httpStatus.FORBIDDEN)
        );
      }
      
      return res.json(successResponse({ invoice }, 'Invoice retrieved successfully'));
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get invoice by invoice number
   * @route GET /api/invoices/number/:invoiceNumber
   */
  getInvoiceByNumber: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      const { invoiceNumber } = req.params;
      const invoice = await invoiceService.getInvoiceByNumber(invoiceNumber);
      
      // Check permissions to view invoice
      if (
        req.user.role === UserRole.PARTICIPANT && 
        invoice.participantId.toString() !== req.user._id.toString()
      ) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('You do not have permission to view this invoice', httpStatus.FORBIDDEN)
        );
      }
      
      if (
        req.user.role === UserRole.SUPPORT_WORKER && 
        invoice.workerId.toString() !== req.user._id.toString()
      ) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('You do not have permission to view this invoice', httpStatus.FORBIDDEN)
        );
      }
      
      return res.json(successResponse({ invoice }, 'Invoice retrieved successfully'));
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get invoice by timesheet ID
   * @route GET /api/invoices/timesheet/:timesheetId
   */
  getInvoiceByTimesheetId: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      const { timesheetId } = req.params;
      const invoice = await invoiceService.getInvoiceByTimesheetId(timesheetId);
      
      // Check permissions to view invoice
      if (
        req.user.role === UserRole.PARTICIPANT && 
        invoice.participantId.toString() !== req.user._id.toString()
      ) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('You do not have permission to view this invoice', httpStatus.FORBIDDEN)
        );
      }
      
      if (
        req.user.role === UserRole.SUPPORT_WORKER && 
        invoice.workerId.toString() !== req.user._id.toString()
      ) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('You do not have permission to view this invoice', httpStatus.FORBIDDEN)
        );
      }
      
      return res.json(successResponse({ invoice }, 'Invoice retrieved successfully'));
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get invoices (based on user role)
   * @route GET /api/invoices
   */
  getInvoices: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      const userId = req.user._id.toString();
      const {
        startDate,
        endDate,
        workerId,
        participantId,
        sent
      } = req.query;
      
      let invoices;
      
      // Get invoices based on user role
      if (req.user.role === UserRole.PARTICIPANT) {
        invoices = await invoiceService.getParticipantInvoices(
          userId,
          {
            startDate: startDate ? new Date(startDate as string) : undefined,
            endDate: endDate ? new Date(endDate as string) : undefined,
            workerId: workerId as string,
            sent: sent === 'true' ? true : sent === 'false' ? false : undefined
          }
        );
      } else if (req.user.role === UserRole.SUPPORT_WORKER) {
        invoices = await invoiceService.getWorkerInvoices(
          userId,
          {
            startDate: startDate ? new Date(startDate as string) : undefined,
            endDate: endDate ? new Date(endDate as string) : undefined,
            participantId: participantId as string,
            sent: sent === 'true' ? true : sent === 'false' ? false : undefined
          }
        );
      } else if (req.user.role === UserRole.ADMIN) {
        // Admins need to specify either participantId or workerId
        if (!participantId && !workerId) {
          return res.status(httpStatus.BAD_REQUEST).json(
            errorResponse('Admin must specify either participantId or workerId', httpStatus.BAD_REQUEST)
          );
        }
        
        if (participantId) {
          invoices = await invoiceService.getParticipantInvoices(
            participantId as string,
            {
              startDate: startDate ? new Date(startDate as string) : undefined,
              endDate: endDate ? new Date(endDate as string) : undefined,
              workerId: workerId as string,
              sent: sent === 'true' ? true : sent === 'false' ? false : undefined
            }
          );
        } else {
          invoices = await invoiceService.getWorkerInvoices(
            workerId as string,
            {
              startDate: startDate ? new Date(startDate as string) : undefined,
              endDate: endDate ? new Date(endDate as string) : undefined,
              participantId: participantId as string,
              sent: sent === 'true' ? true : sent === 'false' ? false : undefined
            }
          );
        }
      } else {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Role not authorized to view invoices', httpStatus.FORBIDDEN)
        );
      }
      
      return res.json(successResponse({ invoices }, 'Invoices retrieved successfully'));
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Generate invoice for a timesheet (usually called automatically on timesheet approval)
   * @route POST /api/invoices/generate/:timesheetId
   */
  generateInvoice: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      // Only admin or participant can manually generate an invoice
      if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.PARTICIPANT) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('You do not have permission to generate an invoice', httpStatus.FORBIDDEN)
        );
      }
      
      const { timesheetId } = req.params;
      const invoice = await invoiceService.generateInvoice(timesheetId);
      
      return res.status(httpStatus.CREATED).json(
        successResponse({ invoice }, 'Invoice generated successfully')
      );
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Send invoice to participant
   * @route POST /api/invoices/:invoiceId/send
   */
  sendInvoice: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      const { invoiceId } = req.params;
      
      // Get the invoice first to check permissions
      const invoice = await invoiceService.getInvoiceById(invoiceId);
      
      // Only the worker who created the invoice or an admin can send it
      if (
        req.user.role === UserRole.SUPPORT_WORKER && 
        invoice.workerId.toString() !== req.user._id.toString()
      ) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('You do not have permission to send this invoice', httpStatus.FORBIDDEN)
        );
      }
      
      // Don't allow participants to send invoices to themselves
      if (req.user.role === UserRole.PARTICIPANT) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Participants cannot send invoices', httpStatus.FORBIDDEN)
        );
      }
      
      // Send the invoice
      const updatedInvoice = await invoiceService.sendInvoiceToParticipant(invoiceId);
      
      return res.json(
        successResponse(
          { invoice: updatedInvoice }, 
          'Invoice sent to participant successfully'
        )
      );
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Send batch invoices to participant
   * @route POST /api/invoices/send-batch
   */
  sendBatchInvoices: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      // Only support worker or admin can send batch invoices
      if (
        req.user.role !== UserRole.SUPPORT_WORKER && 
        req.user.role !== UserRole.ADMIN
      ) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('You do not have permission to send batch invoices', httpStatus.FORBIDDEN)
        );
      }
      
      const { participantId, invoiceIds } = req.body;
      
      if (!participantId || !invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
        return res.status(httpStatus.BAD_REQUEST).json(
          errorResponse('Invalid request parameters', httpStatus.BAD_REQUEST)
        );
      }
      
      // For worker, verify all invoices belong to them
      if (req.user.role === UserRole.SUPPORT_WORKER) {
        try {
          // Get all invoices to verify ownership
          const invoices = await Promise.all(
            invoiceIds.map(id => invoiceService.getInvoiceById(id))
          );
          
          const unauthorized = invoices.some(
            invoice => invoice.workerId.toString() !== req.user?._id.toString()
          );
          
          if (unauthorized) {
            return res.status(httpStatus.FORBIDDEN).json(
              errorResponse('You do not have permission to send some of these invoices', httpStatus.FORBIDDEN)
            );
          }
        } catch (error) {
          logger.error('Error verifying invoice ownership:', error);
          return res.status(httpStatus.BAD_REQUEST).json(
            errorResponse('Error verifying invoice ownership', httpStatus.BAD_REQUEST)
          );
        }
      }
      
      // Send the batch invoices
      const count = await invoiceService.sendBatchInvoicesToParticipant(participantId, invoiceIds);
      
      return res.json(
        successResponse(
          { count }, 
          `${count} invoices sent to participant successfully`
        )
      );
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Download invoice as PDF
   * @route GET /api/invoices/:invoiceId/download
   */
  downloadInvoice: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      const { invoiceId } = req.params;
      
      // Get the invoice first to check permissions
      const invoice = await invoiceService.getInvoiceById(invoiceId);
      
      // Check permissions to download invoice
      if (
        req.user.role === UserRole.PARTICIPANT && 
        invoice.participantId.toString() !== req.user._id.toString()
      ) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('You do not have permission to download this invoice', httpStatus.FORBIDDEN)
        );
      }
      
      if (
        req.user.role === UserRole.SUPPORT_WORKER && 
        invoice.workerId.toString() !== req.user._id.toString()
      ) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('You do not have permission to download this invoice', httpStatus.FORBIDDEN)
        );
      }
      
      // Generate PDF
      const { filePath, fileName } = await invoiceService.generateInvoicePdf(invoiceId);
      
      // Set headers for download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      
      // Send the file
      res.sendFile(filePath, err => {
        if (err) {
          next(err);
        }
      });
    } catch (error) {
      return next(error);
    }
  }
};