/**
 * Routine Analytics Service
 * Provides analytics data for routine usage, completion rates, and effectiveness
 */

import mongoose from 'mongoose';
import moment from 'moment';
import Routine from '../models/routine.model';
import RoutineCompletion from '../models/routineCompletion.model';
import { AnalyticsService } from './analytics.service';
import {
  DateRange,
  TrendDataPoint,
  ComparisonData
} from '../types/analytics.types';
import { 
  RoutineStatus, 
  RoutineCompletionStatus,
  TaskCompletionStatus 
} from '../types/routine.types';
import logger from '../utils/logger';

/**
 * Routine usage analytics interface
 */
export interface RoutineUsageAnalytics {
  totalRoutines: number;
  activeRoutines: number;
  draftRoutines: number;
  inactiveRoutines: number;
  routineCompletionRate: ComparisonData;
  averageCompletionTime: ComparisonData;
  mostUsedRoutines: Array<{
    routineId: string;
    name: string;
    timesUsed: number;
    completionRate: number;
    averageTime: number;
  }>;
  taskCompletionRates: Array<{
    taskType: string;
    completionRate: number;
    averageTime: number;
    skipRate: number;
  }>;
  usageTrend: TrendDataPoint[];
}

/**
 * Routine quality analytics interface
 */
export interface RoutineQualityAnalytics {
  overallQualityScore: number;
  consistencyScore: number;
  adherenceRate: number;
  timeAccuracyScore: number;
  workerSatisfactionMetrics: {
    averageRating: number;
    issueReportRate: number;
    commonIssues: Array<{
      issue: string;
      frequency: number;
    }>;
  };
  improvementSuggestions: Array<{
    routineId: string;
    routineName: string;
    suggestion: string;
    impact: 'high' | 'medium' | 'low';
  }>;
}

/**
 * Worker routine performance interface
 */
export interface WorkerRoutinePerformance {
  workerId: string;
  workerName: string;
  routinesCompleted: number;
  averageCompletionTime: number;
  completionRate: number;
  consistencyScore: number;
  taskSkipRate: number;
  commonSkippedTasks: Array<{
    taskType: string;
    skipRate: number;
    commonReasons: string[];
  }>;
  qualityMetrics: {
    onTimeCompletion: number;
    thoroughnessScore: number;
    issueReportRate: number;
  };
}

