/**
 * Participant Analytics Service
 * Provides analytics data for participant dashboards
 */

import mongoose from 'mongoose';
import moment from 'moment';
// import User from '../models/user.model';
import Organization from '../models/organization.model';
import Shift from '../models/shift.model';
import Timesheet from '../models/timesheet.model';
import Worker from '../models/worker.model';
import { AnalyticsService } from './analytics.service';
import {
  ParticipantOverviewAnalytics,
  ParticipantServiceAnalytics,
  DateRange,
  TrendDataPoint,
  ComparisonData,
  AnalyticsFilters
} from '../types/analytics.types';
import { ShiftStatus, TimesheetStatus } from '../types/shift.types';
import logger from '../utils/logger';

export class ParticipantAnalyticsService {
  /**
   * Get participant overview analytics
   */
  static async getOverviewAnalytics(
    participantId: string,
    dateRange: DateRange,
    includeComparison: boolean = true
  ): Promise<ParticipantOverviewAnalytics> {
    try {
      logger.info('Generating participant overview analytics', { participantId, dateRange });

      // Get care overview
      const careOverview = await this.getCareOverview(participantId, dateRange);
      
      // Get financial summary
      const financialSummary = await this.getFinancialSummary(participantId, dateRange, includeComparison);
      
      // Get worker metrics
      const workerMetrics = await this.getWorkerMetrics(participantId);

      return {
        careOverview,
        financialSummary,
        workerMetrics
      };
    } catch (error) {
      logger.error('Error generating participant overview analytics:', error);
      throw error;
    }
  }

