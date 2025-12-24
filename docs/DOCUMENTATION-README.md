# 📚 API Documentation System - Quick Reference

## 🚀 What You Get

Your API now has **automatic documentation** in two formats:

1. **Swagger UI** (Interactive) - http://localhost:5000/api-docs
2. **Postman Collection** (Exportable) - Generate with `npm run docs`

---

## ⚡ Quick Commands

```bash
# Start dev server (view docs at /api-docs)
npm run dev

# Generate Postman collection
npm run docs

# Build project
npm run build
```

---

## 📝 How to Document New Endpoints

### Step 1: Add Swagger Annotations

Add this **above** your route definition:

```typescript
/**
 * @swagger
 * /api/v1/your-path:
 *   post:
 *     summary: Brief description
 *     tags: [YourTag]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created successfully
 *       400:
 *         description: Validation error
 */
router.post('/your-path', authenticate, controller.create);
```

### Step 2: Verify Documentation

1. Start your server: `npm run dev`
2. Open: http://localhost:5000/api-docs
3. Find your endpoint in the list
4. Click "Try it out" to test

### Step 3: Generate Postman Collection

```bash
npm run docs
```

This creates:
- `docs/openapi.json` - OpenAPI specification
- `docs/postman-collection.json` - Import into Postman

---

## 🎯 Authentication in Swagger UI

1. Click **"Authorize"** button (top right)
2. Enter: `Bearer <your-jwt-token>`
3. Click **"Authorize"** then **"Close"**
4. Now all requests will include your token

---

## 📖 Documentation Files

- **[API-DOCUMENTATION-GUIDE.md](./API-DOCUMENTATION-GUIDE.md)** - Complete guide with examples
- **[swagger-template.js](./swagger-template.js)** - Copy-paste templates
- **openapi.json** - Generated OpenAPI spec
- **postman-collection.json** - Generated Postman collection

---

## 🔄 Workflow

```
Create Endpoint → Add Swagger Annotations → Test in Swagger UI → Generate Postman → Done!
```

---

## ✅ Best Practices Checklist

- [ ] Add Swagger annotations to every new endpoint
- [ ] Use consistent tags to group related endpoints
- [ ] Specify security requirements (bearerAuth or [])
- [ ] Document all request parameters and body
- [ ] Include all possible response codes
- [ ] Add examples for clarity
- [ ] Run `npm run docs` to regenerate Postman collection
- [ ] Test in Swagger UI before merging

---

## 🛠️ Configuration Files

- `src/config/swagger.config.ts` - Swagger/OpenAPI configuration
- `scripts/generate-postman.js` - Postman collection generator
- `src/app.ts` - Swagger UI middleware setup

---

## 📚 Examples

See **[job.route.ts](../src/routes/job.route.ts)** for real-world examples of documented endpoints.

---

## 🆘 Need Help?

Check the full guide: **[API-DOCUMENTATION-GUIDE.md](./API-DOCUMENTATION-GUIDE.md)**

---

**Happy Documenting! 🎉**
