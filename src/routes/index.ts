/**
 * Routes index
 * Combines all API routes
 */

import express, { Router } from 'express';
import authRoute from './auth.route';
import userRoute from './user.route';
// import organizationRoute from './organization.route';
// import workerRoute from './worker.route';
// import participantRoute from './participant.route';
// import shiftRoute from './shift.route';
// import timesheetRoute from './timesheet.route';
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
  // {
  //   path: '/organizations',
  //   route: organizationRoute,
  //   authRequired: true,
  // },
//   {
//     path: '/workers',
//     route: workerRoute,
//     authRequired: true,
//   },
//   {
//     path: '/participants',
//     route: participantRoute,
//     authRequired: true,
//   },
//   {
//     path: '/shifts',
//     route: shiftRoute,
//     authRequired: true,
//   },
//   {
//     path: '/timesheets',
//     route: timesheetRoute,
//     authRequired: true,
//   },
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