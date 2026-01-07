import { authenticate, authorize } from '../middlewares/auth.middleware';
import validate from '../middlewares/validate.middleware';
import express from 'express';
import { UserRole } from '../types/user.types';
import { incidentValidation } from '../utils/validation';
import incidentController from '../controllers/incident.controller';

const router: express.Router = express.Router();

/**
 * @swagger
 * /api/v1/incidents:
 *   post:
 *     summary: Create incident
 *     description: Report a new incident during a shift (Support Worker only)
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shiftId
 *               - incidentType
 *               - description
 *             properties:
 *               shiftId:
 *                 type: string
 *                 description: The shift ID where incident occurred
 *               incidentType:
 *                 type: string
 *                 description: Type of incident
 *               description:
 *                 type: string
 *                 description: Detailed description of the incident
 *               severity:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *     responses:
 *       201:
 *         description: Incident created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Support Worker only
 */
router.post(
  '/',
  authenticate,
  authorize([UserRole.SUPPORT_WORKER]),
  validate(incidentValidation.createIncident),
  incidentController.createIncident,
);

/**
 * @swagger
 * /api/v1/incidents:
 *   get:
 *     summary: Get all incidents
 *     description: Retrieve all incidents based on user role
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved incidents
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, incidentController.getAllIncidents);

/**
 * @swagger
 * /api/v1/incidents/{id}:
 *   get:
 *     summary: Get incident by ID
 *     description: Retrieve detailed information about a specific incident
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Incident ID
 *     responses:
 *       200:
 *         description: Successfully retrieved incident
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Incident not found
 */
router.get('/:id', authenticate, incidentController.getIncidentById);

/**
 * @swagger
 * /api/v1/incidents/shift/{shiftId}:
 *   get:
 *     summary: Get incidents by shift
 *     description: Retrieve all incidents associated with a specific shift
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shiftId
 *         required: true
 *         schema:
 *           type: string
 *         description: Shift ID
 *     responses:
 *       200:
 *         description: Successfully retrieved shift incidents
 *       401:
 *         description: Unauthorized
 */
router.get('/shift/:shiftId', authenticate, incidentController.getIncidentsByShift);
/**
 * @swagger
 * /api/v1/incidents/{id}/resolve:
 *   patch:
 *     summary: Resolve incident
 *     description: Mark an incident as resolved with resolution details
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Incident ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resolutionNotes:
 *                 type: string
 *                 description: Notes about how the incident was resolved
 *     responses:
 *       200:
 *         description: Incident resolved successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Incident not found
 */
router.patch(
  '/:id/resolve',
  authenticate,
  validate(incidentValidation.resolveIncident),
  incidentController.resolveIncident,
);

/**
 * @swagger
 * /api/v1/incidents/{id}/status:
 *   patch:
 *     summary: Update incident status
 *     description: Update the status of an incident
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Incident ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, investigating, resolved, closed]
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Incident not found
 */
router.patch(
  '/:id/status',
  authenticate,
  validate(incidentValidation.updateIncidentStatus),
  incidentController.updateIncidentStatus,
);

/**
 * @swagger
 * /api/v1/incidents/{id}/update:
 *   put:
 *     summary: Update incident
 *     description: Update incident details (Admin or Support Worker who created it)
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Incident ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *               severity:
 *                 type: string
 *               incidentType:
 *                 type: string
 *     responses:
 *       200:
 *         description: Incident updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Incident not found
 */
router.put(
  '/:id/update',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPPORT_WORKER]),
  validate(incidentValidation.updateIncident),
  incidentController.updateIncident,
);

/**
 * @swagger
 * /api/v1/incidents/{id}/delete:
 *   delete:
 *     summary: Delete incident
 *     description: Delete an incident (Admin or Support Worker who created it)
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Incident ID
 *     responses:
 *       200:
 *         description: Incident deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Incident not found
 */
router.delete(
  '/:id/delete',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPPORT_WORKER]),
  incidentController.deleteIncident,
);
export default router;