  /**
   * Get participant service analytics
   */
  static async getServiceAnalytics(
    participantId: string,
    dateRange: DateRange
  ): Promise<ParticipantServiceAnalytics> {
    try {
      logger.info('Generating participant service analytics', { participantId, dateRange });

      // Get service distribution
      const serviceDistribution = await this.getServiceDistribution(participantId, dateRange);
      
      // Get peak service times
      const peakServiceTimes = await this.getPeakServiceTimes(participantId, dateRange);
      
      // Get service trends
      const servicetrends = await this.getServiceTrends(participantId, dateRange);
      
      // Get preferred workers
      const preferredWorkers = await this.getPreferredWorkers(participantId, dateRange);

      return {
        serviceDistribution,
        peakServiceTimes,
        servicetrends,
        preferredWorkers
      };
    } catch (error) {
      logger.error('Error generating participant service analytics:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  /**
   * Get care overview for participant
   */
  private static async getCareOverview(
    participantId: string,
    dateRange: DateRange,
    includeComparison: boolean = true
  ): Promise<ParticipantOverviewAnalytics['careOverview']> {
    try {
      // Get participant's organization
      const organization = await Organization.findOne({ participantId: new mongoose.Types.ObjectId(participantId) });
      
      if (!organization) {
        throw new Error('Participant organization not found');
      }

      // Count active workers in the organization
      const activeWorkers = organization.workers.length;
      
      // Get upcoming shifts (next 7 days)
      const now = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(now.getDate() + 7);
      
      const upcomingShifts = await Shift.find({
        participantId: new mongoose.Types.ObjectId(participantId),
        startTime: { $gte: now, $lte: nextWeek },
        status: { $in: [ShiftStatus.CONFIRMED, ShiftStatus.PENDING] }
      })
      .sort({ startTime: 1 })
      .limit(5)
      .populate('workerId', 'firstName lastName')
      .populate('serviceTypeId', 'name code')
      .lean();
      
      // Format upcoming shifts
      const formattedUpcomingShifts = upcomingShifts.map(shift => ({
        shiftId: shift.shiftId,
        date: shift.startTime,
        workerName: shift.workerId ? 
          `${(shift.workerId as any).firstName} ${(shift.workerId as any).lastName}` : 
          'Unassigned',
        serviceType: {
          id: (shift.serviceTypeId as any)?._id?.toString() || '',
          name: (shift.serviceTypeId as any)?.name || 'Unknown',
          code: (shift.serviceTypeId as any)?.code || 'UNKNOWN'
        }
      }));
      
      // Count completed shifts this month
      const startOfMonth = moment().startOf('month').toDate();
      const completedShiftsThisMonth = await Shift.countDocuments({
        participantId: new mongoose.Types.ObjectId(participantId),
        status: ShiftStatus.COMPLETED,
        endTime: { $gte: startOfMonth, $lte: dateRange.endDate }
      });
      
      // Calculate total care hours
      const totalCareHoursQuery = await Shift.aggregate([
        {
          $match: {
            participantId: new mongoose.Types.ObjectId(participantId),
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
      
      const currentPeriodHours = totalCareHoursQuery.length > 0 ? totalCareHoursQuery[0].totalHours : 0;
      
      // Calculate comparison with previous period if requested
      let totalCareHours: ComparisonData = {
        current: currentPeriodHours,
        previous: 0,
        percentageChange: 0,
        trend: 'stable'
      };
      
      if (includeComparison) {
        const previousRange = AnalyticsService.getPreviousPeriodRange(dateRange);
        
        const previousCareHoursQuery = await Shift.aggregate([
          {
            $match: {
              participantId: new mongoose.Types.ObjectId(participantId),
              status: ShiftStatus.COMPLETED,
              endTime: { $gte: previousRange.startDate, $lte: previousRange.endDate }
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
        
        const previousPeriodHours = previousCareHoursQuery.length > 0 ? previousCareHoursQuery[0].totalHours : 0;
        
        totalCareHours = AnalyticsService.createComparisonData(currentPeriodHours, previousPeriodHours);
      }
      
      // Count pending timesheets
      const pendingTimesheets = await Timesheet.countDocuments({
        participantId: new mongoose.Types.ObjectId(participantId),
        status: TimesheetStatus.PENDING
      });
      
      return {
        activeWorkers,
        upcomingShifts: formattedUpcomingShifts,
        completedShiftsThisMonth,
        totalCareHours,
        pendingTimesheets
      };
    } catch (error) {
      logger.error(`Error getting care overview for participant ${participantId}:`, error);
      throw error;
    }
  }

  /**
   * Get financial summary for participant
   */
  private static async getFinancialSummary(
    participantId: string,
    dateRange: DateRange,
    _includeComparison: boolean
  ): Promise<ParticipantOverviewAnalytics['financialSummary']> {
    try {
      // Get current month expenses from timesheets
      const startOfMonth = moment().startOf('month').toDate();
      const endOfMonth = moment().endOf('month').toDate();
      
      const currentMonthExpensesQuery = await Timesheet.aggregate([
        {
          $match: {
            participantId: new mongoose.Types.ObjectId(participantId),
            status: { $in: [TimesheetStatus.APPROVED, TimesheetStatus.PROCESSED] },
            actualStartTime: { $gte: startOfMonth, $lte: endOfMonth }
          }
        },
        {
          $group: {
            _id: null,
            serviceFees: { $sum: '$subtotal' },
            travelCosts: { $sum: '$distanceTravelAmount' },
            additionalExpenses: { $sum: '$participantExpensesTotal' },
            total: { $sum: '$grandTotal' }
          }
        }
      ]);
      
      const currentMonthExpenses = currentMonthExpensesQuery.length > 0 ? 
        currentMonthExpensesQuery[0].total : 0;
      
      const expensesByCategory = {
        serviceFees: currentMonthExpensesQuery.length > 0 ? currentMonthExpensesQuery[0].serviceFees : 0,
        travelCosts: currentMonthExpensesQuery.length > 0 ? currentMonthExpensesQuery[0].travelCosts : 0,
        additionalExpenses: currentMonthExpensesQuery.length > 0 ? currentMonthExpensesQuery[0].additionalExpenses : 0
      };
      
      // Get spending trend
      const spendingTrendData = await Timesheet.aggregate([
        {
          $match: {
            participantId: new mongoose.Types.ObjectId(participantId),
            status: { $in: [TimesheetStatus.APPROVED, TimesheetStatus.PROCESSED] },
            actualStartTime: { $gte: dateRange.startDate, $lte: dateRange.endDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$actualStartTime' }
            },
            expenses: { $sum: '$grandTotal' }
          }
        },
        {
          $project: {
            date: '$_id',
            value: '$expenses',
            _id: 0
          }
        },
        {
          $sort: { date: 1 }
        }
      ]);
      
      const spendingTrend = AnalyticsService.generateTrendPoints(
        spendingTrendData.map(item => ({
          date: new Date(item.date),
          value: item.value
        })),
        'day'
      );
      
      // Calculate budget utilization (mock - replace with actual budget if available)
      // In a real implementation, this would be based on the participant's NDIS budget
      const budgetUtilization = 65; // Percentage (placeholder)
      
      return {
        currentMonthExpenses,
        expensesByCategory,
        budgetUtilization,
        spendingTrend
      };
    } catch (error) {
      logger.error(`Error getting financial summary for participant ${participantId}:`, error);
      throw error;
    }
  }

  /**
   * Get worker metrics for participant
   */
  private static async getWorkerMetrics(
    participantId: string
  ): Promise<ParticipantOverviewAnalytics['workerMetrics']> {
    try {
      // Get participant's organization
      const organization = await Organization.findOne({ participantId: new mongoose.Types.ObjectId(participantId) });
      
      if (!organization) {
        throw new Error('Participant organization not found');
      }
      
      // Get total workers count
      const totalWorkers = organization.workers.length;
      
      // Get workers with their ids
      const workerIds = organization.workers.map(worker => worker.workerId);
      
      // Get worker details including ratings
      const workers = await Worker.find({
        _id: { $in: workerIds }
      })
      .select('_id firstName lastName ratings')
      .lean();
      
      // Calculate average rating across all workers
      let totalRating = 0;
      let ratedWorkersCount = 0;
      
      workers.forEach(worker => {
        if (worker.ratings && worker.ratings.average > 0) {
          totalRating += worker.ratings.average;
          ratedWorkersCount += 1;
        }
      });
      
      const averageRating = ratedWorkersCount > 0 ? totalRating / ratedWorkersCount : 0;
      
      // Get completed shifts for each worker to find top workers
      const workerShifts = await Shift.aggregate([
        {
          $match: {
            participantId: new mongoose.Types.ObjectId(participantId),
            status: ShiftStatus.COMPLETED,
            workerId: { $in: workerIds }
          }
        },
        {
          $group: {
            _id: '$workerId',
            count: { $sum: 1 },
            hours: {
              $sum: {
                $divide: [
                  { $subtract: ['$endTime', '$startTime'] },
                  1000 * 60 * 60 // Convert milliseconds to hours
                ]
              }
            }
          }
        },
        {
          $sort: { hours: -1 }
        },
        {
          $limit: 5
        }
      ]);
      
      // Map worker shifts to worker details
      const topWorkers = workerShifts.map(workerShift => {
        const worker = workers.find(w => w._id.toString() === workerShift._id.toString());
        return {
          workerId: workerShift._id.toString(),
          name: worker ? `${worker.firstName} ${worker.lastName}` : 'Unknown Worker',
          hours: Math.round(workerShift.hours * 10) / 10, // Round to 1 decimal
          rating: worker && worker.ratings ? worker.ratings.average : 0
        };
      });
      
      return {
        totalWorkers,
        averageRating,
        topWorkers
      };
    } catch (error) {
      logger.error(`Error getting worker metrics for participant ${participantId}:`, error);
      throw error;
    }
  }

  /**
   * Get service distribution for participant
   */
  private static async getServiceDistribution(
    participantId: string,
    dateRange: DateRange
  ): Promise<ParticipantServiceAnalytics['serviceDistribution']> {
    try {
      // Get all completed shifts grouped by service type
      const serviceAggregation = await Shift.aggregate([
        {
          $match: {
            participantId: new mongoose.Types.ObjectId(participantId),
            status: ShiftStatus.COMPLETED,
            endTime: { $gte: dateRange.startDate, $lte: dateRange.endDate }
          }
        },
        {
          $lookup: {
            from: 'servicetypes',
            localField: 'serviceTypeId',
            foreignField: '_id',
            as: 'serviceTypeData'
          }
        },
        {
          $unwind: '$serviceTypeData'
        },
        {
          $project: {
            serviceTypeId: '$serviceTypeData._id',
            serviceTypeName: '$serviceTypeData.name',
            serviceTypeCode: '$serviceTypeData.code',
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
            _id: {
              id: '$serviceTypeId',
              name: '$serviceTypeName',
              code: '$serviceTypeCode'
            },
            hours: { $sum: '$durationHours' }
          }
        }
      ]);
      
      // Calculate total hours
      const totalHours = serviceAggregation.reduce((sum, service) => sum + service.hours, 0);
      
      // Format the result with percentages
      const serviceDistribution = serviceAggregation.map(service => ({
        serviceType: {
          id: service._id.id.toString(),
          name: service._id.name,
          code: service._id.code
        },
        hours: Math.round(service.hours * 10) / 10, // Round to 1 decimal
        percentage: totalHours > 0 ? Math.round((service.hours / totalHours) * 100) : 0
      }));
      
      return serviceDistribution;
    } catch (error) {
      logger.error(`Error getting service distribution for participant ${participantId}:`, error);
      throw error;
    }
  }

  /**
   * Get peak service times for participant
   */
  private static async getPeakServiceTimes(
    participantId: string,
    dateRange: DateRange
  ): Promise<ParticipantServiceAnalytics['peakServiceTimes']> {
    try {
      // Aggregate shifts by day of week and hour
      const peakTimesAggregation = await Shift.aggregate([
        {
          $match: {
            participantId: new mongoose.Types.ObjectId(participantId),
            status: ShiftStatus.COMPLETED,
            startTime: { $gte: dateRange.startDate, $lte: dateRange.endDate }
          }
        },
        {
          $project: {
            dayOfWeek: { $dayOfWeek: '$startTime' }, // 1 = Sunday, 2 = Monday, etc.
            hour: { $hour: '$startTime' }
          }
        },
        {
          $group: {
            _id: {
              dayOfWeek: '$dayOfWeek',
              hour: '$hour'
            },
            frequency: { $sum: 1 }
          }
        },
        {
          $sort: { frequency: -1 }
        }
      ]);
      
      // Convert day of week from number to string
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      const peakServiceTimes = peakTimesAggregation.map(peak => ({
        dayOfWeek: dayNames[peak._id.dayOfWeek - 1],
        hour: peak._id.hour,
        frequency: peak.frequency
      }));
      
      return peakServiceTimes;
    } catch (error) {
      logger.error(`Error getting peak service times for participant ${participantId}:`, error);
      throw error;
    }
  }

  /**
   * Get service trends for participant
   */
  private static async getServiceTrends(
    participantId: string,
    dateRange: DateRange
  ): Promise<TrendDataPoint[]> {
    try {
      // Get service hours by date
      const serviceTrendData = await Shift.aggregate([
        {
          $match: {
            participantId: new mongoose.Types.ObjectId(participantId),
            status: ShiftStatus.COMPLETED,
            endTime: { $gte: dateRange.startDate, $lte: dateRange.endDate }
          }
        },
        {
          $project: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$startTime' } },
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
            _id: '$date',
            hours: { $sum: '$durationHours' }
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
      
      return AnalyticsService.generateTrendPoints(
        serviceTrendData.map(item => ({
          date: new Date(item.date),
          value: item.value
        })),
        'day'
      );
    } catch (error) {
      logger.error(`Error getting service trends for participant ${participantId}:`, error);
      throw error;
    }
  }

  /**
   * Get preferred workers for participant
   */
  private static async getPreferredWorkers(
    participantId: string,
    dateRange: DateRange
  ): Promise<ParticipantServiceAnalytics['preferredWorkers']> {
    try {
      // Get most frequently used workers
      const workerCountAggregation = await Shift.aggregate([
        {
          $match: {
            participantId: new mongoose.Types.ObjectId(participantId),
            status: ShiftStatus.COMPLETED,
            endTime: { $gte: dateRange.startDate, $lte: dateRange.endDate }
          }
        },
        {
          $group: {
            _id: '$workerId',
            serviceCount: { $sum: 1 }
          }
        },
        {
          $sort: { serviceCount: -1 }
        },
        {
          $limit: 5
        }
      ]);
      
      // Get worker details
      const workerIds = workerCountAggregation.map(w => w._id);
      const workers = await Worker.find({
        _id: { $in: workerIds }
      })
      .select('firstName lastName')
      .lean();
      
      // Map counts to worker details
      const preferredWorkers = workerCountAggregation.map(workerCount => {
        const worker = workers.find(w => w._id.toString() === workerCount._id.toString());
        return {
          workerId: workerCount._id ? workerCount._id.toString() : '',
          name: worker ? `${worker.firstName} ${worker.lastName}` : 'Unknown Worker',
          serviceCount: workerCount.serviceCount
        };
      });
      
      return preferredWorkers;
    } catch (error) {
      logger.error(`Error getting preferred workers for participant ${participantId}:`, error);
      throw error;
    }
  }

  /**
   * Get analytics data with filters
   */
  static async getFilteredAnalytics(
    participantId: string,
    filters: AnalyticsFilters
  ): Promise<any> {
    try {
      logger.info('Generating filtered participant analytics', { participantId, filters });

      const dateRange = filters.dateRange;
      
      // Base analytics
      const overview = await this.getOverviewAnalytics(
        participantId,
        dateRange,
        filters.comparison
      );
      
      // Apply additional filters if specified
      const filteredData = overview;
      
      if (filters.workerId) {
        // Filter data for specific worker
        // This would require additional queries with worker filter
      }
      
      if (filters.serviceTypeId) {
        // Filter by service type
        // This would require additional queries with service type filter
      }

      return filteredData;
    } catch (error) {
      logger.error(`Error generating filtered participant analytics for ${participantId}:`, error);
      throw error;
    }
  }
}