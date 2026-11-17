# Guardian Care Pro API

Backend API for Guardian Care Pro - a platform connecting Independent Support Workers (ISWs) with participants (clients seeking care) and their guardians.

## Overview

Guardian Care Pro is a web and mobile marketplace that enables discovery of support workers, secure onboarding with compliance checks, and end-to-end management of support sessions (booking, timesheets, etc.) in one platform.

This repository contains the backend API implementation built with Express.js, TypeScript, and MongoDB.

## Features

- User authentication and authorization
- User management (participants, guardians, workers, coordinators)
- Worker discovery and profile management
- Shift scheduling and management
- Timesheet submission and approval
- Document uploads and verification
- Payment processing and subscription management

## Tech Stack

- **Language:** TypeScript
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens)
- **File Storage:** AWS S3 (configurable)
- **Payment Processing:** Stripe (configurable)
- **Email:** Nodemailer with configurable SMTP
- **Validation:** Joi
- **Logging:** Winston
- **Testing:** Jest

## Project Structure

```
guardian-care-pro-api/
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # HTTP request handlers
│   ├── middlewares/    # Express middlewares
│   ├── models/         # Mongoose models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   ├── app.ts          # Express app setup
│   └── server.ts       # Server entry point
├── .env.example        # Environment variables template
├── .eslintrc.js        # ESLint configuration
├── .gitignore          # Git ignore file
├── jest.config.js      # Jest configuration
├── nodemon.json        # Nodemon configuration
├── package.json        # Node.js dependencies
├── tsconfig.json       # TypeScript configuration
└── README.md           # Project documentation
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-org/guardian-care-pro-api.git
   cd guardian-care-pro-api
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration.

### Running the Server

Development mode with auto-restart:
```
npm run dev
```

Production build:
```
npm run build
npm start
```

### Testing

Run tests:
```
npm test
```

Run tests in watch mode:
```
npm run test:watch
```

## API Documentation

### 📚 Interactive Documentation

This API includes **automatic documentation** with Swagger/OpenAPI:

- **Swagger UI (Interactive)**: http://localhost:5000/api-docs
- **OpenAPI JSON**: http://localhost:5000/api-docs.json
- **Postman Collection**: Run `npm run docs` to generate

**Quick Start:**
1. Start the server: `npm run dev`
2. Open http://localhost:5000/api-docs in your browser
3. Click "Authorize" to add your JWT token
4. Try out endpoints directly in the browser

**For Developers:**
- See [docs/DOCUMENTATION-README.md](./docs/DOCUMENTATION-README.md) for quick reference
- See [docs/API-DOCUMENTATION-GUIDE.md](./docs/API-DOCUMENTATION-GUIDE.md) for complete guide
- Always add Swagger annotations when creating new endpoints

### API Endpoints Overview

The API is organized around REST. All requests and responses are in JSON format.

Base URL: `/api`

### Authentication

- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login and get tokens
- `POST /auth/refresh-token` - Refresh access token
- `POST /auth/logout` - Logout and invalidate tokens
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password with token
- `POST /auth/verify-email` - Verify email address

### Users

- `GET /users/me` - Get current user profile
- `PATCH /users/me` - Update current user profile
- `PUT /users/password` - Update password

### Workers

- `GET /workers` - List all workers
- `GET /workers/:id` - Get worker details
- `PATCH /workers/:id` - Update worker profile
- `PATCH /workers/:id/availability` - Update worker availability
- `POST /workers/:id/onboarding-fee` - Process onboarding fee

### Participants

- `GET /participants/:id` - Get participant details
- `PATCH /participants/:id` - Update participant profile
- `POST /participants/:id/link-guardian` - Link a guardian
- `POST /participants/:id/link-coordinator` - Link a support coordinator

### Shifts

- `POST /shifts` - Create a new shift
- `GET /shifts` - List shifts
- `GET /shifts/:id` - Get shift details
- `PATCH /shifts/:id` - Update shift
- `POST /shifts/:id/accept` - Accept a shift
- `POST /shifts/:id/confirm` - Confirm a shift
- `POST /shifts/:id/cancel` - Cancel a shift
- `POST /shifts/:id/start` - Start a shift
- `POST /shifts/:id/complete` - Complete a shift

### Timesheets

- `POST /shifts/:id/timesheet` - Submit a timesheet
- `GET /timesheets` - List timesheets
- `GET /timesheets/:id` - Get timesheet details
- `POST /timesheets/:id/approve` - Approve a timesheet
- `POST /timesheets/:id/reject` - Reject a timesheet
- `PATCH /timesheets/:id/revise` - Revise a timesheet

### Documents

- `POST /documents` - Upload a document
- `GET /documents` - List documents
- `GET /documents/:id` - Get document details
- `POST /documents/:id/verify` - Verify a document
- `DELETE /documents/:id` - Delete a document

## License

[ISC License]

## Contact

For support or inquiries, please contact [your.email@example.com].
## Deploying to Render

This repo includes a [Render Blueprint](render.yaml) that deploys the API (free web service) and the
[web app](https://github.com/timmyproofficial/guardian-care-pro-web) (static site) together.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/timmyproofficial/guardian-care-pro-backend)

You'll be asked for:

| Variable | Service | Value |
|---|---|---|
| `MONGODB_URI` | API | MongoDB Atlas connection string |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | API | From your Cloudinary dashboard |
| `CLIENT_URL`, `CORS_ORIGINS` | API | The web app's URL, e.g. `https://guardian-care-pro-web.onrender.com` |
| `VITE_API_BASE_URL` | Web | The API's URL + `/api/v1`, e.g. `https://guardian-care-pro-api.onrender.com/api/v1` |

`JWT_SECRET` is generated automatically. Email (SMTP), push notifications (Firebase), Stripe and AWS are optional.
