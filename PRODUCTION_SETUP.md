## CommandAI Production Deployment Guide

Complete guide to deploying CommandAI as a production-ready SaaS application.

## Architecture

```
Desktop App (Auto-starts) → Cloud API (24/7) → Supabase Database
     ↓                            ↓
System Tray Icon          Web Console (React)
```

## Prerequisites

- Supabase account (free tier works)
- Resend account for emails (free tier works)
- Cloud hosting (choose one):
  - Railway.app (recommended, free tier)
  - Render.com (free tier available)
  - Fly.io (free tier available)
  - Any Docker-compatible host

## Part 1: Deploy Backend to Cloud (Always Running 24/7)

### Option A: Railway.app (Recommended - Easiest)

1. **Create Railway account**: https://railway.app/
2. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   railway login
   ```

3. **Deploy**:
   ```bash
   cd /Users/david/Downloads/commandai
   railway init
   railway up
   ```

4. **Set environment variables** in Railway dashboard:
   ```
   SUPABASE_URL=https://xnmmwqrezspgjspdllzb.supabase.co
   SUPABASE_ANON_KEY=eyJhbGci...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
   RESEND_API_KEY=re_NvqKHepA_2Vn8HoXm8R4a5Xa1R92urXr8
   RESEND_FROM_EMAIL=auth@dhwebsiteservices.co.uk
   WEB_APP_URL=https://your-railway-url.up.railway.app
   NODE_ENV=production
   API_GATEWAY_PORT=3000
   LOG_LEVEL=info
   ```

5. **Get your API URL**: Railway will give you a URL like `https://commandai.up.railway.app`

### Option B: Render.com

1. **Create Render account**: https://render.com
2. **Connect GitHub repo**: Link your commandai repository
3. **Create Web Service**:
   - Environment: Docker
   - Branch: main
   - Plan: Free
4. **Add environment variables** (same as Railway above)
5. **Deploy**: Render will auto-deploy from GitHub

### Option C: Fly.io

1. **Install Fly CLI**: https://fly.io/docs/hands-on/install-flyctl/
2. **Login**: `flyctl auth login`
3. **Launch app**:
   ```bash
   cd /Users/david/Downloads/commandai
   flyctl launch
   ```
4. **Set secrets**:
   ```bash
   flyctl secrets set SUPABASE_URL=... SUPABASE_ANON_KEY=... ...
   ```
5. **Deploy**: `flyctl deploy`

### Verify Deployment

Test your deployed API:
```bash
curl https://your-deployment-url.com/v1/health
```

Should return: `{"status":"ok"}`

## Part 2: Build Desktop App Installers

### For Mac (.dmg installer)

1. **Install dependencies**:
   ```bash
   cd apps/desktop-app
   pnpm install
   ```

2. **Update API URL** in `src/main.ts`:
   ```typescript
   const API_BASE = "https://your-deployment-url.com"; // Your Railway/Render URL
   ```

3. **Build Mac installer**:
   ```bash
   pnpm build:mac
   ```

4. **Find installer**: `apps/desktop-app/release/CommandAI-1.0.0.dmg`

### For Windows (.exe installer)

1. **On Windows or use cross-compilation**:
   ```bash
   pnpm build:win
   ```

2. **Find installer**: `apps/desktop-app/release/CommandAI Setup 1.0.0.exe`

### For Linux (.AppImage)

```bash
pnpm build:linux
```

## Part 3: Build Web Console for Production

### Option A: Deploy with Backend (Same Server)

Web console is automatically served from the API gateway when built.

### Option B: Deploy Separately (Vercel/Netlify)

1. **Build web console**:
   ```bash
   cd apps/web-console
   pnpm build
   ```

2. **Deploy to Vercel**:
   ```bash
   npx vercel --prod
   ```

3. **Or deploy to Netlify**:
   ```bash
   npx netlify deploy --prod --dir=dist
   ```

4. **Update environment variables**:
   ```
   VITE_API_GATEWAY_URL=https://your-api-url.com
   ```

## Part 4: End User Installation Flow

### For Users Downloading Your App:

1. **Download installer**:
   - Mac: CommandAI.dmg
   - Windows: CommandAI Setup.exe
   - Linux: CommandAI.AppImage

2. **Install**:
   - Mac: Drag to Applications folder
   - Windows: Run installer, click through wizard
   - Linux: Make executable and run

3. **First Launch**:
   - App auto-starts in system tray (menu bar on Mac, taskbar on Windows)
   - Click tray icon → "Login"
   - Opens web browser to your hosted web console
   - User signs up/logs in
   - Desktop app automatically syncs with their account

