/**
 * Dashboard Analytics routes
 * Provides endpoints for retrieving analytics data for all user roles
 */

import express from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import validate from '../middlewares/validate.middleware';
import { analyticsValidation } from '../utils/analytics.validation';
import { UserRole } from '../types/user.types';
import { Request } from 'express';

const router = express.Router();

/**
 * @route GET /api/analytics/overview
 * @desc Get role-specific dashboard overview analytics
 * @access Private (All authenticated users)
 * @query {string} [dateRange] - Date range type (today, week, month, quarter, year, custom)
 * @query {string} [startDate] - Custom range start date (ISO string, required if dateRange=custom)
 * @query {string} [endDate] - Custom range end date (ISO string, required if dateRange=custom)
 * @query {boolean} [comparison] - Include comparison with previous period (default: true)
 */
router.get(
  '/overview',
  authenticate,
  validate(analyticsValidation.getOverviewAnalytics),
  (req: Request, res, next) => analyticsController.getOverviewAnalytics(req as any, res, next)
);

/**
 * @route GET /api/analytics/admin/users
 * @desc Get user analytics for admin dashboard
 * @access Private (Admin only)
 * @query {string} [dateRange] - Date range type (today, week, month, quarter, year, custom)
 * @query {string} [startDate] - Custom range start date (ISO string)
 * @query {string} [endDate] - Custom range end date (ISO string)
 */
router.get(
  '/admin/users',
  authenticate,
  authorize([UserRole.ADMIN]),
  validate(analyticsValidation.getDateRangeParams),
  (req: Request, res, next) => analyticsController.getAdminUserAnalytics(req as any, res, next)
);

/**
 * @route GET /api/analytics/admin/financial
 * @desc Get financial analytics for admin dashboard
 * @access Private (Admin only)
 * @query {string} [dateRange] - Date range type (today, week, month, quarter, year, custom)
 * @query {string} [startDate] - Custom range start date (ISO string)
 * @query {string} [endDate] - Custom range end date (ISO string)
 */
router.get(
  '/admin/financial',
  authenticate,
  authorize([UserRole.ADMIN]),
  validate(analyticsValidation.getDateRangeParams),
  (req: Request, res, next) => analyticsController.getAdminFinancialAnalytics(req as any, res, next)
);

/**
 * @route GET /api/analytics/participant/services
 * @desc Get service analytics for participant dashboard
 * @access Private (Participant only)
 * @query {string} [dateRange] - Date range type (today, week, month, quarter, year, custom)
 * @query {string} [startDate] - Custom range start date (ISO string)
 * @query {string} [endDate] - Custom range end date (ISO string)
 */
router.get(
  '/participant/services',
  authenticate,
  authorize([UserRole.PARTICIPANT]),
  validate(analyticsValidation.getDateRangeParams),
  (req: Request, res, next) => analyticsController.getParticipantServiceAnalytics(req as any, res, next)
);

/**
 * @route GET /api/analytics/worker/financial
 * @desc Get financial analytics for worker dashboard
 * @access Private (Support Worker only)
 * @query {string} [dateRange] - Date range type (today, week, month, quarter, year, custom)
 * @query {string} [startDate] - Custom range start date (ISO string)
 * @query {string} [endDate] - Custom range end date (ISO string)
 */
router.get(
  '/worker/financial',
  authenticate,
  authorize([UserRole.SUPPORT_WORKER]),
  validate(analyticsValidation.getDateRangeParams),
  (req: Request, res, next) => analyticsController.getWorkerFinancialAnalytics(req as any, res, next)
);

/**
 * @route GET /api/analytics/worker/schedule
 * @desc Get schedule analytics for worker dashboard
 * @access Private (Support Worker only)
 * @query {string} [dateRange] - Date range type (today, week, month, quarter, year, custom)
 * @query {string} [startDate] - Custom range start date (ISO string)
 * @query {string} [endDate] - Custom range end date (ISO string)
 */
router.get(
  '/worker/schedule',
  authenticate,
  authorize([UserRole.SUPPORT_WORKER]),
  validate(analyticsValidation.getDateRangeParams),
  (req: Request, res, next) => analyticsController.getWorkerScheduleAnalytics(req as any, res, next)
);

/**
 * @route GET /api/analytics/worker/performance
 * @desc Get performance analytics for worker dashboard
 * @access Private (Support Worker only)
 * @query {string} [dateRange] - Date range type (today, week, month, quarter, year, custom)
 * @query {string} [startDate] - Custom range start date (ISO string)
 * @query {string} [endDate] - Custom range end date (ISO string)
 */
router.get(
  '/worker/performance',
  authenticate,
  authorize([UserRole.SUPPORT_WORKER]),
  validate(analyticsValidation.getDateRangeParams),
  (req: Request, res, next) => analyticsController.getWorkerPerformanceAnalytics(req as any, res, next)
);

/**
 * @route POST /api/analytics/filtered
 * @desc Get filtered analytics (admin only)
 * @access Private (Admin only)
 * @body {AnalyticsFilters} filters - Analytics filter criteria
 */
router.post(
  '/filtered',
  authenticate,
  authorize([UserRole.ADMIN]),
  validate(analyticsValidation.getFilteredAnalytics),
  (req: Request, res, next) => analyticsController.getFilteredAnalytics(req as any, res, next)
);

/**
 * @route GET /api/analytics/platform/summary
 * @desc Get platform metrics summary (admin only)
 * @access Private (Admin only)
 * @query {string} [dateRange] - Date range type (today, week, month, quarter, year, custom)
 * @query {string} [startDate] - Custom range start date (ISO string)
 * @query {string} [endDate] - Custom range end date (ISO string)
 */
router.get(
  '/platform/summary',
  authenticate,
  authorize([UserRole.ADMIN]),
  validate(analyticsValidation.getDateRangeParams),
  (req: Request, res, next) => analyticsController.getPlatformSummary(req as any, res, next)
);

/**
 * @route POST /api/analytics/export
 * @desc Export analytics data (all roles)
 * @access Private (All authenticated users)
 * @body {string} [dateRange] - Date range type (today, week, month, quarter, year, custom)
 * @body {string} [startDate] - Custom range start date (ISO string)
 * @body {string} [endDate] - Custom range end date (ISO string)
 * @body {string} [format] - Export format (json, csv, pdf) - default: json
 */
router.post(
  '/export',
  authenticate,
  validate(analyticsValidation.exportAnalyticsData),
  (req: Request, res, next) => analyticsController.exportAnalyticsData(req as any, res, next)
);

/**
 * @route GET /api/analytics/realtime
 * @desc Get real-time metrics (admin only)
 * @access Private (Admin only)
 */
router.get(
  '/realtime',
  authenticate,
  authorize([UserRole.ADMIN]),
  (req: Request, res, next) => analyticsController.getRealtimeMetrics(req as any, res, next)
);

export default router;