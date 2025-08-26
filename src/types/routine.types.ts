/**
 * Type definitions for routine-related entities
 * Includes enums and interfaces for routine management
 */

import mongoose from 'mongoose';

/**
 * Routine status enumeration
 * Defines the possible status values for routines
 */
export enum RoutineStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft'
}



/**
 * Routine completion status enumeration
 * Tracks overall completion status of a routine
 */
export enum RoutineCompletionStatus {
  NOT_STARTED = 'notStarted',
  IN_PROGRESS = 'inProgress',
  COMPLETED = 'completed',
  PARTIALLY_COMPLETED = 'partiallyCompleted',
  SKIPPED = 'skipped'
}

/**
 * Task completion status enumeration
 * Tracks completion status of individual tasks
 */
export enum TaskCompletionStatus {
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
  NOT_STARTED = 'notStarted'
}

/**
 * Routine task interface
 * Defines the structure of individual tasks within a routine
 */
export interface RoutineTask {
  _id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
}

/**
 * Task completion interface
 * Tracks completion data for individual tasks
 */
export interface TaskCompletion {
  taskId: mongoose.Types.ObjectId;
  status: TaskCompletionStatus;
  completedAt?: Date;
  notes?: string;
  numericValue?: number;
  photoUrls?: string[];
  timeSpentMinutes?: number;
}

/**
 * Routine input interface
 * Data required for creating a routine
 */
export interface RoutineInput {
  name: string;
  description?: string;
  serviceTypeId?: string;
  tasks: Omit<RoutineTask, '_id'>[];
}

/**
 * Routine update interface
 * Data for updating a routine
 */
export interface RoutineUpdateInput {
  name?: string;
  description?: string;
  serviceTypeId?: string;
  status?: RoutineStatus;
  tasks?: Omit<RoutineTask, '_id'>[];
}

/**
 * Routine completion input interface
 * Data for creating routine completion
 */
export interface RoutineCompletionInput {
  shiftId: string;
  routineId: string;
  workerId: string;
}

/**
 * Task completion update interface
 * Data for updating task completions
 */
export interface TaskCompletionUpdateInput {
  taskCompletions: TaskCompletion[];
  overallNotes?: string;
  issuesEncountered?: string;
}

/**
 * Complete routine input interface
 * Data for marking routine as completed
 */
export interface CompleteRoutineInput {
  taskCompletions: TaskCompletion[];
  overallNotes?: string;
  issuesEncountered?: string;
  totalTimeSpentMinutes?: number;
}

/**
 * Routine filter interface
 * Filters for querying routines
 */
export interface RoutineFilter {
  status?: RoutineStatus;
  serviceTypeId?: string;
  participantId?: string;
  organizationId?: string;
  search?: string;
}

/**
 * Routine completion filter interface
 * Filters for querying routine completions
 */
export interface RoutineCompletionFilter {
  status?: RoutineCompletionStatus;
  routineId?: string;
  workerId?: string;
  participantId?: string;
  organizationId?: string;
  startDate?: Date;
  endDate?: Date;
}
