/**
 * SWAGGER ANNOTATION TEMPLATE
 * 
 * Copy and paste this template when creating new endpoints
 * Replace placeholders with your actual endpoint details
 */

/**
 * @swagger
 * /api/YOUR_ENDPOINT_PATH:
 *   METHOD:
 *     summary: Brief one-line description
 *     description: Detailed description of what this endpoint does
 *     tags: [TagName]
 *     security:
 *       - bearerAuth: []  # Remove this entire security block if no auth required
 *     
 *     # For endpoints with path parameters (e.g., /api/users/:userId)
 *     parameters:
 *       - in: path
 *         name: paramName
 *         required: true
 *         schema:
 *           type: string
 *         description: Parameter description
 *     
 *     # For endpoints with query parameters (e.g., /api/users?page=1&limit=10)
 *     parameters:
 *       - in: query
 *         name: queryParamName
 *         schema:
 *           type: string
 *         description: Query parameter description
 *     
 *     # For POST/PUT/PATCH with JSON body
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - requiredField1
 *               - requiredField2
 *             properties:
 *               field1:
 *                 type: string
 *                 example: "Example value"
 *               field2:
 *                 type: number
 *                 example: 123
 *               field3:
 *                 type: boolean
 *                 example: true
 *     
 *     # For file upload endpoints
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               otherField:
 *                 type: string
 *     
 *     responses:
 *       200:
 *         description: Success response description
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
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 *       500:
 *         description: Server error
 */

// ============================================================================
// QUICK EXAMPLES FOR COMMON PATTERNS
// ============================================================================

// 1. PUBLIC GET ENDPOINT (No Auth)
/**
 * @swagger
 * /api/public/data:
 *   get:
 *     summary: Get public data
 *     tags: [Public]
 *     security: []
 *     responses:
 *       200:
 *         description: Success
 */
// router.get('/public/data', controller.getData);

// 2. PROTECTED POST ENDPOINT
/**
 * @swagger
 * /api/protected/create:
 *   post:
 *     summary: Create new resource
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created successfully
 *       401:
 *         description: Unauthorized
 */
// router.post('/protected/create', authenticate, controller.create);

// 3. GET BY ID
/**
 * @swagger
 * /api/items/{id}:
 *   get:
 *     summary: Get item by ID
 *     tags: [Items]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 *       404:
 *         description: Not found
 */
// router.get('/items/:id', controller.getById);

// 4. UPDATE ENDPOINT
/**
 * @swagger
 * /api/items/{id}:
 *   put:
 *     summary: Update item
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated successfully
 */
// router.put('/items/:id', authenticate, controller.update);

// 5. DELETE ENDPOINT
/**
 * @swagger
 * /api/items/{id}:
 *   delete:
 *     summary: Delete item
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted successfully
 */
// router.delete('/items/:id', authenticate, controller.delete);

// ============================================================================
// FIELD TYPES REFERENCE
// ============================================================================

/*
Common field types:
- type: string
- type: number
- type: integer
- type: boolean
- type: array
- type: object

String formats:
- format: email
- format: date
- format: date-time
- format: uuid
- format: binary (for file uploads)

Array example:
  tags:
    type: array
    items:
      type: string

Object example:
  address:
    type: object
    properties:
      street:
        type: string
      city:
        type: string

Enum example:
  status:
    type: string
    enum: [ACTIVE, INACTIVE, PENDING]
*/
