/**
 * Type definitions for analytics-related entities
 * Includes interfaces for different dashboard analytics
 */

import { UserRole, UserStatus } from './user.types';
import { ServiceType } from './shift.types';

/**
 * Common date range options
 */
export enum DateRangeType {
  TODAY = 'today',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
  CUSTOM = 'custom'
}

/**
 * Date range interface
 */
export interface DateRange {
  startDate: Date;
  endDate: Date;
  type: DateRangeType;
}

/**
 * Trend data point
 */
export interface TrendDataPoint {
  date: string;
  value: number;
  label?: string;
}

/**
 * Comparison data
 */
export interface ComparisonData {
  current: number;
  previous: number;
  percentageChange: number;
  trend: 'up' | 'down' | 'stable';
}

/**
 * Admin Analytics Interfaces
 */
export interface AdminOverviewAnalytics {
  userMetrics: {
    totalUsers: number;
    byRole: Record<UserRole, number>;
    byStatus: Record<UserStatus, number>;
    newUsersToday: number;
    activeToday: number;
    growthRate: ComparisonData;
  };
  platformActivity: {
    activeOrganizations: number;
    activeShifts: number;
    pendingTimesheets: number;
    completedShiftsToday: number;
    platformUsageTrend: TrendDataPoint[];
  };
  financialSummary: {
    totalRevenue: ComparisonData;
    pendingPayments: number;
    processedToday: number;
    averageShiftValue: number;
  };
  operationalMetrics: {
    pendingInvites: number;
    shiftCompletionRate: number;
    averageResponseTime: number; // in hours
    cancellationRate: ComparisonData;
  };
}

export interface AdminUserAnalytics {
  registrationTrends: TrendDataPoint[];
  verificationStats: {
    emailVerified: number;
    profileComplete: number;
    documentsVerified: number;
    fullyOnboarded: number;
  };
  userDistribution: {
    byState: Record<string, number>;
    byServiceArea: Record<string, number>;
  };
  retentionMetrics: {
    monthlyActiveUsers: number;
    churnRate: number;
    averageLifespan: number; // in days
  };
}

export interface AdminFinancialAnalytics {
  revenue: {
    total: number;
    trend: TrendDataPoint[];
    byOrganization: Array<{
      organizationId: string;
      name: string;
      revenue: number;
    }>;
    byServiceType: Record<ServiceType, number>;
  };
  payments: {
    processed: number;
    pending: number;
    failed: number;
    averageProcessingTime: number; // in hours
  };
  projections: {
    monthlyProjected: number;
    quarterlyProjected: number;
    growthRate: number;
  };
}

/**
 * Participant Analytics Interfaces
 */
export interface ParticipantOverviewAnalytics {
  careOverview: {
    activeWorkers: number;
    upcomingShifts: Array<{
      shiftId: string;
      date: Date;
      workerName: string;
      serviceType: ServiceType;
    }>;
    completedShiftsThisMonth: number;
    totalCareHours: ComparisonData;
    pendingTimesheets: number;
  };
  financialSummary: {
    currentMonthExpenses: number;
    expensesByCategory: {
      serviceFees: number;
      travelCosts: number;
      additionalExpenses: number;
    };
    budgetUtilization?: number; // percentage
    spendingTrend: TrendDataPoint[];
  };
  workerMetrics: {
    totalWorkers: number;
    averageRating: number;
    topWorkers: Array<{
      workerId: string;
      name: string;
      hours: number;
      rating: number;
    }>;
  };
}

export interface ParticipantServiceAnalytics {
  serviceDistribution: Array<{
    serviceType: ServiceType;
    hours: number;
    percentage: number;
  }>;
  peakServiceTimes: Array<{
    dayOfWeek: string;
    hour: number;
    frequency: number;
  }>;
  servicetrends: TrendDataPoint[];
  preferredWorkers: Array<{
    workerId: string;
    name: string;
    serviceCount: number;
  }>;
}

/**
 * Worker Analytics Interfaces
 */
export interface WorkerOverviewAnalytics {
  workSummary: {
    activeClients: number;
    upcomingShifts: Array<{
      shiftId: string;
      date: Date;
      clientName: string;
      serviceType: ServiceType;
      location: string;
    }>;
    completedThisPeriod: number;
    hoursWorked: ComparisonData;
    earnings: ComparisonData;
  };
  performanceMetrics: {
    acceptanceRate: number;
    completionRate: number;
    onTimeRate: number;
    averageRating: number;
    totalReviews: number;
  };
  availability: {
    utilizationRate: number; // percentage of available hours worked
    peakWorkDays: string[];
    averageShiftLength: number; // in hours
  };
}

export interface WorkerFinancialAnalytics {
  earnings: {
    currentPeriod: number;
    pending: number;
    paid: number;
    trend: TrendDataPoint[];
    byOrganization: Array<{
      organizationId: string;
      name: string;
      amount: number;
    }>;
  };
  expenses: {
    travelReimbursements: number;
    expenseClaims: number;
    totalExpenses: number;
  };
  projections: {
    monthlyProjected: number;
    averageHourlyRate: number;
    highestPayingService: ServiceType;
  };
}

export interface WorkerScheduleAnalytics {
  weeklyHours: TrendDataPoint[];
  shiftDistribution: {
    byServiceType: Record<ServiceType, number>;
    byDayOfWeek: Array<{
      day: string;
      hours: number;
    }>;
    byTimeOfDay: Array<{
      hour: number;
      frequency: number;
    }>;
  };
  travelAnalysis: {
    totalDistance: number;
    averageDistancePerShift: number;
    travelReimbursements: number;
  };
}

/**
 * Analytics filter options
 */
export interface AnalyticsFilters {
  dateRange: DateRange;
  organizationId?: string;
  workerId?: string;
  participantId?: string;
  serviceType?: ServiceType;
  comparison?: boolean; // Include comparison with previous period
}

/**
 * Analytics response wrapper
 */
export interface AnalyticsResponse<T> {
  data: T;
  filters: AnalyticsFilters;
  generatedAt: Date;
  cached: boolean;
}