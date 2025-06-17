/**
 * Analytics service
 * Core analytics calculations and data aggregation
 */

// import mongoose from 'mongoose';
import moment from 'moment';
import User from '../models/user.model';
import Organization from '../models/organization.model';
import Shift from '../models/shift.model';
import Timesheet from '../models/timesheet.model';
// import Worker from '../models/worker.model';
// import Participant from '../models/participant.model';
import { 
  DateRange, 
  DateRangeType, 
  TrendDataPoint, 
  ComparisonData,
//   AnalyticsFilters 
} from '../types/analytics.types';
import { UserRole } from '../types/user.types';
import { ShiftStatus, TimesheetStatus } from '../types/shift.types';
import logger from '../utils/logger';

export class AnalyticsService {
  /**
   * Get date range based on type
   */
  static getDateRange(type: DateRangeType, customStart?: Date, customEnd?: Date): DateRange {
    const now = moment();
    let startDate: moment.Moment;
    const endDate = now.clone().endOf('day');

    switch (type) {
      case DateRangeType.TODAY:
        startDate = now.clone().startOf('day');
        break;
      case DateRangeType.WEEK:
        startDate = now.clone().startOf('week');
        break;
      case DateRangeType.MONTH:
        startDate = now.clone().startOf('month');
        break;
      case DateRangeType.QUARTER:
        startDate = now.clone().startOf('quarter');
        break;
      case DateRangeType.YEAR:
        startDate = now.clone().startOf('year');
        break;
      case DateRangeType.CUSTOM:
        if (!customStart || !customEnd) {
          throw new Error('Custom date range requires start and end dates');
        }
        return {
          startDate: customStart,
          endDate: customEnd,
          type: DateRangeType.CUSTOM
        };
      default:
        startDate = now.clone().startOf('month');
    }

    return {
      startDate: startDate.toDate(),
      endDate: endDate.toDate(),
      type
    };
  }

  /**
   * Get previous period date range for comparison
   */
  static getPreviousPeriodRange(currentRange: DateRange): DateRange {
    const duration = moment(currentRange.endDate).diff(moment(currentRange.startDate), 'days');
    
    return {
      startDate: moment(currentRange.startDate).subtract(duration + 1, 'days').toDate(),
      endDate: moment(currentRange.startDate).subtract(1, 'day').toDate(),
      type: currentRange.type
    };
  }

