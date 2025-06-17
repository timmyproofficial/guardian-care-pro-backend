/**
 * Admin Analytics Service
 * Provides comprehensive analytics data for administrators
 */

// import mongoose from 'mongoose';
import moment from 'moment';
import User from '../models/user.model';
// import Participant from '../models/participant.model';
import Worker from '../models/worker.model';
// import Admin from '../models/admin.model';
import Organization from '../models/organization.model';
import Shift from '../models/shift.model';
import Timesheet from '../models/timesheet.model';
import { AnalyticsService } from './analytics.service';
import { 
  AdminOverviewAnalytics,
  AdminUserAnalytics,
  AdminFinancialAnalytics,
  DateRange,
//   DateRangeType,
  TrendDataPoint,
  ComparisonData,
  AnalyticsFilters
} from '../types/analytics.types';
import { UserRole, UserStatus } from '../types/user.types';
import { ShiftStatus, TimesheetStatus, ServiceType } from '../types/shift.types';
import { InviteStatus } from '../models/organization.model';
import logger from '../utils/logger';

export class AdminAnalyticsService {
  /**
   * Get comprehensive overview analytics for admin dashboard
   */
  static async getOverviewAnalytics(
    dateRange: DateRange,
    includeComparison: boolean = true
  ): Promise<AdminOverviewAnalytics> {
    try {
      logger.info('Generating admin overview analytics', { dateRange });

      // Get user metrics
      const userMetrics = await this.getUserMetrics(dateRange, includeComparison);
      
      // Get platform activity
      const platformActivity = await this.getPlatformActivity(dateRange);
      
      // Get financial summary
      const financialSummary = await this.getFinancialSummary(dateRange, includeComparison);
      
      // Get operational metrics
      const operationalMetrics = await this.getOperationalMetrics(dateRange, includeComparison);

      return {
        userMetrics,
        platformActivity,
        financialSummary,
        operationalMetrics
      };
    } catch (error) {
      logger.error('Error generating admin overview analytics:', error);
      throw error;
    }
  }

