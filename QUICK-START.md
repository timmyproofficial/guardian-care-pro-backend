# 🚀 Quick Start - Fix Email Images & Fonts

## Problems You're Having:

1. ❌ Banner image showing as broken in emails
2. ❌ Montserrat font from Google Fonts not working

## ✅ Solutions (3 Minutes to Fix):

---

## Step 1: Place Your Banner (1 min)

Copy your PNG banner file to:

```
src/assets/email-banner.png
```

**Banner specs:**
- Size: 770px × 219px
- Format: PNG or JPG  
- File size: < 150KB

**If your file is too large, compress it first:**
- Visit [tinypng.com](https://tinypng.com) or [squoosh.app](https://squoosh.app)
- Upload your banner
- Download compressed version
- Save as `email-banner.png`

---

## Step 2: Update .env File (30 seconds)

Add these two lines to your `.env` file:

```env
EMAIL_BANNER_LOCAL=src/assets/email-banner.png
USE_BASE64_IMAGES=true
```

That's it! The system will now embed your banner directly in emails (most reliable method).

---

## Step 3: Restart Your App (1 min)

```bash
# Rebuild TypeScript
npm run build

# Restart your application  
npm start
```

---

## Step 4: Test (30 seconds)

Send yourself a test email (create test account with OTP or trigger any email).

**Check:**
- ✅ Banner displays immediately (no broken image)
- ✅ Text uses clean, professional fonts
- ✅ Everything looks good on mobile

---

## That's It! 🎉

Your emails now:
- ✅ Display banner images reliably in ALL email clients
- ✅ Use professional system fonts that work everywhere
- ✅ Look great on desktop and mobile

---

## What Happened?

### For Images:
- **Before:** Tried to load from Cloudinary URL → Often blocked
- **After:** Banner embedded directly in email → Always displays

### For Fonts:
- **Before:** Tried to load Montserrat from Google → Blocked by email clients
- **After:** Uses system fonts (San Francisco, Segoe UI, etc.) → Works everywhere

---

## Need More Info?

- **Detailed Setup:** See `docs/email-image-setup-guide.md`
- **Complete Summary:** See `FIXES-SUMMARY.md`
- **Assets Info:** See `src/assets/README.md`

---

## Troubleshooting

### Banner still not showing?

```bash
# Check file exists
ls src/assets/email-banner.png

# Check .env is correct
cat .env | grep EMAIL_BANNER_LOCAL

# Rebuild
npm run build
```

### Email too large?

Compress your banner image to < 150KB

---

**All set!** Your emails will now work perfectly. 🚀

