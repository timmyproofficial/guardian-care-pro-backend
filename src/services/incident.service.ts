/**
 * Incident service
 * Handles incident-related business logic and database operations
 */

import httpStatus from "http-status";
import mongoose from "mongoose";
import Incident, { IIncident } from "../models/incident.model";
import Shift from "../models/shift.model";
import User from "../models/user.model";
// import { UserRole } from '../types/user.types';
import ApiError from "../utils/api-error";
import logger from "../utils/logger";
import { UserRole } from "../types/user.types";
import checkIncidentPermissions from "../utils/incident-permissions";

/**
 * Interface for incident creation input
 */
interface CreateIncidentInput {
  shiftId: string;
  title: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  urlLinks?: string[];
}

/**
 * Interface for incident filter options
 */
interface IncidentFilterOptions {
  status?: "OPEN" | "IN_REVIEW" | "RESOLVED" | "REJECTED";
  severity?: "LOW" | "MEDIUM" | "HIGH";
  shiftId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Interface for incident resolution input
 */
interface ResolveIncidentInput {
  resolutionNote: string;
  resolvedBy: string;
}

/**
 * Interface for pagination options
 */
interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Incident service implementation
 */
export const incidentService = {
  /**
   * Create a new incident
   */
  createIncident: async (incidentData: CreateIncidentInput, user: { id: string; role: UserRole }) => {
    try {
      // Check if user can create incidents
      if (!checkIncidentPermissions.canCreateIncident(user.role)) {
        throw new ApiError(httpStatus.FORBIDDEN, "You are not authorized to create incidents");
      }

      const shift = await Shift.findOne({ shiftId: incidentData.shiftId });

      if (!shift) {
        throw new ApiError(httpStatus.NOT_FOUND, "Shift not found");
      }

      // Verify the reporter is the worker of the shift
      if (shift.workerId!.toString() !== user.id) {
        throw new ApiError(httpStatus.FORBIDDEN, "You can only report incidents for your own shifts");
      }

      const incident = await Incident.create({
        ...incidentData,
        status: "OPEN",
        reportedBy: shift.workerId,
        reportedAgainst: shift.participantId,
      });

      // Manually attach the shift details instead of population
      const incidentObj = incident.toObject();

      // Populate user details normally
      const populatedIncident = await Incident.findById(incident._id).populate([
        { path: "reportedBy", select: "firstName lastName email" },
        { path: "reportedAgainst", select: "firstName lastName email" },
      ]);

      logger.info(`New incident created: ${incident._id}`);
      return { ...populatedIncident?.toObject(), shiftId: incidentObj.shiftId };
    } catch (error) {
      logger.error("Error creating incident:", error);
      throw error;
    }
  },
  /**
   * Get all incidents with filtering and pagination
   */
  getAllIncidents: async (
    filters: IncidentFilterOptions = {},
    pagination: PaginationOptions = {},
    user: { id: string; role: UserRole },
  ) => {
    try {
      // Build filter query
      const query: any = {};

      if (filters.status) query.status = filters.status;
      if (filters.severity) query.severity = filters.severity;
      if (filters.shiftId) query.shiftId = filters.shiftId;

      // Date range filtering
      if (filters.dateFrom || filters.dateTo) {
        query.createdAt = {};
        if (filters.dateFrom) query.createdAt.$gte = filters.dateFrom;
        if (filters.dateTo) query.createdAt.$lte = filters.dateTo;
      }

      // If user is not admin, only show incidents they're involved in
      if (user.role !== UserRole.ADMIN) {
        query.$or = [{ reportedBy: user.id }, { reportedAgainst: user.id }];
      }

      // Pagination setup
      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const skip = (page - 1) * limit;

      // Sorting setup
      const sortBy = pagination.sortBy || "createdAt";
      const sortOrder = pagination.sortOrder === "asc" ? 1 : -1;
      const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder };

      // Execute query with pagination
      const [incidents, totalCount] = await Promise.all([
        Incident.find(query)
          .populate([
            {
              path: "reportedBy",
              select: "firstName lastName email",
            },
            {
              path: "reportedAgainst",
              select: "firstName lastName email",
            },
            {
              path: "resolvedBy",
              select: "firstName lastName email",
            },
          ])
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Incident.countDocuments(query),
      ]);

      // Manually populate shift information
      const shiftIds = [...new Set(incidents.map((i) => i.shiftId))];
      const shifts = await Shift.find({ shiftId: { $in: shiftIds } })
        .select("shiftId title startTime endTime")
        .lean();

      const incidentsWithShifts = incidents.map((incident) => {
        const shift = shifts.find((s) => s.shiftId === incident.shiftId);
        return {
          ...incident,
          shift: shift || null, // Add shift details under a new property
        };
      });

      const totalPages = Math.ceil(totalCount / limit);

      return {
        incidents: incidentsWithShifts,
        totalCount,
        totalPages,
        currentPage: page,
      };
    } catch (error) {
      logger.error("Error fetching all incidents:", error);
      throw error;
    }
  },

