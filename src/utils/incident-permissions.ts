import { UserRole } from "../types/user.types";
import ApiError from "./api-error";
import { IIncident } from "../models/incident.model";
import httpStatus from "http-status";

const checkIncidentPermissions = {
  canViewIncident: (incident: IIncident, userId: string, userRole: UserRole) => {
    if (userRole === UserRole.ADMIN) return true;
    return (
      incident.reportedBy.id.toString() === userId ||
      (incident.reportedAgainst && incident.reportedAgainst.id.toString() === userId)
    );
  },

  canCreateIncident: (userRole: UserRole) => {
    return userRole === UserRole.SUPPORT_WORKER;
  },

  canUpdateIncident: (incident: IIncident, userId: string, userRole: UserRole) => {
    if (incident.status !== "OPEN") {
      throw new ApiError(httpStatus.BAD_REQUEST, "Only OPEN incidents can be updated");
    }
    return userRole === UserRole.ADMIN || incident.reportedBy.id.toString() === userId;
  },

  canDeleteIncident: (incident: IIncident, userId: string, userRole: UserRole) => {
    return userRole === UserRole.ADMIN || incident.reportedBy.id.toString() === userId;
  },

  canResolveIncident: (userRole: UserRole) => {
    return userRole === UserRole.ADMIN;
    // If you want to allow participants to resolve, add:
    // || userRole === UserRole.PARTICIPANT
  },

  canChangeStatus: (userRole: UserRole) => {
    return userRole === UserRole.ADMIN;
  },
};

export default checkIncidentPermissions;