  /**
   * Calculate percentage change
   */
  static calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Number(((current - previous) / previous * 100).toFixed(2));
  }

  /**
   * Create comparison data
   */
  static createComparisonData(current: number, previous: number): ComparisonData {
    const percentageChange = this.calculatePercentageChange(current, previous);
    
    return {
      current,
      previous,
      percentageChange,
      trend: percentageChange > 0 ? 'up' : percentageChange < 0 ? 'down' : 'stable'
    };
  }

  /**
   * Generate trend data points
   */
  static generateTrendPoints(
    data: Array<{ date: Date; value: number }>,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): TrendDataPoint[] {
    const grouped: Record<string, number> = {};
    
    data.forEach(item => {
      let key: string;
      const date = moment(item.date);
      
      switch (groupBy) {
        case 'day':
          key = date.format('YYYY-MM-DD');
          break;
        case 'week':
          key = date.format('YYYY-[W]WW');
          break;
        case 'month':
          key = date.format('YYYY-MM');
          break;
      }
      
      grouped[key] = (grouped[key] || 0) + item.value;
    });
    
    return Object.entries(grouped)
      .map(([date, value]) => ({
        date,
        value,
        label: this.formatDateLabel(date, groupBy)
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Format date label for display
   */
  private static formatDateLabel(date: string, groupBy: 'day' | 'week' | 'month'): string {
    const m = moment(date);
    
    switch (groupBy) {
      case 'day':
        return m.format('MMM DD');
      case 'week':
        return `Week ${m.format('WW')}`;
      case 'month':
        return m.format('MMM YYYY');
      default:
        return date;
    }
  }

  /**
   * Get user growth metrics
   */
  static async getUserGrowthMetrics(dateRange: DateRange): Promise<{
    total: number;
    new: number;
    byRole: Record<UserRole, number>;
    growthRate: ComparisonData;
  }> {
    try {
      // Total users
      const total = await User.countDocuments();
      
      // New users in date range
      const newUsers = await User.countDocuments({
        createdAt: {
          $gte: dateRange.startDate,
          $lte: dateRange.endDate
        }
      });
      
      // Users by role
      const roleAggregation = await User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 }
          }
        }
      ]);
      
      const byRole = roleAggregation.reduce((acc, item) => {
        acc[item._id as UserRole] = item.count;
        return acc;
      }, {} as Record<UserRole, number>);
      
      // Growth rate comparison
      const previousRange = this.getPreviousPeriodRange(dateRange);
      const previousNewUsers = await User.countDocuments({
        createdAt: {
          $gte: previousRange.startDate,
          $lte: previousRange.endDate
        }
      });
      
      return {
        total,
        new: newUsers,
        byRole,
        growthRate: this.createComparisonData(newUsers, previousNewUsers)
      };
    } catch (error) {
      logger.error('Error getting user growth metrics:', error);
      throw error;
    }
  }

  /**
   * Get shift metrics
   */
  static async getShiftMetrics(dateRange: DateRange): Promise<{
    total: number;
    byStatus: Record<ShiftStatus, number>;
    completionRate: number;
    cancellationRate: number;
  }> {
    try {
      const shiftQuery = {
        startTime: {
          $gte: dateRange.startDate,
          $lte: dateRange.endDate
        }
      };
      
      // Total shifts
      const total = await Shift.countDocuments(shiftQuery);
      
      // Shifts by status
      const statusAggregation = await Shift.aggregate([
        { $match: shiftQuery },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);
      
      const byStatus = statusAggregation.reduce((acc, item) => {
        acc[item._id as ShiftStatus] = item.count;
        return acc;
      }, {} as Record<ShiftStatus, number>);
      
      // Calculate rates
      const completed = byStatus[ShiftStatus.COMPLETED] || 0;
      const cancelled = byStatus[ShiftStatus.CANCELLED] || 0;
      
      const completionRate = total > 0 ? (completed / total) * 100 : 0;
      const cancellationRate = total > 0 ? (cancelled / total) * 100 : 0;
      
      return {
        total,
        byStatus,
        completionRate: Number(completionRate.toFixed(2)),
        cancellationRate: Number(cancellationRate.toFixed(2))
      };
    } catch (error) {
      logger.error('Error getting shift metrics:', error);
      throw error;
    }
  }

  /**
   * Get financial metrics
   */
  static async getFinancialMetrics(dateRange: DateRange): Promise<{
    totalRevenue: number;
    pendingPayments: number;
    averageShiftValue: number;
    paymentDistribution: Record<string, number>;
  }> {
    try {
      // Get approved timesheets in date range
      const timesheetQuery = {
        actualStartTime: {
          $gte: dateRange.startDate,
          $lte: dateRange.endDate
        },
        status: { $in: [TimesheetStatus.APPROVED, TimesheetStatus.PROCESSED] }
      };
      
      // Total revenue (sum of all grandTotal)
      const revenueAggregation = await Timesheet.aggregate([
        { $match: timesheetQuery },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$grandTotal' },
            count: { $sum: 1 }
          }
        }
      ]);
      
      const totalRevenue = revenueAggregation[0]?.totalRevenue || 0;
      const timesheetCount = revenueAggregation[0]?.count || 0;
      const averageShiftValue = timesheetCount > 0 ? totalRevenue / timesheetCount : 0;
      
      // Pending payments
      const pendingPayments = await Timesheet.aggregate([
        {
          $match: {
            status: TimesheetStatus.APPROVED,
            isPaid: false
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$grandTotal' }
          }
        }
      ]);
      
      // Payment distribution by status
      const paymentDistribution = await Timesheet.aggregate([
        { $match: timesheetQuery },
        {
          $group: {
            _id: '$isPaid',
            amount: { $sum: '$grandTotal' }
          }
        }
      ]);
      
      return {
        totalRevenue,
        pendingPayments: pendingPayments[0]?.total || 0,
        averageShiftValue: Number(averageShiftValue.toFixed(2)),
        paymentDistribution: paymentDistribution.reduce((acc, item) => {
          acc[item._id ? 'paid' : 'unpaid'] = item.amount;
          return acc;
        }, {} as Record<string, number>)
      };
    } catch (error) {
      logger.error('Error getting financial metrics:', error);
      throw error;
    }
  }

  /**
   * Get organization metrics
   */
  static async getOrganizationMetrics(): Promise<{
    total: number;
    active: number;
    pendingInvites: number;
    averageWorkersPerOrg: number;
  }> {
    try {
      // Total organizations
      const total = await Organization.countDocuments();
      
      // Active organizations (with at least one worker)
      const active = await Organization.countDocuments({
        'workers.0': { $exists: true }
      });
      
      // Pending invites
      const pendingInvitesAgg = await Organization.aggregate([
        {
          $project: {
            pendingCount: {
              $size: {
                $filter: {
                  input: '$pendingInvites',
                  cond: { $eq: ['$$this.status', 'pending'] }
                }
              }
            }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$pendingCount' }
          }
        }
      ]);
      
      const pendingInvites = pendingInvitesAgg[0]?.total || 0;
      
      // Average workers per organization
      const workerCountAgg = await Organization.aggregate([
        {
          $project: {
            workerCount: { $size: '$workers' }
          }
        },
        {
          $group: {
            _id: null,
            avgWorkers: { $avg: '$workerCount' }
          }
        }
      ]);
      
      const averageWorkersPerOrg = workerCountAgg[0]?.avgWorkers || 0;
      
      return {
        total,
        active,
        pendingInvites,
        averageWorkersPerOrg: Number(averageWorkersPerOrg.toFixed(1))
      };
    } catch (error) {
      logger.error('Error getting organization metrics:', error);
      throw error;
    }
  }

  /**
   * Calculate platform usage trends
   */
  static async getPlatformUsageTrends(dateRange: DateRange): Promise<TrendDataPoint[]> {
    try {
      // Get daily active users (based on last login)
      const loginData = await User.aggregate([
        {
          $match: {
            lastLogin: {
              $gte: dateRange.startDate,
              $lte: dateRange.endDate
            }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$lastLogin' }
            },
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            date: '$_id',
            value: '$count',
            _id: 0
          }
        }
      ]);
      
      return this.generateTrendPoints(
        loginData.map(item => ({
          date: new Date(item.date),
          value: item.value
        })),
        'day'
      );
    } catch (error) {
      logger.error('Error getting platform usage trends:', error);
      throw error;
    }
  }
}