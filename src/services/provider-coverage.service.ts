/**
 * Provider Coverage Rules Service
 * Manages provider-specific shift assignment and coverage rules
 */

import mongoose from 'mongoose';
import Provider from '../models/provider.model';
import {
  ProviderCoverageRules,
  AutoApprovalCriteria,
  ManualApprovalTriggers,
  CoverageEscalationSettings,
  WorkerCommunicationSettings,
  WorkerPriorityCriteria
} from '../types/roster.types';

/**
 * Get provider coverage rules
 */
export async function getProviderCoverageRules(providerId: string): Promise<ProviderCoverageRules | null> {
  const provider = await Provider.findById(providerId).select('settings.coverageRules');
  return provider?.settings?.coverageRules || null;
}

/**
 * Update provider coverage rules
 */
export async function updateProviderCoverageRules(
  providerId: string,
  coverageRules: ProviderCoverageRules
): Promise<ProviderCoverageRules> {
  const provider = await Provider.findByIdAndUpdate(
    providerId,
    {
      $set: { 'settings.coverageRules': coverageRules }
    },
    { new: true, runValidators: true }
  ).select('settings.coverageRules');

  if (!provider) {
    throw new Error('Provider not found');
  }

  // Since we just set the coverageRules, they should exist
  return provider.settings?.coverageRules as ProviderCoverageRules;
}

/**
 * Check if a shift assignment meets auto-approval criteria
 */
export async function checkAutoApprovalCriteria(
  providerId: string,
  workerRating: number,
  hasShiftTypeExperience: boolean,
  hasLocationExperience: boolean,
  distanceKm: number,
  hasValidCredentials: boolean,
  acceptTimeMinutes: number,
  isEmergency: boolean = false
): Promise<boolean> {
  const rules = await getProviderCoverageRules(providerId);

  if (!rules) {
    return false; // No rules configured, require manual approval
  }

  const enabled = isEmergency ? rules.enableEmergencyAutoApproval : rules.enableAutoApproval;
  if (!enabled) {
    return false;
  }

  const criteria = rules.autoApprovalCriteria;
  if (!criteria) {
    return false;
  }

  // Check all criteria
  const ratingOk = !criteria.minRating || workerRating >= criteria.minRating;
  const shiftTypeOk = !criteria.requireExperienceWithShiftType || hasShiftTypeExperience;
  const locationOk = !criteria.requireExperienceWithLocation || hasLocationExperience;
  const distanceOk = !criteria.maxDistanceKm || distanceKm <= criteria.maxDistanceKm;
  const credentialsOk = !criteria.requireValidCredentials || hasValidCredentials;
  const timeOk = !criteria.maxAcceptTimeMinutes || acceptTimeMinutes <= criteria.maxAcceptTimeMinutes;

  return ratingOk && shiftTypeOk && locationOk && distanceOk && credentialsOk && timeOk;
}

/**
 * Check if a shift assignment requires manual approval
 */
export async function checkManualApprovalRequired(
  providerId: string,
  workerRating: number,
  shiftsCompleted: number,
  hasShiftTypeExperience: boolean,
  distanceKm: number,
  isWeekendOrOvernight: boolean,
  isHighComplexity: boolean,
  billingRate: number
): Promise<boolean> {
  const rules = await getProviderCoverageRules(providerId);

  if (!rules) {
    return true; // No rules configured, require manual approval
  }

  const triggers = rules.manualApprovalTriggers;
  if (!triggers) {
    return false; // No manual triggers, allow auto-approval if enabled
  }

  // Check if any trigger conditions are met
  const ratingTrigger = triggers.ratingBelow !== undefined && workerRating < triggers.ratingBelow;
  const newWorkerTrigger = triggers.newWorkerThreshold !== undefined && shiftsCompleted < triggers.newWorkerThreshold;
  const shiftTypeTrigger = Boolean(triggers.requireShiftTypeExperience) && !hasShiftTypeExperience;
  const distanceTrigger = triggers.maxDistanceKm !== undefined && distanceKm > triggers.maxDistanceKm;
  const weekendTrigger = Boolean(triggers.weekendOrOvernightShifts) && isWeekendOrOvernight;
  const complexityTrigger = Boolean(triggers.highComplexityParticipants) && isHighComplexity;
  const rateTrigger = triggers.highRateThreshold !== undefined && billingRate > triggers.highRateThreshold;

  return ratingTrigger || newWorkerTrigger || shiftTypeTrigger || distanceTrigger ||
         weekendTrigger || complexityTrigger || rateTrigger;
}

