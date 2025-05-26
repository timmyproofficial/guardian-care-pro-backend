/**
 * Routes index
 * Combines all API routes
 */

import express, { Router } from 'express';
import authRoute from './auth.route';
import userRoute from './user.route';
import organizationRoute from './organization.route';
import rateTimeBandRoute from './rateTimeBand.route';
import shiftRoute from './shift.route';
import timesheetRoute from './timesheet.route';
import workerRoute from './worker.route';
import chatRoute from './chat.route';
// import participantRoute from './participant.route';
// import documentRoute from './document.route';
import { authenticate } from '../middlewares/auth.middleware';

const router: Router = express.Router();

/**
 * Route configurations
 */
interface Route {
  path: string;
  route: Router;
  authRequired?: boolean;
}

const routes: Route[] = [
  {
    path: '/auth',
    route: authRoute,
    authRequired: false,
  },
  {
    path: '/users',
    route: userRoute,
    authRequired: true,
  },
  {
    path: '/organizations',
    route: organizationRoute,
    authRequired: true,
  },
  {
    path: '/rate-time-band',
    route: rateTimeBandRoute,
    authRequired: true,
  },
  {
    path: '/shifts',
    route: shiftRoute,
    authRequired: true,
  },
  {
    path: '/timesheets',
    route: timesheetRoute,
    authRequired: true,
  },
  {
    path: '/workers',
    route: workerRoute,
    authRequired: true,
  },
  {
    path: '/chat',
    route: chatRoute,
    authRequired: true,
  }
//   {
//     path: '/documents',
//     route: documentRoute,
//     authRequired: true,
//   },
];

// Register all routes
routes.forEach((route) => {
  if (route.authRequired) {
    router.use(route.path, authenticate, route.route);
  } else {
    router.use(route.path, route.route);
  }
});

export default router;