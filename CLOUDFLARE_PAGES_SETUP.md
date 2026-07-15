# 🚀 Cloudflare Pages Setup Instructions

## ⚠️ ACTION REQUIRED

Your Cloudflare Pages build is failing because the dashboard settings need to be updated.

## 📋 Steps to Fix

### 1. Go to Cloudflare Dashboard
```
https://dash.cloudflare.com/
```

### 2. Navigate to Your Pages Project
- Click **Pages** in the left sidebar
- Find your project (likely named "comandr" or similar)
- Click on it

### 3. Update Build Settings

Click **Settings** → **Builds & deployments** → **Configure Production deployments** → **Edit configuration**

**Change these settings:**

| Setting | Current (wrong) | Correct |
|---------|----------------|---------|
| **Build command** | `(empty)` | `./build-web-console.sh` |
| **Build output directory** | `dist` | `dist` |
| **Root directory** | `(empty)` | `(empty)` |
| **Environment variables** | Add if missing | See below |

### 4. Environment Variables

Add these if they don't exist:

```
NODE_VERSION = 20
VITE_API_GATEWAY_URL = https://comandr-api.onrender.com
```

### 5. Save and Retry

- Click **Save**
- Go to **Deployments** tab
- Click **Retry deployment** on the latest failed deployment

## ✅ Expected Result

After saving settings and retrying:
```
✅ Cloning repository
✅ Installing dependencies
✅ Running ./build-web-console.sh
✅ Building web console
✅ Copying to dist/
✅ Deploying to Cloudflare
✅ Deployment successful
```

## 🔍 What the Build Script Does

The `build-web-console.sh` script:
1. Installs all dependencies (`pnpm install`)
2. Builds the web console (`cd apps/web-console && pnpm run build`)
3. Copies output to root `dist/` folder (what Cloudflare expects)

## 📞 If Build Still Fails

Check the build logs for:
- Missing dependencies → Add to package.json
- pnpm not found → Check Node version is 20
- Permission denied → Script needs execute permission (already set)

## 🎯 Current Deployment

- **URL:** https://ee725405.comandr.pages.dev
- **Status:** ❌ Failed (needs dashboard config update)
- **Next:** Will succeed after you update dashboard settings

---

**After you update the dashboard settings, the next git push will auto-deploy successfully!** 🚀
