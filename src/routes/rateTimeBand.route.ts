/**
 * RateTimeBand routes
 */

import express from 'express';
import { rateTimeBandController } from '../controllers/rateTimeBand.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import validate from '../middlewares/validate.middleware';
import { rateTimeBandValidation } from '../utils/validation';
import { UserRole } from '../types/user.types';

const router = express.Router();

/**
 * @swagger
 * /api/v1/rate-time-bands:
 *   get:
 *     summary: Get all rate time bands
 *     description: Retrieve all rate time bands with different pricing for different time periods (e.g., weekday, weekend, after-hours)
 *     tags: [Rate Time Bands]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved rate time bands
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       multiplier:
 *                         type: number
 *                       timeStart:
 *                         type: string
 *                       timeEnd:
 *                         type: string
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/',
  authenticate,
  rateTimeBandController.getAllRateTimeBands
);

/**
 * @swagger
 * /api/v1/rate-time-bands/{rateTimeBandId}:
 *   get:
 *     summary: Get rate time band by ID
 *     description: Retrieve a specific rate time band configuration
 *     tags: [Rate Time Bands]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rateTimeBandId
 *         required: true
 *         schema:
 *           type: string
 *         description: The rate time band ID
 *     responses:
 *       200:
 *         description: Successfully retrieved rate time band
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Rate time band not found
 */
router.get(
  '/:rateTimeBandId',
  authenticate,
  rateTimeBandController.getRateTimeBandById
);

/**
 * @swagger
 * /api/v1/rate-time-bands:
 *   post:
 *     summary: Create rate time band
 *     description: Create a new rate time band configuration (Admin only)
 *     tags: [Rate Time Bands]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - multiplier
 *               - timeStart
 *               - timeEnd
 *             properties:
 *               name:
 *                 type: string
 *                 example: Weekend Rate
 *               multiplier:
 *                 type: number
 *                 example: 1.5
 *                 description: Rate multiplier (1.5 = 150% of base rate)
 *               timeStart:
 *                 type: string
 *                 example: "18:00"
 *                 description: Start time in HH:mm format
 *               timeEnd:
 *                 type: string
 *                 example: "22:00"
 *                 description: End time in HH:mm format
 *               daysOfWeek:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday]
 *     responses:
 *       201:
 *         description: Rate time band created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.post(
  '/',
  authenticate,
  authorize([UserRole.ADMIN]),
  validate(rateTimeBandValidation.createRateTimeBand),
  rateTimeBandController.createRateTimeBand
);

/**
 * @swagger
 * /api/v1/rate-time-bands/{rateTimeBandId}:
 *   patch:
 *     summary: Update rate time band
 *     description: Update an existing rate time band configuration (Admin only)
 *     tags: [Rate Time Bands]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rateTimeBandId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               multiplier:
 *                 type: number
 *               timeStart:
 *                 type: string
 *               timeEnd:
 *                 type: string
 *               daysOfWeek:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Rate time band updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Rate time band not found
 */
router.patch(
  '/:rateTimeBandId',
  authenticate,
  authorize([UserRole.ADMIN]),
  validate(rateTimeBandValidation.updateRateTimeBand),
  rateTimeBandController.updateRateTimeBand
);

/**
 * @swagger
 * /api/v1/rate-time-bands/{rateTimeBandId}:
 *   delete:
 *     summary: Delete rate time band
 *     description: Delete a rate time band configuration (Admin only)
 *     tags: [Rate Time Bands]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rateTimeBandId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rate time band deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Rate time band not found
 */
router.delete(
  '/:rateTimeBandId',
  authenticate,
  authorize([UserRole.ADMIN]),
  rateTimeBandController.deleteRateTimeBand
);

export default router;