export class RoutineAnalyticsService {
  /**
   * Get routine usage analytics for participant
   */
  static async getRoutineUsageAnalytics(
    participantId: string,
    dateRange: DateRange,
    includeComparison: boolean = true
  ): Promise<RoutineUsageAnalytics> {
    try {
      logger.info('Generating routine usage analytics', { participantId, dateRange });

      // Get routine counts by status
      const routineCounts = await Routine.aggregate([
        {
          $match: { participantId: new mongoose.Types.ObjectId(participantId) }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const statusCounts = routineCounts.reduce((acc: Record<string, number>, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>);

      // Get completion statistics
      const completionStats = await this.getCompletionStatistics(
        participantId,
        dateRange,
        includeComparison
      );

      // Get most used routines
      const mostUsedRoutines = await this.getMostUsedRoutines(participantId, dateRange);

      // Get task completion rates by type
      const taskCompletionRates = await this.getTaskCompletionRates(participantId, dateRange);

      // Get usage trend
      const usageTrend = await this.getUsageTrend(participantId, dateRange);

      return {
        totalRoutines: Object.values(statusCounts).reduce((sum: number, count: unknown) => sum + (count as number), 0),
        activeRoutines: statusCounts[RoutineStatus.ACTIVE] || 0,
        draftRoutines: statusCounts[RoutineStatus.DRAFT] || 0,
        inactiveRoutines: statusCounts[RoutineStatus.INACTIVE] || 0,
        routineCompletionRate: completionStats.completionRate,
        averageCompletionTime: completionStats.averageTime,
        mostUsedRoutines,
        taskCompletionRates,
        usageTrend
      };
    } catch (error) {
      logger.error('Error generating routine usage analytics:', error);
      throw error;
    }
  }

  /**
   * Get routine quality analytics
   */
  static async getRoutineQualityAnalytics(
    participantId: string,
    dateRange: DateRange
  ): Promise<RoutineQualityAnalytics> {
    try {
      logger.info('Generating routine quality analytics', { participantId, dateRange });

      // Calculate overall quality metrics
      const qualityMetrics = await this.calculateQualityMetrics(participantId, dateRange);

      // Get worker satisfaction metrics
      const workerSatisfactionMetrics = await this.getWorkerSatisfactionMetrics(
        participantId,
        dateRange
      );

      // Generate improvement suggestions
      const improvementSuggestions = await this.generateImprovementSuggestions(
        participantId,
        dateRange
      );

      return {
        overallQualityScore: qualityMetrics.overallScore,
        consistencyScore: qualityMetrics.consistencyScore,
        adherenceRate: qualityMetrics.adherenceRate,
        timeAccuracyScore: qualityMetrics.timeAccuracyScore,
        workerSatisfactionMetrics,
        improvementSuggestions
      };
    } catch (error) {
      logger.error('Error generating routine quality analytics:', error);
      throw error;
    }
  }

  /**
   * Get worker routine performance analytics
   */
  static async getWorkerRoutinePerformance(
    workerId: string,
    dateRange: DateRange,
    participantId?: string
  ): Promise<WorkerRoutinePerformance> {
    try {
      logger.info('Generating worker routine performance analytics', { workerId, dateRange });

      const matchQuery: any = {
        workerId: new mongoose.Types.ObjectId(workerId),
        completedAt: {
          $gte: dateRange.startDate,
          $lte: dateRange.endDate
        }
      };

      if (participantId) {
        matchQuery.participantId = new mongoose.Types.ObjectId(participantId);
      }

      // Get basic completion metrics
      const completionMetrics = await RoutineCompletion.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            routinesCompleted: { $sum: 1 },
            averageCompletionTime: { $avg: '$totalTimeSpentMinutes' },
            averageCompletionPercentage: { $avg: '$completionPercentage' },
            onTimeCompletions: {
              $sum: {
                $cond: [
                  { $eq: ['$status', RoutineCompletionStatus.COMPLETED] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);

      const metrics = completionMetrics[0] || {
        routinesCompleted: 0,
        averageCompletionTime: 0,
        averageCompletionPercentage: 0,
        onTimeCompletions: 0
      };

      // Calculate completion rate
      const completionRate = metrics.routinesCompleted > 0 
        ? (metrics.onTimeCompletions / metrics.routinesCompleted) * 100 
        : 0;

      // Get task skip analysis
      const taskSkipAnalysis = await this.getTaskSkipAnalysis(workerId, dateRange, participantId);

      // Get worker name
      const workerInfo = await mongoose.model('User').findById(workerId).select('firstName lastName');
      const workerName = workerInfo ? `${workerInfo.firstName} ${workerInfo.lastName}` : 'Unknown';

      return {
        workerId,
        workerName,
        routinesCompleted: metrics.routinesCompleted,
        averageCompletionTime: Math.round(metrics.averageCompletionTime || 0),
        completionRate: Math.round(completionRate),
        consistencyScore: Math.round(metrics.averageCompletionPercentage || 0),
        taskSkipRate: taskSkipAnalysis.overallSkipRate,
        commonSkippedTasks: taskSkipAnalysis.commonSkippedTasks,
        qualityMetrics: {
          onTimeCompletion: Math.round(completionRate),
          thoroughnessScore: Math.round(metrics.averageCompletionPercentage || 0),
          issueReportRate: 0 // Would need to calculate based on issues reported
        }
      };
    } catch (error) {
      logger.error('Error generating worker routine performance analytics:', error);
      throw error;
    }
  }

  /**
   * Get completion statistics with comparison
   */
  private static async getCompletionStatistics(
    participantId: string,
    dateRange: DateRange,
    includeComparison: boolean
  ) {
    const currentPeriodStats = await RoutineCompletion.aggregate([
      {
        $match: {
          participantId: new mongoose.Types.ObjectId(participantId),
          completedAt: {
            $gte: dateRange.startDate,
            $lte: dateRange.endDate
          }
        }
      },
      {
        $group: {
          _id: null,
          totalCompletions: { $sum: 1 },
          completedCount: {
            $sum: {
              $cond: [{ $eq: ['$status', RoutineCompletionStatus.COMPLETED] }, 1, 0]
            }
          },
          averageTime: { $avg: '$totalTimeSpentMinutes' }
        }
      }
    ]);

    const currentStats = currentPeriodStats[0] || {
      totalCompletions: 0,
      completedCount: 0,
      averageTime: 0
    };

    const currentCompletionRate = currentStats.totalCompletions > 0
      ? (currentStats.completedCount / currentStats.totalCompletions) * 100
      : 0;

    let completionRate: ComparisonData = {
      current: currentCompletionRate,
      previous: 0,
      percentageChange: 0,
      trend: 'stable'
    };

    let averageTime: ComparisonData = {
      current: currentStats.averageTime,
      previous: 0,
      percentageChange: 0,
      trend: 'stable'
    };

    if (includeComparison) {
      const previousRange = AnalyticsService.getPreviousPeriodRange(dateRange);
      
      const previousPeriodStats = await RoutineCompletion.aggregate([
        {
          $match: {
            participantId: new mongoose.Types.ObjectId(participantId),
            completedAt: {
              $gte: previousRange.startDate,
              $lte: previousRange.endDate
            }
          }
        },
        {
          $group: {
            _id: null,
            totalCompletions: { $sum: 1 },
            completedCount: {
              $sum: {
                $cond: [{ $eq: ['$status', RoutineCompletionStatus.COMPLETED] }, 1, 0]
              }
            },
            averageTime: { $avg: '$totalTimeSpentMinutes' }
          }
        }
      ]);

      const previousStats = previousPeriodStats[0] || {
        totalCompletions: 0,
        completedCount: 0,
        averageTime: 0
      };

      const previousCompletionRate = previousStats.totalCompletions > 0
        ? (previousStats.completedCount / previousStats.totalCompletions) * 100
        : 0;

      // Calculate changes
      completionRate.previous = previousCompletionRate;
      if (previousCompletionRate > 0) {
        completionRate.percentageChange = 
          ((currentCompletionRate - previousCompletionRate) / previousCompletionRate) * 100;
        completionRate.trend = completionRate.percentageChange > 5 ? 'up' : 
          completionRate.percentageChange < -5 ? 'down' : 'stable';
      }

      averageTime.previous = previousStats.averageTime;
      if (previousStats.averageTime > 0) {
        averageTime.percentageChange = 
          ((currentStats.averageTime - previousStats.averageTime) / previousStats.averageTime) * 100;
        averageTime.trend = averageTime.percentageChange > 5 ? 'up' : 
          averageTime.percentageChange < -5 ? 'down' : 'stable';
      }
    }

    return { completionRate, averageTime };
  }

  /**
   * Get most used routines with completion metrics
   */
  private static async getMostUsedRoutines(participantId: string, dateRange: DateRange) {
    return await Routine.aggregate([
      {
        $match: {
          participantId: new mongoose.Types.ObjectId(participantId),
          status: RoutineStatus.ACTIVE
        }
      },
      {
        $lookup: {
          from: 'routinecompletions',
          let: { routineId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$routineId', '$$routineId'] },
                completedAt: {
                  $gte: dateRange.startDate,
                  $lte: dateRange.endDate
                }
              }
            }
          ],
          as: 'completions'
        }
      },
      {
        $addFields: {
          periodUsage: { $size: '$completions' },
          completedCount: {
            $size: {
              $filter: {
                input: '$completions',
                cond: { $eq: ['$$this.status', RoutineCompletionStatus.COMPLETED] }
              }
            }
          },
          averageTime: { $avg: '$completions.totalTimeSpentMinutes' }
        }
      },
      {
        $match: { periodUsage: { $gt: 0 } }
      },
      {
        $project: {
          routineId: 1,
          name: 1,
          timesUsed: '$periodUsage',
          completionRate: {
            $cond: [
              { $gt: ['$periodUsage', 0] },
              { $multiply: [{ $divide: ['$completedCount', '$periodUsage'] }, 100] },
              0
            ]
          },
          averageTime: { $round: ['$averageTime', 0] }
        }
      },
      {
        $sort: { timesUsed: -1 }
      },
      {
        $limit: 10
      }
    ]);
  }

  /**
   * Get task completion rates by type
   */
  private static async getTaskCompletionRates(participantId: string, dateRange: DateRange) {
    return await RoutineCompletion.aggregate([
      {
        $match: {
          participantId: new mongoose.Types.ObjectId(participantId),
          completedAt: {
            $gte: dateRange.startDate,
            $lte: dateRange.endDate
          }
        }
      },
      {
        $lookup: {
          from: 'routines',
          localField: 'routineId',
          foreignField: '_id',
          as: 'routine'
        }
      },
      {
        $unwind: '$routine'
      },
      {
        $unwind: '$routine.tasks'
      },
      {
        $unwind: '$taskCompletions'
      },
      {
        $match: {
          $expr: { $eq: ['$routine.tasks._id', '$taskCompletions.taskId'] }
        }
      },
      {
        $group: {
          _id: '$routine.tasks.taskType',
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: {
              $cond: [
                { $eq: ['$taskCompletions.status', TaskCompletionStatus.COMPLETED] },
                1,
                0
              ]
            }
          },
          skippedTasks: {
            $sum: {
              $cond: [
                { $eq: ['$taskCompletions.status', TaskCompletionStatus.SKIPPED] },
                1,
                0
              ]
            }
          },
          averageTime: { $avg: '$taskCompletions.timeSpentMinutes' }
        }
      },
      {
        $project: {
          taskType: '$_id',
          completionRate: {
            $multiply: [{ $divide: ['$completedTasks', '$totalTasks'] }, 100]
          },
          skipRate: {
            $multiply: [{ $divide: ['$skippedTasks', '$totalTasks'] }, 100]
          },
          averageTime: { $round: ['$averageTime', 0] }
        }
      },
      {
        $sort: { completionRate: -1 }
      }
    ]);
  }

  /**
   * Get usage trend over time
   */
  private static async getUsageTrend(participantId: string, dateRange: DateRange): Promise<TrendDataPoint[]> {
    const days = moment(dateRange.endDate).diff(moment(dateRange.startDate), 'days');
    const groupBy = days > 90 ? 'week' : days > 30 ? 'day' : 'day';

    const groupFormat = groupBy === 'week' 
      ? { $dateToString: { format: '%Y-%U', date: '$completedAt' } }
      : { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } };

    const trendData = await RoutineCompletion.aggregate([
      {
        $match: {
          participantId: new mongoose.Types.ObjectId(participantId),
          completedAt: {
            $gte: dateRange.startDate,
            $lte: dateRange.endDate
          }
        }
      },
      {
        $group: {
          _id: groupFormat,
          count: { $sum: 1 },
          completed: {
            $sum: {
              $cond: [{ $eq: ['$status', RoutineCompletionStatus.COMPLETED] }, 1, 0]
            }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    return trendData.map(item => ({
      date: item._id,
      value: item.count,
      label: `${item.count} routines`
    }));
  }

  /**
   * Calculate quality metrics
   */
  private static async calculateQualityMetrics(participantId: string, dateRange: DateRange) {
    const qualityData = await RoutineCompletion.aggregate([
      {
        $match: {
          participantId: new mongoose.Types.ObjectId(participantId),
          completedAt: {
            $gte: dateRange.startDate,
            $lte: dateRange.endDate
          }
        }
      },
      {
        $group: {
          _id: null,
          totalCompletions: { $sum: 1 },
          fullyCompleted: {
            $sum: {
              $cond: [{ $eq: ['$completionPercentage', 100] }, 1, 0]
            }
          },
          averageCompletionPercentage: { $avg: '$completionPercentage' },
          onTimeCompletions: {
            $sum: {
              $cond: [{ $eq: ['$status', RoutineCompletionStatus.COMPLETED] }, 1, 0]
            }
          }
        }
      }
    ]);

    const data = qualityData[0] || {
      totalCompletions: 0,
      fullyCompleted: 0,
      averageCompletionPercentage: 0,
      onTimeCompletions: 0
    };

    const adherenceRate = data.totalCompletions > 0 
      ? (data.fullyCompleted / data.totalCompletions) * 100 
      : 0;
    
    const consistencyScore = data.averageCompletionPercentage || 0;
    
    const timeAccuracyScore = data.totalCompletions > 0 
      ? (data.onTimeCompletions / data.totalCompletions) * 100 
      : 0;

    const overallScore = (adherenceRate + consistencyScore + timeAccuracyScore) / 3;

    return {
      overallScore: Math.round(overallScore),
      consistencyScore: Math.round(consistencyScore),
      adherenceRate: Math.round(adherenceRate),
      timeAccuracyScore: Math.round(timeAccuracyScore)
    };
  }

  /**
   * Get worker satisfaction metrics
   */
  private static async getWorkerSatisfactionMetrics(participantId: string, dateRange: DateRange) {
    const satisfactionData = await RoutineCompletion.aggregate([
      {
        $match: {
          participantId: new mongoose.Types.ObjectId(participantId),
          completedAt: {
            $gte: dateRange.startDate,
            $lte: dateRange.endDate
          }
        }
      },
      {
        $group: {
          _id: null,
          totalCompletions: { $sum: 1 },
          averageRating: { $avg: '$participantSatisfaction' },
          issuesReported: {
            $sum: {
              $cond: [
                { $ne: ['$issuesEncountered', null] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const data = satisfactionData[0] || {
      totalCompletions: 0,
      averageRating: 0,
      issuesReported: 0
    };

    const issueReportRate = data.totalCompletions > 0 
      ? (data.issuesReported / data.totalCompletions) * 100 
      : 0;

    return {
      averageRating: Math.round((data.averageRating || 0) * 10) / 10,
      issueReportRate: Math.round(issueReportRate),
      commonIssues: [] // Would need more complex aggregation for issue categorization
    };
  }

  /**
   * Generate improvement suggestions
   */
  private static async generateImprovementSuggestions(participantId: string, dateRange: DateRange) {
    // This would be a more complex algorithm that analyzes patterns
    // For now, return basic suggestions based on completion rates
    const routinePerformance = await this.getMostUsedRoutines(participantId, dateRange);
    
    return routinePerformance
      .filter(routine => routine.completionRate < 80)
      .map(routine => ({
        routineId: routine.routineId,
        routineName: routine.name,
        suggestion: routine.completionRate < 50 
          ? 'Consider simplifying tasks or breaking down complex steps'
          : 'Review task timing and worker training for better completion',
        impact: routine.timesUsed > 10 ? 'high' as const : 
                routine.timesUsed > 5 ? 'medium' as const : 'low' as const
      }));
  }

  /**
   * Get task skip analysis for worker
   */
  private static async getTaskSkipAnalysis(workerId: string, dateRange: DateRange, participantId?: string) {
    const matchQuery: any = {
      workerId: new mongoose.Types.ObjectId(workerId),
      completedAt: {
        $gte: dateRange.startDate,
        $lte: dateRange.endDate
      }
    };

    if (participantId) {
      matchQuery.participantId = new mongoose.Types.ObjectId(participantId);
    }

    const skipAnalysis = await RoutineCompletion.aggregate([
      { $match: matchQuery },
      { $unwind: '$taskCompletions' },
      {
        $lookup: {
          from: 'routines',
          localField: 'routineId',
          foreignField: '_id',
          as: 'routine'
        }
      },
      { $unwind: '$routine' },
      { $unwind: '$routine.tasks' },
      {
        $match: {
          $expr: { $eq: ['$routine.tasks._id', '$taskCompletions.taskId'] }
        }
      },
      {
        $group: {
          _id: '$routine.tasks.taskType',
          totalTasks: { $sum: 1 },
          skippedTasks: {
            $sum: {
              $cond: [
                { $eq: ['$taskCompletions.status', TaskCompletionStatus.SKIPPED] },
                1,
                0
              ]
            }
          },
          skipReasons: {
            $push: {
              $cond: [
                { $eq: ['$taskCompletions.status', TaskCompletionStatus.SKIPPED] },
                '$taskCompletions.notes',
                null
              ]
            }
          }
        }
      },
      {
        $project: {
          taskType: '$_id',
          skipRate: {
            $multiply: [{ $divide: ['$skippedTasks', '$totalTasks'] }, 100]
          },
          commonReasons: {
            $filter: {
              input: '$skipReasons',
              cond: { $ne: ['$$this', null] }
            }
          }
        }
      },
      {
        $sort: { skipRate: -1 }
      }
    ]);

    const overallSkipRate = skipAnalysis.length > 0 
      ? skipAnalysis.reduce((sum, item) => sum + item.skipRate, 0) / skipAnalysis.length 
      : 0;

    return {
      overallSkipRate: Math.round(overallSkipRate),
      commonSkippedTasks: skipAnalysis.map(item => ({
        taskType: item.taskType,
        skipRate: Math.round(item.skipRate),
        commonReasons: item.commonReasons.slice(0, 3) // Top 3 reasons
      }))
    };
  }
}
