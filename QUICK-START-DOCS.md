# 🎯 Quick Start - API Documentation

**Your API now has automatic documentation!** Here's everything you need to know in 2 minutes.

---

## 🚀 Start Using It Right Now

### 1. View Interactive Docs
```bash
npm run dev
```
Then open: **http://localhost:5000/api-docs**

### 2. Test an Endpoint
1. In Swagger UI, expand any endpoint (e.g., `GET /api/jobs`)
2. Click **"Try it out"**
3. Click **"Execute"**
4. See the response!

### 3. Test with Authentication
1. Login to get a JWT token
2. Click **"Authorize"** in Swagger UI
3. Enter: `Bearer your-token-here`
4. Now you can test protected endpoints!

---

## 📝 Document Your Next Endpoint

**Step 1:** In your route file, type `swagger-post` and press **Tab**

**Step 2:** Fill in the template:
```typescript
/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create new user
 *     tags: [Users]
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
 *               email:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created
 */
router.post('/users', authenticate, controller.createUser);
```

**Step 3:** Save and restart server. Done! ✅

---

## 📦 Generate Postman Collection

```bash
npm run docs
```

Then:
1. Open Postman
2. Click **Import**
3. Select `docs/postman-collection.json`
4. All your endpoints are now in Postman!

---

## 📚 Where to Find More Help

| Need | See |
|------|-----|
| Quick tips | [docs/DOCUMENTATION-README.md](./docs/DOCUMENTATION-README.md) |
| Full guide | [docs/API-DOCUMENTATION-GUIDE.md](./docs/API-DOCUMENTATION-GUIDE.md) |
| Templates | [docs/swagger-template.js](./docs/swagger-template.js) |
| Examples | [src/routes/job.route.ts](./src/routes/job.route.ts) |

---

## ⚡ VS Code Snippets

Just type and press Tab:

- `swagger-get` → GET endpoint docs
- `swagger-post` → POST endpoint docs  
- `swagger-put` → PUT endpoint docs
- `swagger-delete` → DELETE endpoint docs
- `swagger-public` → Public endpoint (no auth)

---

## ✅ Your New Workflow

```
Create endpoint → Type swagger-post + Tab → Fill details → Save → Test in /api-docs → Done!
```

---

**That's it! You're ready to document your API like a pro.** 🚀

For detailed information, see [DOCUMENTATION-SETUP-COMPLETE.md](./DOCUMENTATION-SETUP-COMPLETE.md)
