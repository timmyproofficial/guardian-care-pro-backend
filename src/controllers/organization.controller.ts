/**
 * Organization controller
 * Handles HTTP requests related to organizations and worker connections
 */

import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import { organizationService } from '../services/organization.service';
import { successResponse, errorResponse } from '../utils/api-response';
import { InviteStatus } from '../models/organization.model';

// Define an interface for request with user property
interface AuthRequest extends Request {
  user: any;
}

export const organizationController = {
  /**
   * Create a new organization
   * @route POST /api/organizations
   */
  createOrganization: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      const participantId = req.user._id;
      const { name, description } = req.body;
      
      const organization = await organizationService.createOrganization(
        participantId.toString(),
        name,
        description
      );
      
      return res.status(httpStatus.CREATED).json(
        successResponse({ organization }, 'Organization created successfully')
      );
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get participant's organizations
   * @route GET /api/organizations
   */
  getOrganizations: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      const userId = req.user._id;
      const { role } = req.user;
      
      let organizations;
      
      // Get organizations based on user role
      if (role === 'participant') {
        organizations = await organizationService.getParticipantOrganizations(userId.toString());
      } else if (role === 'supportWorker') {
        organizations = await organizationService.getWorkerOrganizations(userId.toString());
      } else {
        // Admins can see all organizations with pending invites
        organizations = await organizationService.getPendingInvites();
      }
      
      return res.json(successResponse({ organizations }, 'Organizations retrieved successfully'));
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Invite a worker to an organization
   * @route POST /api/organizations/:organizationId/invite
   */
  inviteWorker: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      const { organizationId } = req.params;
      const { workerId, proposedRates, notes } = req.body;
      
      const organization = await organizationService.inviteWorker(
        organizationId,
        workerId,
        proposedRates,
        notes
      );
      
      return res.json(
        successResponse(
          { organization }, 
          'Worker invited successfully. Awaiting admin approval.'
        )
      );
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Process a worker invite (admin function)
   * @route POST /api/organizations/:organizationId/invites/:inviteId/process
   */
  processInvite: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      const { organizationId, inviteId } = req.params;
      const adminId = req.user._id;
      const { 
        status, 
        adminNotes, 
        declineReason, 
        serviceAgreement 
      } = req.body;
      
      // Validate status
      if (!Object.values(InviteStatus).includes(status as InviteStatus)) {
        return res.status(httpStatus.BAD_REQUEST).json(
          errorResponse('Invalid status', httpStatus.BAD_REQUEST)
        );
      }
      
      const organization = await organizationService.processInvite(
        organizationId,
        inviteId,
        adminId.toString(),
        status as InviteStatus,
        adminNotes,
        declineReason,
        serviceAgreement
      );
      
      return res.json(
        successResponse(
          { organization }, 
          `Invitation ${status.toLowerCase()} successfully`
        )
      );
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get all pending invites (admin function)
   * @route GET /api/organizations/invites/pending
   */
  getPendingInvites: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const pendingInvites = await organizationService.getPendingInvites();
      
      res.json(
        successResponse(
          { pendingInvites }, 
          'Pending invites retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get worker's invites
   * @route GET /api/organizations/invites/worker
   */
  getWorkerInvites: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }
      
      const workerId = req.user._id;
      const invites = await organizationService.getWorkerInvites(workerId.toString());
      
      return res.json(
        successResponse(
          { invites }, 
          'Worker invites retrieved successfully'
        )
      );
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Remove a worker from an organization
   * @route DELETE /api/organizations/:organizationId/workers/:workerId
   */
  removeWorker: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, workerId } = req.params;
      
      const organization = await organizationService.removeWorker(
        organizationId,
        workerId
      );
      
      res.json(
        successResponse(
          { organization }, 
          'Worker removed from organization successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }
};