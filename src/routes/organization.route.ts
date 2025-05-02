// /**
//  * Organization routes
//  */

// import express from 'express';
// import { organizationController } from '../controllers/organization.controller';
// import { authenticate, authorize } from '../middlewares/auth.middleware';
// import validate from '../middlewares/validate.middleware';
// import { organizationValidation } from '../utils/validation';
// import { UserRole } from '../types/user.types';

// const router = express.Router();

// // Create organization (Participant only)
// router.post(
//   '/',
//   authenticate,
//   authorize([UserRole.PARTICIPANT]),
//   validate(organizationValidation.createOrganization),
//   organizationController.createOrganization
// );

// // Get organizations (based on user role)
// router.get(
//   '/',
//   authenticate,
//   organizationController.getOrganizations
// );

// // Invite worker to organization (Participant only)
// router.post(
//   '/:organizationId/invite',
//   authenticate,
//   authorize([UserRole.PARTICIPANT]),
//   validate(organizationValidation.inviteWorker),
//   organizationController.inviteWorker
// );

// // Process invite (Admin only)
// router.post(
//   '/:organizationId/invites/:inviteId/process',
//   authenticate,
//   authorize([UserRole.ADMIN]),
//   validate(organizationValidation.processInvite),
//   organizationController.processInvite
// );

// // Get all pending invites (Admin only)
// router.get(
//   '/invites/pending',
//   authenticate,
//   authorize([UserRole.ADMIN]),
//   organizationController.getPendingInvites
// );

// // Get worker's invites (Worker only)
// router.get(
//   '/invites/worker',
//   authenticate,
//   authorize([UserRole.SUPPORT_WORKER]),
//   organizationController.getWorkerInvites
// );

// // Remove worker from organization (Participant or Admin)
// router.delete(
//   '/:organizationId/workers/:workerId',
//   authenticate,
//   authorize([UserRole.PARTICIPANT, UserRole.ADMIN]),
//   organizationController.removeWorker
// );

// export default router;