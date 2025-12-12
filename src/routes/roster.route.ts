/**
 * Roster Routes
 * API routes for the Roster Lookup Table system
 */

import express from 'express';
import { rosterController } from '../controllers/roster.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';
import { UserRole } from '../types/user.types';

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// ROSTER SNAPSHOT ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Upload roster file
 * POST /api/roster-snapshots/upload
 * 
 * Accepts: CSV, XLSX, XLS files (up to 10MB)
 * Returns: 202 Accepted with snapshotId for tracking
 */
router.post(
  '/roster-snapshots/upload',
  authenticate,
  authorize([UserRole.PROVIDER]),
  upload.single('file'),
  rosterController.uploadRoster
);

/**
 * List roster snapshots
 * GET /api/roster-snapshots
 * 
 * Query params:
 * - limit (default: 20, max: 100)
 * - offset (default: 0)
 * - status (optional): pending, processing, completed, failed, partially_completed
 * - startDate (optional): ISO8601 date
 * - endDate (optional): ISO8601 date
 */
router.get(
  '/roster-snapshots',
  authenticate,
  authorize([UserRole.PROVIDER, UserRole.ADMIN]),
  rosterController.listSnapshots
);

/**
 * Get roster snapshot details
 * GET /api/roster-snapshots/:snapshotId
 */
router.get(
  '/roster-snapshots/:snapshotId',
  authenticate,
  authorize([UserRole.PROVIDER, UserRole.ADMIN]),
  rosterController.getSnapshot
);

/**
 * Get parsing errors for a snapshot
 * GET /api/roster-snapshots/:snapshotId/errors
 * 
 * Query params:
 * - limit (default: 50)
 * - offset (default: 0)
 * - unreviewed (optional): 'true' to filter only unreviewed errors
 */
router.get(
  '/roster-snapshots/:snapshotId/errors',
  authenticate,
  authorize([UserRole.PROVIDER, UserRole.ADMIN]),
  rosterController.getSnapshotErrors
);

// ═══════════════════════════════════════════════════════════════
// SHIFT REFERENCE ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Search shift references
 * GET /api/shift-references/search
 * 
 * Query params:
 * - providerId (required for admins, auto-set for providers)
 * - workerId (optional): MongoDB ObjectId
 * - workerName (optional): partial match
 * - workerPhone (optional): exact match for SMS lookup
 * - participantId (optional): MongoDB ObjectId
 * - participantName (optional): partial match
 * - shiftDate (optional): exact date (YYYY-MM-DD)
 * - shiftDateStart (optional): range start
 * - shiftDateEnd (optional): range end
 * - status (optional): scheduled, confirmed, cancelled, replaced, completed, noShow
 * - locationPostcode (optional): exact match
 * - requiredCompetencies (optional): comma-separated list
 * - limit (default: 50, max: 500)
 * - offset (default: 0)
 * - sortBy (default: 'shiftDate')
 * - sortOrder (default: 'asc')
 */
router.get(
  '/shift-references/search',
  authenticate,
  authorize([UserRole.PROVIDER, UserRole.ADMIN]),
  rosterController.searchShifts
);

// ═══════════════════════════════════════════════════════════════
// SHIFT EVENT ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Report shift cancellation
 * POST /api/shift-events/cancellation
 * 
 * Body:
 * - shiftReferenceId (optional): direct reference
 * - workerPhone (optional): for SMS-based lookup
 * - workerName (optional): partial match
 * - participantName (optional): partial match
 * - shiftDate (optional): ISO8601 or 'today', 'tomorrow'
 * - shiftTime (optional): 'HH:mm' or 'morning', 'afternoon', etc.
 * - cancellationReason (required): sick, emergency, unavailable, transport, other
 * - cancellationMessage (optional): free text
 * - noticeHours (optional): calculated if not provided
 * - triggeredBy (required): worker_sms, worker_whatsapp, worker_call, provider_portal, system_automation
 * - triggeredByPhone (optional): if from SMS/WhatsApp/call
 * - aiParsedEntities (optional): for automated parsing
 * - autoTriggerReplacement (optional, default: false)
 */
router.post(
  '/shift-events/cancellation',
  authenticate,
  authorize([UserRole.PROVIDER, UserRole.ADMIN]),
  rosterController.reportCancellation
);

// ═══════════════════════════════════════════════════════════════
// WORKER REPLACEMENT ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Find replacement workers
 * POST /api/workers/find-replacements
 * 
 * Body:
 * - shiftReferenceId (required): the cancelled shift
 * - preferences (optional):
 *   - excludeWorkerIds: string[] - workers to exclude
 *   - maxDistanceKm: number (default: 20)
 *   - minReliabilityScore: number (default: 0.70)
 *   - preferPastExperience: boolean (default: true)
 *   - requireAllCompetencies: boolean (default: true)
 * - limit (optional, default: 10, max: 50)
 */
router.post(
  '/workers/find-replacements',
  authenticate,
  authorize([UserRole.PROVIDER, UserRole.ADMIN]),
  rosterController.findReplacements
);

export default router;

