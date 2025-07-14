import { authenticate, authorize } from '../middlewares/auth.middleware';
import validate from '../middlewares/validate.middleware';
import express from 'express';
import { UserRole } from '../types/user.types';
import { incidentValidation } from '../utils/validation';
import incidentController from '../controllers/incident.controller';

const router: express.Router = express.Router();

router.post(
  '/',
  authenticate,
  authorize([UserRole.SUPPORT_WORKER]),
  validate(incidentValidation.createIncident),
  incidentController.createIncident,
);
router.get('/', authenticate, incidentController.getAllIncidents);
router.get('/:id', authenticate, incidentController.getIncidentById);
router.get('/shift/:shiftId', authenticate, incidentController.getIncidentsByShift);
router.patch(
  '/:id/resolve',
  authenticate,
  validate(incidentValidation.resolveIncident),
  incidentController.resolveIncident,
);
router.patch(
  '/:id/status',
  authenticate,
  validate(incidentValidation.updateIncidentStatus),
  incidentController.updateIncidentStatus,
);

router.put(
  '/:id/update',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPPORT_WORKER]),
  validate(incidentValidation.updateIncident),
  incidentController.updateIncident,
);

router.delete(
  '/:id/delete',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPPORT_WORKER]),
  incidentController.deleteIncident,
);
export default router;
