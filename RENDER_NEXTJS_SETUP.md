# Render Next.js SSR Setup Guide

## Problem

Your marketing site is configured as a **Static Site** in Render, but Next.js needs to run as a **Web Service** to enable:
- Server-side rendering (SSR) for SEO
- Dynamic routing
- Redirects
- API routes (if needed)

**Current Error:**
```
==> Publish directory ./apps/marketing/out does not exist!
==> Build failed 😞
```

This happens because static sites look for an `out/` directory created by `output: 'export'`, which we removed to enable SSR.

---

## Solution: Convert to Web Service

### Step 1: Create New Web Service

1. Go to **Render Dashboard**: https://dashboard.render.com
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Configure the service:

### Step 2: Configuration Settings

**Basic Settings:**
- **Name**: `peakops-marketing` (or your choice)
- **Region**: Choose closest to your users
- **Branch**: `main` (or your deployment branch)
- **Root Directory**: `apps/marketing`

**Build & Deploy:**
- **Runtime**: `Node`
- **Build Command**:
  ```bash
  npm install && npm run build
  ```
- **Start Command**:
  ```bash
  npm run start
  ```

**Advanced:**
- **Auto-Deploy**: Yes (deploys on git push)

### Step 3: Environment Variables

Add these in the **Environment** tab:

```
NODE_ENV=production
```

(Add any other env vars your marketing site needs)

### Step 4: Instance Type

- **Free**: $0/month (goes to sleep after 15 min inactivity)
- **Starter**: $7/month (always on, recommended for production)

### Step 5: Deploy

1. Click **Create Web Service**
2. Wait for initial build (~2-3 minutes)
3. Your site will be available at: `https://peakops-marketing.onrender.com`

---

## What About the Old Static Site?

### Option 1: Delete It (Recommended)
1. Go to your old static site in Render
2. Settings → Delete Web Service
3. This avoids confusion and duplicate deployments

### Option 2: Keep It Disabled
1. Go to Settings
2. Turn off **Auto-Deploy**
3. Keep it as backup but it won't update

---

## Custom Domain Setup

Once your Web Service is running:

1. Go to **Settings** → **Custom Domains**
2. Add: `getpeakops.com` and `www.getpeakops.com`
3. Follow Render's instructions to update DNS:
   - Add CNAME record pointing to your Render service
   - Or use Render's nameservers

---

## Verify It's Working

After deployment, test these URLs:

1. **Homepage**: `https://your-service.onrender.com/`
2. **Demo page**: `https://your-service.onrender.com/demo`
3. **Redirect**: `https://your-service.onrender.com/coaching` → should redirect to `/coaching-mode`

**Check SSR is working:**
1. View page source (right-click → View Page Source)
2. You should see fully rendered HTML with meta tags
3. NOT just `<div id="root"></div>` like a SPA

**SEO Check:**
```html
<!-- You should see this in source: -->
<title>PeakOps - AI Habits for Operational Excellence</title>
<meta name="description" content="...">
<meta property="og:title" content="...">
```

---

## Troubleshooting

### Build fails with "command not found"
**Solution**: Make sure `package.json` is in `apps/marketing/` directory, not root

### Port already in use
**Solution**: Render automatically assigns a PORT env var. Next.js will use it automatically.

### Site is slow on free tier
**Solution**: Upgrade to Starter ($7/mo) for always-on service

### 404 on all routes except homepage
**Solution**:
- Make sure Start Command is `npm run start`, not `npm run dev`
- Check that Root Directory is set to `apps/marketing`

---

## Cost Comparison

| Type | Cost | SSR | SEO | Always On |
|------|------|-----|-----|-----------|
| Static Site | Free | ❌ | ❌ | ✅ |
| Web Service (Free) | $0 | ✅ | ✅ | ❌ (sleeps) |
| Web Service (Starter) | $7/mo | ✅ | ✅ | ✅ |

**Recommendation**: Use Web Service Starter for production marketing site with SEO requirements.

---

## Summary

1. **Create new Web Service** in Render
2. **Root Directory**: `apps/marketing`
3. **Build Command**: `npm install && npm run build`
4. **Start Command**: `npm run start`
5. **Delete old static site** to avoid confusion
6. **Test** `/demo` and view source to verify SSR

Your Next.js SSR setup will then work properly with full SEO support!
