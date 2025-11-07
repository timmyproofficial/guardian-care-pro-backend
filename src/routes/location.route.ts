/**
 * Location Routes
 * Routes for location reference data and geospatial worker search
 */

import express from 'express';
import * as locationController from '../controllers/location.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = express.Router();

// ===== Location Reference Data Routes =====

/**
 * @route   GET /api/location/states
 * @desc    Get all states
 * @access  Private
 */
router.get('/states', authenticate, locationController.getStates);

/**
 * @route   GET /api/location/regions/:stateId
 * @desc    Get regions by state ID
 * @access  Private
 */
router.get('/regions/:stateId', authenticate, locationController.getRegions);

/**
 * @route   GET /api/location/suburbs/region/:regionId
 * @desc    Get suburbs by region ID
 * @access  Private
 */
router.get('/suburbs/region/:regionId', authenticate, locationController.getSuburbsByRegion);

/**
 * @route   GET /api/location/suburbs/state/:stateId
 * @desc    Get suburbs by state ID
 * @access  Private
 */
router.get('/suburbs/state/:stateId', authenticate, locationController.getSuburbsByState);

/**
 * @route   GET /api/location/suburbs/search
 * @desc    Search suburbs by name or postcode
 * @query   query, stateId (optional), limit (optional)
 * @access  Private
 */
router.get('/suburbs/search', authenticate, locationController.searchSuburbs);

/**
 * @route   GET /api/location/service-areas/region/:regionId
 * @desc    Get service areas by region ID
 * @access  Private
 */
router.get('/service-areas/region/:regionId', authenticate, locationController.getServiceAreasByRegion);

/**
 * @route   GET /api/location/service-areas/state/:stateId
 * @desc    Get service areas by state ID
 * @access  Private
 */
router.get('/service-areas/state/:stateId', authenticate, locationController.getServiceAreasByState);

/**
 * @route   GET /api/location/service-areas
 * @desc    Get all service areas
 * @access  Private
 */
router.get('/service-areas', authenticate, locationController.getAllServiceAreas);

/**
 * @route   GET /api/location/hierarchy/:suburbId
 * @desc    Get complete location hierarchy (state, region, service areas) for a suburb
 * @access  Private
 */
router.get('/hierarchy/:suburbId', authenticate, locationController.getLocationHierarchy);

/**
 * @route   POST /api/location/geocode
 * @desc    Geocode an address to get coordinates
 * @body    { street?, suburb, postcode, state }
 * @access  Private
 */
router.post('/geocode', authenticate, locationController.geocodeAddress);

// ===== Geospatial Worker Search Routes =====

/**
 * @route   GET /api/location/workers/nearby
 * @desc    Search for workers near participant's location (geospatial search)
 * @query   maxDistanceKm, page, limit, skills[], languages[], minRating, maxHourlyRate, onlyVerified, keyword
 * @access  Private (Participant only - uses authenticated user's ID)
 * @example GET /api/location/workers/nearby?maxDistanceKm=30&skills[]=skill1&skills[]=skill2&page=1&limit=10
 */
router.get('/workers/nearby', authenticate, locationController.searchNearbyWorkers);

/**
 * @route   GET /api/location/workers/by-region
 * @desc    Search for workers by region/state/service area
 * @query   stateId, regionId, serviceAreaId, matchParticipantLocation, page, limit, + standard filters
 * @access  Private (Participant only - uses authenticated user's ID)
 * @example GET /api/location/workers/by-region?regionId=456&skills[]=skill1&page=1&limit=10
 * @example GET /api/location/workers/by-region?matchParticipantLocation=true&page=1&limit=10
 */
router.get('/workers/by-region', authenticate, locationController.searchWorkersByRegion);

export default router;

