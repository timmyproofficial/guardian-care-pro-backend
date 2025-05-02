// /**
//  * Organization service
//  * Handles operations related to participant organizations and worker connections
//  */

// import httpStatus from 'http-status';
// import mongoose from 'mongoose';
// import Organization, { InviteStatus, IOrganization, ServiceAgreement } from '../models/organization.model';
// import User from '../models/user.model';
// import Worker from '../models/worker.model';
// import Participant from '../models/participant.model';
// import ApiError from '../utils/api-error';
// import logger from '../utils/logger';
// import { UserRole } from '../types/user.types';

// /**
//  * Organization service implementation
//  */
// export const organizationService = {
//   /**
//    * Create a new organization for a participant
//    */
//   createOrganization: async (
//     participantId: string,
//     name: string,
//     description?: string
//   ): Promise<IOrganization> => {
//     try {
//       // Verify the user is a participant
//       const participant = await Participant.findById(participantId);
//       if (!participant) {
//         throw new ApiError(httpStatus.BAD_REQUEST, 'User is not a valid participant');
//       }

//       // Create the organization
//       const organization = await Organization.create({
//         name,
//         participantId: new mongoose.Types.ObjectId(participantId),
//         description,
//         workers: [],
//         pendingInvites: [],
//       });
      
//       return organization;
//     } catch (error) {
//       logger.error(`Error creating organization for participant ${participantId}:`, error);
//       throw error;
//     }
//   },

//   /**
//    * Get all organizations for a participant
//    */
//   getParticipantOrganizations: async (participantId: string): Promise<IOrganization[]> => {
//     try {
//       const organizations = await Organization.find({ participantId });
//       return organizations;
//     } catch (error) {
//       logger.error(`Error getting organizations for participant ${participantId}:`, error);
//       throw error;
//     }
//   },

//   /**
//    * Get organizations a support worker belongs to
//    */
//   getWorkerOrganizations: async (workerId: string): Promise<IOrganization[]> => {
//     try {
//       const organizations = await Organization.find({ 
//         'workers.workerId': new mongoose.Types.ObjectId(workerId) 
//       });
//       return organizations;
//     } catch (error) {
//       logger.error(`Error getting organizations for worker ${workerId}:`, error);
//       throw error;
//     }
//   },

//   /**
//    * Send an invite to a support worker
//    */
//   inviteWorker: async (
//     organizationId: string,
//     workerId: string,
//     proposedHourlyRate: number,
//     notes?: string
//   ): Promise<IOrganization> => {
//     try {
//       // Check if organization exists
//       const organization = await Organization.findById(organizationId);
//       if (!organization) {
//         throw new ApiError(httpStatus.NOT_FOUND, 'Organization not found');
//       }
      
//       // Check if worker exists and is a support worker
//       const worker = await Worker.findById(workerId);
//       if (!worker || worker.role !== UserRole.SUPPORT_WORKER) {
//         throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid support worker');
//       }
      
//       // Check if worker is already in the organization
//       const alreadyMember = organization.workers.some(w => 
//         w.workerId.toString() === workerId
//       );
//       if (alreadyMember) {
//         throw new ApiError(
//           httpStatus.BAD_REQUEST, 
//           'Worker is already a member of this organization'
//         );
//       }
      
//       // Check if there's already a pending invite for this worker
//       const hasPendingInvite = organization.pendingInvites.some(invite => 
//         invite.workerId.toString() === workerId && 
//         invite.status === InviteStatus.PENDING
//       );
//       if (hasPendingInvite) {
//         throw new ApiError(
//           httpStatus.BAD_REQUEST, 
//           'Worker already has a pending invite'
//         );
//       }
      
//       // Create the invite
//       const invite = {
//         workerId: new mongoose.Types.ObjectId(workerId),
//         inviteDate: new Date(),
//         status: InviteStatus.PENDING,
//         proposedHourlyRate,
//         notes
//       };
      
//       // Add to pending invites
//       organization.pendingInvites.push(invite);
//       await organization.save();
      
//       return organization;
//     } catch (error) {
//       logger.error(`Error inviting worker ${workerId} to organization ${organizationId}:`, error);
//       throw error;
//     }
//   },

//   /**
//    * Process a worker invite (admin function)
//    */
//   processInvite: async (
//     organizationId: string,
//     inviteId: string,
//     adminId: string,
//     status: InviteStatus,
//     adminNotes?: string,
//     declineReason?: string,
//     serviceAgreement?: ServiceAgreement
//   ): Promise<IOrganization> => {
//     try {
//       // Find the organization and invite
//       const organization = await Organization.findById(organizationId);
//       if (!organization) {
//         throw new ApiError(httpStatus.NOT_FOUND, 'Organization not found');
//       }
      
//       // Find the invite by its ID (using MongoDB's ObjectId)
//       const inviteIndex = organization.pendingInvites.findIndex(invite => 
//         invite._id.toString() === inviteId
//       );
      
//       if (inviteIndex === -1) {
//         throw new ApiError(httpStatus.NOT_FOUND, 'Invite not found');
//       }
      
//       const invite = organization.pendingInvites[inviteIndex];
      
//       // Only process if invite is pending
//       if (invite.status !== InviteStatus.PENDING) {
//         throw new ApiError(
//           httpStatus.BAD_REQUEST, 
//           'Invite has already been processed'
//         );
//       }
      
//       // Update invite status
//       invite.status = status;
//       invite.adminId = new mongoose.Types.ObjectId(adminId);
//       invite.responseDate = new Date();
//       invite.adminNotes = adminNotes;
      
