/**
 * RateTimeBand controller
 * Handles HTTP requests related to shift type management
 */

import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import RateTimeBand from '../models/rateTimeBand.model';
import { successResponse, errorResponse } from '../utils/api-response';

export const rateTimeBandController = {
  /**
   * Get all rate time bands
   * @route GET /api/rate-time-bands
   */
  getAllRateTimeBands: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const rateTimeBands = await RateTimeBand.find({ isActive: true }).sort({ name: 1 });
      
      res.json(successResponse({ rateTimeBands }, 'Rate time bands retrieved successfully'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get rate time band by ID
   * @route GET /api/rate-time-bands/:rateTimeBandId
   */
  getRateTimeBandById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { rateTimeBandId } = req.params;
      
      const rateTimeBand = await RateTimeBand.findById(rateTimeBandId);
      
      if (!rateTimeBand) {
        return res.status(httpStatus.NOT_FOUND).json(
          errorResponse('Shift type not found', httpStatus.NOT_FOUND)
        );
      }
      
      return res.json(successResponse({ rateTimeBand }, 'Rate time band retrieved successfully'));
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Create rate time band (admin only)
   * @route POST /api/rate-time-bands
   */
  createRateTimeBand: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { 
        name, 
        code, 
        startTime, 
        endTime, 
        description, 
        isWeekend, 
        isPublicHoliday, 
        isSleepover, 
        baseRateMultiplier 
    } = req.body;
      
      // Check if code already exists
      const existingRateTimeBand = await RateTimeBand.findOne({ code });
      
      if (existingRateTimeBand) {
        return res.status(httpStatus.BAD_REQUEST).json(
          errorResponse('Rate time band code already exists', httpStatus.BAD_REQUEST)
        );
      }
      
      // Create rate time band
      const rateTimeBand = await RateTimeBand.create({
        name,
        code,
        startTime,
        endTime,
        description,
        isWeekend,
        isPublicHoliday,
        isSleepover,
        baseRateMultiplier,
      });
      
      return res.status(httpStatus.CREATED).json(
        successResponse({ rateTimeBand }, 'Rate time band created successfully')
      );
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Update rate time band (admin only)
   * @route PATCH /api/rate-time-bands/:rateTimeBandId
   */
  updateRateTimeBand: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { rateTimeBandId } = req.params;
      const updateData = req.body;
      
      // Prevent code changes if code is already assigned to another rate time band
      if (updateData.code) {
        const existingRateTimeBand = await RateTimeBand.findOne({ 
          code: updateData.code,
          _id: { $ne: rateTimeBandId }
        });
        
        if (existingRateTimeBand) {
          return res.status(httpStatus.BAD_REQUEST).json(
            errorResponse('Rate time band code already exists', httpStatus.BAD_REQUEST)
          );
        }
      }
      
      // Update rate time band
      const rateTimeBand = await RateTimeBand.findByIdAndUpdate(
        rateTimeBandId,
        updateData,
        { new: true, runValidators: true }
      );
      
      if (!rateTimeBand) {
        return res.status(httpStatus.NOT_FOUND).json(
          errorResponse('Rate time band not found', httpStatus.NOT_FOUND)
        );
      }
      
      return res.json(successResponse({ rateTimeBand }, 'Rate time band updated successfully'));
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Delete rate time band (admin only)
   * @route DELETE /api/rate-time-bands/:rateTimeBandId
   */
  deleteRateTimeBand: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { rateTimeBandId } = req.params;
      
      // Instead of actually deleting, mark as inactive
      const rateTimeBand = await RateTimeBand.findByIdAndUpdate(
        rateTimeBandId,
        { isActive: false },
        { new: true }
      );
      
      if (!rateTimeBand) {
        return res.status(httpStatus.NOT_FOUND).json(
          errorResponse('Rate time band not found', httpStatus.NOT_FOUND)
        );
      }
      
      return res.json(successResponse({}, 'Rate time band deactivated successfully'));
    } catch (error) {
      return next(error);
    }
  }
};