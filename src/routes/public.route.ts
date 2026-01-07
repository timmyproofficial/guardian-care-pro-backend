/**
 * Public Routes
 * API routes that don't require authentication
 * Used for external worker interactions
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import * as publicController from '../controllers/public.controller';

const router = express.Router();

// Rate limiting for public endpoints to prevent abuse
const publicRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per window
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
    code: 429
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Stricter rate limit for cancellation endpoint
const cancellationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 cancellation attempts per hour
  message: {
    success: false,
    error: 'Too many cancellation attempts. Please try again later or contact your provider.',
    code: 429
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ═══════════════════════════════════════════════════════════════
// SHIFT CANCELLATION ENDPOINTS (No Auth Required)
// ═══════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/v1/public/shift-cancellation:
 *   post:
 *     summary: Cancel shift by phone
 *     description: Cancel an upcoming shift using phone number verification (no authentication required). Supports flexible date/time formats including 'today', 'tomorrow', 'morning', 'afternoon'.
 *     tags: [Public]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - workerPhone
 *               - cancellationReason
 *             properties:
 *               workerPhone:
 *                 type: string
 *                 description: Worker's phone number for verification
 *                 example: "+61412345678"
 *               shiftDate:
 *                 type: string
 *                 description: ISO date string, 'today', or 'tomorrow'
 *                 example: "today"
 *               shiftStartTime:
 *                 type: string
 *                 description: Time in HH:mm format or 'morning', 'afternoon', 'evening', 'night'
 *                 example: "morning"
 *               cancellationReason:
 *                 type: string
 *                 enum: [sick, emergency, unavailable, transport, other]
 *                 description: Reason for cancellation
 *               cancellationMessage:
 *                 type: string
 *                 description: Additional details about the cancellation
 *     responses:
 *       200:
 *         description: Shift cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 shiftDetails:
 *                   type: object
 *                 eventId:
 *                   type: string
 *       400:
 *         description: Validation error or shift not found
 *       429:
 *         description: Rate limit exceeded
 */
router.post(
  '/shift-cancellation',
  cancellationRateLimiter,
  publicController.cancelShiftByPhone
);

/**
 * @swagger
 * /api/v1/public/my-shifts:
 *   get:
 *     summary: Get worker's upcoming shifts
 *     description: Retrieve upcoming shifts for a worker using phone number (no authentication required)
 *     tags: [Public]
 *     parameters:
 *       - in: query
 *         name: phone
 *         required: true
 *         schema:
 *           type: string
 *         description: Worker's phone number
 *         example: "+61412345678"
 *     responses:
 *       200:
 *         description: Successfully retrieved shifts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 shifts:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: number
 *       400:
 *         description: Invalid phone number
 *       429:
 *         description: Rate limit exceeded
 */
router.get(
  '/my-shifts',
  publicRateLimiter,
  publicController.getMyShifts
);

/**
 * @swagger
 * /api/v1/public/cancellation-reasons:
 *   get:
 *     summary: Get cancellation reasons
 *     description: Retrieve list of available shift cancellation reasons
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: Successfully retrieved cancellation reasons
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 reasons:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       value:
 *                         type: string
 *                       label:
 *                         type: string
 */
router.get(
  '/cancellation-reasons',
  publicController.getCancellationReasons
);

export default router;

