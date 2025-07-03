/**
 * Organization routes
 */

import express from 'express';
import { organizationController } from '../controllers/organization.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import validate from '../middlewares/validate.middleware';
import { organizationValidation } from '../utils/validation';
import { UserRole } from '../types/user.types';
import { Request } from 'express';

const router = express.Router();

// Create organization (Participant only)
router.post(
  '/',
  authenticate,
  authorize([UserRole.PARTICIPANT]),
  validate(organizationValidation.createOrganization),
  (req: Request, res, next) => organizationController.createOrganization(req as any, res, next)
);

// Get organizations (based on user role)
router.get(
  '/',
  authenticate,
  (req: Request, res, next) => organizationController.getOrganizations(req as any, res, next)
);

// Invite worker to organization (Participant only)
router.post(
  '/:organizationId/invite',
  authenticate,
  authorize([UserRole.PARTICIPANT]),
  validate(organizationValidation.inviteWorker),
  (req: Request, res, next) => organizationController.inviteWorker(req as any, res, next)
);

// Process invite (Admin only)
router.post(
  '/:organizationId/invites/:inviteId/process',
  authenticate,
  authorize([UserRole.ADMIN]),
  validate(organizationValidation.processInvite),
  (req: Request, res, next) => organizationController.processInvite(req as any, res, next)
);

// Get all pending invites (Admin only)
router.get(
  '/invites/pending',
  authenticate,
  authorize([UserRole.ADMIN]),
  organizationController.getPendingInvites
);

// Get worker's invites (Worker only)
router.get(
  '/invites/worker',
  authenticate,
  authorize([UserRole.SUPPORT_WORKER]),
  (req: Request, res, next) => organizationController.getWorkerInvites(req as any, res, next)
);

// Get organization ID for the authenticated participant
router.get(
  '/my-organization-id',
  authenticate,
  authorize([UserRole.PARTICIPANT]),
  (req: Request, res, next) => organizationController.getMyOrganizationId(req as any, res, next)
);

// Get support workers for the authenticated participant's organization
router.get(
  '/my-support-workers',
  authenticate,
  authorize([UserRole.PARTICIPANT]),
  (req: Request, res, next) => organizationController.getMySupportWorkers(req as any, res, next)
);

// Get organization ID for a specified participant (admin only)
router.get(
  '/participant/:participantId/organization-id',
  authenticate,
  authorize([UserRole.ADMIN]),
  (req: Request, res, next) => organizationController.getOrganizationIdForParticipant(req as any, res, next)
);

// Remove worker from organization (Participant or Admin)
router.delete(
  '/:organizationId/workers/:workerId',
  authenticate,
  authorize([UserRole.PARTICIPANT, UserRole.ADMIN]),
  organizationController.removeWorker
);

export default router;