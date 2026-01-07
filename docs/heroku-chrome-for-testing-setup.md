# Heroku Chrome for Testing Setup Guide

This guide explains how to fix the Chrome/Puppeteer issue using the **new Chrome for Testing buildpack**.

## Important Update

The old `heroku-buildpack-google-chrome` was deprecated. We now use the new [Chrome for Testing buildpack](https://github.com/heroku/heroku-buildpack-chrome-for-testing) which is actively maintained and provides better Chrome/Chromedriver version alignment.

## Quick Fix Commands

Run these commands to fix your production app:

```bash
# Set your app name
APP_NAME="backend-guardian-care-pro"

# Remove old buildpack if present
heroku buildpacks:remove https://github.com/heroku/heroku-buildpack-google-chrome --app $APP_NAME

# Add the new Chrome for Testing buildpack
heroku buildpacks:add https://github.com/heroku/heroku-buildpack-chrome-for-testing --index 1 --app $APP_NAME

# Add Node.js buildpack
heroku buildpacks:add heroku/nodejs --index 2 --app $APP_NAME

# Set environment variables
heroku config:set NODE_ENV=production --app $APP_NAME
heroku config:set PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true --app $APP_NAME

# Verify buildpacks
heroku buildpacks --app $APP_NAME

# Deploy the updated code
git add .
git commit -m "Update to Chrome for Testing buildpack"
git push heroku main
```

## Expected Buildpack Output

After setting up the buildpacks, you should see:

```
=== backend-guardian-care-pro Buildpack URLs
1. https://github.com/heroku/heroku-buildpack-chrome-for-testing
2. heroku/nodejs
```

## How the New Buildpack Works

The new Chrome for Testing buildpack:
- Installs Chrome at `/app/.chrome-for-testing/chrome-linux64/chrome`
- Automatically keeps Chrome and Chromedriver versions in sync
- Provides better stability and updates
- Is actively maintained by Heroku

## Updated PDF Generator

The PDF generator now:
1. **First tries**: Chrome for Testing path (`/app/.chrome-for-testing/chrome-linux64/chrome`)
2. **Falls back to**: Legacy `GOOGLE_CHROME_BIN` environment variable
3. **Provides logging**: To help debug Chrome executable detection

## Testing the Fix

After deployment, test the invoice download:

```bash
# Check deployment status
heroku ps --app backend-guardian-care-pro

# View logs
heroku logs --tail --app backend-guardian-care-pro

# Test the endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-api.example.com/api/v1/v1/invoices/INVOICE_ID/download
```

## Troubleshooting

### 1. Build Fails with "Buildpack not found"
Make sure you're using the correct URL:
```bash
heroku buildpacks:add https://github.com/heroku/heroku-buildpack-chrome-for-testing --index 1 --app backend-guardian-care-pro
```

### 2. Still Getting Chrome Not Found Error
Check the logs for the Chrome executable detection:
```bash
heroku logs --tail --app backend-guardian-care-pro | grep -i chrome
```

You should see logs like:
```
Using Chrome for Testing executable: /app/.chrome-for-testing/chrome-linux64/chrome
```

### 3. Memory Issues
If you encounter memory issues, upgrade your dyno:
```bash
heroku ps:scale web=1:standard-1x --app backend-guardian-care-pro
```

### 4. Environment Variables Check
Verify your environment variables are set correctly:
```bash
heroku config --app backend-guardian-care-pro
```

Expected variables:
```
NODE_ENV: production
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: true
```

## Migration from Old Buildpack

If you were using the old Google Chrome buildpack:

1. **Remove old buildpack:**
   ```bash
   heroku buildpacks:remove heroku/google-chrome --app backend-guardian-care-pro
   ```

2. **Add new buildpack:**
   ```bash
   heroku buildpacks:add https://github.com/heroku/heroku-buildpack-chrome-for-testing --index 1 --app backend-guardian-care-pro
   ```

3. **Deploy:**
   ```bash
   git push heroku main
   ```

## Alternative: Using Heroku Community Buildpack

You can also use the community version:

```bash
heroku buildpacks:add heroku-community/chrome-for-testing --index 1 --app backend-guardian-care-pro
```

## Files Updated

1. **`src/utils/pdf-generator.ts`** - Updated Chrome executable detection
2. **`.buildpacks`** - Updated to use Chrome for Testing buildpack
3. **`app.json`** - Updated buildpack configuration

## Success Indicators

After successful deployment, you should see:

1. **Build logs showing Chrome installation:**
   ```
   -----> Chrome for Testing app detected
   -----> Installing Chrome for Testing
   ```

2. **Application logs showing Chrome detection:**
   ```
   Using Chrome for Testing executable: /app/.chrome-for-testing/chrome-linux64/chrome
   ```

3. **Successful PDF generation:**
   ```
   Invoice PDF generated successfully
   ```

## Next Steps

1. Run the quick fix commands above
2. Wait for deployment to complete
3. Test invoice downloads
4. Monitor logs for any issues
5. Celebrate working PDF generation! 🎉

## Support

If you continue to have issues:
1. Check the [Chrome for Testing buildpack documentation](https://github.com/heroku/heroku-buildpack-chrome-for-testing)
2. Review Heroku logs for specific error messages
3. Ensure your Puppeteer version is compatible with the installed Chrome version

The new Chrome for Testing buildpack provides a much more reliable solution for PDF generation in production! 