  /**
   * Get incidents for a specific shift
   */
  getIncidentsByShift: async (shiftId: string, user: { id: string; role: UserRole }) => {
    try {
      // Validate shift exists
      const shift = await Shift.findOne({ shiftId });
      if (!shift) {
        throw new ApiError(httpStatus.NOT_FOUND, "Shift not found");
      }

      // Check if user is involved in this shift
      if (
        user.role !== UserRole.ADMIN &&
        shift.workerId?.id!.toString() !== user.id &&
        shift.participantId.id.toString() !== user.id
      ) {
        throw new ApiError(httpStatus.FORBIDDEN, "You are not authorized to view incidents for this shift");
      }

      const incidents = await Incident.find({ shiftId })
        .populate("reportedBy", "firstName lastName email")
        .populate("reportedAgainst", "firstName lastName email")
        .populate("resolvedBy", "firstName lastName email")
        .sort({ createdAt: -1 });

      // Filter incidents based on user permissions
      return incidents.filter((incident) => checkIncidentPermissions.canViewIncident(incident, user.id, user.role));
    } catch (error) {
      logger.error("Error fetching incidents by shift:", error);
      throw error;
    }
  },

  /**
   * Get incidents reported by a specific user
   */
  getIncidentsByReporter: async (userId: string): Promise<IIncident[]> => {
    try {
      const incidents = await Incident.find({ reportedBy: userId })
        .populate("shiftId", "title startTime endTime")
        .populate("reportedAgainst", "firstName lastName email")
        .populate("resolvedBy", "firstName lastName email")
        .sort({ createdAt: -1 });

      return incidents;
    } catch (error) {
      logger.error("Error fetching incidents by reporter:", error);
      throw error;
    }
  },

  /**
   * Get incidents reported against a specific user
   */
  getIncidentsAgainstUser: async (userId: string): Promise<IIncident[]> => {
    try {
      const incidents = await Incident.find({ reportedAgainst: userId })
        .populate("shiftId", "title startTime endTime")
        .populate("reportedBy", "firstName lastName email")
        .populate("resolvedBy", "firstName lastName email")
        .sort({ createdAt: -1 });

      return incidents;
    } catch (error) {
      logger.error("Error fetching incidents against user:", error);
      throw error;
    }
  },