4. **Daily Usage**:
   - App runs automatically on startup (no commands needed!)
   - Users can:
     - Click tray icon for quick commands
     - Open web dashboard for full control
     - Agent runs in background, executes commands automatically

## Part 5: Configuration for Different Environments

### Production Environment Variables

Create `.env.production` in `apps/api-gateway/`:

```bash
NODE_ENV=production
LOG_LEVEL=info
API_GATEWAY_PORT=3000

# Supabase (from your Supabase dashboard)
SUPABASE_URL=https://xnmmwqrezspgjspdllzb.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Resend (from resend.com)
RESEND_API_KEY=your-resend-key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Your deployment URL
WEB_APP_URL=https://app.yourcompany.com

# NATS (for message queue)
NATS_URL=nats://your-nats-server:4222
```

## Part 6: Database Setup (Supabase)

1. **Run migrations**:
   ```bash
   # From local machine
   npx supabase db push
   ```

2. **Or apply manually** in Supabase SQL editor:
   - Run each migration file in `supabase/migrations/` in order

3. **Verify tables exist**:
   - tenants
   - profiles
   - email_verification_tokens
   - password_reset_tokens
   - actions
   - audit_events
   - agent_enrollment_tokens
   - agent_credentials

## Part 7: Monitoring & Maintenance

### Health Checks

Your API includes a health endpoint: `/v1/health`

Set up monitoring:
- **UptimeRobot** (free): Monitor API uptime
- **Railway/Render built-in**: Both have uptime monitoring
- **Sentry** (optional): Error tracking

### Logs

View logs:
- **Railway**: `railway logs`
- **Render**: View in dashboard
- **Fly.io**: `flyctl logs`

### Database Backups

Supabase automatically backs up your database daily (free tier: 7 days retention)

### Scaling

Free tiers handle:
- Railway: 500 hours/month (enough for 24/7)
- Render: Always running
- Fly.io: 3 shared-CPU VMs

For production load, upgrade to paid tiers.

## Part 8: Custom Domain Setup (Optional)

### For API

1. **Add domain in hosting dashboard**:
   - Railway/Render: Add custom domain
   - Configure DNS: `CNAME api.yourdomain.com → your-deployment-url.com`

2. **Update all URLs**:
   - Desktop app: `const API_BASE = "https://api.yourdomain.com"`
   - Web console: `VITE_API_GATEWAY_URL=https://api.yourdomain.com`

### For Web Console

1. **Add domain**:
   - Vercel/Netlify: Add custom domain
   - Configure DNS: `CNAME app.yourdomain.com → your-vercel-url.vercel.app`

2. **Update email templates**:
   - WEB_APP_URL=https://app.yourdomain.com

## Part 9: Distribution

### Mac App Store (Optional)

1. Enroll in Apple Developer Program ($99/year)
2. Sign app with Developer ID
3. Notarize app
4. Submit to App Store

### Windows Store (Optional)

1. Create Microsoft Partner account
2. Package as MSIX
3. Submit to Microsoft Store

### Direct Download (Easier)

1. Host installers on:
   - GitHub Releases (free)
   - Your website
   - CloudFlare R2 (cheap)

2. Create download page:
   ```html
   <a href="/downloads/CommandAI.dmg">Download for Mac</a>
   <a href="/downloads/CommandAI-Setup.exe">Download for Windows</a>
   ```

## Part 10: No-Command Startup Checklist

✅ **Backend deployed to cloud** - Always running, no local server needed
✅ **Desktop app auto-launches** - Starts with system, no terminal commands
✅ **System tray integration** - Click icon to access, no window needed
✅ **Auto-login persistence** - User logs in once, stays logged in
✅ **Background agent** - Runs silently, polls for commands automatically
✅ **One-click installers** - Users just download and install, that's it!

## Summary: From Download to Running (End User Experience)

1. User downloads CommandAI.dmg (or .exe)
2. User installs it (drag to Applications or click installer)
3. App automatically starts (appears in menu bar/system tray)
4. User clicks icon → Login
5. User creates account in web browser
6. Done! Agent is now running 24/7

**No terminal, no commands, no configuration - just works!**

## Cost Breakdown (Production)

**Free Tier:**
- Railway.app: $0 (500 hours/month = 24/7)
- Supabase: $0 (500MB database, 50,000 monthly active users)
- Resend: $0 (100 emails/day)
- **Total: $0/month**

**Paid Tier (for scale):**
- Railway Pro: $20/month (always-on + more resources)
- Supabase Pro: $25/month (8GB database, 100,000 users)
- Resend Pro: $20/month (50,000 emails/month)
- **Total: ~$65/month for serious production usage**

---

**Questions?** Check AGENT_GUIDE.md for usage details or open an issue on GitHub.
