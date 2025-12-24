/**
 * Incident controller
 * Handles HTTP requests related to incident management
 */

import { Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import { incidentService } from '../services/incident.service';
import { successResponse } from '../utils/api-response';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

const incidentController = {
  /**
   * Create a new incident
   * @route POST /api/v1/v1/incidents
   */
  createIncident: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { shiftId, title, description, severity, urlLinks } = req.body;

      const incident = await incidentService.createIncident(
        {
          shiftId,
          title,
          description,
          severity,
          urlLinks,
        },
        { id: req.user!.id, role: req.user!.role },
      );

      res.status(httpStatus.CREATED).json(successResponse(incident, 'Incident created successfully'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get all incidents with filtering and pagination
   * @route GET /api/v1/v1/incidents
   */
  getAllIncidents: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const allowedStatuses = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED'] as const;
      const statusQuery = req.query.status as string | undefined;
      const allowedSeverities = ['LOW', 'MEDIUM', 'HIGH'] as const;
      const severityQuery = req.query.severity as string | undefined;
      const filters = {
        status: allowedStatuses.includes(statusQuery as any)
          ? (statusQuery as (typeof allowedStatuses)[number])
          : undefined,
        severity: allowedSeverities.includes(severityQuery as any)
          ? (severityQuery as (typeof allowedSeverities)[number])
          : undefined,
        shiftId: req.query.shiftId as string,
        reportedBy: req.query.reportedBy as string,
        reportedAgainst: req.query.reportedAgainst as string,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      };

      const pagination = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
      };

      const result = await incidentService.getAllIncidents(filters, pagination, {
        id: req.user!.id,
        role: req.user!.role,
      });

      res.json(successResponse(result, 'Incidents retrieved successfully'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get incidents for a specific shift
   * @route GET /api/v1/v1/incidents/shift/:shiftId
   */
  getIncidentsByShift: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { shiftId } = req.params;
      const incidents = await incidentService.getIncidentsByShift(shiftId, { id: req.user!.id, role: req.user!.role });

      res.json(successResponse(incidents, 'Shift incidents retrieved successfully'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get incidents reported by current user
   * @route GET /api/v1/v1/incidents/my-reports/:id
   */
  getMyReports: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.params?.id;
      const incidents = await incidentService.getIncidentsByReporter(userId);

      res.json(successResponse(incidents, 'User reports retrieved successfully'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get incidents reported against current user
   * @route GET /api/v1/v1/incidents/against-me/:id
   */
  getIncidentsAgainstMe: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.params?.id;
      const incidents = await incidentService.getIncidentsAgainstUser(userId);

      res.json(successResponse(incidents, 'Incidents against user retrieved successfully'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get a single incident by ID
   * @route GET /api/v1/v1/incidents/:id
   */
  getIncidentById: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const incident = await incidentService.getIncidentById(id, { id: req.user!.id, role: req.user!.role });

      res.json(successResponse(incident, 'Incident retrieved successfully'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update incident status (admin action)
   * @route PATCH /api/v1/v1/incidents/:id/status
   */
  updateIncidentStatus: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status, updatedBy } = req.body;

      const incident = await incidentService.updateIncidentStatus(
        id,
        { status, updatedBy },
        { id: req.user!.id, role: req.user!.role },
      );

      res.json(successResponse(incident, 'Incident status updated successfully'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Resolve an incident (admin action)
   * @route PATCH /api/v1/v1/incidents/:id/resolve
   */
  resolveIncident: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { resolutionNote, resolvedBy } = req.body;

      const incident = await incidentService.resolveIncident(
        id,
        {
          resolutionNote,
          resolvedBy,
        },
        { id: req.user!.id, role: req.user!.role },
      );

      res.json(successResponse(incident, 'Incident resolved successfully'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete an incident (admin action)
   * @route DELETE /api/v1/v1/incidents/:id
   */
  deleteIncident: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await incidentService.deleteIncident(id, { id: req.user!.id, role: req.user!.role });

      res.json(successResponse({}, 'Incident deleted successfully'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update incident by id
   */

  updateIncident: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const updatedIncident = await incidentService.updateIncident(req.params.id, req.body, {
        id: req.user!.id,
        role: req.user!.role,
      });
      res.json({
        success: true,
        code: httpStatus.OK,
        message: 'Incident updated successfully',
        data: updatedIncident,
      });
    } catch (error) {
      next(error);
    }
  },
  /**
   * Get incident statistics (admin action)
   * @route GET /api/v1/v1/incidents/statistics
   */
  getIncidentStatistics: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const filters = {
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      };

      const statistics = await incidentService.getIncidentStatistics(filters);

      res.json(successResponse(statistics, 'Incident statistics retrieved successfully'));
    } catch (error) {
      next(error);
    }
  },
};

export default incidentController;
