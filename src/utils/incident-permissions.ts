import { UserRole } from '../types/user.types';
import ApiError from './api-error';
import { IIncident } from '../models/incident.model';
import httpStatus from 'http-status';

/**
 * Helper function to safely extract user ID from populated or non-populated user field
 */
const extractUserId = (userField: any): string => {
  if (!userField) return '';

  // If it's a populated object with _id or id
  if (typeof userField === 'object' && (userField._id || userField.id)) {
    return (userField._id || userField.id).toString();
  }

  // If it's just an ObjectId
  return userField.toString();
};

const checkIncidentPermissions = {
  canViewIncident: (incident: IIncident, userId: string, userRole: UserRole) => {
    if (userRole === UserRole.ADMIN) return true;

    const reportedByUserId = extractUserId(incident.reportedBy);
    const reportedAgainstUserId = extractUserId(incident.reportedAgainst);

    return reportedByUserId === userId || (reportedAgainstUserId && reportedAgainstUserId === userId);
  },

  canCreateIncident: (userRole: UserRole) => {
    return userRole === UserRole.SUPPORT_WORKER;
  },

  canUpdateIncident: (incident: IIncident, userId: string, userRole: UserRole) => {
    if (incident.status !== 'OPEN') {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Only OPEN incidents can be updated');
    }

    // Admin can update any incident
    if (userRole === UserRole.ADMIN) return true;

    // Support worker can only update incidents they reported
    const reportedByUserId = extractUserId(incident.reportedBy);
    if (userRole === UserRole.SUPPORT_WORKER && reportedByUserId === userId) {
      return true;
    }

    return false;
  },

  canDeleteIncident: (incident: IIncident, userId: string, userRole: UserRole) => {
    // Admin can delete any incident
    if (userRole === UserRole.ADMIN) return true;

    // User can delete incidents they reported
    const reportedByUserId = extractUserId(incident.reportedBy);
    return reportedByUserId === userId;
  },

  // changed signatures: now accept the incident + userId + role so we can check "reportedAgainst"
  canResolveIncident: (incident: IIncident, userId: string, userRole: UserRole) => {
    // Admin can always resolve
    if (userRole === UserRole.ADMIN) return true;

    // The participant the incident is reported against can resolve
    const reportedAgainstUserId = extractUserId(incident.reportedAgainst);
    if (reportedAgainstUserId && reportedAgainstUserId === userId) return true;

    return false;
    // If you want to allow other roles later, extend here
  },

  canChangeStatus: (incident: IIncident, userId: string, userRole: UserRole) => {
    // Admin can change status
    if (userRole === UserRole.ADMIN) return true;

    // The participant the incident is reported against can also change status
    const reportedAgainstUserId = extractUserId(incident.reportedAgainst);
    if (reportedAgainstUserId && reportedAgainstUserId === userId) return true;

    return false;
  },
};

export default checkIncidentPermissions;
