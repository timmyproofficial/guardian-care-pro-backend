/**
 * Analytics Controller
 * Handles HTTP requests for analytics endpoints across all user roles
 */

import { Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { AnalyticsService } from '../services/analytics.service';
import { AdminAnalyticsService } from '../services/admin-analytics.service';
import { ParticipantAnalyticsService } from '../services/participant-analytics.service';
import { WorkerAnalyticsService } from '../services/worker-analytics.service';
import { UserRole } from '../types/user.types';
import { DateRangeType, AnalyticsFilters } from '../types/analytics.types';
import { successResponse, errorResponse } from '../utils/api-response';
import logger from '../utils/logger';

export const analyticsController = {
  /**
   * Get overview analytics based on user role
   * @route GET /api/analytics/overview
   */
  getOverviewAnalytics: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      const userId = req.user._id.toString();
      const userRole = req.user.role;

      // Parse query parameters
      const {
        dateRange = DateRangeType.MONTH,
        startDate,
        endDate,
        comparison = 'true'
      } = req.query;

      // Get date range
      const range = startDate && endDate
        ? AnalyticsService.getDateRange(
            DateRangeType.CUSTOM, new Date(startDate as string), new Date(endDate as string)
        )
        : AnalyticsService.getDateRange(dateRange as DateRangeType);

      const includeComparison = comparison === 'true';

      let analytics;

      // Route to appropriate service based on user role
      switch (userRole) {
        case UserRole.ADMIN:
          analytics = await AdminAnalyticsService.getOverviewAnalytics(range, includeComparison);
          break;

        case UserRole.PARTICIPANT:
          analytics = await ParticipantAnalyticsService.getOverviewAnalytics(userId, range, includeComparison);
          break;

        case UserRole.SUPPORT_WORKER:
          analytics = await WorkerAnalyticsService.getOverviewAnalytics(userId, range, includeComparison);
          break;

        default:
          return res.status(httpStatus.FORBIDDEN).json(
            errorResponse('Analytics not available for this user role', httpStatus.FORBIDDEN)
          );
      }

      return res.json(
        successResponse(
          {
            analytics,
            dateRange: range,
            userRole
          },
          'Overview analytics retrieved successfully'
        )
      );
    } catch (error) {
      logger.error('Error getting overview analytics:', error);
      return next(error);
    }
  },

  /**
   * Get user analytics (admin only)
   * @route GET /api/analytics/admin/users
   */
  getAdminUserAnalytics: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      // Only admins can access this endpoint
      if (req.user.role !== UserRole.ADMIN) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only administrators can access user analytics', httpStatus.FORBIDDEN)
        );
      }

      const {
        dateRange = DateRangeType.MONTH,
        startDate,
        endDate
      } = req.query;

      const range = startDate && endDate
        ? AnalyticsService.getDateRange(
            DateRangeType.CUSTOM, new Date(startDate as string), new Date(endDate as string)
        )
        : AnalyticsService.getDateRange(dateRange as DateRangeType);

      const analytics = await AdminAnalyticsService.getUserAnalytics(range);

      return res.json(
        successResponse(
          {
            analytics,
            dateRange: range
          },
          'User analytics retrieved successfully'
        )
      );
    } catch (error) {
      logger.error('Error getting admin user analytics:', error);
      return next(error);
    }
  },

  /**
   * Get financial analytics (admin only)
   * @route GET /api/analytics/admin/financial
   */
  getAdminFinancialAnalytics: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      // Only admins can access this endpoint
      if (req.user.role !== UserRole.ADMIN) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only administrators can access financial analytics', httpStatus.FORBIDDEN)
        );
      }

      const {
        dateRange = DateRangeType.MONTH,
        startDate,
        endDate
      } = req.query;

      const range = startDate && endDate
        ? AnalyticsService.getDateRange(
            DateRangeType.CUSTOM, new Date(startDate as string), new Date(endDate as string)
        )
        : AnalyticsService.getDateRange(dateRange as DateRangeType);

      const analytics = await AdminAnalyticsService.getFinancialAnalytics(range);

      return res.json(
        successResponse(
          {
            analytics,
            dateRange: range
          },
          'Financial analytics retrieved successfully'
        )
      );
    } catch (error) {
      logger.error('Error getting admin financial analytics:', error);
      return next(error);
    }
  },

  /**
   * Get participant service analytics
   * @route GET /api/analytics/participant/services
   */
  getParticipantServiceAnalytics: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      // Only participants can access this endpoint
      if (req.user.role !== UserRole.PARTICIPANT) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only participants can access service analytics', httpStatus.FORBIDDEN)
        );
      }

      const participantId = req.user._id.toString();

      const {
        dateRange = DateRangeType.MONTH,
        startDate,
        endDate
      } = req.query;

      const range = startDate && endDate
        ? AnalyticsService.getDateRange(
            DateRangeType.CUSTOM, new Date(startDate as string), new Date(endDate as string)
        )
        : AnalyticsService.getDateRange(dateRange as DateRangeType);

      const analytics = await ParticipantAnalyticsService.getServiceAnalytics(participantId, range);

      return res.json(
        successResponse(
          {
            analytics,
            dateRange: range
          },
          'Service analytics retrieved successfully'
        )
      );
    } catch (error) {
      logger.error('Error getting participant service analytics:', error);
      return next(error);
    }
  },

  /**
   * Get worker financial analytics
   * @route GET /api/analytics/worker/financial
   */
  getWorkerFinancialAnalytics: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      // Only support workers can access this endpoint
      if (req.user.role !== UserRole.SUPPORT_WORKER) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only support workers can access financial analytics', httpStatus.FORBIDDEN)
        );
      }

      const workerId = req.user._id.toString();

      const {
        dateRange = DateRangeType.MONTH,
        startDate,
        endDate
      } = req.query;

      const range = startDate && endDate
        ? AnalyticsService.getDateRange(
            DateRangeType.CUSTOM, new Date(startDate as string), new Date(endDate as string)
        )
        : AnalyticsService.getDateRange(dateRange as DateRangeType);

      const analytics = await WorkerAnalyticsService.getFinancialAnalytics(workerId, range);

      return res.json(
        successResponse(
          {
            analytics,
            dateRange: range
          },
          'Financial analytics retrieved successfully'
        )
      );
    } catch (error) {
      logger.error('Error getting worker financial analytics:', error);
      return next(error);
    }
  },

  /**
   * Get worker schedule analytics
   * @route GET /api/analytics/worker/schedule
   */
  getWorkerScheduleAnalytics: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      // Only support workers can access this endpoint
      if (req.user.role !== UserRole.SUPPORT_WORKER) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only support workers can access schedule analytics', httpStatus.FORBIDDEN)
        );
      }

      const workerId = req.user._id.toString();

      const {
        dateRange = DateRangeType.MONTH,
        startDate,
        endDate
      } = req.query;

      const range = startDate && endDate
        ? AnalyticsService.getDateRange(
            DateRangeType.CUSTOM, new Date(startDate as string), new Date(endDate as string)
        )
        : AnalyticsService.getDateRange(dateRange as DateRangeType);

      const analytics = await WorkerAnalyticsService.getScheduleAnalytics(workerId, range);

      return res.json(
        successResponse(
          {
            analytics,
            dateRange: range
          },
          'Schedule analytics retrieved successfully'
        )
      );
    } catch (error) {
      logger.error('Error getting worker schedule analytics:', error);
      return next(error);
    }
  },

  /**
   * Get worker performance metrics
   * @route GET /api/analytics/worker/performance
   */
  getWorkerPerformanceAnalytics: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      // Only support workers can access this endpoint
      if (req.user.role !== UserRole.SUPPORT_WORKER) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only support workers can access performance analytics', httpStatus.FORBIDDEN)
        );
      }

      const workerId = req.user._id.toString();

      const {
        dateRange = DateRangeType.MONTH,
        startDate,
        endDate
      } = req.query;

      const range = startDate && endDate
        ? AnalyticsService.getDateRange(
            DateRangeType.CUSTOM, new Date(startDate as string), new Date(endDate as string)
        )
        : AnalyticsService.getDateRange(dateRange as DateRangeType);

      // Get skill utilization
      const skillUtilization = await WorkerAnalyticsService.getSkillUtilization(workerId, range);
      
      // Get availability vs utilization
      const availabilityComparison = await WorkerAnalyticsService.getAvailabilityVsUtilization(workerId, range);
      
      // Get document expiry alerts
      const documentAlerts = await WorkerAnalyticsService.getDocumentExpiryAlerts(workerId);

      return res.json(
        successResponse(
          {
            skillUtilization,
            availabilityComparison,
            documentAlerts,
            dateRange: range
          },
          'Performance analytics retrieved successfully'
        )
      );
    } catch (error) {
      logger.error('Error getting worker performance analytics:', error);
      return next(error);
    }
  },

  /**
   * Get filtered analytics (admin only)
   * @route POST /api/analytics/filtered
   */
  getFilteredAnalytics: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      // Only admins can access filtered analytics
      if (req.user.role !== UserRole.ADMIN) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only administrators can access filtered analytics', httpStatus.FORBIDDEN)
        );
      }

      const filters: AnalyticsFilters = req.body;

      const analytics = await AdminAnalyticsService.getFilteredAnalytics(filters);

      return res.json(
        successResponse(
          {
            analytics,
            filters
          },
          'Filtered analytics retrieved successfully'
        )
      );
    } catch (error) {
      logger.error('Error getting filtered analytics:', error);
      return next(error);
    }
  },

  /**
   * Get platform metrics summary (admin only)
   * @route GET /api/analytics/platform/summary
   */
  getPlatformSummary: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      // Only admins can access platform summary
      if (req.user.role !== UserRole.ADMIN) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only administrators can access platform summary', httpStatus.FORBIDDEN)
        );
      }

      const {
        dateRange = DateRangeType.MONTH,
        startDate,
        endDate
      } = req.query;

      const range = startDate && endDate
        ? AnalyticsService.getDateRange(
            DateRangeType.CUSTOM, new Date(startDate as string), new Date(endDate as string)
        )
        : AnalyticsService.getDateRange(dateRange as DateRangeType);

      // Get comprehensive platform metrics
      const [
        userGrowth,
        shiftMetrics,
        financialMetrics,
        organizationMetrics
      ] = await Promise.all([
        AnalyticsService.getUserGrowthMetrics(range),
        AnalyticsService.getShiftMetrics(range),
        AnalyticsService.getFinancialMetrics(range),
        AnalyticsService.getOrganizationMetrics()
      ]);

      const platformSummary = {
        userGrowth,
        shiftMetrics,
        financialMetrics,
        organizationMetrics,
        dateRange: range
      };

      return res.json(
        successResponse(
          { platformSummary },
          'Platform summary retrieved successfully'
        )
      );
    } catch (error) {
      logger.error('Error getting platform summary:', error);
      return next(error);
    }
  },

  /**
   * Export analytics data (all roles)
   * @route POST /api/analytics/export
   */
  exportAnalyticsData: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      const userId = req.user._id.toString();
      const userRole = req.user.role;

      const {
        dateRange = DateRangeType.MONTH,
        startDate,
        endDate,
        format = 'json'
      } = req.body;

      const range = startDate && endDate
        ? AnalyticsService.getDateRange(DateRangeType.CUSTOM, new Date(startDate), new Date(endDate))
        : AnalyticsService.getDateRange(dateRange as DateRangeType);

      let exportData;

      // Get data based on user role
      switch (userRole) {
        case UserRole.ADMIN:
          exportData = await AdminAnalyticsService.getOverviewAnalytics(range, true);
          break;

        case UserRole.PARTICIPANT:
          exportData = await ParticipantAnalyticsService.getOverviewAnalytics(userId, range, true);
          break;

        case UserRole.SUPPORT_WORKER:
          exportData = await WorkerAnalyticsService.getOverviewAnalytics(userId, range, true);
          break;

        default:
          return res.status(httpStatus.FORBIDDEN).json(
            errorResponse('Export not available for this user role', httpStatus.FORBIDDEN)
          );
      }

      // For now, returning JSON format
      // In a real implementation, this could generate CSV or PDF
      return res.json(
        successResponse(
          {
            exportData,
            dateRange: range,
            format,
            exportedAt: new Date()
          },
          'Analytics data exported successfully'
        )
      );
    } catch (error) {
      logger.error('Error exporting analytics data:', error);
      return next(error);
    }
  },

  /**
   * Get real-time metrics (admin only)
   * @route GET /api/analytics/realtime
   */
  getRealtimeMetrics: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      // Only admins can access real-time metrics
      if (req.user.role !== UserRole.ADMIN) {
        return res.status(httpStatus.FORBIDDEN).json(
          errorResponse('Only administrators can access real-time metrics', httpStatus.FORBIDDEN)
        );
      }

      // Get today's date range
      const todayRange = AnalyticsService.getDateRange(DateRangeType.TODAY);

      // Get real-time metrics for today
      const [
        todayUserGrowth,
        todayShiftMetrics,
        platformUsage
      ] = await Promise.all([
        AnalyticsService.getUserGrowthMetrics(todayRange),
        AnalyticsService.getShiftMetrics(todayRange),
        AnalyticsService.getPlatformUsageTrends(todayRange)
      ]);

      const realtimeMetrics = {
        activeUsers: todayUserGrowth.new,
        shiftsToday: todayShiftMetrics.total,
        completedShiftsToday: todayShiftMetrics.byStatus.completed || 0,
        platformUsage,
        lastUpdated: new Date()
      };

      return res.json(
        successResponse(
          { realtimeMetrics },
          'Real-time metrics retrieved successfully'
        )
      );
    } catch (error) {
      logger.error('Error getting real-time metrics:', error);
      return next(error);
    }
  }
};