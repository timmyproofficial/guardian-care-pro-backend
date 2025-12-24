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
 * @swagger
 * /api/v1/location/states:
 *   get:
 *     summary: Get all states
 *     description: Get all states
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 */
router.get('/states', authenticate, locationController.getStates);

/**
 * @swagger
 * /api/v1/location/regions/:stateId:
 *   get:
 *     summary: Get regions by state ID
 *     description: Get regions by state ID
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: stateId
 *         required: true
 *         schema:
 *           type: string
 *         description: The stateId
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.get('/regions/:stateId', authenticate, locationController.getRegions);

/**
 * @swagger
 * /api/v1/location/suburbs/region/:regionId:
 *   get:
 *     summary: Get suburbs by region ID
 *     description: Get suburbs by region ID
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: regionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The regionId
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.get('/suburbs/region/:regionId', authenticate, locationController.getSuburbsByRegion);

/**
 * @swagger
 * /api/v1/location/suburbs/state/:stateId:
 *   get:
 *     summary: Get suburbs by state ID
 *     description: Get suburbs by state ID
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: stateId
 *         required: true
 *         schema:
 *           type: string
 *         description: The stateId
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.get('/suburbs/state/:stateId', authenticate, locationController.getSuburbsByState);

/**
 * @swagger
 * /api/v1/location/suburbs/search:
 *   get:
 *     summary: Search suburbs by name or postcode
 *     description: Search suburbs by name or postcode
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: query
 *       - in: query
 *         name: stateId
 *         schema:
 *           type: string
 *         description: stateId (optional)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: string
 *         description: limit (optional)
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 */
router.get('/suburbs/search', authenticate, locationController.searchSuburbs);

/**
 * @swagger
 * /api/v1/location/service-areas/region/:regionId:
 *   get:
 *     summary: Get service areas by region ID
 *     description: Get service areas by region ID
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: regionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The regionId
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.get('/service-areas/region/:regionId', authenticate, locationController.getServiceAreasByRegion);

/**
 * @swagger
 * /api/v1/location/service-areas/state/:stateId:
 *   get:
 *     summary: Get service areas by state ID
 *     description: Get service areas by state ID
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: stateId
 *         required: true
 *         schema:
 *           type: string
 *         description: The stateId
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.get('/service-areas/state/:stateId', authenticate, locationController.getServiceAreasByState);

/**
 * @swagger
 * /api/v1/location/service-areas:
 *   get:
 *     summary: Get all service areas
 *     description: Get all service areas
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 */
router.get('/service-areas', authenticate, locationController.getAllServiceAreas);

/**
 * @swagger
 * /api/v1/location/hierarchy/:suburbId:
 *   get:
 *     summary: Get complete location hierarchy (state, region, service areas) for a suburb
 *     description: Get complete location hierarchy (state, region, service areas) for a suburb
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: suburbId
 *         required: true
 *         schema:
 *           type: string
 *         description: The suburbId
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.get('/hierarchy/:suburbId', authenticate, locationController.getLocationHierarchy);

/**
 * @swagger
 * /api/v1/location/geocode:
 *   post:
 *     summary: Geocode an address to get coordinates
 *     description: Geocode an address to get coordinates
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: { street?, suburb, postcode, state }
 *     responses:
 *       201:
 *         description: Successfully created
 *       401:
 *         description: Unauthorized
 */
router.post('/geocode', authenticate, locationController.geocodeAddress);

// ===== Geospatial Worker Search Routes =====

/**
 * @swagger
 * /api/v1/location/workers/nearby:
 *   get:
 *     summary: Search for workers near participant's location (geospatial search)
 *     description: Search for workers near participant's location (geospatial search)
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: maxDistanceKm
 *         required: true
 *         schema:
 *           type: string
 *         description: maxDistanceKm
 *       - in: query
 *         name: page
 *         required: true
 *         schema:
 *           type: string
 *         description: page
 *       - in: query
 *         name: limit
 *         required: true
 *         schema:
 *           type: string
 *         description: limit
 *       - in: query
 *         name: skills
 *         required: true
 *         schema:
 *           type: array
 *         description: skills[]
 *       - in: query
 *         name: languages
 *         required: true
 *         schema:
 *           type: array
 *         description: languages[]
 *       - in: query
 *         name: minRating
 *         required: true
 *         schema:
 *           type: string
 *         description: minRating
 *       - in: query
 *         name: maxHourlyRate
 *         required: true
 *         schema:
 *           type: string
 *         description: maxHourlyRate
 *       - in: query
 *         name: onlyVerified
 *         required: true
 *         schema:
 *           type: string
 *         description: onlyVerified
 *       - in: query
 *         name: keyword
 *         required: true
 *         schema:
 *           type: string
 *         description: keyword
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 */
router.get('/workers/nearby', authenticate, locationController.searchNearbyWorkers);

/**
 * @swagger
 * /api/v1/location/workers/by-region:
 *   get:
 *     summary: Search for workers by region/state/service area
 *     description: Search for workers by region/state/service area
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: stateId
 *         required: true
 *         schema:
 *           type: string
 *         description: stateId
 *       - in: query
 *         name: regionId
 *         required: true
 *         schema:
 *           type: string
 *         description: regionId
 *       - in: query
 *         name: serviceAreaId
 *         required: true
 *         schema:
 *           type: string
 *         description: serviceAreaId
 *       - in: query
 *         name: matchParticipantLocation
 *         required: true
 *         schema:
 *           type: string
 *         description: matchParticipantLocation
 *       - in: query
 *         name: page
 *         required: true
 *         schema:
 *           type: string
 *         description: page
 *       - in: query
 *         name: limit
 *         required: true
 *         schema:
 *           type: string
 *         description: limit
 *       - in: query
 *         name: standard
 *         required: true
 *         schema:
 *           type: string
 *         description: + standard filters
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 */
router.get('/workers/by-region', authenticate, locationController.searchWorkersByRegion);

export default router;

