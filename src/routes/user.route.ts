/**
 * User routes
 */

import express from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import validate from '../middlewares/validate.middleware';
import { userValidation, workerValidation, participantValidation } from '../utils/validation';
import { profileUpload, documentUpload } from '../utils/cloudinary';
import { UserRole } from '../types/user.types';

const router = express.Router();

// Current user profile routes
router.get('/profile', authenticate, userController.getProfile);

router.patch(
  '/profile',
  authenticate,
  // validate(userValidation.updateUser),
  userController.updateProfile,
);

router.post('/profile-image', authenticate, profileUpload.single('image'), userController.updateProfileImage);
router.post('/upload-resume', authenticate, documentUpload.single('file'), authorize([UserRole.SUPPORT_WORKER]), userController.uploadResume);

router.post('/change-password', authenticate, validate(userValidation.updatePassword), userController.changePassword);

router.patch('/profile/address', authenticate, validate(userValidation.updateAddress), userController.updateAddress);

// User-specific account management routes
/**
 * @swagger
 * /api/v1/users/profile:
 *   delete:
 *     summary: Delete current user's account
 *     description: Delete current user's account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully deleted
 *       401:
 *         description: Unauthorized
 */
router.delete('/profile', authenticate, userController.deleteMyAccount);

/**
 * @swagger
 * /api/v1/users/profile/deactivate:
 *   patch:
 *     summary: Deactivate current user's account
 *     description: Deactivate current user's account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Successfully updated
 *       401:
 *         description: Unauthorized
 */
router.patch('/profile/deactivate', authenticate, userController.deactivateMyAccount);

// General user management routes (admin access)
router.get('/', authenticate, authorize([UserRole.ADMIN]), userController.getUsers);

router.get('/:userId', authenticate, authorize([UserRole.ADMIN]), userController.getUserById);

router.get('/email/:email', authenticate, authorize([UserRole.ADMIN]), userController.getUserByEmail);

// Admin routes for role-specific updates
router.patch('/:role/:userId', authenticate, authorize([UserRole.ADMIN]), userController.updateUserByRoleAndId);

router.patch(
  '/:userId',
  authenticate,
  authorize([UserRole.ADMIN]),
  validate(userValidation.updateUser),
  userController.updateUser,
);

router.delete('/:userId', authenticate, authorize([UserRole.ADMIN]), userController.deleteUser);

router.patch('/:userId/status', authenticate, authorize([UserRole.ADMIN]), userController.updateUserStatus);

// Role-specific user routes
router.get('/participants/:participantId', authenticate, userController.getParticipantById);

router.get('/workers/:workerId', authenticate, userController.getWorkerById);

router.get('/coordinators/:coordinatorId', authenticate, userController.getCoordinatorById);

// Worker onboarding route
router.post(
  '/workers/onboarding',
  authenticate,
  authorize([UserRole.SUPPORT_WORKER]),
  validate(workerValidation.onboarding),
  userController.completeWorkerOnboarding,
);

// Participant onboarding route
router.post(
  '/participants/onboarding',
  authenticate,
  authorize([UserRole.PARTICIPANT]),
  validate(participantValidation.onboarding),
  userController.completeParticipantOnboarding,
);

// Guardian-participant relationship routes
router.post(
  '/participants/:participantId/guardians/:guardianId',
  authenticate,
  authorize([UserRole.ADMIN]),
  userController.linkGuardianToParticipant,
);

router.delete(
  '/participants/:participantId/guardians/:guardianId',
  authenticate,
  authorize([UserRole.ADMIN]),
  userController.unlinkGuardianFromParticipant,
);

export default router;