/**
 * Get worker priority ranking order for a provider
 */
export async function getWorkerPriorityOrder(providerId: string): Promise<WorkerPriorityCriteria[]> {
  const rules = await getProviderCoverageRules(providerId);

  if (!rules?.priorityRankingOrder || rules.priorityRankingOrder.length === 0) {
    // Default priority order
    return [
      WorkerPriorityCriteria.WORKED_EXACT_SHIFT,
      WorkerPriorityCriteria.WORKED_SAME_LOCATION,
      WorkerPriorityCriteria.HIGHEST_RATING,
      WorkerPriorityCriteria.CLOSEST_DISTANCE,
      WorkerPriorityCriteria.MOST_RECENT_SHIFT
    ];
  }

  return rules.priorityRankingOrder;
}

/**
 * Get coverage escalation settings for a provider
 */
export async function getEscalationSettings(providerId: string): Promise<CoverageEscalationSettings> {
  const rules = await getProviderCoverageRules(providerId);

  if (!rules?.escalationSettings) {
    return {
      standardShiftTimeoutMinutes: 120,
      emergencyShiftTimeoutMinutes: 10,
      escalationOptions: [],
      rateIncreaseAmount: 5
    };
  }

  return rules.escalationSettings;
}

/**
 * Get worker communication settings for a provider
 */
export async function getCommunicationSettings(providerId: string): Promise<WorkerCommunicationSettings> {
  const rules = await getProviderCoverageRules(providerId);

  if (!rules?.communicationSettings) {
    return {
      useDirectiveLanguage: false,
      standardCancellationNoticeHours: 24,
      emergencyCancellationNoticeHours: 2
    };
  }

  return rules.communicationSettings;
}

/**
 * Reset provider coverage rules to defaults
 */
export async function resetProviderCoverageRules(providerId: string): Promise<ProviderCoverageRules | null> {
  const defaultRules: ProviderCoverageRules = {
    enableAutoApproval: false,
    enableEmergencyAutoApproval: false,
    autoApprovalCriteria: {
      minRating: 4.5,
      requireExperienceWithShiftType: true,
      requireExperienceWithLocation: false,
      maxDistanceKm: 20,
      requireValidCredentials: true,
      maxAcceptTimeMinutes: 30
    },
    manualApprovalTriggers: {
      ratingBelow: 4.5,
      newWorkerThreshold: 3,
      requireShiftTypeExperience: true,
      maxDistanceKm: 20,
      weekendOrOvernightShifts: true,
      highComplexityParticipants: true,
      highRateThreshold: 50
    },
    priorityRankingOrder: [
      WorkerPriorityCriteria.WORKED_EXACT_SHIFT,
      WorkerPriorityCriteria.WORKED_SAME_LOCATION,
      WorkerPriorityCriteria.HIGHEST_RATING,
      WorkerPriorityCriteria.CLOSEST_DISTANCE,
      WorkerPriorityCriteria.MOST_RECENT_SHIFT
    ],
    escalationSettings: {
      standardShiftTimeoutMinutes: 120,
      emergencyShiftTimeoutMinutes: 10,
      escalationOptions: [],
      rateIncreaseAmount: 5
    },
    communicationSettings: {
      useDirectiveLanguage: false,
      standardCancellationNoticeHours: 24,
      emergencyCancellationNoticeHours: 2
    }
  };

  return updateProviderCoverageRules(providerId, defaultRules);
}