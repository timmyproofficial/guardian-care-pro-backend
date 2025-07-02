/**
 * Worker Analytics Service
 * Provides analytics data for support worker dashboards
 */

import mongoose from 'mongoose';
import moment from 'moment';
import Organization from '../models/organization.model';
import Shift from '../models/shift.model';
import Timesheet from '../models/timesheet.model';
import User from '../models/user.model';
import { AnalyticsService } from './analytics.service';
import {
  WorkerOverviewAnalytics,
  WorkerFinancialAnalytics,
  WorkerScheduleAnalytics,
  DateRange,
  TrendDataPoint,
  ComparisonData,
  AnalyticsFilters
} from '../types/analytics.types';
import { ShiftStatus, TimesheetStatus } from '../types/shift.types';
import logger from '../utils/logger';

export class WorkerAnalyticsService {
  /**
   * Get worker overview analytics
   */
  static async getOverviewAnalytics(
    workerId: string,
    dateRange: DateRange,
    includeComparison: boolean = true
  ): Promise<WorkerOverviewAnalytics> {
    try {
      logger.info('Generating worker overview analytics', { workerId, dateRange });

      // Get work summary
      const workSummary = await this.getWorkSummary(workerId, dateRange, includeComparison);
      
      // Get performance metrics
      const performanceMetrics = await this.getPerformanceMetrics(workerId, dateRange);
      
      // Get availability metrics
      const availability = await this.getAvailabilityMetrics(workerId, dateRange);

      return {
        workSummary,
        performanceMetrics,
        availability
      };
    } catch (error) {
      logger.error('Error generating worker overview analytics:', error);
      throw error;
    }
  }

  /**
   * Get worker financial analytics
   */
  static async getFinancialAnalytics(
    workerId: string,
    dateRange: DateRange
  ): Promise<WorkerFinancialAnalytics> {
    try {
      logger.info('Generating worker financial analytics', { workerId, dateRange });

      // Get earnings data
      const earnings = await this.getEarningsData(workerId, dateRange);
      
      // Get expenses data
      const expenses = await this.getExpensesData(workerId, dateRange);
      
      // Get financial projections
      const projections = await this.getFinancialProjections(workerId, dateRange);

      return {
        earnings,
        expenses,
        projections
      };
    } catch (error) {
      logger.error('Error generating worker financial analytics:', error);
      throw error;
    }
  }

  /**
   * Get worker schedule analytics
   */
  static async getScheduleAnalytics(
    workerId: string,
    dateRange: DateRange
  ): Promise<WorkerScheduleAnalytics> {
    try {
      logger.info('Generating worker schedule analytics', { workerId, dateRange });

      // Get weekly hours trend
      const weeklyHours = await this.getWeeklyHoursTrend(workerId, dateRange);
      
      // Get shift distribution data
      const shiftDistribution = await this.getShiftDistribution(workerId, dateRange);
      
      // Get travel analysis
      const travelAnalysis = await this.getTravelAnalysis(workerId, dateRange);

      return {
        weeklyHours,
        shiftDistribution,
        travelAnalysis
      };
    } catch (error) {
      logger.error('Error generating worker schedule analytics:', error);
      throw error;
    }
  }