//       if (status === InviteStatus.ACCEPTED) {
//         // Ensure service agreement is provided for accepted invites
//         if (!serviceAgreement) {
//           throw new ApiError(
//             httpStatus.BAD_REQUEST, 
//             'Service agreement required for accepting invite'
//           );
//         }
        
//         // Add service agreement to invite
//         invite.serviceAgreement = serviceAgreement;
        
//         // Add worker to organization with service agreement
//         organization.workers.push({
//           workerId: invite.workerId,
//           serviceAgreement,
//           joinedDate: new Date()
//         });
//       } else if (status === InviteStatus.DECLINED) {
//         // Add decline reason if provided
//         invite.declineReason = declineReason;
//       }
      
//       // Save organization changes
//       await organization.save();
      
//       return organization;
//     } catch (error) {
//       logger.error(`Error processing invite ${inviteId} in organization ${organizationId}:`, error);
//       throw error;
//     }
//   },

//   /**
//    * Get all pending invites for admin review
//    */
//   getPendingInvites: async (): Promise<{
//     organizationId: string;
//     organizationName: string;
//     participantId: string;
//     participantName: string;
//     invites: any[];
//   }[]> => {
//     try {
//       // Find all organizations with pending invites
//       const organizations = await Organization.find({
//         'pendingInvites.status': InviteStatus.PENDING
//       });
      
//       // Collect all relevant user IDs
//       const userIds = new Set<string>();
//       organizations.forEach(org => {
//         userIds.add(org.participantId.toString());
//         org.pendingInvites.forEach(invite => {
//           if (invite.status === InviteStatus.PENDING) {
//             userIds.add(invite.workerId.toString());
//           }
//         });
//       });
      
//       // Get user information in a single query
//       const users = await User.find({
//         _id: { $in: Array.from(userIds) }
//       });
      
//       // Create a map for quick lookup
//       const userMap = new Map();
//       users.forEach(user => {
//         userMap.set(user._id.toString(), `${user.firstName} ${user.lastName}`);
//       });
      
//       // Format the result
//       const result = organizations.map(org => {
//         const pendingInvites = org.pendingInvites
//           .filter(invite => invite.status === InviteStatus.PENDING)
//           .map(invite => ({
//             inviteId: invite._id,
//             workerId: invite.workerId,
//             workerName: userMap.get(invite.workerId.toString()),
//             inviteDate: invite.inviteDate,
//             proposedHourlyRate: invite.proposedHourlyRate,
//             notes: invite.notes
//           }));
        
//         return {
//           organizationId: org._id,
//           organizationName: org.name,
//           participantId: org.participantId,
//           participantName: userMap.get(org.participantId.toString()),
//           invites: pendingInvites
//         };
//       });
      
//       return result;
//     } catch (error) {
//       logger.error('Error getting pending invites:', error);
//       throw error;
//     }
//   },

//   /**
//    * Get all invites for a worker
//    */
//   getWorkerInvites: async (workerId: string): Promise<any[]> => {
//     try {
//       // Find all organizations with invites for this worker
//       const organizations = await Organization.find({
//         'pendingInvites.workerId': new mongoose.Types.ObjectId(workerId)
//       });
      
//       // Collect all participant IDs
//       const participantIds = organizations.map(org => org.participantId);
      
//       // Get participant information
//       const participants = await User.find({
//         _id: { $in: participantIds }
//       });
      
//       // Create a map for quick lookup
//       const participantMap = new Map();
//       participants.forEach(participant => {
//         participantMap.set(
//           participant._id.toString(), 
//           `${participant.firstName} ${participant.lastName}`
//         );
//       });
      
//       // Format the result
//       const invites = [];
//       organizations.forEach(org => {
//         org.pendingInvites
//           .filter(invite => invite.workerId.toString() === workerId)
//           .forEach(invite => {
//             invites.push({
//               inviteId: invite._id,
//               organizationId: org._id,
//               organizationName: org.name,
//               participantId: org.participantId,
//               participantName: participantMap.get(org.participantId.toString()),
//               status: invite.status,
//               inviteDate: invite.inviteDate,
//               proposedHourlyRate: invite.proposedHourlyRate,
//               notes: invite.notes,
//               adminNotes: invite.adminNotes,
//               responseDate: invite.responseDate,
//               declineReason: invite.declineReason,
//               serviceAgreement: invite.serviceAgreement
//             });
//           });
//       });
      
//       return invites;
//     } catch (error) {
//       logger.error(`Error getting invites for worker ${workerId}:`, error);
//       throw error;
//     }
//   },

//   /**
//    * Remove a worker from an organization
//    */
//   removeWorker: async (
//     organizationId: string,
//     workerId: string
//   ): Promise<IOrganization> => {
//     try {
//       // Check if organization exists
//       const organization = await Organization.findById(organizationId);
//       if (!organization) {
//         throw new ApiError(httpStatus.NOT_FOUND, 'Organization not found');
//       }
      
//       // Check if worker is in the organization
//       const workerIndex = organization.workers.findIndex(w => 
//         w.workerId.toString() === workerId
//       );
      
//       if (workerIndex === -1) {
//         throw new ApiError(
//           httpStatus.BAD_REQUEST, 
//           'Worker is not a member of this organization'
//         );
//       }
      
//       // Remove worker from organization
//       organization.workers.splice(workerIndex, 1);
//       await organization.save();
      
//       return organization;
//     } catch (error) {
//       logger.error(`Error removing worker ${workerId} from organization ${organizationId}:`, error);
//       throw error;
//     }
//   }
// };