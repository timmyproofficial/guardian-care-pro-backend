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
 * @swagger
 * /api/v1/roster-snapshots/upload:
 *   post:
 *     summary: Upload roster file
 *     description: Upload a roster file in CSV, XLSX, or XLS format (up to 10MB). Returns snapshot ID for tracking processing status (Provider only).
 *     tags: [Roster]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Roster file (CSV, XLSX, or XLS)
 *     responses:
 *       202:
 *         description: File accepted for processing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 snapshotId:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid file format or size
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Provider only
 */
router.post(
  '/roster-snapshots/upload',
  authenticate,
  authorize([UserRole.PROVIDER]),
  upload.single('file'),
  rosterController.uploadRoster
);

/**
 * @swagger
 * /api/v1/roster-snapshots:
 *   get:
 *     summary: List roster snapshots
 *     description: Retrieve a list of roster snapshots with optional filtering by status and date range
 *     tags: [Roster]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Maximum number of results
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Pagination offset
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, failed, partially_completed]
 *         description: Filter by processing status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter snapshots from this date (ISO8601)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter snapshots until this date (ISO8601)
 *     responses:
 *       200:
 *         description: Successfully retrieved snapshots
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  '/roster-snapshots',
  authenticate,
  authorize([UserRole.PROVIDER, UserRole.ADMIN]),
  rosterController.listSnapshots
);

/**
 * @swagger
 * /api/v1/roster-snapshots/{snapshotId}:
 *   get:
 *     summary: Get roster snapshot details
 *     description: Retrieve detailed information about a specific roster snapshot including processing status and statistics
 *     tags: [Roster]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: snapshotId
 *         required: true
 *         schema:
 *           type: string
 *         description: The snapshot ID
 *     responses:
 *       200:
 *         description: Successfully retrieved snapshot details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Snapshot not found
 */
router.get(
  '/roster-snapshots/:snapshotId',
  authenticate,
  authorize([UserRole.PROVIDER, UserRole.ADMIN]),
  rosterController.getSnapshot
);

