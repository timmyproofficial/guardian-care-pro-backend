/**
 * Routine validation schemas
 * Joi validation schemas for routine-related API endpoints
 */

import Joi from 'joi';
import { RoutineStatus, TaskCompletionStatus, RoutineCompletionStatus } from '../types/routine.types';

/**
 * Task validation schema
 */
const taskSchema = Joi.object({
  title: Joi.string().required().max(200).trim(),
  description: Joi.string().optional().max(500).trim()
});

/**
 * Task completion validation schema
 */
const taskCompletionSchema = Joi.object({
  taskId: Joi.string().required(),
  status: Joi.string().valid(...Object.values(TaskCompletionStatus)).required(),
  completedAt: Joi.date().optional(),
  notes: Joi.string().optional().max(500).trim(),
  numericValue: Joi.number().min(0).optional(),
  photoUrls: Joi.array().items(Joi.string().uri()).optional(),
  timeSpentMinutes: Joi.number().integer().min(0).max(240).optional()
});

export const routineValidation = {
  /**
   * Create routine validation
   */
  createRoutine: Joi.object({
    name: Joi.string().required().max(100).trim(),
    description: Joi.string().optional().max(500).trim(),
    serviceTypeId: Joi.string().optional(),
    tasks: Joi.array().items(taskSchema).min(1).max(50).required()
  }),

  /**
   * Get routines validation
   */
  getRoutines: Joi.object({
    status: Joi.string().valid(...Object.values(RoutineStatus)).optional(),
    serviceTypeId: Joi.string().optional(),
    search: Joi.string().optional().max(100).trim(),
    participantId: Joi.string().optional()
  }),



  /**
   * Update routine validation
   */
  updateRoutine: Joi.object({
    name: Joi.string().optional().max(100).trim(),
    description: Joi.string().optional().max(500).trim(),
    serviceTypeId: Joi.string().optional(),
    status: Joi.string().valid(...Object.values(RoutineStatus)).optional(),
    tasks: Joi.array().items(taskSchema).min(1).max(50).optional()
  }),

  /**
   * Duplicate routine validation
   */
  duplicateRoutine: Joi.object({
    name: Joi.string().optional().max(100).trim()
  }),

  /**
   * Update shift routine validation
   */
  updateShiftRoutine: Joi.object({
    routineId: Joi.string().allow(null).optional(),
    routineRequired: Joi.boolean().default(false)
  }),

  /**
   * Update task completions validation
   */
  updateTaskCompletions: Joi.object({
    taskCompletions: Joi.array().items(taskCompletionSchema).min(1).required(),
    overallNotes: Joi.string().optional().max(1000).trim(),
    issuesEncountered: Joi.string().optional().max(1000).trim()
  }),

  /**
   * Complete routine validation
   */
  completeRoutine: Joi.object({
    taskCompletions: Joi.array().items(taskCompletionSchema).optional(),
    overallNotes: Joi.string().optional().max(1000).trim(),
    issuesEncountered: Joi.string().optional().max(1000).trim(),
    totalTimeSpentMinutes: Joi.number().integer().min(0).max(480).optional()
  }),

  /**
   * Get participant completions validation (for query params)
   */
  getParticipantCompletions: Joi.object({
    status: Joi.string().valid(...Object.values(RoutineCompletionStatus)).optional(),
    routineId: Joi.string().optional(),
    workerId: Joi.string().optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional()
  }),

  /**
   * Get worker completions validation (for query params)
   */
  getWorkerCompletions: Joi.object({
    status: Joi.string().valid(...Object.values(RoutineCompletionStatus)).optional(),
    routineId: Joi.string().optional(),
    participantId: Joi.string().optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional()
  }),

  /**
   * Get daily completion stats validation (for query params)
   */
  getDailyStats: Joi.object({
    date: Joi.date().iso().optional()
  }),

  /**
   * Get daily routine details validation (for query params)
   */
  getDailyDetails: Joi.object({
    date: Joi.date().iso().optional()
  }),

  /**
   * Get weekly completion trend validation (for query params)
   */
  getWeeklyTrend: Joi.object({
    weekStartDate: Joi.date().iso().optional()
  }),

  /**
   * Get organization daily stats validation (for query params)
   */
  getOrganizationDailyStats: Joi.object({
    date: Joi.date().iso().optional(),
    organizationId: Joi.string().optional()
  }),

  /**
   * Get overdue routines validation (for query params)
   */
  getOverdueRoutines: Joi.object({
    organizationId: Joi.string().optional()
  }),

};
