# API Documentation System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     Your Express API                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────┐         ┌──────────────────┐                │
│  │  Route Files   │────────▶│  Swagger JSDoc   │                │
│  │  (*.route.ts)  │         │  Annotations     │                │
│  └────────────────┘         └──────────────────┘                │
│         │                             │                          │
│         │                             ▼                          │
│         │                   ┌──────────────────┐                │
│         │                   │ swagger.config.ts│                │
│         │                   │  (Reads & Parse) │                │
│         │                   └──────────────────┘                │
│         │                             │                          │
│         ▼                             ▼                          │
│  ┌────────────────┐         ┌──────────────────┐                │
│  │  Controllers   │         │  OpenAPI Spec    │                │
│  │  (*.controller.ts)       │  (Generated)     │                │
│  └────────────────┘         └──────────────────┘                │
│                                      │                           │
│                       ┌──────────────┼──────────────┐           │
│                       │              │              │           │
│                       ▼              ▼              ▼           │
│              ┌─────────────┐  ┌───────────┐  ┌─────────┐       │
│              │ Swagger UI  │  │ OpenAPI   │  │ Postman │       │
│              │ /api-docs   │  │ JSON      │  │ Script  │       │
│              └─────────────┘  └───────────┘  └─────────┘       │
│                     │              │              │             │
└─────────────────────┼──────────────┼──────────────┼─────────────┘
                      │              │              │
                      ▼              ▼              ▼
            ┌──────────────┐  ┌───────────┐  ┌──────────────┐
            │   Browser    │  │  Export   │  │  Postman     │
            │  (Interactive)  │  (Download)  │  Collection  │
            └──────────────┘  └───────────┘  └──────────────┘
```

## Flow Diagram

```
Developer Workflow:
═════════════════

  1. CREATE ENDPOINT
     │
     ├─▶ Write route in job.route.ts
     │
     ▼
  2. ADD SWAGGER ANNOTATIONS
     │
     ├─▶ Use VS Code snippet (swagger-post)
     ├─▶ Or copy from docs/swagger-template.js
     │
     ▼
  3. START SERVER
     │
     ├─▶ npm run dev
     │
     ▼
  4. TEST IN BROWSER
     │
     ├─▶ Open http://localhost:5000/api-docs
     ├─▶ Click "Try it out"
     ├─▶ Test endpoint
     │
     ▼
  5. GENERATE POSTMAN
     │
     ├─▶ npm run docs
     ├─▶ Import docs/postman-collection.json
     │
     ▼
  6. COMMIT & DEPLOY
     │
     └─▶ Documentation auto-updates!
```

## Component Breakdown

### 1. Swagger JSDoc Comments
```typescript
/**
 * @swagger
 * /api/v1/endpoint:
 *   get:
 *     summary: ...
 */
```
- Written directly above route definitions
- Uses JSDoc-style comments
- Follows OpenAPI 3.0 specification

### 2. Swagger Config (`src/config/swagger.config.ts`)
- Scans all route files for @swagger comments
- Parses JSDoc annotations
- Generates OpenAPI specification object
- Configures security schemes (JWT)
- Defines global schemas and tags

### 3. Swagger UI Middleware (`src/app.ts`)
```typescript
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```
- Serves interactive documentation UI
- Provides "Try it out" functionality
- Handles authentication
- Validates requests/responses

### 4. Postman Generator (`scripts/generate-postman.js`)
- Reads OpenAPI specification
- Converts to Postman Collection v2.1 format
- Saves to `docs/postman-collection.json`
- Run with: `npm run docs`

## Data Flow

```
Source Code           Process           Output
═══════════          ═══════════        ═══════

route.ts files  ──▶  swagger-jsdoc  ──▶  OpenAPI JSON
      +                    │                   │
@swagger comments          │                   │
                           │                   │
                           ▼                   ▼
                    swagger-ui-express    /api-docs UI
                                               │
                                               │
                    openapi-to-postman    ◀────┘
                           │
                           ▼
                    postman-collection.json
```

## Authentication Flow

```
User Authentication in Swagger UI:
══════════════════════════════════

  1. User logs in via /api/v1/auth/login
     │
     ├─▶ Receives JWT token
     │
     ▼
  2. Opens /api-docs in browser
     │
     ├─▶ Clicks "Authorize" button
     │
     ▼
  3. Enters: Bearer <token>
     │
     ├─▶ Swagger UI stores token
     │
     ▼
  4. Makes API request via "Try it out"
     │
     ├─▶ Swagger UI adds header:
     │   Authorization: Bearer <token>
     │
     ▼
  5. Server validates JWT
     │
     └─▶ Returns authenticated response
```

## File Dependencies

```
Project Files:
═════════════

src/
├── app.ts                      (Imports swagger config & UI)
│   └── config/
│       └── swagger.config.ts   (Scans route files)
│
├── routes/
│   ├── job.route.ts           (Has @swagger comments)
│   ├── user.route.ts          (Add @swagger here)
│   └── ...                    (Add @swagger to all)
│
scripts/
└── generate-postman.js        (Generates Postman collection)

docs/                          (Generated files)
├── openapi.json              (Auto-generated)
└── postman-collection.json   (Auto-generated)
```

## Available Endpoints

```
Documentation Endpoints:
═══════════════════════

GET  /api-docs           → Interactive Swagger UI
GET  /api-docs.json      → Raw OpenAPI JSON specification
GET  /health             → Health check (no auth)

All other endpoints depend on your route files!
```

## Technologies Used

```
┌─────────────────────┬──────────────────────────────┐
│ Package             │ Purpose                      │
├─────────────────────┼──────────────────────────────┤
│ swagger-jsdoc       │ Parse JSDoc → OpenAPI        │
│ swagger-ui-express  │ Serve interactive UI         │
│ openapi-to-postmanv2│ Convert to Postman format    │
│ @types/*            │ TypeScript definitions       │
└─────────────────────┴──────────────────────────────┘
```

## Benefits

✅ **No Manual Documentation** - Auto-generated from code
✅ **Always Up-to-Date** - Docs reflect actual endpoints
✅ **Interactive Testing** - Try endpoints in browser
✅ **Team Collaboration** - Share Swagger URL with team
✅ **Postman Ready** - One command to generate collection
✅ **Type Safety** - TypeScript integration
✅ **Professional** - Industry-standard OpenAPI 3.0
✅ **Easy Maintenance** - Update code, docs update automatically

---

**This architecture ensures your API documentation is always accurate, professional, and easy to maintain!**
