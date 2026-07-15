# 🚀 Render Deployment Guide

## ✅ Code Pushed to GitHub

Your code is now at:
```
https://github.com/dhwebservices/commandai
Branch: main
Latest commit: a25107b
```

---

## 🎯 Deploy to Render (3 Options)

### Option 1: Render Dashboard (Easiest) ⭐

**If you already have a Render service:**

1. **Go to Render Dashboard**
   ```
   https://dashboard.render.com/
   ```

2. **Find your service**
   - Look for "comandr-api" or similar

3. **Manual Deploy**
   - Click the service
   - Click "Manual Deploy" → "Deploy latest commit"
   - Wait 3-5 minutes

4. **Check logs**
   - Click "Logs" tab
   - Watch for "Nest application successfully started"

---

### Option 2: Create New Service from Blueprint

**If you DON'T have a Render service yet:**

1. **Go to Render Dashboard**
   ```
   https://dashboard.render.com/
   ```

2. **New → Blueprint**
   - Click "New +"
   - Select "Blueprint"

3. **Connect Repository**
   - Select "GitHub"
   - Find "dhwebservices/commandai"
   - Click "Connect"

4. **Render will detect `render.yaml`**
   - It will show "comandr-api" service
   - Click "Apply"

5. **Add Secret Environment Variables**
   
   Go to the service → Environment:
   ```
   SUPABASE_ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhubW13cXJlenNwZ2pzcGRsbHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1OTk1NTIsImV4cCI6MjA5OTE3NTU1Mn0.npTAZwcjLOVkrvLBbOavN8y4QKjmHouIqQcACElnskM
   
   SUPABASE_SERVICE_ROLE_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhubW13cXJlenNwZ2pzcGRsbHpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzU5OTU1MiwiZXhwIjoyMDk5MTc1NTUyfQ.qTy4JqM8XS4kzSJjIrg68s9RMRyh0VauHGndu7xmYtY
   
   JWT_SECRET: [generate random: openssl rand -base64 32]
   
   RESEND_API_KEY: [your Resend API key if you have one]
   ```

6. **Deploy**
   - Service will automatically deploy
   - Wait 3-5 minutes

---

### Option 3: Using Render CLI

**Install Render CLI:**
```bash
npm install -g @render-com/cli
```

**Login:**
```bash
render login
```

**Deploy:**
```bash
render deploy
```

---

## 📊 Check Deployment Status

### Once Deployed

Your API will be at:
```
https://comandr-api.onrender.com
```

**Test it:**
```bash
curl https://comandr-api.onrender.com/v1/health
```

**Expected response:**
```json
{
  "status": "ok",
  "service": "api-gateway",
  "version": "v1"
}
```

---

## ⚙️ Configure Desktop Apps for Render

### Update API URL

**File: `apps/desktop-app/src/main.ts`**

Find line 18:
```typescript
const API_BASE = process.env.API_URL || "http://localhost:3000";
```

Change to:
```typescript
const API_BASE = process.env.API_URL || "https://comandr-api.onrender.com";
```

**Or use your actual Render URL if different**

### Rebuild Desktop Apps

```bash
cd /Users/david/Downloads/commandai/apps/desktop-app

# Rebuild both platforms
npm run build -- --mac --win

# Wait ~5 minutes for both to build
```

**New installers will be in `release/` folder with production API URL**

---

## 🧪 Test End-to-End

### 1. Test API is Live

```bash
# Health check
curl https://comandr-api.onrender.com/v1/health

# Should return: {"status":"ok",...}
```

### 2. Install Updated Desktop App

```bash
# Mac
open release/Comandr-1.0.0-arm64.dmg

# Install to Applications
# Launch Comandr
```

### 3. Create Account / Login

```
- App should connect to Render API
- Create account or login
- Device should register automatically
```

### 4. Test Remote Desktop

```
- Go to Devices tab
- Click Connect on your device
- Session window should open
- WebRTC should connect
- Screen should appear
- Mouse/keyboard should work
```

---

## 🔧 Troubleshooting

### API Not Deploying

**Check Render logs:**
```
Dashboard → comandr-api → Logs
```

**Look for:**
- ✅ "Build completed"
- ✅ "Nest application successfully started"
- ❌ Any errors

### Desktop App Can't Connect

**Check API URL:**
```bash
# In app DevTools console
console.log(API_BASE)
# Should show: https://comandr-api.onrender.com
```

**Check network:**
```bash
# In DevTools Network tab
# Filter: "comandr-api"
# Should see requests to Render
```

### Render Service Sleeping (Free Tier)

**Free tier sleeps after 15min inactivity**

**First request wakes it up (~30 seconds)**

**Solutions:**
- Wait 30 seconds for wake-up
- Upgrade to paid ($7/month) for no sleep
- Use a ping service to keep it awake

---

## 💰 Render Costs

### Free Tier (What you'll use)
```
✅ 750 hours/month free
✅ Auto-sleeps after 15min
✅ Wakes on request
✅ Perfect for testing/personal use
```

### Paid Tier ($7/month)
```
✅ No sleep
✅ Faster
✅ More CPU/RAM
✅ Better for production
```

---

## 📋 Deployment Checklist

- [ ] Code pushed to GitHub ✅ (Done!)
- [ ] Render service created (Do this now)
- [ ] Environment variables added (In Render dashboard)
- [ ] Deployment successful (Check logs)
- [ ] API responding (curl /v1/health)
- [ ] Desktop app updated (Change API_BASE)
- [ ] Apps rebuilt (npm run build)
- [ ] End-to-end test (Login + connect)

---

## 🎯 Your Action Items

### Right Now:

1. **Go to Render Dashboard**
   ```
   https://dashboard.render.com/
   ```

2. **If service exists**: 
   - Click "Manual Deploy"
   - Wait for deployment

3. **If no service**:
   - New → Blueprint
   - Connect dhwebservices/commandai
   - Add secret env vars
   - Deploy

4. **Get your API URL**
   ```
   https://comandr-api.onrender.com
   (or whatever Render assigns)
   ```

5. **Tell me the URL** and I'll update the desktop apps!

---

## 🚀 After Deployment

**Once Render is live:**

```bash
# I'll update this automatically:
# apps/desktop-app/src/main.ts with your Render URL

# Then rebuild:
npm run build -- --mac --win

# You'll have production-ready installers!
```

---

**Your code is pushed and ready! Just need to deploy on Render dashboard.** 🎉

**URL**: https://dashboard.render.com/