  /**
   * Get a single incident by ID
   */
  getIncidentById: async (incidentId: string, user: { id: string; role: UserRole }): Promise<IIncident> => {
    try {
      if (!mongoose.Types.ObjectId.isValid(incidentId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid incident ID format");
      }

      const incident = await Incident.findById(incidentId)
        .populate("reportedBy", "firstName lastName email")
        .populate("reportedAgainst", "firstName lastName email")
        .populate("resolvedBy", "firstName lastName email");

      if (!incident) {
        throw new ApiError(httpStatus.NOT_FOUND, "Incident not found");
      }

      // Check if user can view this incident
      if (!checkIncidentPermissions.canViewIncident(incident, user.id, user.role)) {
        throw new ApiError(httpStatus.FORBIDDEN, "You are not authorized to view this incident");
      }

      return incident;
    } catch (error) {
      logger.error(`Error fetching incident with ID ${incidentId}:`, error);
      throw error;
    }
  },

  /**
   * Update incident status
   */
  updateIncidentStatus: async (
    incidentId: string,
    payload: {
      status: "OPEN" | "IN_REVIEW" | "RESOLVED" | "REJECTED";
      updatedBy?: string;
    },
    user: { id: string; role: UserRole },
  ): Promise<IIncident> => {
    try {
      // Check if user can change status
      if (!checkIncidentPermissions.canChangeStatus(user.role)) {
        throw new ApiError(httpStatus.FORBIDDEN, "You are not authorized to change incident status");
      }

      // Basic validation
      if (!mongoose.Types.ObjectId.isValid(incidentId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid incident ID");
      }

      const validStatuses = ["OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"];
      if (!validStatuses.includes(payload.status)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid status value");
      }

      // Prepare update data
      const updateData: any = {
        status: payload.status,
      };

      // Only include updatedBy if provided
      if (payload.updatedBy) {
        updateData.updatedBy = new mongoose.Types.ObjectId(payload.updatedBy);
      }

      // Simple find and update
      const incident = await Incident.findByIdAndUpdate(incidentId, updateData, { new: true });

      if (!incident) {
        throw new ApiError(httpStatus.NOT_FOUND, "Incident not found");
      }

      logger.info(`Incident ${incidentId} status updated to ${payload.status}`);
      return incident;
    } catch (error) {
      logger.error("Error updating incident status:", error);
      throw error;
    }
  },
  /**
   * Resolve an incident with resolution notes
   */
  resolveIncident: async (
    incidentId: string,
    { resolutionNote, resolvedBy }: ResolveIncidentInput,
    user: { id: string; role: UserRole },
  ): Promise<IIncident> => {
    try {
      // Check if user can resolve incidents
      if (!checkIncidentPermissions.canResolveIncident(user.role)) {
        throw new ApiError(httpStatus.FORBIDDEN, "You are not authorized to resolve incidents");
      }

      // Validate resolver matches the authenticated user
      if (resolvedBy !== user.id) {
        throw new ApiError(httpStatus.FORBIDDEN, "You can only resolve incidents as yourself");
      }
      // Validate incident ID format
      if (!mongoose.Types.ObjectId.isValid(incidentId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid incident ID");
      }

      // Validate resolver exists
      const resolver = await User.findById(resolvedBy);
      if (!resolver) {
        throw new ApiError(httpStatus.NOT_FOUND, "Resolver user not found");
      }

      // Find and validate incident
      const incident = await Incident.findById(incidentId);
      if (!incident) {
        throw new ApiError(httpStatus.NOT_FOUND, "Incident not found");
      }

      if (incident.status === "RESOLVED") {
        throw new ApiError(httpStatus.BAD_REQUEST, "Incident is already resolved");
      }

      // Update incident
      const updateData = {
        status: "RESOLVED",
        resolutionNote,
        resolvedBy: new mongoose.Types.ObjectId(resolvedBy),
        resolvedAt: new Date(),
      };

      const updatedIncident = await Incident.findByIdAndUpdate(incidentId, updateData, { new: true }).populate([
        { path: "reportedBy", select: "firstName lastName email" },
        { path: "reportedAgainst", select: "firstName lastName email" },
        { path: "resolvedBy", select: "firstName lastName email" },
      ]);

      if (!updatedIncident) {
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to update incident");
      }

      logger.info(`Incident ${incidentId} resolved by ${resolvedBy}`);
      return updatedIncident;
    } catch (error) {
      logger.error("Error resolving incident:", error);
      throw error;
    }
  },

  /**
   * Update an incident
   */
  updateIncident: async (
    incidentId: string,
    data: Partial<IIncident>, // Use Partial to allow updating only some fields
    user: { id: string; role: UserRole },
  ): Promise<IIncident> => {
    // Return the updated incident
    try {
      if (!mongoose.Types.ObjectId.isValid(incidentId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid incident ID");
      }

      const incident = await Incident.findById(incidentId);
      if (!incident) {
        throw new ApiError(httpStatus.NOT_FOUND, "Incident not found");
      }

      // Check if user can update this incident
      if (!checkIncidentPermissions.canUpdateIncident(incident, user.id, user.role)) {
        throw new ApiError(httpStatus.FORBIDDEN, "You are not authorized to update this incident");
      }

      // Create update object with only allowed fields
      const updateData: Partial<IIncident> = {
        title: data.title,
        description: data.description,
        severity: data.severity,
        urlLinks: data.urlLinks,
        updatedAt: new Date(),
      };

      // Remove undefined fields
      (Object.keys(updateData) as (keyof IIncident)[]).forEach(
        (key) => updateData[key] === undefined && delete updateData[key],
      );

      const updatedIncident = await Incident.findByIdAndUpdate(
        incidentId,
        updateData,
        { new: true }, // Return the updated document
      ).populate([
        { path: "reportedBy", select: "firstName lastName email" },
        { path: "reportedAgainst", select: "firstName lastName email" },
      ]);

      if (!updatedIncident) {
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to update incident");
      }

      logger.info(`Incident ${incidentId} updated by user ${user.id}`);
      return updatedIncident;
    } catch (error) {
      logger.error("Error updating incident:", error);
      throw error;
    }
  },

  /**
   * Delete an incident
   */
  deleteIncident: async (incidentId: string, user: { id: string; role: UserRole }): Promise<void> => {
    try {
      if (!mongoose.Types.ObjectId.isValid(incidentId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid incident ID");
      }

      const incident = await Incident.findById(incidentId);
      if (!incident) {
        throw new ApiError(httpStatus.NOT_FOUND, "Incident not found");
      }

      // Check if user can delete this incident
      if (!checkIncidentPermissions.canDeleteIncident(incident, user.id, user.role)) {
        throw new ApiError(httpStatus.FORBIDDEN, "You are not authorized to delete this incident");
      }

      await Incident.findByIdAndDelete(incidentId);

      logger.info(`Incident ${incidentId} deleted by user ${user.id}`);
    } catch (error) {
      logger.error("Error deleting incident:", error);
      throw error;
    }
  },

  /**
   * Get incident statistics
   */
  getIncidentStatistics: async (
    filters: IncidentFilterOptions = {},
  ): Promise<{
    totalIncidents: number;
    byStatus: Record<string, number>;
    bySeverity: Record<string, number>;
    resolvedIncidents: number;
    averageResolutionTime: number;
  }> => {
    try {
      // Build base query
      const baseQuery: any = {};
      if (filters.dateFrom || filters.dateTo) {
        baseQuery.createdAt = {};
        if (filters.dateFrom) baseQuery.createdAt.$gte = filters.dateFrom;
        if (filters.dateTo) baseQuery.createdAt.$lte = filters.dateTo;
      }

      // Aggregate statistics
      const [totalIncidents, statusStats, severityStats, resolutionStats] = await Promise.all([
        Incident.countDocuments(baseQuery),

        Incident.aggregate([{ $match: baseQuery }, { $group: { _id: "$status", count: { $sum: 1 } } }]),

        Incident.aggregate([{ $match: baseQuery }, { $group: { _id: "$severity", count: { $sum: 1 } } }]),

        Incident.aggregate([
          {
            $match: {
              ...baseQuery,
              status: "RESOLVED",
              resolvedAt: { $exists: true },
            },
          },
          {
            $addFields: {
              resolutionTime: {
                $subtract: ["$resolvedAt", "$createdAt"],
              },
            },
          },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              avgResolutionTime: { $avg: "$resolutionTime" },
            },
          },
        ]),
      ]);

      // Format statistics
      const byStatus = statusStats.reduce(
        (acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        },
        {} as Record<string, number>,
      );

      const bySeverity = severityStats.reduce(
        (acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        },
        {} as Record<string, number>,
      );

      const resolvedIncidents = resolutionStats[0]?.count || 0;
      const averageResolutionTime = resolutionStats[0]?.avgResolutionTime || 0;

      return {
        totalIncidents,
        byStatus,
        bySeverity,
        resolvedIncidents,
        averageResolutionTime: Math.round(averageResolutionTime / (1000 * 60 * 60)), // Convert to hours
      };
    } catch (error) {
      logger.error("Error fetching incident statistics:", error);
      throw error;
    }
  },
};
