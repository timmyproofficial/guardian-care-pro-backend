/**
 * User routes
 */

import express from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import validate from '../middlewares/validate.middleware';
import { userValidation, workerValidation } from '../utils/validation';
import { profileUpload } from '../utils/cloudinary';
import { UserRole } from '../types/user.types';

const router = express.Router();

// Current user profile routes
router.get(
  '/profile',
  authenticate,
  userController.getProfile
);

router.patch(
  '/profile',
  authenticate,
  validate(userValidation.updateUser),
  userController.updateProfile
);

router.post(
  '/profile-image',
  authenticate,
  profileUpload.single('image'),
  userController.updateProfileImage
);

router.post(
  '/change-password',
  authenticate,
  validate(userValidation.updatePassword),
  userController.changePassword
);

// General user management routes (admin access)
router.get(
  '/',
  authenticate,
  authorize([UserRole.ADMIN]),
  userController.getUsers
);

router.get(
  '/:userId',
  authenticate,
  authorize([UserRole.ADMIN]),
  userController.getUserById
);

router.get(
  '/email/:email',
  authenticate,
  authorize([UserRole.ADMIN]),
  userController.getUserByEmail
);

// Admin routes for role-specific updates
router.patch(
  '/:role/:userId',
  authenticate,
  authorize([UserRole.ADMIN]),
  userController.updateUserByRoleAndId
);

router.patch(
  '/:userId',
  authenticate,
  authorize([UserRole.ADMIN]),
  validate(userValidation.updateUser),
  userController.updateUser
);

router.delete(
  '/:userId',
  authenticate,
  authorize([UserRole.ADMIN]),
  userController.deleteUser
);

router.patch(
  '/:userId/status',
  authenticate,
  authorize([UserRole.ADMIN]),
  userController.updateUserStatus
);

// Role-specific user routes
router.get(
  '/participants/:participantId',
  authenticate,
  userController.getParticipantById
);

router.get(
  '/workers/:workerId',
  authenticate,
  userController.getWorkerById
);

router.get(
  '/coordinators/:coordinatorId',
  authenticate,
  userController.getCoordinatorById
);

// Worker onboarding route
router.post(
  '/workers/onboarding',
  authenticate,
  authorize([UserRole.SUPPORT_WORKER]),
  validate(workerValidation.onboarding),
  userController.completeWorkerOnboarding
);

// Guardian-participant relationship routes
router.post(
  '/participants/:participantId/guardians/:guardianId',
  authenticate,
  authorize([UserRole.ADMIN]),
  userController.linkGuardianToParticipant
);

router.delete(
  '/participants/:participantId/guardians/:guardianId',
  authenticate,
  authorize([UserRole.ADMIN]),
  userController.unlinkGuardianFromParticipant
);

export default router;