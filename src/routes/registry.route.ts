/**
 * Registry Routes
 * API routes for manual worker and participant onboarding
 */

import express from 'express';
import { registryController } from '../controllers/registry.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { UserRole } from '../types/user.types';

const router = express.Router();

// All registry routes require authentication and provider/admin role
const requireProviderOrAdmin = [authenticate, authorize([UserRole.PROVIDER, UserRole.ADMIN])];

// ═══════════════════════════════════════════════════════════════
// WORKER REGISTRY ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/v1/registry/workers:
 *   post:
 *     summary: Manually onboard a worker
 *     description: Add a worker to the registry manually (bypassing automatic roster processing)
 *     tags: [Registry]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - workerName
 *             properties:
 *               workerName:
 *                 type: string
 *                 description: Full name of the worker
 *                 example: "Jane Smith"
 *               phone:
 *                 type: string
 *                 description: Worker phone number
 *                 example: "+61412345678"
 *               email:
 *                 type: string
 *                 description: Worker email address
 *                 example: "jane.smith@email.com"
 *               externalWorkerId:
 *                 type: string
 *                 description: External system worker ID
 *                 example: "EMP001"
 *               competencies:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of worker competencies
 *                 example: ["Personal Care", "Medication Administration"]
 *               qualifications:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of worker qualifications
 *                 example: ["Certificate III", "First Aid"]
 *               matchedUserId:
 *                 type: string
 *                 description: ID of existing user account to match this worker to
 *     responses:
 *       201:
 *         description: Worker successfully onboarded
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Provider/Admin only
 *       409:
 *         description: Worker already exists
 */
router.post('/workers', requireProviderOrAdmin, registryController.onboardWorker);

/**
 * @swagger
 * /api/v1/registry/workers:
 *   get:
 *     summary: Get workers in registry
 *     description: Retrieve workers in your registry with optional filtering and pagination
 *     tags: [Registry]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 200
 *         description: Number of results per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [lightweight, matched, invited, active]
 *         description: Filter by registry status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, phone, or email
 *     responses:
 *       200:
 *         description: Successfully retrieved workers
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/workers', requireProviderOrAdmin, registryController.getWorkers);

/**
 * @swagger
 * /api/v1/registry/workers/{workerId}:
 *   patch:
 *     summary: Update worker registry entry
 *     description: Update details of a worker in your registry
 *     tags: [Registry]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Worker registry ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               workerName:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               competencies:
 *                 type: array
 *                 items:
 *                   type: string
 *               qualifications:
 *                 type: array
 *                 items:
 *                   type: string
 *               matchedUserId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Worker updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Worker not found
 */
router.patch('/workers/:workerId', requireProviderOrAdmin, registryController.updateWorker);

// ═══════════════════════════════════════════════════════════════
// PARTICIPANT REGISTRY ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/v1/registry/participants:
 *   post:
 *     summary: Manually onboard a participant
 *     description: Add a participant to the registry manually (bypassing automatic roster processing)
 *     tags: [Registry]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - participantName
 *             properties:
 *               participantName:
 *                 type: string
 *                 description: Full name of the participant
 *                 example: "John Doe"
 *               phone:
 *                 type: string
 *                 description: Participant phone number
 *                 example: "+61412345678"
 *               ndisNumber:
 *                 type: string
 *                 description: NDIS number
 *                 example: "12345678"
 *               externalParticipantId:
 *                 type: string
 *                 description: External system participant ID
 *                 example: "PT001"
 *               supportNeeds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of support needs
 *                 example: ["Personal Care", "Mobility Assistance"]
 *               preferredGender:
 *                 type: string
 *                 description: Preferred worker gender
 *                 example: "Female"
 *               preferredLanguages:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Preferred languages
 *                 example: ["English", "Mandarin"]
 *               address:
 *                 type: string
 *                 description: Participant address
 *               postcode:
 *                 type: string
 *                 description: Postcode
 *               matchedUserId:
 *                 type: string
 *                 description: ID of existing user account to match this participant to
 *     responses:
 *       201:
 *         description: Participant successfully onboarded
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Provider/Admin only
 *       409:
 *         description: Participant already exists
 */
router.post('/participants', requireProviderOrAdmin, registryController.onboardParticipant);

/**
 * @swagger
 * /api/v1/registry/participants:
 *   get:
 *     summary: Get participants in registry
 *     description: Retrieve participants in your registry with optional filtering and pagination
 *     tags: [Registry]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 200
 *         description: Number of results per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [lightweight, matched, invited, active]
 *         description: Filter by registry status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, phone, or NDIS number
 *     responses:
 *       200:
 *         description: Successfully retrieved participants
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/participants', requireProviderOrAdmin, registryController.getParticipants);

/**
 * @swagger
 * /api/v1/registry/participants/{participantId}:
 *   patch:
 *     summary: Update participant registry entry
 *     description: Update details of a participant in your registry
 *     tags: [Registry]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: participantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Participant registry ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               participantName:
 *                 type: string
 *               phone:
 *                 type: string
 *               ndisNumber:
 *                 type: string
 *               supportNeeds:
 *                 type: array
 *                 items:
 *                   type: string
 *               preferredGender:
 *                 type: string
 *               preferredLanguages:
 *                 type: array
 *                 items:
 *                   type: string
 *               address:
 *                 type: string
 *               postcode:
 *                 type: string
 *               matchedUserId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Participant updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Participant not found
 */
router.patch('/participants/:participantId', requireProviderOrAdmin, registryController.updateParticipant);

export default router;