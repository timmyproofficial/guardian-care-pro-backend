# Heroku Puppeteer Setup Guide

This guide explains how to fix the Chrome/Puppeteer issue in your Heroku production environment.

## Issue
When trying to download invoices, you get the error:
```
Could not find Chrome (ver. 137.0.7151.119). This can occur if either
1. you did not perform an installation before running the script
2. your cache path is incorrectly configured
```

## Root Cause
Heroku dynos don't come with Chrome installed by default, but Puppeteer needs Chrome to generate PDFs.

## Solution Steps

### 1. Update Your Heroku App with Buildpacks

Run these commands in your terminal to configure the buildpacks:

```bash
# Add Chrome buildpack (this installs Chrome)
heroku buildpacks:add https://github.com/heroku/heroku-buildpack-google-chrome --index 1 --app backend-guardian-care-pro

# Add Node.js buildpack (if not already present)
heroku buildpacks:add heroku/nodejs --index 2 --app backend-guardian-care-pro

# Verify buildpacks are set correctly
heroku buildpacks --app backend-guardian-care-pro
```

Expected output:
```
=== backend-guardian-care-pro Buildpack URLs
1. https://github.com/heroku/heroku-buildpack-google-chrome
2. heroku/nodejs
```

### 2. Set Environment Variables

```bash
# Set NODE_ENV to production
heroku config:set NODE_ENV=production --app backend-guardian-care-pro

# Skip Puppeteer's Chromium download (we use Chrome from buildpack)
heroku config:set PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true --app backend-guardian-care-pro

# Verify config
heroku config --app backend-guardian-care-pro
```

### 3. Deploy the Updated Code

Since we've made changes to the PDF generator configuration:

```bash
# Add and commit the changes
git add .
git commit -m "Fix Puppeteer configuration for Heroku deployment"

# Deploy to Heroku
git push heroku main
```

### 4. Test the Fix

After deployment, test the invoice download:
```bash
# Check if the app is running
heroku ps --app backend-guardian-care-pro

# View logs to see if there are any errors
heroku logs --tail --app backend-guardian-care-pro
```

Then try downloading an invoice again:
```
GET https://your-app-name.herokuapp.com/api/v1/v1/invoices/{invoice-id}/download
```

## Alternative Solution (If Above Doesn't Work)

If you're still having issues, you can use the `puppeteer-core` package with a specific Chrome version:

### 1. Update package.json
```bash
npm uninstall puppeteer
npm install puppeteer-core
```

### 2. Alternative PDF Generator Configuration
If the current approach doesn't work, we can modify the PDF generator to use a different approach or a PDF generation service.

## Files Created/Modified

1. **Procfile** - Defines how Heroku runs your app
2. **.buildpacks** - Specifies which buildpacks to use
3. **app.json** - Heroku app configuration
4. **src/utils/pdf-generator.ts** - Updated Puppeteer configuration

## Environment Variables Set

- `NODE_ENV=production`
- `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`
- `GOOGLE_CHROME_BIN` (automatically set by buildpack)

## Troubleshooting

### If you still get Chrome errors:

1. **Check buildpack order:**
   ```bash
   heroku buildpacks --app your-app-name
   ```
   Chrome buildpack should be first, Node.js second.

2. **Check environment variables:**
   ```bash
   heroku config --app your-app-name
   ```

3. **Check logs for more details:**
   ```bash
   heroku logs --tail --app your-app-name
   ```

4. **Restart the app:**
   ```bash
   heroku restart --app your-app-name
   ```

### Memory Issues
If you encounter memory issues, consider upgrading your Heroku dyno:
```bash
heroku ps:scale web=1:standard-1x --app your-app-name
```

### Alternative PDF Services
If Puppeteer continues to cause issues, consider using:
- **PDFShift** (https://pdfshift.io/)
- **HTML/CSS to PDF API** (https://htmlcsstoimage.com/)
- **Bannerbear** (https://www.bannerbear.com/)

## Testing Locally

To test the production configuration locally:
```bash
export NODE_ENV=production
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
npm start
```

## Quick Fix Commands

If you need to apply this fix quickly:

```bash
# Replace 'your-app-name' with your actual Heroku app name
APP_NAME="backend-guardian-care-pro-0bc1ad551029"

# Add buildpacks
heroku buildpacks:add https://github.com/heroku/heroku-buildpack-google-chrome --index 1 --app $APP_NAME
heroku buildpacks:add heroku/nodejs --index 2 --app $APP_NAME

# Set environment variables
heroku config:set NODE_ENV=production --app $APP_NAME
heroku config:set PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true --app $APP_NAME

# Deploy
git add .
git commit -m "Fix Puppeteer for Heroku"
git push heroku main
```

After running these commands, your invoice downloads should work correctly. 