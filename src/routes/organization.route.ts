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

/**
 * @swagger
 * /api/v1/organizations:
 *   post:
 *     summary: Create organization
 *     description: Create a new organization for managing support workers (Participant only)
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Care Services Inc"
 *               description:
 *                 type: string
 *                 example: "Professional care support organization"
 *               abn:
 *                 type: string
 *                 example: "12345678901"
 *               address:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                   suburb:
 *                     type: string
 *                   state:
 *                     type: string
 *                   postcode:
 *                     type: string
 *     responses:
 *       201:
 *         description: Organization created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Participant only
 */
router.post(
  '/',
  authenticate,
  authorize([UserRole.PARTICIPANT]),
  validate(organizationValidation.createOrganization),
  (req: Request, res, next) => organizationController.createOrganization(req as any, res, next)
);

/**
 * @swagger
 * /api/v1/organizations:
 *   get:
 *     summary: Get organizations
 *     description: Get organizations based on user role (Own organization for participants, all for admins)
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved organizations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/',
  authenticate,
  (req: Request, res, next) => organizationController.getOrganizations(req as any, res, next)
);

/**
 * @swagger
 * /api/v1/organizations/{organizationId}/invite:
 *   post:
 *     summary: Invite worker to organization
 *     description: Send an invitation to a support worker to join the organization (Participant only)
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         description: The organization ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - workerId
 *             properties:
 *               workerId:
 *                 type: string
 *                 description: The support worker's user ID
 *               message:
 *                 type: string
 *                 description: Optional invitation message
 *     responses:
 *       201:
 *         description: Invitation sent successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Organization or worker not found
 */
router.post(
  '/:organizationId/invite',
  authenticate,
  authorize([UserRole.PARTICIPANT]),
  validate(organizationValidation.inviteWorker),
  (req: Request, res, next) => organizationController.inviteWorker(req as any, res, next)
);

/**
 * @swagger
 * /api/v1/organizations/{organizationId}/invites/{inviteId}/process:
 *   post:
 *     summary: Process organization invite
 *     description: Accept or reject an organization invitation (Admin only)
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: inviteId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [accept, reject]
 *     responses:
 *       200:
 *         description: Invite processed successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Invite not found
 */
router.post(
  '/:organizationId/invites/:inviteId/process',
  authenticate,
  authorize([UserRole.ADMIN]),
  validate(organizationValidation.processInvite),
  (req: Request, res, next) => organizationController.processInvite(req as any, res, next)
);

/**
 * @swagger
 * /api/v1/organizations/invites/pending:
 *   get:
 *     summary: Get all pending invites
 *     description: Retrieve all pending organization invitations (Admin only)
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved pending invites
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get(
  '/invites/pending',
  authenticate,
  authorize([UserRole.ADMIN]),
  organizationController.getPendingInvites
);

/**
 * @swagger
 * /api/v1/organizations/invites/worker:
 *   get:
 *     summary: Get worker invites
 *     description: Retrieve all organization invitations for the authenticated support worker
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved worker invites
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Support Worker only
 */
router.get(
  '/invites/worker',
  authenticate,
  authorize([UserRole.SUPPORT_WORKER]),
  (req: Request, res, next) => organizationController.getWorkerInvites(req as any, res, next)
);

/**
 * @swagger
 * /api/v1/organizations/my-organization-id:
 *   get:
 *     summary: Get my organization ID
 *     description: Get the organization ID for the authenticated participant
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved organization ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     organizationId:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Participant only
 *       404:
 *         description: Organization not found
 */
router.get(
  '/my-organization-id',
  authenticate,
  authorize([UserRole.PARTICIPANT]),
  (req: Request, res, next) => organizationController.getMyOrganizationId(req as any, res, next)
);

/**
 * @swagger
 * /api/v1/organizations/my-support-workers:
 *   get:
 *     summary: Get my support workers
 *     description: Get all support workers associated with the authenticated participant's organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved support workers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Participant only
 */
router.get(
  '/my-support-workers',
  authenticate,
  authorize([UserRole.PARTICIPANT]),
  (req: Request, res, next) => organizationController.getMySupportWorkers(req as any, res, next)
);

/**
 * @swagger
 * /api/v1/organizations/participant/{participantId}/organization-id:
 *   get:
 *     summary: Get organization ID for participant
 *     description: Get the organization ID for a specified participant (Admin only)
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: participantId
 *         required: true
 *         schema:
 *           type: string
 *         description: The participant's user ID
 *     responses:
 *       200:
 *         description: Successfully retrieved organization ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     organizationId:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Participant or organization not found
 */
router.get(
  '/participant/:participantId/organization-id',
  authenticate,
  authorize([UserRole.ADMIN]),
  (req: Request, res, next) => organizationController.getOrganizationIdForParticipant(req as any, res, next)
);

/**
 * @swagger
 * /api/v1/organizations/{organizationId}/workers/{workerId}:
 *   delete:
 *     summary: Remove worker from organization
 *     description: Remove a support worker from an organization (Participant or Admin only)
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         description: The organization ID
 *       - in: path
 *         name: workerId
 *         required: true
 *         schema:
 *           type: string
 *         description: The worker's user ID
 *     responses:
 *       200:
 *         description: Worker removed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Organization or worker not found
 */
router.delete(
  '/:organizationId/workers/:workerId',
  authenticate,
  authorize([UserRole.PARTICIPANT, UserRole.ADMIN]),
  organizationController.removeWorker
);

export default router;