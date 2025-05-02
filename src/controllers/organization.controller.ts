// /**
//  * Organization controller
//  * Handles HTTP requests related to organizations and worker connections
//  */

// import { Request, Response, NextFunction } from 'express';
// import httpStatus from 'http-status';
// import { organizationService } from '../services/organization.service';
// import { successResponse } from '../utils/api-response';
// import { InviteStatus } from '../models/organization.model';

// export const organizationController = {
//   /**
//    * Create a new organization
//    * @route POST /api/organizations
//    */
//   createOrganization: async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const participantId = req.user._id;
//       const { name, description } = req.body;
      
//       const organization = await organizationService.createOrganization(
//         participantId.toString(),
//         name,
//         description
//       );
      
//       res.status(httpStatus.CREATED).json(
//         successResponse({ organization }, 'Organization created successfully')
//       );
//     } catch (error) {
//       next(error);
//     }
//   },

//   /**
//    * Get participant's organizations
//    * @route GET /api/organizations
//    */
//   getOrganizations: async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const userId = req.user._id;
//       const { role } = req.user;
      
//       let organizations;
      
//       // Get organizations based on user role
//       if (role === 'participant') {
//         organizations = await organizationService.getParticipantOrganizations(userId.toString());
//       } else if (role === 'supportWorker') {
//         organizations = await organizationService.getWorkerOrganizations(userId.toString());
//       } else {
//         // Admins can see all organizations with pending invites
//         organizations = await organizationService.getPendingInvites();
//       }
      
//       res.json(successResponse({ organizations }, 'Organizations retrieved successfully'));
//     } catch (error) {
//       next(error);
//     }
//   },

//   /**
//    * Invite a worker to an organization
//    * @route POST /api/organizations/:organizationId/invite
//    */
//   inviteWorker: async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const { organizationId } = req.params;
//       const { workerId, proposedHourlyRate, notes } = req.body;
      
//       const organization = await organizationService.inviteWorker(
//         organizationId,
//         workerId,
//         proposedHourlyRate,
//         notes
//       );
      
//       res.json(
//         successResponse(
//           { organization }, 
//           'Worker invited successfully. Awaiting admin approval.'
//         )
//       );
//     } catch (error) {
//       next(error);
//     }
//   },

//   /**
//    * Process a worker invite (admin function)
//    * @route POST /api/organizations/:organizationId/invites/:inviteId/process
//    */
//   processInvite: async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const { organizationId, inviteId } = req.params;
//       const adminId = req.user._id;
//       const { 
//         status, 
//         adminNotes, 
//         declineReason, 
//         serviceAgreement 
//       } = req.body;
      
//       // Validate status
//       if (!Object.values(InviteStatus).includes(status)) {
//         return res.status(httpStatus.BAD_REQUEST).json({
//           success: false,
//           error: 'Invalid status'
//         });
//       }
      
//       const organization = await organizationService.processInvite(
//         organizationId,
//         inviteId,
//         adminId.toString(),
//         status,
//         adminNotes,
//         declineReason,
//         serviceAgreement
//       );
      
//       res.json(
//         successResponse(
//           { organization }, 
//           `Invitation ${status.toLowerCase()} successfully`
//         )
//       );
//     } catch (error) {
//       next(error);
//     }
//   },

//   /**
//    * Get all pending invites (admin function)
//    * @route GET /api/organizations/invites/pending
//    */
//   getPendingInvites: async (_req: Request, res: Response, next: NextFunction) => {
//     try {
//       const pendingInvites = await organizationService.getPendingInvites();
      
//       res.json(
//         successResponse(
//           { pendingInvites }, 
//           'Pending invites retrieved successfully'
//         )
//       );
//     } catch (error) {
//       next(error);
//     }
//   },

//   /**
//    * Get worker's invites
//    * @route GET /api/organizations/invites/worker
//    */
//   getWorkerInvites: async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const workerId = req.user._id;
//       const invites = await organizationService.getWorkerInvites(workerId.toString());
      
//       res.json(
//         successResponse(
//           { invites }, 
//           'Worker invites retrieved successfully'
//         )
//       );
//     } catch (error) {
//       next(error);
//     }
//   },

//   /**
//    * Remove a worker from an organization
//    * @route DELETE /api/organizations/:organizationId/workers/:workerId
//    */
//   removeWorker: async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const { organizationId, workerId } = req.params;
      
//       const organization = await organizationService.removeWorker(
//         organizationId,
//         workerId
//       );
      
//       res.json(
//         successResponse(
//           { organization }, 
//           'Worker removed from organization successfully'
//         )
//       );
//     } catch (error) {
//       next(error);
//     }
//   }
// };