  /**
   * Get detailed user analytics
   */
  static async getUserAnalytics(
    dateRange: DateRange
  ): Promise<AdminUserAnalytics> {
    try {
      logger.info('Generating admin user analytics', { dateRange });

      // Registration trends
      const registrationTrends = await this.getRegistrationTrends(dateRange);
      
      // Verification statistics
      const verificationStats = await this.getVerificationStats();
      
      // User distribution
      const userDistribution = await this.getUserDistribution();
      
      // Retention metrics
      const retentionMetrics = await this.getRetentionMetrics(dateRange);

      return {
        registrationTrends,
        verificationStats,
        userDistribution,
        retentionMetrics
      };
    } catch (error) {
      logger.error('Error generating admin user analytics:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive financial analytics
   */
  static async getFinancialAnalytics(
    dateRange: DateRange
  ): Promise<AdminFinancialAnalytics> {
    try {
      logger.info('Generating admin financial analytics', { dateRange });

      // Revenue analytics
      const revenue = await this.getRevenueAnalytics(dateRange);
      
      // Payment analytics
      const payments = await this.getPaymentAnalytics(dateRange);
      
      // Financial projections
      const projections = await this.getFinancialProjections(dateRange);

      return {
        revenue,
        payments,
        projections
      };
    } catch (error) {
      logger.error('Error generating admin financial analytics:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private static async getUserMetrics(
    dateRange: DateRange,
    includeComparison: boolean
  ): Promise<AdminOverviewAnalytics['userMetrics']> {
    // Total users
    const totalUsers = await User.countDocuments();

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

    // Users by status
    const statusAggregation = await User.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const byStatus = statusAggregation.reduce((acc, item) => {
      acc[item._id as UserStatus] = item.count;
      return acc;
    }, {} as Record<UserStatus, number>);

    // New users in date range
    const newUsersToday = await User.countDocuments({
      createdAt: {
        $gte: moment().startOf('day').toDate(),
        $lte: moment().endOf('day').toDate()
      }
    });

    // Active users today (based on last login)
    const activeToday = await User.countDocuments({
      lastLogin: {
        $gte: moment().startOf('day').toDate(),
        $lte: moment().endOf('day').toDate()
      }
    });

    // Growth rate calculation
    let growthRate: ComparisonData = {
      current: 0,
      previous: 0,
      percentageChange: 0,
      trend: 'stable'
    };

    if (includeComparison) {
      const currentPeriodUsers = await User.countDocuments({
        createdAt: {
          $gte: dateRange.startDate,
          $lte: dateRange.endDate
        }
      });

      const previousRange = AnalyticsService.getPreviousPeriodRange(dateRange);
      const previousPeriodUsers = await User.countDocuments({
        createdAt: {
          $gte: previousRange.startDate,
          $lte: previousRange.endDate
        }
      });

      growthRate = AnalyticsService.createComparisonData(currentPeriodUsers, previousPeriodUsers);
    }

    return {
      totalUsers,
      byRole,
      byStatus,
      newUsersToday,
      activeToday,
      growthRate
    };
  }

  private static async getPlatformActivity(
    dateRange: DateRange
  ): Promise<AdminOverviewAnalytics['platformActivity']> {
    // Active organizations (with at least one worker)
    const activeOrganizations = await Organization.countDocuments({
      'workers.0': { $exists: true }
    });

    // Active shifts (confirmed or in progress)
    const activeShifts = await Shift.countDocuments({
      status: { $in: [ShiftStatus.CONFIRMED, ShiftStatus.IN_PROGRESS] },
      startTime: {
        $gte: moment().startOf('day').toDate(),
        $lte: moment().add(7, 'days').endOf('day').toDate()
      }
    });

    // Pending timesheets
    const pendingTimesheets = await Timesheet.countDocuments({
      status: { $in: [TimesheetStatus.PENDING, TimesheetStatus.REVISED] }
    });

    // Completed shifts today
    const completedShiftsToday = await Shift.countDocuments({
      status: ShiftStatus.COMPLETED,
      endTime: {
        $gte: moment().startOf('day').toDate(),
        $lte: moment().endOf('day').toDate()
      }
    });

    // Platform usage trends (active users over time)
    const platformUsageTrend = await AnalyticsService.getPlatformUsageTrends(dateRange);

    return {
      activeOrganizations,
      activeShifts,
      pendingTimesheets,
      completedShiftsToday,
      platformUsageTrend
    };
  }

  private static async getFinancialSummary(
    dateRange: DateRange,
    includeComparison: boolean
  ): Promise<AdminOverviewAnalytics['financialSummary']> {
    // Total revenue in current period
    const currentRevenue = await Timesheet.aggregate([
      {
        $match: {
          actualStartTime: {
            $gte: dateRange.startDate,
            $lte: dateRange.endDate
          },
          status: { $in: [TimesheetStatus.APPROVED, TimesheetStatus.PROCESSED] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$grandTotal' }
        }
      }
    ]);

    const totalRevenueAmount = currentRevenue[0]?.total || 0;

    // Total revenue comparison
    let totalRevenue: ComparisonData = {
      current: totalRevenueAmount,
      previous: 0,
      percentageChange: 0,
      trend: 'stable'
    };

    if (includeComparison) {
      const previousRange = AnalyticsService.getPreviousPeriodRange(dateRange);
      const previousRevenue = await Timesheet.aggregate([
        {
          $match: {
            actualStartTime: {
              $gte: previousRange.startDate,
              $lte: previousRange.endDate
            },
            status: { $in: [TimesheetStatus.APPROVED, TimesheetStatus.PROCESSED] }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$grandTotal' }
          }
        }
      ]);

      const previousRevenueAmount = previousRevenue[0]?.total || 0;
      totalRevenue = AnalyticsService.createComparisonData(totalRevenueAmount, previousRevenueAmount);
    }

    // Pending payments
    const pendingPaymentsResult = await Timesheet.aggregate([
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
    const pendingPayments = pendingPaymentsResult[0]?.total || 0;

    // Processed today
    const processedTodayResult = await Timesheet.aggregate([
      {
        $match: {
          status: TimesheetStatus.PROCESSED,
          approvedAt: {
            $gte: moment().startOf('day').toDate(),
            $lte: moment().endOf('day').toDate()
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$grandTotal' }
        }
      }
    ]);
    const processedToday = processedTodayResult[0]?.total || 0;

    // Average shift value
    const avgShiftResult = await Timesheet.aggregate([
      {
        $match: {
          actualStartTime: {
            $gte: dateRange.startDate,
            $lte: dateRange.endDate
          },
          status: { $in: [TimesheetStatus.APPROVED, TimesheetStatus.PROCESSED] }
        }
      },
      {
        $group: {
          _id: null,
          average: { $avg: '$grandTotal' }
        }
      }
    ]);
    const averageShiftValue = avgShiftResult[0]?.average || 0;

    return {
      totalRevenue,
      pendingPayments,
      processedToday,
      averageShiftValue: Number(averageShiftValue.toFixed(2))
    };
  }

  private static async getOperationalMetrics(
    dateRange: DateRange,
    includeComparison: boolean
  ): Promise<AdminOverviewAnalytics['operationalMetrics']> {
    // Pending invites
    const pendingInvitesResult = await Organization.aggregate([
      {
        $project: {
          pendingCount: {
            $size: {
              $filter: {
                input: '$pendingInvites',
                cond: { $eq: ['$$this.status', InviteStatus.PENDING] }
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
    const pendingInvites = pendingInvitesResult[0]?.total || 0;

    // Shift completion rate
    const shiftStats = await Shift.aggregate([
      {
        $match: {
          startTime: {
            $gte: dateRange.startDate,
            $lte: dateRange.endDate
          }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalShifts = shiftStats.reduce((sum, stat) => sum + stat.count, 0);
    const completedShifts = shiftStats.find(stat => stat._id === ShiftStatus.COMPLETED)?.count || 0;
    const shiftCompletionRate = totalShifts > 0 ? (completedShifts / totalShifts) * 100 : 0;

    // Average response time (hours from shift creation to worker confirmation)
    const avgResponseResult = await Shift.aggregate([
      {
        $match: {
          status: ShiftStatus.CONFIRMED,
          createdAt: {
            $gte: dateRange.startDate,
            $lte: dateRange.endDate
          }
        }
      },
      {
        $addFields: {
          responseTime: {
            $divide: [
              { $subtract: ['$updatedAt', '$createdAt'] },
              1000 * 60 * 60 // Convert to hours
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgResponseTime: { $avg: '$responseTime' }
        }
      }
    ]);
    const averageResponseTime = avgResponseResult[0]?.avgResponseTime || 0;

    // Cancellation rate
    const cancelledShifts = shiftStats.find(stat => stat._id === ShiftStatus.CANCELLED)?.count || 0;
    const currentCancellationRate = totalShifts > 0 ? (cancelledShifts / totalShifts) * 100 : 0;

    let cancellationRate: ComparisonData = {
      current: currentCancellationRate,
      previous: 0,
      percentageChange: 0,
      trend: 'stable'
    };

    if (includeComparison) {
      const previousRange = AnalyticsService.getPreviousPeriodRange(dateRange);
      const previousShiftStats = await Shift.aggregate([
        {
          $match: {
            startTime: {
              $gte: previousRange.startDate,
              $lte: previousRange.endDate
            }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const previousTotalShifts = previousShiftStats.reduce((sum, stat) => sum + stat.count, 0);
      const previousCancelledShifts = previousShiftStats.find(stat => stat._id === ShiftStatus.CANCELLED)?.count || 0;
      const previousCancellationRate = previousTotalShifts > 0 
      ? (previousCancelledShifts / previousTotalShifts) * 100 : 0;

      cancellationRate = AnalyticsService.createComparisonData(currentCancellationRate, previousCancellationRate);
    }

    return {
      pendingInvites,
      shiftCompletionRate: Number(shiftCompletionRate.toFixed(2)),
      averageResponseTime: Number(averageResponseTime.toFixed(2)),
      cancellationRate
    };
  }

  private static async getRegistrationTrends(dateRange: DateRange): Promise<TrendDataPoint[]> {
    const registrationData = await User.aggregate([
      {
        $match: {
          createdAt: {
            $gte: dateRange.startDate,
            $lte: dateRange.endDate
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
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
      },
      {
        $sort: { date: 1 }
      }
    ]);

    return AnalyticsService.generateTrendPoints(
      registrationData.map(item => ({
        date: new Date(item.date),
        value: item.value
      })),
      'day'
    );
  }

  private static async getVerificationStats(): Promise<AdminUserAnalytics['verificationStats']> {
    // Email verified users
    const emailVerified = await User.countDocuments({ isEmailVerified: true });

    // Profile complete users (basic profile fields filled)
    const profileComplete = await User.countDocuments({
      firstName: { $exists: true, $ne: '' },
      lastName: { $exists: true, $ne: '' },
      phone: { $exists: true, $ne: '' }
    });

    // Documents verified workers
    const documentsVerified = await Worker.countDocuments({
      'verificationStatus.policeCheckVerified': true,
      'verificationStatus.ndisWorkerScreeningVerified': true
    });

    // Fully onboarded workers
    const fullyOnboarded = await Worker.countDocuments({
      'verificationStatus.onboardingComplete': true
    });

    return {
      emailVerified,
      profileComplete,
      documentsVerified,
      fullyOnboarded
    };
  }

  private static async getUserDistribution(): Promise<AdminUserAnalytics['userDistribution']> {
    // Distribution by state (from address field)
    const stateDistribution = await User.aggregate([
      {
        $match: {
          'address.state': { $exists: true, $ne: '' }
        }
      },
      {
        $group: {
          _id: '$address.state',
          count: { $sum: 1 }
        }
      }
    ]);

    const byState = stateDistribution.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);

    // Distribution by service area (for workers)
    const serviceAreaDistribution = await Worker.aggregate([
      {
        $unwind: '$serviceAreas'
      },
      {
        $group: {
          _id: '$serviceAreas',
          count: { $sum: 1 }
        }
      }
    ]);

    const byServiceArea = serviceAreaDistribution.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);

    return {
      byState,
      byServiceArea
    };
  }

  private static async getRetentionMetrics(_dateRange: DateRange): Promise<AdminUserAnalytics['retentionMetrics']> {
    // Monthly active users (users who logged in within the last 30 days)
    const monthlyActiveUsers = await User.countDocuments({
      lastLogin: {
        $gte: moment().subtract(30, 'days').toDate()
      }
    });

    // Churn rate calculation (simplified - users who haven't logged in for 90 days)
    const totalActiveUsers = await User.countDocuments({
      status: UserStatus.ACTIVE
    });

    const inactiveUsers = await User.countDocuments({
      status: UserStatus.ACTIVE,
      lastLogin: {
        $lt: moment().subtract(90, 'days').toDate()
      }
    });

    const churnRate = totalActiveUsers > 0 ? (inactiveUsers / totalActiveUsers) * 100 : 0;

    // Average user lifespan (days from creation to last login)
    const lifespanResult = await User.aggregate([
      {
        $match: {
          lastLogin: { $exists: true }
        }
      },
      {
        $addFields: {
          lifespan: {
            $divide: [
              { $subtract: ['$lastLogin', '$createdAt'] },
              1000 * 60 * 60 * 24 // Convert to days
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgLifespan: { $avg: '$lifespan' }
        }
      }
    ]);

    const averageLifespan = lifespanResult[0]?.avgLifespan || 0;

    return {
      monthlyActiveUsers,
      churnRate: Number(churnRate.toFixed(2)),
      averageLifespan: Number(averageLifespan.toFixed(0))
    };
  }

  private static async getRevenueAnalytics(dateRange: DateRange): Promise<AdminFinancialAnalytics['revenue']> {
    // Total revenue
    const totalResult = await Timesheet.aggregate([
      {
        $match: {
          actualStartTime: {
            $gte: dateRange.startDate,
            $lte: dateRange.endDate
          },
          status: { $in: [TimesheetStatus.APPROVED, TimesheetStatus.PROCESSED] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$grandTotal' }
        }
      }
    ]);
    const total = totalResult[0]?.total || 0;

    // Revenue trend
    const trendData = await Timesheet.aggregate([
      {
        $match: {
          actualStartTime: {
            $gte: dateRange.startDate,
            $lte: dateRange.endDate
          },
          status: { $in: [TimesheetStatus.APPROVED, TimesheetStatus.PROCESSED] }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$actualStartTime' }
          },
          revenue: { $sum: '$grandTotal' }
        }
      },
      {
        $project: {
          date: '$_id',
          value: '$revenue',
          _id: 0
        }
      },
      {
        $sort: { date: 1 }
      }
    ]);

    const trend = AnalyticsService.generateTrendPoints(
      trendData.map(item => ({
        date: new Date(item.date),
        value: item.value
      })),
      'day'
    );

    // Revenue by organization
    const byOrganizationData = await Timesheet.aggregate([
      {
        $match: {
          actualStartTime: {
            $gte: dateRange.startDate,
            $lte: dateRange.endDate
          },
          status: { $in: [TimesheetStatus.APPROVED, TimesheetStatus.PROCESSED] }
        }
      },
      {
        $group: {
          _id: '$organizationId',
          revenue: { $sum: '$grandTotal' }
        }
      },
      {
        $lookup: {
          from: 'organizations',
          localField: '_id',
          foreignField: '_id',
          as: 'organization'
        }
      },
      {
        $unwind: '$organization'
      },
      {
        $project: {
          organizationId: '$_id',
          name: '$organization.name',
          revenue: 1,
          _id: 0
        }
      },
      {
        $sort: { revenue: -1 }
      },
      {
        $limit: 10
      }
    ]);

    const byOrganization = byOrganizationData.map(item => ({
      organizationId: item.organizationId.toString(),
      name: item.name,
      revenue: item.revenue
    }));

    // Revenue by service type
    const byServiceTypeData = await Shift.aggregate([
      {
        $match: {
          startTime: {
            $gte: dateRange.startDate,
            $lte: dateRange.endDate
          },
          status: ShiftStatus.COMPLETED
        }
      },
      {
        $lookup: {
          from: 'timesheets',
          localField: '_id',
          foreignField: 'shiftId',
          as: 'timesheet'
        }
      },
      {
        $unwind: '$timesheet'
      },
      {
        $match: {
          'timesheet.status': { $in: [TimesheetStatus.APPROVED, TimesheetStatus.PROCESSED] }
        }
      },
      {
        $group: {
          _id: '$serviceType',
          revenue: { $sum: '$timesheet.grandTotal' }
        }
      }
    ]);

    const byServiceType = byServiceTypeData.reduce((acc, item) => {
      acc[item._id as ServiceType] = item.revenue;
      return acc;
    }, {} as Record<ServiceType, number>);

    return {
      total,
      trend,
      byOrganization,
      byServiceType
    };
  }

  private static async getPaymentAnalytics(dateRange: DateRange): Promise<AdminFinancialAnalytics['payments']> {
    // Processed payments
    const processed = await Timesheet.countDocuments({
      actualStartTime: {
        $gte: dateRange.startDate,
        $lte: dateRange.endDate
      },
      status: TimesheetStatus.PROCESSED,
      isPaid: true
    });

    // Pending payments
    const pending = await Timesheet.countDocuments({
      status: TimesheetStatus.APPROVED,
      isPaid: false
    });

    // Failed payments (approximation - rejected timesheets)
    const failed = await Timesheet.countDocuments({
      actualStartTime: {
        $gte: dateRange.startDate,
        $lte: dateRange.endDate
      },
      status: TimesheetStatus.REJECTED
    });

    // Average processing time
    const processingTimeResult = await Timesheet.aggregate([
      {
        $match: {
          status: TimesheetStatus.PROCESSED,
          approvedAt: { $exists: true },
          createdAt: { $exists: true }
        }
      },
      {
        $addFields: {
          processingTime: {
            $divide: [
              { $subtract: ['$approvedAt', '$createdAt'] },
              1000 * 60 * 60 // Convert to hours
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgProcessingTime: { $avg: '$processingTime' }
        }
      }
    ]);

    const averageProcessingTime = processingTimeResult[0]?.avgProcessingTime || 0;

    return {
      processed,
      pending,
      failed,
      averageProcessingTime: Number(averageProcessingTime.toFixed(2))
    };
  }

  private static async getFinancialProjections(dateRange: DateRange): Promise<AdminFinancialAnalytics['projections']> {
    // Get historical revenue data to calculate projections
    const historicalData = await Timesheet.aggregate([
      {
        $match: {
          actualStartTime: {
            $gte: moment(dateRange.startDate).subtract(3, 'months').toDate(),
            $lte: dateRange.endDate
          },
          status: { $in: [TimesheetStatus.APPROVED, TimesheetStatus.PROCESSED] }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$actualStartTime' },
            month: { $month: '$actualStartTime' }
          },
          revenue: { $sum: '$grandTotal' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Calculate simple growth rate
    const revenues = historicalData.map(item => item.revenue);
    const avgRevenue = revenues.length > 0 ? revenues.reduce((a, b) => a + b, 0) / revenues.length : 0;
    
    // Simple growth calculation (last month vs previous month)
    const growthRate = revenues.length >= 2 
      ? ((revenues[revenues.length - 1] - revenues[revenues.length - 2]) / revenues[revenues.length - 2]) * 100
      : 0;

    // Monthly projection (current average)
    const monthlyProjected = avgRevenue;

    // Quarterly projection (3 months * monthly average * growth factor)
    const quarterlyProjected = avgRevenue * 3 * (1 + Math.max(0, growthRate / 100));

    return {
      monthlyProjected: Number(monthlyProjected.toFixed(2)),
      quarterlyProjected: Number(quarterlyProjected.toFixed(2)),
      growthRate: Number(growthRate.toFixed(2))
    };
  }

  /**
   * Get analytics data with filters
   */
  static async getFilteredAnalytics(filters: AnalyticsFilters): Promise<any> {
    try {
      logger.info('Generating filtered admin analytics', { filters });

      const dateRange = filters.dateRange;
      
      // Base analytics
      const overview = await this.getOverviewAnalytics(dateRange, filters.comparison);
      
      // Apply additional filters if specified
      const filteredData = overview;
      
      if (filters.organizationId) {
        // Filter data for specific organization
        // This would require additional queries with organization filter
      }
      
      if (filters.serviceType) {
        // Filter by service type
        // This would require additional queries with service type filter
      }

      return filteredData;
    } catch (error) {
      logger.error('Error generating filtered admin analytics:', error);
      throw error;
    }
  }
}