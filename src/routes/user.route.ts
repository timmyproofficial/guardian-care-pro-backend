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
import { getProviderCoverageRules, updateProviderCoverageRules, resetProviderCoverageRules } from '../services/provider-coverage.service';
import { successResponse } from '../utils/api-response';

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

// ADMIN-specific provider routes
router.get(
  '/admin/providers',
  authenticate,
  authorize([UserRole.ADMIN]),
  userController.getAllProviderUsers,
);

router.get(
  '/admin/providers/phone/:phoneNumber',
  authenticate,
  authorize([UserRole.ADMIN]),
  userController.getProviderByPhoneNumber,
);

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

// ═══════════════════════════════════════════════════════════════
// PROVIDER COVERAGE RULES ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/v1/users/provider/coverage-rules:
 *   get:
 *     summary: Get provider coverage rules
 *     description: Retrieve current coverage and approval rules for the provider
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved coverage rules
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Provider only
 */
router.get(
  '/provider/coverage-rules',
  authenticate,
  authorize([UserRole.PROVIDER]),
  async (req: any, res: any, next: any) => {
    try {
      const rules = await getProviderCoverageRules(req.user._id);
      return res.json(successResponse({ rules }, 'Coverage rules retrieved successfully'));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/users/provider/coverage-rules:
 *   put:
 *     summary: Update provider coverage rules
 *     description: Update coverage and approval rules for shift assignments
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enableAutoApproval:
 *                 type: boolean
 *                 description: Enable automatic approval for standard shifts
 *               enableEmergencyAutoApproval:
 *                 type: boolean
 *                 description: Enable automatic approval for emergency shifts (<2hrs notice)
 *               autoApprovalCriteria:
 *                 type: object
 *                 properties:
 *                   minRating:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 5
 *                   requireExperienceWithShiftType:
 *                     type: boolean
 *                   requireExperienceWithLocation:
 *                     type: boolean
 *                   maxDistanceKm:
 *                     type: number
 *                     minimum: 0
 *                   requireValidCredentials:
 *                     type: boolean
 *                   maxAcceptTimeMinutes:
 *                     type: number
 *                     minimum: 1
 *               manualApprovalTriggers:
 *                 type: object
 *                 properties:
 *                   ratingBelow:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 5
 *                   newWorkerThreshold:
 *                     type: number
 *                     minimum: 0
 *                   requireShiftTypeExperience:
 *                     type: boolean
 *                   maxDistanceKm:
 *                     type: number
 *                     minimum: 0
 *                   weekendOrOvernightShifts:
 *                     type: boolean
 *                   highComplexityParticipants:
 *                     type: boolean
 *                   highRateThreshold:
 *                     type: number
 *                     minimum: 0
 *               priorityRankingOrder:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [worked_exact_shift, worked_same_location, highest_rating, closest_distance, most_recent_shift, longest_time_since_shift]
 *               escalationSettings:
 *                 type: object
 *                 properties:
 *                   standardShiftTimeoutMinutes:
 *                     type: number
 *                     minimum: 1
 *                   emergencyShiftTimeoutMinutes:
 *                     type: number
 *                     minimum: 1
 *                   escalationOptions:
 *                     type: array
 *                     items:
 *                       type: string
 *                       enum: [notify_provider, contact_backup_agency, offer_higher_rate, broadcast_to_all]
 *                   rateIncreaseAmount:
 *                     type: number
 *                     minimum: 0
 *               communicationSettings:
 *                 type: object
 *                 properties:
 *                   useDirectiveLanguage:
 *                     type: boolean
 *                   standardCancellationNoticeHours:
 *                     type: number
 *                     minimum: 0
 *                   emergencyCancellationNoticeHours:
 *                     type: number
 *                     minimum: 0
 *     responses:
 *       200:
 *         description: Coverage rules updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Provider only
 */
router.put(
  '/provider/coverage-rules',
  authenticate,
  authorize([UserRole.PROVIDER]),
  async (req: any, res: any, next: any) => {
    try {
      const rules = await updateProviderCoverageRules(req.user._id, req.body);
      return res.json(successResponse({ rules }, 'Coverage rules updated successfully'));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/users/provider/coverage-rules/reset:
 *   post:
 *     summary: Reset provider coverage rules to defaults
 *     description: Reset all coverage rules to default settings
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coverage rules reset to defaults
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Provider only
 */
router.post(
  '/provider/coverage-rules/reset',
  authenticate,
  authorize([UserRole.PROVIDER]),
  async (req: any, res: any, next: any) => {
    try {
      const rules = await resetProviderCoverageRules(req.user._id);
      return res.json(successResponse({ rules }, 'Coverage rules reset to defaults'));
    } catch (error) {
      next(error);
    }
  }
);

export default router;
