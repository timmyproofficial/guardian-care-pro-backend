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
 * Cancel a shift by phone number
 * POST /api/public/shift-cancellation
 * 
 * Body:
 * - workerPhone (required): Worker's phone number for verification
 * - shiftDate (optional): ISO date, 'today', or 'tomorrow'
 * - shiftStartTime (optional): 'HH:mm' or 'morning', 'afternoon', 'evening', 'night'
 * - cancellationReason (required): sick, emergency, unavailable, transport, other
 * - cancellationMessage (optional): Additional details
 * 
 * Response:
 * - success: boolean
 * - message: Human-readable result
 * - shiftDetails: Cancelled shift info (if successful)
 * - eventId: Audit trail event ID (if successful)
 */
router.post(
  '/shift-cancellation',
  cancellationRateLimiter,
  publicController.cancelShiftByPhone
);

/**
 * Get upcoming shifts for a worker
 * GET /api/public/my-shifts?phone=+61412345678
 * 
 * Query params:
 * - phone (required): Worker's phone number
 * 
 * Response:
 * - shifts: Array of upcoming shifts
 * - total: Number of shifts found
 */
router.get(
  '/my-shifts',
  publicRateLimiter,
  publicController.getMyShifts
);

/**
 * Get available cancellation reasons
 * GET /api/public/cancellation-reasons
 * 
 * Response:
 * - reasons: Array of { value, label } objects
 */
router.get(
  '/cancellation-reasons',
  publicController.getCancellationReasons
);

export default router;

