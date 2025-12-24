# 🔄 Swagger Migration Tool - Auto-Document All Routes

## Problem Solved

Your route files have old-style documentation comments like:
```typescript
/**
 * @route GET /api/v1/users
 * @desc Get all users
 * @access Private
 */
```

But Swagger needs `@swagger` JSDoc annotations. This tool **automatically converts** all your existing routes to Swagger documentation!

---

## 🚀 Quick Start (2 Commands)

### Step 1: Preview Changes (Dry Run)
```bash
npm run migrate:swagger
```

This shows you what will be changed **without modifying files**.

### Step 2: Apply Changes
```bash
npm run migrate:swagger:write
```

This updates all route files with Swagger documentation.

---

## 📋 What It Does

### Before (Old Format):
```typescript
/**
 * @route POST /api/v1/auth/login
 * @desc Login with email and password
 * @access Public
 */
router.post('/login', validate(authValidation.login), authController.login);
```

### After (Swagger Format):
```typescript
/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login with email and password
 *     description: Login with email and password
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Successfully created
 */
router.post('/login', validate(authValidation.login), authController.login);
```

---

## 🎯 Features

✅ **Auto-detects** all route files  
✅ **Converts** old comments to Swagger format  
✅ **Preserves** your code - only updates comments  
✅ **Smart tagging** - automatically assigns correct tags  
✅ **Path parameters** - extracts `:id`, `:userId`, etc.  
✅ **Auth detection** - marks Public vs Private endpoints  
✅ **Safe preview** - dry run before applying changes  

---

## 📁 Supported Files

The tool automatically processes all these route files:

- ✅ auth.route.ts → **Authentication** tag
- ✅ user.route.ts → **Users** tag
- ✅ worker.route.ts → **Workers** tag
- ✅ job.route.ts → **Jobs** tag
- ✅ shift.route.ts → **Shifts** tag
- ✅ timesheet.route.ts → **Timesheets** tag
- ✅ invoice.route.ts → **Invoices** tag
- ✅ organization.route.ts → **Organizations** tag
- ✅ location.route.ts → **Locations** tag
- ✅ analytics.route.ts → **Analytics** tag
- ✅ chat.route.ts → **Chat** tag
- ✅ event.route.ts → **Events** tag
- ✅ incident.route.ts → **Incidents** tag
- ✅ notification.routes.ts → **Notifications** tag
- ✅ All other route files...

---

## 📝 Usage Examples

### Example 1: Preview First
```bash
# See what will change
npm run migrate:swagger

# Output:
# 📄 Processing: auth.route.ts (Tag: Authentication)
#    ✅ Found 8 routes to migrate
#    📋 Preview of first route:
#
# /**
#  * @swagger
#  * /api/v1/auth/register:
#  *   post:
#  *     summary: Register a new user
#  *     ...
```

### Example 2: Apply to All Files
```bash
# Apply changes to all route files
npm run migrate:swagger:write

# Output:
# 🚀 Starting Swagger Documentation Migration
# Mode: ✍️  WRITE
# Found 18 route files
#
# 📄 Processing: auth.route.ts (Tag: Authentication)
#    ✅ Migrated 8 routes
# ...
# ✅ Migration complete!
```

### Example 3: Check Results
```bash
# Start server
npm run dev

# Open browser
http://localhost:5000/api-docs

# You'll see ALL your routes documented! 🎉
```

---

## 🔍 What Gets Detected

The script intelligently detects:

### 1. Route Information
- HTTP Method (GET, POST, PUT, DELETE, PATCH)
- Path (`/api/v1/users/:id`)
- Description
- Access level (Public/Private)

### 2. Parameters
- **Path params**: `:userId`, `:id`, `:shiftId`
- **Query params**: `?page=1&limit=10`
- **Body**: For POST/PUT/PATCH requests

### 3. Authentication
- Public endpoints → `security: []`
- Private endpoints → `security: [{ bearerAuth: [] }]`

### 4. Tags
- Automatically assigns based on file name
- Groups related endpoints in Swagger UI

---

## 🎨 Customization

### Add New Tags

Edit `scripts/migrate-to-swagger.ts`:

```typescript
const ROUTE_TAGS_MAP: Record<string, string> = {
  'auth.route.ts': 'Authentication',
  'user.route.ts': 'Users',
  // Add your new routes here:
  'payment.route.ts': 'Payments',
  'subscription.route.ts': 'Subscriptions',
};
```

---

## 🔄 Workflow

```
┌─────────────────────────────────────────────────┐
│ 1. Run: npm run migrate:swagger                 │
│    (Preview changes)                            │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ 2. Review output                                │
│    (Check if conversions look good)             │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ 3. Run: npm run migrate:swagger:write           │
│    (Apply changes to all files)                 │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ 4. Run: npm run dev                             │
│    (Start server)                               │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ 5. Open: http://localhost:5000/api-docs        │
│    (View all documented endpoints!)            │
└─────────────────────────────────────────────────┘
```

---

## ✅ Post-Migration Checklist

After running the migration:

- [ ] Review changes: `git diff`
- [ ] Check for any broken formatting
- [ ] Restart server: `npm run dev`
- [ ] Open Swagger UI: `http://localhost:5000/api-docs`
- [ ] Verify all endpoints appear
- [ ] Test "Try it out" on a few endpoints
- [ ] Generate Postman: `npm run docs`
- [ ] Commit changes: `git commit -am "Add Swagger documentation to all routes"`

---

## 🆘 Troubleshooting

### Routes not showing in Swagger UI?

1. **Check syntax**: Make sure `@swagger` comments are valid
2. **Restart server**: `npm run dev`
3. **Clear browser cache**: Hard refresh (Ctrl+Shift+R)
4. **Check console**: Look for parsing errors

### Some routes missing?

The migration tool only converts routes with old-style `@route` comments. For routes without comments, manually add Swagger annotations using VS Code snippets:

```typescript
// Type: swagger-post + Tab
/**
 * @swagger
 * /api/v1/your-endpoint:
 *   post:
 *     ...
 */
```

### Wrong tag assigned?

Edit the `ROUTE_TAGS_MAP` in `scripts/migrate-to-swagger.ts` and re-run the migration.

---

## 🔮 Future Routes

For **new routes** after migration:

**Option 1**: Use VS Code snippets
```
Type: swagger-post + Tab
```

**Option 2**: Copy from existing documented routes

**Option 3**: Run migration script again (safe to re-run)

---

## 📚 Related Documentation

- [API-DOCUMENTATION-GUIDE.md](../docs/API-DOCUMENTATION-GUIDE.md) - Complete Swagger guide
- [DOCUMENTATION-README.md](../docs/DOCUMENTATION-README.md) - Quick reference
- [swagger-template.js](../docs/swagger-template.js) - Manual templates

---

## 💡 Pro Tips

1. **Safe to re-run**: The migration script can be run multiple times
2. **Git commit first**: Commit your code before running with `--write`
3. **Preview always**: Always run without `--write` first to preview
4. **Manual refinement**: After migration, manually enhance important endpoints
5. **Keep updated**: Run migration when adding new route files

---

## 🎉 Success!

After running this migration, **ALL your routes** will be documented in Swagger UI!

No more manual work for existing routes - just run the script and you're done! ✨

---

**Commands Reference:**

```bash
# Preview what will change
npm run migrate:swagger

# Apply changes to all files
npm run migrate:swagger:write

# View results
npm run dev
# Then: http://localhost:5000/api-docs

# Generate Postman collection
npm run docs
```

**Happy Documenting! 🚀**
