# API Documentation Guide

Complete guide for documenting your API endpoints with **Swagger/OpenAPI** and generating **Postman collections**.

## 📚 Table of Contents

1. [Quick Start](#quick-start)
2. [Viewing Documentation](#viewing-documentation)
3. [Documenting New Endpoints](#documenting-new-endpoints)
4. [Swagger Annotation Examples](#swagger-annotation-examples)
5. [Generating Postman Collection](#generating-postman-collection)
6. [Best Practices](#best-practices)

---

## 🚀 Quick Start

### Access Interactive API Documentation

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Open Swagger UI in your browser:**
   ```
   http://localhost:5000/api-docs
   ```

3. **Get raw OpenAPI JSON:**
   ```
   http://localhost:5000/api-docs.json
   ```

### Generate Postman Collection

```bash
npm run docs
# or
npm run generate:docs
```

This creates:
- `docs/openapi.json` - OpenAPI 3.0 specification
- `docs/postman-collection.json` - Postman collection (import into Postman)

---

## 📖 Viewing Documentation

### Swagger UI Features

The Swagger UI at `/api-docs` provides:
- ✅ Interactive API testing
- ✅ Request/response examples
- ✅ Authentication support
- ✅ Schema validation
- ✅ Try it out functionality

### Testing with Authentication

1. Click **"Authorize"** button at the top
2. Enter your JWT token in the format: `Bearer <your-token>`
3. Click **"Authorize"** then **"Close"**
4. All subsequent requests will include the token

---

## 🔧 Documenting New Endpoints

Every time you create a new endpoint, add Swagger annotations above the route definition.

### Basic Template

```typescript
/**
 * @swagger
 * /api/v1/your-endpoint:
 *   get:
 *     summary: Brief description
 *     description: Detailed description of what this endpoint does
 *     tags: [TagName]
 *     security:
 *       - bearerAuth: []  # Remove this line if no auth required
 *     parameters:
 *       - in: query
 *         name: paramName
 *         schema:
 *           type: string
 *         description: Parameter description
 *     responses:
 *       200:
 *         description: Success response
 *       401:
 *         description: Unauthorized
 */
router.get('/your-endpoint', yourController.yourMethod);
```

---

## 📝 Swagger Annotation Examples

### Example 1: GET with Query Parameters

```typescript
/**
 * @swagger
 * /api/v1/jobs:
 *   get:
 *     summary: Get all jobs with filters
 *     description: Retrieve a paginated list of job postings with optional filters
 *     tags: [Jobs]
 *     security: []  # Public endpoint, no auth required
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [OPEN, CLOSED, FILLED, CANCELLED]
 *         description: Filter by job status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and description
 *     responses:
 *       200:
 *         description: Successfully retrieved jobs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *       400:
 *         description: Validation error
 */
router.get('/', validate(jobValidation.queryJobs, 'query'), jobController.getAllJobs);
```

### Example 2: POST with Request Body

```typescript
/**
 * @swagger
 * /api/v1/jobs:
 *   post:
 *     summary: Create a new job posting
 *     description: Create a new job posting (Participant or Provider only)
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []  # Requires authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - serviceType
 *               - location
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Personal Care Assistant Needed"
 *               description:
 *                 type: string
 *                 example: "Looking for a caring support worker"
 *               serviceType:
 *                 type: string
 *                 description: Service type ID
 *               location:
 *                 type: object
 *                 properties:
 *                   address:
 *                     type: string
 *                   suburb:
 *                     type: string
 *                   state:
 *                     type: string
 *                   postcode:
 *                     type: string
 *               requirements:
 *                 type: array
 *                 items:
 *                   type: string
 *               budget:
 *                 type: object
 *                 properties:
 *                   min:
 *                     type: number
 *                   max:
 *                     type: number
 *     responses:
 *       201:
 *         description: Job created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.post('/', authenticate, authorize([UserRole.PARTICIPANT, UserRole.PROVIDER]), validate(jobValidation.createJob), jobController.createJob);
```

### Example 3: GET with Path Parameters

```typescript
/**
 * @swagger
 * /api/v1/jobs/{jobId}:
 *   get:
 *     summary: Get a single job by ID
 *     description: Retrieve detailed information about a specific job posting
 *     tags: [Jobs]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: The job ID
 *     responses:
 *       200:
 *         description: Successfully retrieved job
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *       404:
 *         description: Job not found
 */
router.get('/:jobId', jobController.getJobById);
```

### Example 4: PUT/PATCH for Updates

```typescript
/**
 * @swagger
 * /api/v1/jobs/{jobId}:
 *   put:
 *     summary: Update a job
 *     description: Update an existing job posting (Owner or Admin only)
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: The job ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [OPEN, CLOSED, FILLED, CANCELLED]
 *     responses:
 *       200:
 *         description: Job updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Job not found
 */
router.put('/:jobId', authenticate, authorize([UserRole.PARTICIPANT, UserRole.PROVIDER, UserRole.ADMIN]), validate(jobValidation.updateJob), jobController.updateJob);
```

### Example 5: DELETE

```typescript
/**
 * @swagger
 * /api/v1/jobs/{jobId}:
 *   delete:
 *     summary: Delete a job
 *     description: Soft delete a job posting (Owner or Admin only)
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: The job ID
 *     responses:
 *       200:
 *         description: Job deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Job not found
 */
router.delete('/:jobId', authenticate, authorize([UserRole.PARTICIPANT, UserRole.PROVIDER, UserRole.ADMIN]), jobController.deleteJob);
```

### Example 6: File Upload (Multipart)

```typescript
/**
 * @swagger
 * /api/v1/jobs/{jobId}/apply:
 *   post:
 *     summary: Apply for a job
 *     description: Submit a job application with resume and cover letter
 *     tags: [Jobs]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - applicantName
 *               - applicantEmail
 *             properties:
 *               applicantName:
 *                 type: string
 *               applicantEmail:
 *                 type: string
 *                 format: email
 *               applicantPhone:
 *                 type: string
 *               coverLetter:
 *                 type: string
 *               resume:
 *                 type: string
 *                 format: binary
 *                 description: PDF or Word document
 *     responses:
 *       201:
 *         description: Application submitted successfully
 *       400:
 *         description: Validation error
 */
router.post('/:jobId/apply', uploadJobAttachments(), validate(jobValidation.applyForJob), jobController.applyForJob);
```

---

## 🎯 Common Response Schemas

You can reference common schemas in your config:

```typescript
// In swagger.config.ts, add to components.schemas:
{
  Error: {
    type: 'object',
    properties: {
      code: { type: 'integer' },
      message: { type: 'string' },
      stack: { type: 'string' }
    }
  },
  ValidationError: {
    type: 'object',
    properties: {
      code: { type: 'integer', example: 400 },
      message: { type: 'string', example: 'Validation error' },
      errors: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            field: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }
}
```

Then reference in your routes:

```typescript
/**
 * @swagger
 * /api/v1/example:
 *   get:
 *     # ... other properties
 *     responses:
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
```

---

## 🔄 Generating Postman Collection

After documenting your endpoints:

1. **Generate the collection:**
   ```bash
   npm run docs
   ```

2. **Import into Postman:**
   - Open Postman
   - Click **Import**
   - Select `docs/postman-collection.json`
   - Click **Import**

3. **Set up environment variables:**
   - Create a new environment in Postman
   - Add variable `baseUrl`: `http://localhost:5000`
   - Add variable `token`: `<your-jwt-token>`
   - Use `{{baseUrl}}` and `{{token}}` in requests

---

## ✅ Best Practices

### 1. **Always Document New Endpoints**
Every new route should have Swagger annotations before merging to main.

### 2. **Use Consistent Tags**
Group related endpoints with the same tag:
- `Jobs` - All job-related endpoints
- `Authentication` - Login, register, logout
- `Users` - User management
- etc.

### 3. **Specify Security Requirements**
```typescript
security: []                    # No auth required
security: [{ bearerAuth: [] }]  # JWT required
```

### 4. **Include Examples**
```typescript
example: "Personal Care Assistant Needed"
```

### 5. **Document All Status Codes**
Include common responses:
- `200` - Success
- `201` - Created
- `400` - Validation error
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not found
- `500` - Server error

### 6. **Keep Descriptions Clear**
- **Summary**: One-line description (< 50 chars)
- **Description**: Detailed explanation of what it does

### 7. **Regenerate After Changes**
```bash
npm run docs  # After adding new endpoints
```

---

## 📋 Workflow Checklist

When creating a new endpoint:

- [ ] Create the route handler
- [ ] Add validation middleware
- [ ] Add authentication/authorization if needed
- [ ] **Add Swagger annotations** above the route
- [ ] Test the endpoint
- [ ] Run `npm run docs` to regenerate Postman collection
- [ ] Verify in Swagger UI at `/api-docs`
- [ ] Commit changes

---

## 🛠️ Troubleshooting

### Documentation not showing up?

1. Check that your route file is included in `swagger.config.ts`:
   ```typescript
   apis: ['./src/routes/*.ts']
   ```

2. Restart your dev server:
   ```bash
   npm run dev
   ```

3. Clear browser cache and refresh `/api-docs`

### Postman generation fails?

1. Check for syntax errors in Swagger annotations
2. Validate OpenAPI spec at: https://editor.swagger.io/
3. Check console for error messages

---

## 📚 Additional Resources

- [Swagger/OpenAPI Specification](https://swagger.io/specification/)
- [swagger-jsdoc Documentation](https://github.com/Surnet/swagger-jsdoc)
- [Postman Collection Format](https://learning.postman.com/docs/collections/collections-overview/)
- [OpenAPI Examples](https://github.com/OAI/OpenAPI-Specification/tree/main/examples)

---

## 🎉 Summary

You now have a complete documentation system:

1. **Interactive Swagger UI** - Test endpoints at `/api-docs`
2. **Automatic Postman Collection** - Generate with `npm run docs`
3. **OpenAPI 3.0 Specification** - Export at `/api-docs.json`

**Remember:** Document as you code, and your API will always have up-to-date documentation! 🚀