  /**
   * Get work summary for worker
   */
  private static async getWorkSummary(
    workerId: string,
    dateRange: DateRange,
    includeComparison: boolean
  ): Promise<WorkerOverviewAnalytics['workSummary']> {
    try {
      // Get active clients (organizations where worker is active)
      const activeOrganizations = await Organization.find({
        'workers.workerId': new mongoose.Types.ObjectId(workerId)
      });
      const activeClients = activeOrganizations.length;

      // Get upcoming shifts (next 7 days)
      const now = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(now.getDate() + 7);

      const upcomingShifts = await Shift.find({
        $or: [
          { workerId: new mongoose.Types.ObjectId(workerId) },
          { 'workerAssignments.workerId': new mongoose.Types.ObjectId(workerId) }
        ],
        startTime: { $gte: now, $lte: nextWeek },
        status: { $in: [ShiftStatus.CONFIRMED, ShiftStatus.PENDING] }
      })
      .sort({ startTime: 1 })
      .limit(5)
      .populate('participantId', 'firstName lastName')
      .lean();

      // Format upcoming shifts
      const formattedUpcomingShifts = upcomingShifts.map(shift => ({
        shiftId: shift.shiftId,
        date: shift.startTime,
        clientName: shift.participantId ? 
          `${(shift.participantId as any).firstName} ${(shift.participantId as any).lastName}` : 
          'Unknown Client',
        serviceType: shift.serviceTypeId ? {
          id: (shift.serviceTypeId as any)._id?.toString() || '',
          name: (shift.serviceTypeId as any).name || 'Unknown Service',
          code: (shift.serviceTypeId as any).code || 'UNKNOWN'
        } : {
          id: '',
          name: 'Unknown Service',
          code: 'UNKNOWN'
        },
        location: shift.address || 'Location TBD'
      }));

      // Count completed shifts in the period
      const completedThisPeriod = await Shift.countDocuments({
        $or: [
          { workerId: new mongoose.Types.ObjectId(workerId) },
          { 'workerAssignments.workerId': new mongoose.Types.ObjectId(workerId) }
        ],
        status: ShiftStatus.COMPLETED,
        endTime: { $gte: dateRange.startDate, $lte: dateRange.endDate }
      });

      // Calculate total hours worked
      const hoursWorkedQuery = await Shift.aggregate([
        {
          $match: {
            $or: [
              { workerId: new mongoose.Types.ObjectId(workerId) },
              { 'workerAssignments.workerId': new mongoose.Types.ObjectId(workerId) }
            ],
            status: ShiftStatus.COMPLETED,
            endTime: { $gte: dateRange.startDate, $lte: dateRange.endDate }
          }
        },
        {
          $project: {
            durationHours: {
              $divide: [
                { $subtract: ['$endTime', '$startTime'] },
                1000 * 60 * 60 // Convert milliseconds to hours
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            totalHours: { $sum: '$durationHours' }
          }
        }
      ]);

      const currentPeriodHours = hoursWorkedQuery.length > 0 ? hoursWorkedQuery[0].totalHours : 0;

      // Calculate comparison with previous period if requested
      let hoursWorked: ComparisonData = {
        current: currentPeriodHours,
        previous: 0,
        percentageChange: 0,
        trend: 'stable'
      };

      if (includeComparison) {
        const previousRange = AnalyticsService.getPreviousPeriodRange(dateRange);
        
        const previousHoursQuery = await Shift.aggregate([
          {
            $match: {
              $or: [
                { workerId: new mongoose.Types.ObjectId(workerId) },
                { 'workerAssignments.workerId': new mongoose.Types.ObjectId(workerId) }
              ],
              status: ShiftStatus.COMPLETED,
              endTime: { $gte: previousRange.startDate, $lte: previousRange.endDate }
            }
          },
          {
            $project: {
              durationHours: {
                $divide: [
                  { $subtract: ['$endTime', '$startTime'] },
                  1000 * 60 * 60
                ]
              }
            }
          },
          {
            $group: {
              _id: null,
              totalHours: { $sum: '$durationHours' }
            }
          }
        ]);

        const previousPeriodHours = previousHoursQuery.length > 0 ? previousHoursQuery[0].totalHours : 0;
        hoursWorked = AnalyticsService.createComparisonData(currentPeriodHours, previousPeriodHours);
      }

      // Calculate earnings
      const earningsQuery = await Timesheet.aggregate([
        {
          $match: {
            workerId: new mongoose.Types.ObjectId(workerId),
            status: { $in: [TimesheetStatus.APPROVED, TimesheetStatus.PROCESSED] },
            actualStartTime: { $gte: dateRange.startDate, $lte: dateRange.endDate }
          }
        },
        {
          $group: {
            _id: null,
            totalEarnings: { $sum: '$grandTotal' }
          }
        }
      ]);

      const currentPeriodEarnings = earningsQuery.length > 0 ? earningsQuery[0].totalEarnings : 0;

      // Calculate earnings comparison
      let earnings: ComparisonData = {
        current: currentPeriodEarnings,
        previous: 0,
        percentageChange: 0,
        trend: 'stable'
      };

      if (includeComparison) {
        const previousRange = AnalyticsService.getPreviousPeriodRange(dateRange);
        
        const previousEarningsQuery = await Timesheet.aggregate([
          {
            $match: {
              workerId: new mongoose.Types.ObjectId(workerId),
              status: { $in: [TimesheetStatus.APPROVED, TimesheetStatus.PROCESSED] },
              actualStartTime: { $gte: previousRange.startDate, $lte: previousRange.endDate }
            }
          },
          {
            $group: {
              _id: null,
              totalEarnings: { $sum: '$grandTotal' }
            }
          }
        ]);

        const previousPeriodEarnings = previousEarningsQuery.length > 0 ? previousEarningsQuery[0].totalEarnings : 0;
        earnings = AnalyticsService.createComparisonData(currentPeriodEarnings, previousPeriodEarnings);
      }

      return {
        activeClients,
        upcomingShifts: formattedUpcomingShifts,
        completedThisPeriod,
        hoursWorked,
        earnings
      };
    } catch (error) {
      logger.error(`Error getting work summary for worker ${workerId}:`, error);
      throw error;
    }
  }

  /**
   * Get performance metrics for worker
   */
  private static async getPerformanceMetrics(
    workerId: string,
    dateRange: DateRange
  ): Promise<WorkerOverviewAnalytics['performanceMetrics']> {
    try {
      // Get all shifts for the worker in the date range
      const workerShifts = await Shift.aggregate([
        {
          $match: {
            $or: [
              { workerId: new mongoose.Types.ObjectId(workerId) },
              { 'workerAssignments.workerId': new mongoose.Types.ObjectId(workerId) }
            ],
            startTime: { $gte: dateRange.startDate, $lte: dateRange.endDate }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const totalShifts = workerShifts.reduce((sum, shift) => sum + shift.count, 0);
      const acceptedShifts = workerShifts.find(s => s._id === ShiftStatus.CONFIRMED)?.count || 0;
      const pendingShifts = workerShifts.find(s => s._id === ShiftStatus.PENDING)?.count || 0;

      // Calculate rates
      const acceptanceRate = totalShifts > 0 ? (acceptedShifts / (totalShifts - pendingShifts)) * 100 : 0;

      // Calculate on-time performance (simplified - could be enhanced with actual time tracking)
      const onTimeRate = 95; // Placeholder - would need actual time tracking data

      // Get average rating from User model (Worker discriminator)
      const worker = await User.findById(workerId);
      const averageRating = (worker as any)?.ratings?.average || 0;
      const totalReviews = (worker as any)?.ratings?.count || 0;

      return {
        acceptanceRate: Math.round(acceptanceRate),
        onTimeRate,
        averageRating,
        totalReviews
      };
    } catch (error) {
      logger.error(`Error getting performance metrics for worker ${workerId}:`, error);
      throw error;
    }
  }

  /**
   * Get availability metrics for worker
   */
  private static async getAvailabilityMetrics(
    workerId: string,
    dateRange: DateRange
  ): Promise<WorkerOverviewAnalytics['availability']> {
    try {
      // Get total hours worked
      const workedHoursQuery = await Shift.aggregate([
        {
          $match: {
            $or: [
              { workerId: new mongoose.Types.ObjectId(workerId) },
              { 'workerAssignments.workerId': new mongoose.Types.ObjectId(workerId) }
            ],
            status: ShiftStatus.COMPLETED,
            endTime: { $gte: dateRange.startDate, $lte: dateRange.endDate }
          }
        },
        {
          $project: {
            hours: {
              $divide: [
                { $subtract: ['$endTime', '$startTime'] },
                1000 * 60 * 60
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            totalHours: { $sum: '$hours' }
          }
        }
      ]);

      const workedHours = workedHoursQuery.length > 0 ? workedHoursQuery[0].totalHours : 0;

      // Calculate utilization rate (simplified - assumes 40 hours available per week)
      const daysInPeriod = moment(dateRange.endDate).diff(moment(dateRange.startDate), 'days');
      const weeksInPeriod = daysInPeriod / 7;
      const availableHours = weeksInPeriod * 40; // Assuming 40 hours per week availability
      const utilizationRate = availableHours > 0 ? (workedHours / availableHours) * 100 : 0;

      // Get peak work days
      const dayDistribution = await Shift.aggregate([
        {
          $match: {
            $or: [
              { workerId: new mongoose.Types.ObjectId(workerId) },
              { 'workerAssignments.workerId': new mongoose.Types.ObjectId(workerId) }
            ],
            status: ShiftStatus.COMPLETED,
            endTime: { $gte: dateRange.startDate, $lte: dateRange.endDate }
          }
        },
        {
          $project: {
            dayOfWeek: { $dayOfWeek: '$startTime' }
          }
        },
        {
          $group: {
            _id: '$dayOfWeek',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: 3
        }
      ]);

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const peakWorkDays = dayDistribution.map(day => dayNames[day._id - 1]);

      // Calculate average shift length
      const shiftLengthQuery = await Shift.aggregate([
        {
          $match: {
            $or: [
              { workerId: new mongoose.Types.ObjectId(workerId) },
              { 'workerAssignments.workerId': new mongoose.Types.ObjectId(workerId) }
            ],
            status: ShiftStatus.COMPLETED,
            endTime: { $gte: dateRange.startDate, $lte: dateRange.endDate }
          }
        },
        {
          $project: {
            duration: {
              $divide: [
                { $subtract: ['$endTime', '$startTime'] },
                1000 * 60 * 60
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgDuration: { $avg: '$duration' }
          }
        }
      ]);

      const averageShiftLength = shiftLengthQuery.length > 0 ? shiftLengthQuery[0].avgDuration : 0;

      return {
        utilizationRate: Math.round(utilizationRate),
        peakWorkDays,
        averageShiftLength: Number(averageShiftLength.toFixed(1))
      };
    } catch (error) {
      logger.error(`Error getting availability metrics for worker ${workerId}:`, error);
      throw error;
    }
  }

  /**
   * Get earnings data for worker
   */
  private static async getEarningsData(
    workerId: string,
    dateRange: DateRange
  ): Promise<WorkerFinancialAnalytics['earnings']> {
    try {
      // Current period earnings
      const currentPeriodQuery = await Timesheet.aggregate([
        {
          $match: {
            workerId: new mongoose.Types.ObjectId(workerId),
            status: { $in: [TimesheetStatus.APPROVED, TimesheetStatus.PROCESSED] },
            actualStartTime: { $gte: dateRange.startDate, $lte: dateRange.endDate }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$grandTotal' }
          }
        }
      ]);

      const currentPeriod = currentPeriodQuery.length > 0 ? currentPeriodQuery[0].total : 0;

      // Pending earnings (approved but not paid)
      const pendingQuery = await Timesheet.aggregate([
        {
          $match: {
            workerId: new mongoose.Types.ObjectId(workerId),
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

      const pending = pendingQuery.length > 0 ? pendingQuery[0].total : 0;

      // Paid earnings
      const paidQuery = await Timesheet.aggregate([
        {
          $match: {
            workerId: new mongoose.Types.ObjectId(workerId),
            status: TimesheetStatus.PROCESSED,
            isPaid: true,
            actualStartTime: { $gte: dateRange.startDate, $lte: dateRange.endDate }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$grandTotal' }
          }
        }
      ]);

      const paid = paidQuery.length > 0 ? paidQuery[0].total : 0;

      // Earnings trend
      const trendData = await Timesheet.aggregate([
        {
          $match: {
            workerId: new mongoose.Types.ObjectId(workerId),
            status: { $in: [TimesheetStatus.APPROVED, TimesheetStatus.PROCESSED] },
            actualStartTime: { $gte: dateRange.startDate, $lte: dateRange.endDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$actualStartTime' }
            },
            earnings: { $sum: '$grandTotal' }
          }
        },
        {
          $project: {
            date: '$_id',
            value: '$earnings',
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

      // Earnings by organization
      const byOrganizationData = await Timesheet.aggregate([
        {
          $match: {
            workerId: new mongoose.Types.ObjectId(workerId),
            status: { $in: [TimesheetStatus.APPROVED, TimesheetStatus.PROCESSED] },
            actualStartTime: { $gte: dateRange.startDate, $lte: dateRange.endDate }
          }
        },
        {
          $group: {
            _id: '$organizationId',
            amount: { $sum: '$grandTotal' }
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
            amount: 1,
            _id: 0
          }
        },
        {
          $sort: { amount: -1 }
        }
      ]);

      const byOrganization = byOrganizationData.map(item => ({
        organizationId: item.organizationId.toString(),
        name: item.name,
        amount: item.amount
      }));

      return {
        currentPeriod,
        pending,
        paid,
        trend,
        byOrganization
      };
    } catch (error) {
      logger.error(`Error getting earnings data for worker ${workerId}:`, error);
      throw error;
    }
  }

  /**
   * Get expenses data for worker
   */
  private static async getExpensesData(
    workerId: string,
    dateRange: DateRange
  ): Promise<WorkerFinancialAnalytics['expenses']> {
    try {
      // Travel reimbursements (distance travel amount)
      const travelReimbursementsQuery = await Timesheet.aggregate([
        {
          $match: {
            workerId: new mongoose.Types.ObjectId(workerId),
            status: { $in: [TimesheetStatus.APPROVED, TimesheetStatus.PROCESSED] },
            actualStartTime: { $gte: dateRange.startDate, $lte: dateRange.endDate }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$distanceTravelAmount' }
          }
        }
      ]);

      const travelReimbursements = travelReimbursementsQuery.length > 0 ? 
        travelReimbursementsQuery[0].total : 0;

      // Worker expense claims (expenses paid by worker that need reimbursement)
      const expenseClaimsQuery = await Timesheet.aggregate([
        {
          $match: {
            workerId: new mongoose.Types.ObjectId(workerId),
            status: { $in: [TimesheetStatus.APPROVED, TimesheetStatus.PROCESSED] },
            actualStartTime: { $gte: dateRange.startDate, $lte: dateRange.endDate }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$workerExpensesTotal' }
          }
        }
      ]);

      const expenseClaims = expenseClaimsQuery.length > 0 ? expenseClaimsQuery[0].total : 0;

      // Total expenses
      const totalExpenses = travelReimbursements + expenseClaims;

      return {
        travelReimbursements,
        expenseClaims,
        totalExpenses
      };
    } catch (error) {
      logger.error(`Error getting expenses data for worker ${workerId}:`, error);
      throw error;
    }
  }

  /**
   * Get financial projections for worker
   */
  private static async getFinancialProjections(
    workerId: string,
    dateRange: DateRange
  ): Promise<WorkerFinancialAnalytics['projections']> {
    try {
      // Get historical earnings to calculate projections
      const historicalData = await Timesheet.aggregate([
        {
          $match: {
            workerId: new mongoose.Types.ObjectId(workerId),
            status: { $in: [TimesheetStatus.APPROVED, TimesheetStatus.PROCESSED] },
            actualStartTime: {
              $gte: moment(dateRange.startDate).subtract(3, 'months').toDate(),
              $lte: dateRange.endDate
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$actualStartTime' },
              month: { $month: '$actualStartTime' }
            },
            earnings: { $sum: '$grandTotal' },
            hours: {
              $sum: {
                $divide: [
                  { $subtract: ['$actualEndTime', '$actualStartTime'] },
                  1000 * 60 * 60
                ]
              }
            }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        }
      ]);

      // Calculate monthly projection
      const monthlyEarnings = historicalData.map(item => item.earnings);
      const monthlyProjected = monthlyEarnings.length > 0 
        ? monthlyEarnings.reduce((a, b) => a + b, 0) / monthlyEarnings.length 
        : 0;

      // Calculate average hourly rate
      const totalEarnings = historicalData.reduce((sum, item) => sum + item.earnings, 0);
      const totalHours = historicalData.reduce((sum, item) => sum + item.hours, 0);
      const averageHourlyRate = totalHours > 0 ? totalEarnings / totalHours : 0;

      // Find highest paying service type
      const serviceTypeEarnings = await Timesheet.aggregate([
        {
          $match: {
            workerId: new mongoose.Types.ObjectId(workerId),
            status: { $in: [TimesheetStatus.APPROVED, TimesheetStatus.PROCESSED] },
            actualStartTime: { $gte: dateRange.startDate, $lte: dateRange.endDate }
          }
        },
        {
          $lookup: {
            from: 'shifts',
            localField: 'shiftId',
            foreignField: '_id',
            as: 'shift'
          }
        },
        {
          $unwind: '$shift'
        },
        {
          $lookup: {
            from: 'servicetypes',
            localField: 'shift.serviceTypeId',
            foreignField: '_id',
            as: 'serviceType'
          }
        },
        {
          $unwind: '$serviceType'
        },
        {
          $group: {
            _id: '$serviceType.code',
            earnings: { $sum: '$grandTotal' }
          }
        },
        {
          $sort: { earnings: -1 }
        },
        {
          $limit: 1
        }
      ]);

            const highestPayingService = serviceTypeEarnings.length > 0 ?
        serviceTypeEarnings[0]._id as string :
        'PERSONAL_CARE'; // Default fallback

      return {
        monthlyProjected: Number(monthlyProjected.toFixed(2)),
        averageHourlyRate: Number(averageHourlyRate.toFixed(2)),
        highestPayingService
      };
    } catch (error) {
      logger.error(`Error getting financial projections for worker ${workerId}:`, error);
      throw error;
    }
  }

  /**
   * Get weekly hours trend for worker
   */
  private static async getWeeklyHoursTrend(
    workerId: string,
    dateRange: DateRange
  ): Promise<TrendDataPoint[]> {
    try {
      const weeklyData = await Shift.aggregate([
        {
          $match: {
            $or: [
              { workerId: new mongoose.Types.ObjectId(workerId) },
              { 'workerAssignments.workerId': new mongoose.Types.ObjectId(workerId) }
            ],
            status: ShiftStatus.COMPLETED,
            endTime: { $gte: dateRange.startDate, $lte: dateRange.endDate }
          }
        },
        {
          $project: {
            week: {
              $dateToString: { 
                format: '%Y-W%U', 
                date: '$startTime' 
              }
            },
            hours: {
              $divide: [
                { $subtract: ['$endTime', '$startTime'] },
                1000 * 60 * 60
              ]
            }
          }
        },
        {
          $group: {
            _id: '$week',
            hours: { $sum: '$hours' }
          }
        },
        {
          $project: {
            date: '$_id',
            value: '$hours',
            _id: 0
          }
        },
        {
          $sort: { date: 1 }
        }
      ]);

      return weeklyData.map(item => ({
        date: item.date,
        value: Number(item.value.toFixed(1)),
        label: `Week ${item.date.split('-W')[1]}`
      }));
    } catch (error) {
      logger.error(`Error getting weekly hours trend for worker ${workerId}:`, error);
      throw error;
    }
  }

  /**
   * Get shift distribution for worker
   */
  private static async getShiftDistribution(
    workerId: string,
    dateRange: DateRange
  ): Promise<WorkerScheduleAnalytics['shiftDistribution']> {
    try {
      // By service type
      const byServiceTypeData = await Shift.aggregate([
        {
          $match: {
            $or: [
              { workerId: new mongoose.Types.ObjectId(workerId) },
              { 'workerAssignments.workerId': new mongoose.Types.ObjectId(workerId) }
            ],
            status: ShiftStatus.COMPLETED,
            endTime: { $gte: dateRange.startDate, $lte: dateRange.endDate }
          }
        },
        {
          $lookup: {
            from: 'servicetypes',
            localField: 'serviceTypeId',
            foreignField: '_id',
            as: 'serviceType'
          }
        },
        {
          $unwind: '$serviceType'
        },
        {
          $group: {
            _id: '$serviceType.code',
            count: { $sum: 1 }
          }
        }
      ]);

      const byServiceType = byServiceTypeData.reduce((acc, item) => {
        acc[item._id as string] = item.count;
        return acc;
      }, {} as Record<string, number>);

      // By day of week
      const byDayData = await Shift.aggregate([
        {
          $match: {
            $or: [
              { workerId: new mongoose.Types.ObjectId(workerId) },
              { 'workerAssignments.workerId': new mongoose.Types.ObjectId(workerId) }
            ],
            status: ShiftStatus.COMPLETED,
            endTime: { $gte: dateRange.startDate, $lte: dateRange.endDate }
          }
        },
        {
          $project: {
            dayOfWeek: { $dayOfWeek: '$startTime' },
            hours: {
              $divide: [
                { $subtract: ['$endTime', '$startTime'] },
                1000 * 60 * 60
              ]
            }
          }
        },
        {
         $group: {
           _id: '$dayOfWeek',
           hours: { $sum: '$hours' }
         }
       },
       {
         $sort: { _id: 1 }
       }
     ]);

     const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
     const byDayOfWeek = byDayData.map(item => ({
       day: dayNames[item._id - 1],
       hours: Number(item.hours.toFixed(1))
     }));

     // By time of day
     const byTimeData = await Shift.aggregate([
       {
         $match: {
           $or: [
             { workerId: new mongoose.Types.ObjectId(workerId) },
             { 'workerAssignments.workerId': new mongoose.Types.ObjectId(workerId) }
           ],
           status: ShiftStatus.COMPLETED,
           endTime: { $gte: dateRange.startDate, $lte: dateRange.endDate }
         }
       },
       {
         $project: {
           hour: { $hour: '$startTime' }
         }
       },
       {
         $group: {
           _id: '$hour',
           frequency: { $sum: 1 }
         }
       },
       {
         $sort: { _id: 1 }
       }
     ]);

     const byTimeOfDay = byTimeData.map(item => ({
       hour: item._id,
       frequency: item.frequency
     }));

     return {
       byServiceType,
       byDayOfWeek,
       byTimeOfDay
     };
   } catch (error) {
     logger.error(`Error getting shift distribution for worker ${workerId}:`, error);
     throw error;
   }
 }

 /**
  * Get travel analysis for worker
  */
 private static async getTravelAnalysis(
   workerId: string,
   dateRange: DateRange
 ): Promise<WorkerScheduleAnalytics['travelAnalysis']> {
   try {
     const travelData = await Timesheet.aggregate([
       {
         $match: {
           workerId: new mongoose.Types.ObjectId(workerId),
           status: { $in: [TimesheetStatus.APPROVED, TimesheetStatus.PROCESSED] },
           actualStartTime: { $gte: dateRange.startDate, $lte: dateRange.endDate }
         }
       },
       {
         $group: {
           _id: null,
           totalDistance: { $sum: '$distanceTravelKm' },
           totalReimbursements: { $sum: '$distanceTravelAmount' },
           shiftCount: { $sum: 1 }
         }
       }
     ]);

     const data = travelData.length > 0 ? travelData[0] : {
       totalDistance: 0,
       totalReimbursements: 0,
       shiftCount: 0
     };

     const averageDistancePerShift = data.shiftCount > 0 ? 
       data.totalDistance / data.shiftCount : 0;

     return {
       totalDistance: Number(data.totalDistance.toFixed(1)),
       averageDistancePerShift: Number(averageDistancePerShift.toFixed(1)),
       travelReimbursements: Number(data.totalReimbursements.toFixed(2))
     };
   } catch (error) {
     logger.error(`Error getting travel analysis for worker ${workerId}:`, error);
     throw error;
   }
 }

 /**
  * Get analytics data with filters
  */
 static async getFilteredAnalytics(
   workerId: string,
   filters: AnalyticsFilters
 ): Promise<any> {
   try {
     logger.info('Generating filtered worker analytics', { workerId, filters });

     const dateRange = filters.dateRange;
     
     // Base analytics
     const overview = await this.getOverviewAnalytics(
       workerId,
       dateRange,
       filters.comparison
     );
     
     // Apply additional filters if specified
     const filteredData = overview;
     
     if (filters.organizationId) {
       // Filter data for specific organization
       // This would require additional queries with organization filter
     }
     
     if (filters.serviceTypeId) {
       // Filter by service type
       // This would require additional queries with service type filter
     }

     return filteredData;
   } catch (error) {
     logger.error(`Error generating filtered worker analytics for ${workerId}:`, error);
     throw error;
   }
 }

 /**
  * Get worker document expiry alerts
  */
 static async getDocumentExpiryAlerts(workerId: string): Promise<Array<{
   documentType: string;
   expiryDate: Date;
   daysUntilExpiry: number;
   isExpired: boolean;
 }>> {
   try {
     // This would integrate with a document management system
     // For now, returning empty array as placeholder
     // In a real implementation, this would query a documents collection
     
     return [];
   } catch (error) {
     logger.error(`Error getting document expiry alerts for worker ${workerId}:`, error);
     throw error;
   }
 }

 /**
  * Get worker skill utilization rates
  */
 static async getSkillUtilization(
   workerId: string,
   dateRange: DateRange
 ): Promise<Array<{
   skill: string;
   utilizationRate: number;
   totalHours: number;
 }>> {
   try {
     // Get worker's skills
     const worker = await User.findById(workerId);
     const workerSkills = (worker as any)?.skills || [];

     if (workerSkills.length === 0) {
       return [];
     }

     // Get shifts by service type (which correlates to skills)
     const skillUtilization = await Shift.aggregate([
       {
         $match: {
           $or: [
             { workerId: new mongoose.Types.ObjectId(workerId) },
             { 'workerAssignments.workerId': new mongoose.Types.ObjectId(workerId) }
           ],
           status: ShiftStatus.COMPLETED,
           endTime: { $gte: dateRange.startDate, $lte: dateRange.endDate }
         }
       },
       {
         $project: {
           serviceType: 1,
           hours: {
             $divide: [
               { $subtract: ['$endTime', '$startTime'] },
               1000 * 60 * 60
             ]
           }
         }
       },
       {
         $group: {
           _id: '$serviceType',
           totalHours: { $sum: '$hours' }
         }
       }
     ]);

     const totalHours = skillUtilization.reduce((sum, item) => sum + item.totalHours, 0);

     return skillUtilization.map(item => ({
       skill: item._id,
       utilizationRate: totalHours > 0 ? (item.totalHours / totalHours) * 100 : 0,
       totalHours: Number(item.totalHours.toFixed(1))
     }));
   } catch (error) {
     logger.error(`Error getting skill utilization for worker ${workerId}:`, error);
     throw error;
   }
 }

 /**
  * Get worker availability vs utilization comparison
  */
 static async getAvailabilityVsUtilization(
   workerId: string,
   dateRange: DateRange
 ): Promise<{
   availableHours: number;
   bookedHours: number;
   utilizationPercentage: number;
   unutilizedHours: number;
 }> {
   try {
     // Get actual worked hours
     const workedHoursQuery = await Shift.aggregate([
       {
         $match: {
           $or: [
             { workerId: new mongoose.Types.ObjectId(workerId) },
             { 'workerAssignments.workerId': new mongoose.Types.ObjectId(workerId) }
           ],
           status: ShiftStatus.COMPLETED,
           endTime: { $gte: dateRange.startDate, $lte: dateRange.endDate }
         }
       },
       {
         $project: {
           hours: {
             $divide: [
               { $subtract: ['$endTime', '$startTime'] },
               1000 * 60 * 60
             ]
           }
         }
       },
       {
         $group: {
           _id: null,
           totalHours: { $sum: '$hours' }
         }
       }
     ]);

     const bookedHours = workedHoursQuery.length > 0 ? workedHoursQuery[0].totalHours : 0;

     // Calculate available hours (simplified - assumes full-time availability)
     const daysInPeriod = moment(dateRange.endDate).diff(moment(dateRange.startDate), 'days');
     const availableHours = (daysInPeriod / 7) * 40; // 40 hours per week

     const utilizationPercentage = availableHours > 0 ? (bookedHours / availableHours) * 100 : 0;
     const unutilizedHours = Math.max(0, availableHours - bookedHours);

     return {
       availableHours: Number(availableHours.toFixed(1)),
       bookedHours: Number(bookedHours.toFixed(1)),
       utilizationPercentage: Number(utilizationPercentage.toFixed(1)),
       unutilizedHours: Number(unutilizedHours.toFixed(1))
     };
   } catch (error) {
     logger.error(`Error getting availability vs utilization for worker ${workerId}:`, error);
     throw error;
   }
 }

 /**
  * Get worker earnings breakdown by time periods
  */
 static async getEarningsBreakdown(
   workerId: string,
   dateRange: DateRange
 ): Promise<{
   daily: TrendDataPoint[];
   weekly: TrendDataPoint[];
   monthly: TrendDataPoint[];
 }> {
   try {
     // Daily earnings
     const dailyData = await Timesheet.aggregate([
       {
         $match: {
           workerId: new mongoose.Types.ObjectId(workerId),
           status: { $in: [TimesheetStatus.APPROVED, TimesheetStatus.PROCESSED] },
           actualStartTime: { $gte: dateRange.startDate, $lte: dateRange.endDate }
         }
       },
       {
         $group: {
           _id: {
             $dateToString: { format: '%Y-%m-%d', date: '$actualStartTime' }
           },
           earnings: { $sum: '$grandTotal' }
         }
       },
       {
         $sort: { _id: 1 }
       }
     ]);

     const daily = dailyData.map(item => ({
       date: item._id,
       value: Number(item.earnings.toFixed(2)),
       label: moment(item._id).format('MMM DD')
     }));

     // Weekly earnings
     const weeklyData = await Timesheet.aggregate([
       {
         $match: {
           workerId: new mongoose.Types.ObjectId(workerId),
           status: { $in: [TimesheetStatus.APPROVED, TimesheetStatus.PROCESSED] },
           actualStartTime: { $gte: dateRange.startDate, $lte: dateRange.endDate }
         }
       },
       {
         $group: {
           _id: {
             $dateToString: { format: '%Y-W%U', date: '$actualStartTime' }
           },
           earnings: { $sum: '$grandTotal' }
         }
       },
       {
         $sort: { _id: 1 }
       }
     ]);

     const weekly = weeklyData.map(item => ({
       date: item._id,
       value: Number(item.earnings.toFixed(2)),
       label: `Week ${item._id.split('-W')[1]}`
     }));

     // Monthly earnings
     const monthlyData = await Timesheet.aggregate([
       {
         $match: {
           workerId: new mongoose.Types.ObjectId(workerId),
           status: { $in: [TimesheetStatus.APPROVED, TimesheetStatus.PROCESSED] },
           actualStartTime: { $gte: dateRange.startDate, $lte: dateRange.endDate }
         }
       },
       {
         $group: {
           _id: {
             $dateToString: { format: '%Y-%m', date: '$actualStartTime' }
           },
           earnings: { $sum: '$grandTotal' }
         }
       },
       {
         $sort: { _id: 1 }
       }
     ]);

     const monthly = monthlyData.map(item => ({
       date: item._id,
       value: Number(item.earnings.toFixed(2)),
       label: moment(item._id).format('MMM YYYY')
     }));

     return {
       daily,
       weekly,
       monthly
     };
   } catch (error) {
     logger.error(`Error getting earnings breakdown for worker ${workerId}:`, error);
     throw error;
   }
 }

 /**
  * Get worker shift patterns and insights
  */
 static async getShiftPatterns(
   workerId: string,
   dateRange: DateRange
 ): Promise<{
   mostProductiveHours: Array<{ hour: number; productivity: number }>;
   preferredShiftLengths: Array<{ duration: string; frequency: number }>;
   clientRetentionRate: number;
   recurringVsOneOffRatio: { recurring: number; oneOff: number };
 }> {
   try {
     // Most productive hours (based on completion rate)
     const hourlyProductivity = await Shift.aggregate([
       {
         $match: {
           $or: [
             { workerId: new mongoose.Types.ObjectId(workerId) },
             { 'workerAssignments.workerId': new mongoose.Types.ObjectId(workerId) }
           ],
           startTime: { $gte: dateRange.startDate, $lte: dateRange.endDate }
         }
       },
       {
         $project: {
           hour: { $hour: '$startTime' },
           isCompleted: { $eq: ['$status', ShiftStatus.COMPLETED] }
         }
       },
       {
         $group: {
           _id: '$hour',
           total: { $sum: 1 },
           completed: { $sum: { $cond: ['$isCompleted', 1, 0] } }
         }
       },
       {
         $project: {
           hour: '$_id',
           productivity: {
             $multiply: [
               { $divide: ['$completed', '$total'] },
               100
             ]
           }
         }
       },
       {
         $sort: { productivity: -1 }
       }
     ]);

     const mostProductiveHours = hourlyProductivity.map(item => ({
       hour: item.hour,
       productivity: Number(item.productivity.toFixed(1))
     }));

     // Preferred shift lengths
     const shiftLengths = await Shift.aggregate([
       {
         $match: {
           $or: [
             { workerId: new mongoose.Types.ObjectId(workerId) },
             { 'workerAssignments.workerId': new mongoose.Types.ObjectId(workerId) }
           ],
           status: ShiftStatus.COMPLETED,
           endTime: { $gte: dateRange.startDate, $lte: dateRange.endDate }
         }
       },
       {
         $project: {
           durationHours: {
             $divide: [
               { $subtract: ['$endTime', '$startTime'] },
               1000 * 60 * 60
             ]
           }
         }
       },
       {
         $bucket: {
           groupBy: '$durationHours',
           boundaries: [0, 2, 4, 6, 8, 12, 24],
           default: '12+',
           output: {
             frequency: { $sum: 1 }
           }
         }
       }
     ]);

     const durationLabels = ['0-2h', '2-4h', '4-6h', '6-8h', '8-12h', '12h+'];
     const preferredShiftLengths = shiftLengths.map((item, index) => ({
       duration: typeof item._id === 'string' ? item._id : durationLabels[index] || 'Unknown',
       frequency: item.frequency
     }));

     // Client retention rate (simplified calculation)
     const clientInteractions = await Shift.aggregate([
       {
         $match: {
           $or: [
             { workerId: new mongoose.Types.ObjectId(workerId) },
             { 'workerAssignments.workerId': new mongoose.Types.ObjectId(workerId) }
           ],
           status: ShiftStatus.COMPLETED,
           endTime: { $gte: dateRange.startDate, $lte: dateRange.endDate }
         }
       },
       {
         $group: {
           _id: '$participantId',
           shiftCount: { $sum: 1 }
         }
       }
     ]);

     const returningClients = clientInteractions.filter(client => client.shiftCount > 1).length;
     const totalClients = clientInteractions.length;
     const clientRetentionRate = totalClients > 0 ? (returningClients / totalClients) * 100 : 0;

     // Recurring vs one-off shifts ratio
     const shiftPatterns = await Shift.aggregate([
       {
         $match: {
           $or: [
             { workerId: new mongoose.Types.ObjectId(workerId) },
             { 'workerAssignments.workerId': new mongoose.Types.ObjectId(workerId) }
           ],
           status: ShiftStatus.COMPLETED,
           endTime: { $gte: dateRange.startDate, $lte: dateRange.endDate }
         }
       },
       {
         $group: {
           _id: {
             $cond: [
               { $ne: ['$recurrence.pattern', 'none'] },
               'recurring',
               'oneOff'
             ]
           },
           count: { $sum: 1 }
         }
       }
     ]);

     const recurringCount = shiftPatterns.find(p => p._id === 'recurring')?.count || 0;
     const oneOffCount = shiftPatterns.find(p => p._id === 'oneOff')?.count || 0;
     const totalShifts = recurringCount + oneOffCount;

     const recurringVsOneOffRatio = {
       recurring: totalShifts > 0 ? (recurringCount / totalShifts) * 100 : 0,
       oneOff: totalShifts > 0 ? (oneOffCount / totalShifts) * 100 : 0
     };

     return {
       mostProductiveHours,
       preferredShiftLengths,
       clientRetentionRate: Number(clientRetentionRate.toFixed(1)),
       recurringVsOneOffRatio: {
         recurring: Number(recurringVsOneOffRatio.recurring.toFixed(1)),
         oneOff: Number(recurringVsOneOffRatio.oneOff.toFixed(1))
       }
     };
   } catch (error) {
     logger.error(`Error getting shift patterns for worker ${workerId}:`, error);
     throw error;
   }
 }
}