/**
 * Swagger/OpenAPI Configuration
 * Auto-generates API documentation from JSDoc comments
 */

import swaggerJsDoc from 'swagger-jsdoc';
import { version } from '../../package.json';

const swaggerOptions: swaggerJsDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Guardian Care Pro API',
      version: version,
      description: 'Backend API for Support24 - A platform connecting Independent Support Workers with participants and their guardians',
      contact: {
        name: 'Support24 Team',
        email: 'support@support24.com.au',
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
      {
        url: 'https://your-production-url.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
          description: 'JWT token stored in cookie',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            code: {
              type: 'integer',
              description: 'HTTP status code',
            },
            message: {
              type: 'string',
              description: 'Error message',
            },
            stack: {
              type: 'string',
              description: 'Error stack trace (only in development)',
            },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            code: {
              type: 'integer',
              example: 400,
            },
            message: {
              type: 'string',
              example: 'Validation error',
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                  },
                  message: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
      {
        cookieAuth: [],
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints',
      },
      {
        name: 'Jobs',
        description: 'Job posting and management',
      },
      {
        name: 'Users',
        description: 'User management',
      },
      {
        name: 'Workers',
        description: 'Support worker management',
      },
      {
        name: 'Organizations',
        description: 'Organization management',
      },
      {
        name: 'Shifts',
        description: 'Shift scheduling and management',
      },
      {
        name: 'Timesheets',
        description: 'Timesheet tracking',
      },
      {
        name: 'Invoices',
        description: 'Invoice generation and management',
      },
      {
        name: 'Analytics',
        description: 'Analytics and reporting',
      },
      {
        name: 'Locations',
        description: 'Location-based services',
      },
      {
        name: 'Notifications',
        description: 'Push and email notifications',
      },
      {
        name: 'Chat',
        description: 'Real-time messaging',
      },
      {
        name: 'Incidents',
        description: 'Incident reporting',
      },
      {
        name: 'Service Categories',
        description: 'Service category management',
      },
      {
        name: 'Service Types',
        description: 'Service type management',
      },
      {
        name: 'Public',
        description: 'Public endpoints (no auth required)',
      },
    ],
  },
  // Path to the API routes with JSDoc comments
  apis: [
    './src/routes/*.ts',
    './src/routes/*.js',
    './src/controllers/*.ts',
    './src/controllers/*.js',
    './src/models/*.ts',
    './src/models/*.js',
  ],
};

const swaggerSpec = swaggerJsDoc(swaggerOptions);

export default swaggerSpec;
