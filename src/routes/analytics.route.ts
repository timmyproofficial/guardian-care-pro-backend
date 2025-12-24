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
 * @swagger
 * /api/v1/analytics/overview:
 *   get:
 *     summary: Get role-specific dashboard overview analytics
 *     description: Get role-specific dashboard overview analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: string
 *         required: true
 *         schema:
 *           type: string
 *         description: {string} [dateRange] - Date range type (today
 *       - in: query
 *         name: week
 *         required: true
 *         schema:
 *           type: string
 *         description: week
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: string
 *         description: month
 *       - in: query
 *         name: quarter
 *         required: true
 *         schema:
 *           type: string
 *         description: quarter
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: string
 *         description: year
 *       - in: query
 *         name: custom
 *         required: true
 *         schema:
 *           type: string
 *         description: custom)
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/overview',
  authenticate,
  validate(analyticsValidation.getOverviewAnalytics),
  (req: Request, res, next) => analyticsController.getOverviewAnalytics(req as any, res, next)
);

/**
 * @swagger
 * /api/v1/analytics/admin/users:
 *   get:
 *     summary: Get user analytics for admin dashboard
 *     description: Get user analytics for admin dashboard
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: string
 *         required: true
 *         schema:
 *           type: string
 *         description: {string} [dateRange] - Date range type (today
 *       - in: query
 *         name: week
 *         required: true
 *         schema:
 *           type: string
 *         description: week
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: string
 *         description: month
 *       - in: query
 *         name: quarter
 *         required: true
 *         schema:
 *           type: string
 *         description: quarter
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: string
 *         description: year
 *       - in: query
 *         name: custom
 *         required: true
 *         schema:
 *           type: string
 *         description: custom)
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/admin/users',
  authenticate,
  authorize([UserRole.ADMIN]),
  validate(analyticsValidation.getDateRangeParams),
  (req: Request, res, next) => analyticsController.getAdminUserAnalytics(req as any, res, next)
);

/**
 * @swagger
 * /api/v1/analytics/admin/financial:
 *   get:
 *     summary: Get financial analytics for admin dashboard
 *     description: Get financial analytics for admin dashboard
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: string
 *         required: true
 *         schema:
 *           type: string
 *         description: {string} [dateRange] - Date range type (today
 *       - in: query
 *         name: week
 *         required: true
 *         schema:
 *           type: string
 *         description: week
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: string
 *         description: month
 *       - in: query
 *         name: quarter
 *         required: true
 *         schema:
 *           type: string
 *         description: quarter
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: string
 *         description: year
 *       - in: query
 *         name: custom
 *         required: true
 *         schema:
 *           type: string
 *         description: custom)
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/admin/financial',
  authenticate,
  authorize([UserRole.ADMIN]),
  validate(analyticsValidation.getDateRangeParams),
  (req: Request, res, next) => analyticsController.getAdminFinancialAnalytics(req as any, res, next)
);

/**
 * @swagger
 * /api/v1/analytics/participant/services:
 *   get:
 *     summary: Get service analytics for participant dashboard
 *     description: Get service analytics for participant dashboard
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: string
 *         required: true
 *         schema:
 *           type: string
 *         description: {string} [dateRange] - Date range type (today
 *       - in: query
 *         name: week
 *         required: true
 *         schema:
 *           type: string
 *         description: week
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: string
 *         description: month
 *       - in: query
 *         name: quarter
 *         required: true
 *         schema:
 *           type: string
 *         description: quarter
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: string
 *         description: year
 *       - in: query
 *         name: custom
 *         required: true
 *         schema:
 *           type: string
 *         description: custom)
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/participant/services',
  authenticate,
  authorize([UserRole.PARTICIPANT]),
  validate(analyticsValidation.getDateRangeParams),
  (req: Request, res, next) => analyticsController.getParticipantServiceAnalytics(req as any, res, next)
);

/**
 * @swagger
 * /api/v1/analytics/worker/financial:
 *   get:
 *     summary: Get financial analytics for worker dashboard
 *     description: Get financial analytics for worker dashboard
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: string
 *         required: true
 *         schema:
 *           type: string
 *         description: {string} [dateRange] - Date range type (today
 *       - in: query
 *         name: week
 *         required: true
 *         schema:
 *           type: string
 *         description: week
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: string
 *         description: month
 *       - in: query
 *         name: quarter
 *         required: true
 *         schema:
 *           type: string
 *         description: quarter
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: string
 *         description: year
 *       - in: query
 *         name: custom
 *         required: true
 *         schema:
 *           type: string
 *         description: custom)
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/worker/financial',
  authenticate,
  authorize([UserRole.SUPPORT_WORKER]),
  validate(analyticsValidation.getDateRangeParams),
  (req: Request, res, next) => analyticsController.getWorkerFinancialAnalytics(req as any, res, next)
);

/**
 * @swagger
 * /api/v1/analytics/worker/schedule:
 *   get:
 *     summary: Get schedule analytics for worker dashboard
 *     description: Get schedule analytics for worker dashboard
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: string
 *         required: true
 *         schema:
 *           type: string
 *         description: {string} [dateRange] - Date range type (today
 *       - in: query
 *         name: week
 *         required: true
 *         schema:
 *           type: string
 *         description: week
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: string
 *         description: month
 *       - in: query
 *         name: quarter
 *         required: true
 *         schema:
 *           type: string
 *         description: quarter
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: string
 *         description: year
 *       - in: query
 *         name: custom
 *         required: true
 *         schema:
 *           type: string
 *         description: custom)
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/worker/schedule',
  authenticate,
  authorize([UserRole.SUPPORT_WORKER]),
  validate(analyticsValidation.getDateRangeParams),
  (req: Request, res, next) => analyticsController.getWorkerScheduleAnalytics(req as any, res, next)
);

/**
 * @swagger
 * /api/v1/analytics/worker/performance:
 *   get:
 *     summary: Get performance analytics for worker dashboard
 *     description: Get performance analytics for worker dashboard
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: string
 *         required: true
 *         schema:
 *           type: string
 *         description: {string} [dateRange] - Date range type (today
 *       - in: query
 *         name: week
 *         required: true
 *         schema:
 *           type: string
 *         description: week
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: string
 *         description: month
 *       - in: query
 *         name: quarter
 *         required: true
 *         schema:
 *           type: string
 *         description: quarter
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: string
 *         description: year
 *       - in: query
 *         name: custom
 *         required: true
 *         schema:
 *           type: string
 *         description: custom)
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/worker/performance',
  authenticate,
  authorize([UserRole.SUPPORT_WORKER]),
  validate(analyticsValidation.getDateRangeParams),
  (req: Request, res, next) => analyticsController.getWorkerPerformanceAnalytics(req as any, res, next)
);

/**
 * @swagger
 * /api/v1/analytics/filtered:
 *   post:
 *     summary: Get filtered analytics (admin only)
 *     description: Get filtered analytics (admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: {AnalyticsFilters} filters - Analytics filter criteria
 *     responses:
 *       201:
 *         description: Successfully created
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/filtered',
  authenticate,
  authorize([UserRole.ADMIN]),
  validate(analyticsValidation.getFilteredAnalytics),
  (req: Request, res, next) => analyticsController.getFilteredAnalytics(req as any, res, next)
);

/**
 * @swagger
 * /api/v1/analytics/platform/summary:
 *   get:
 *     summary: Get platform metrics summary (admin only)
 *     description: Get platform metrics summary (admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: string
 *         required: true
 *         schema:
 *           type: string
 *         description: {string} [dateRange] - Date range type (today
 *       - in: query
 *         name: week
 *         required: true
 *         schema:
 *           type: string
 *         description: week
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: string
 *         description: month
 *       - in: query
 *         name: quarter
 *         required: true
 *         schema:
 *           type: string
 *         description: quarter
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: string
 *         description: year
 *       - in: query
 *         name: custom
 *         required: true
 *         schema:
 *           type: string
 *         description: custom)
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/platform/summary',
  authenticate,
  authorize([UserRole.ADMIN]),
  validate(analyticsValidation.getDateRangeParams),
  (req: Request, res, next) => analyticsController.getPlatformSummary(req as any, res, next)
);

/**
 * @swagger
 * /api/v1/analytics/export:
 *   post:
 *     summary: Export analytics data (all roles)
 *     description: Export analytics data (all roles)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: {string} [dateRange] - Date range type (today, week, month, quarter, year, custom)
 *     responses:
 *       201:
 *         description: Successfully created
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/export',
  authenticate,
  validate(analyticsValidation.exportAnalyticsData),
  (req: Request, res, next) => analyticsController.exportAnalyticsData(req as any, res, next)
);

/**
 * @swagger
 * /api/v1/analytics/realtime:
 *   get:
 *     summary: Get real-time metrics (admin only)
 *     description: Get real-time metrics (admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/realtime',
  authenticate,
  authorize([UserRole.ADMIN]),
  (req: Request, res, next) => analyticsController.getRealtimeMetrics(req as any, res, next)
);

export default router;