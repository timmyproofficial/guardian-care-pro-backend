/**
 * Analytics validation schemas
 */
import Joi from 'joi';
import { DateRangeType } from '../types/analytics.types';

// Validate date range parameters (common to many analytics endpoints)
const getDateRangeParams = Joi.object({
  dateRange: Joi.string()
    .valid(...Object.values(DateRangeType))
    .default(DateRangeType.MONTH),
  startDate: Joi.date().iso()
    .when('dateRange', {
      is: DateRangeType.CUSTOM,
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
  endDate: Joi.date().iso()
    .when('dateRange', {
      is: DateRangeType.CUSTOM,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .when('startDate', {
      is: Joi.exist(),
      then: Joi.date().iso().min(Joi.ref('startDate')).required()
    })
});

// Validate overview analytics request
const getOverviewAnalytics = Joi.object({
  dateRange: Joi.string()
    .valid(...Object.values(DateRangeType))
    .default(DateRangeType.MONTH),
  startDate: Joi.date().iso()
    .when('dateRange', {
      is: DateRangeType.CUSTOM,
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
  endDate: Joi.date().iso()
    .when('dateRange', {
      is: DateRangeType.CUSTOM,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .when('startDate', {
      is: Joi.exist(),
      then: Joi.date().iso().min(Joi.ref('startDate')).required()
    }),
  comparison: Joi.boolean().default(true)
});

// Validate filtered analytics request
const getFilteredAnalytics = Joi.object({
  dateRange: Joi.object({
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
    type: Joi.string().valid(...Object.values(DateRangeType)).required()
  }).required(),
  organizationId: Joi.string().hex().length(24),
  workerId: Joi.string().hex().length(24),
  participantId: Joi.string().hex().length(24),
  serviceType: Joi.string(),
  status: Joi.string(),
  comparison: Joi.boolean().default(true),
  groupBy: Joi.string().valid('day', 'week', 'month', 'worker', 'service', 'status')
});

// Validate export analytics data request
const exportAnalyticsData = Joi.object({
  dateRange: Joi.string()
    .valid(...Object.values(DateRangeType))
    .default(DateRangeType.MONTH),
  startDate: Joi.date().iso()
    .when('dateRange', {
      is: DateRangeType.CUSTOM,
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
  endDate: Joi.date().iso()
    .when('dateRange', {
      is: DateRangeType.CUSTOM,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .when('startDate', {
      is: Joi.exist(),
      then: Joi.date().iso().min(Joi.ref('startDate')).required()
    }),
  format: Joi.string().valid('json', 'csv', 'pdf', 'excel').default('json')
});

export const analyticsValidation = {
  getDateRangeParams,
  getOverviewAnalytics,
  getFilteredAnalytics,
  exportAnalyticsData
};