/**
 * @swagger
 * /api/v1/roster-snapshots/{snapshotId}/errors:
 *   get:
 *     summary: Get parsing errors for snapshot
 *     description: Retrieve all parsing errors encountered during roster file processing
 *     tags: [Roster]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: snapshotId
 *         required: true
 *         schema:
 *           type: string
 *         description: The snapshot ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of errors to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Pagination offset
 *       - in: query
 *         name: unreviewed
 *         schema:
 *           type: boolean
 *         description: Filter only unreviewed errors
 *     responses:
 *       200:
 *         description: Successfully retrieved parsing errors
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Snapshot not found
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
 * @swagger
 * /api/v1/shift-references/search:
 *   get:
 *     summary: Search shift references
 *     description: Search and filter shift references with extensive query parameters including worker, participant, date ranges, status, and location
 *     tags: [Roster]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: providerId
 *         schema:
 *           type: string
 *         description: Provider ID (required for admins, auto-set for providers)
 *       - in: query
 *         name: workerId
 *         schema:
 *           type: string
 *         description: Worker MongoDB ObjectId
 *       - in: query
 *         name: workerName
 *         schema:
 *           type: string
 *         description: Partial match on worker name
 *       - in: query
 *         name: workerPhone
 *         schema:
 *           type: string
 *         description: Exact match for SMS lookup
 *       - in: query
 *         name: participantId
 *         schema:
 *           type: string
 *         description: Participant MongoDB ObjectId
 *       - in: query
 *         name: participantName
 *         schema:
 *           type: string
 *         description: Partial match on participant name
 *       - in: query
 *         name: shiftDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Exact date (YYYY-MM-DD)
 *       - in: query
 *         name: shiftDateStart
 *         schema:
 *           type: string
 *           format: date
 *         description: Date range start
 *       - in: query
 *         name: shiftDateEnd
 *         schema:
 *           type: string
 *           format: date
 *         description: Date range end
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, confirmed, cancelled, replaced, completed, noShow]
 *         description: Shift status filter
 *       - in: query
 *         name: locationPostcode
 *         schema:
 *           type: string
 *         description: Exact postcode match
 *       - in: query
 *         name: requiredCompetencies
 *         schema:
 *           type: string
 *         description: Comma-separated list of required competencies
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 500
 *         description: Maximum number of results
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Pagination offset
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: shiftDate
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort direction
 *     responses:
 *       200:
 *         description: Successfully retrieved shift references
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
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
 * @swagger
 * /api/v1/shift-events/cancellation:
 *   post:
 *     summary: Report shift cancellation
 *     description: Report a shift cancellation with flexible lookup (by reference ID, phone, or worker/participant names) and optional automatic replacement triggering
 *     tags: [Roster]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cancellationReason
 *               - triggeredBy
 *             properties:
 *               shiftReferenceId:
 *                 type: string
 *                 description: Direct shift reference ID
 *               workerPhone:
 *                 type: string
 *                 description: For SMS-based lookup
 *               workerName:
 *                 type: string
 *                 description: Partial worker name match
 *               participantName:
 *                 type: string
 *                 description: Partial participant name match
 *               shiftDate:
 *                 type: string
 *                 description: ISO8601 date or 'today', 'tomorrow'
 *               shiftTime:
 *                 type: string
 *                 description: HH:mm format or 'morning', 'afternoon', 'evening', 'night'
 *               cancellationReason:
 *                 type: string
 *                 enum: [sick, emergency, unavailable, transport, other]
 *               cancellationMessage:
 *                 type: string
 *                 description: Additional cancellation details
 *               noticeHours:
 *                 type: number
 *                 description: Hours of notice (calculated if not provided)
 *               triggeredBy:
 *                 type: string
 *                 enum: [worker_sms, worker_whatsapp, worker_call, provider_portal, system_automation]
 *               triggeredByPhone:
 *                 type: string
 *                 description: Phone number if triggered via SMS/WhatsApp/call
 *               aiParsedEntities:
 *                 type: object
 *                 description: For automated parsing
 *               autoTriggerReplacement:
 *                 type: boolean
 *                 default: false
 *                 description: Automatically trigger worker replacement search
 *     responses:
 *       200:
 *         description: Cancellation reported successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Shift not found
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
 * @swagger
 * /api/v1/workers/find-replacements:
 *   post:
 *     summary: Find replacement workers
 *     description: Find suitable replacement workers for a cancelled shift based on competencies, location, availability, and reliability scores
 *     tags: [Roster]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shiftReferenceId
 *             properties:
 *               shiftReferenceId:
 *                 type: string
 *                 description: The cancelled shift reference ID
 *               preferences:
 *                 type: object
 *                 properties:
 *                   excludeWorkerIds:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: Workers to exclude from search
 *                   maxDistanceKm:
 *                     type: number
 *                     default: 20
 *                     description: Maximum distance from shift location
 *                   minReliabilityScore:
 *                     type: number
 *                     default: 0.70
 *                     description: Minimum reliability score (0.0-1.0)
 *                   preferPastExperience:
 *                     type: boolean
 *                     default: true
 *                     description: Prefer workers with past participant experience
 *                   requireAllCompetencies:
 *                     type: boolean
 *                     default: true
 *                     description: Require all shift competencies or allow partial match
 *               limit:
 *                 type: integer
 *                 default: 10
 *                 maximum: 50
 *                 description: Maximum number of replacement suggestions
 *     responses:
 *       200:
 *         description: Successfully found replacement workers
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Shift reference not found
 */
router.post(
  '/workers/find-replacements',
  authenticate,
  authorize([UserRole.PROVIDER, UserRole.ADMIN]),
  rosterController.findReplacements
);

export default router;

