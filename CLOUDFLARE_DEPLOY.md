# Deploy Comandr to Cloudflare (100% Free!)

Complete guide to deploy Comandr using **Cloudflare Workers + Pages + Supabase** - all on free tiers!

## Why Cloudflare?

✅ **Generous Free Tier**: 100,000 requests/day (3M/month)
✅ **Always Running**: No sleep/cold starts like other free tiers
✅ **Global Edge Network**: Fast worldwide
✅ **Simple Deployment**: Just `wrangler deploy`
✅ **$0/month**: Completely free for most usage

## Architecture

```
Desktop App → Cloudflare Workers (API) → Supabase (Database)
               ↓
          Cloudflare Pages (Web Console)
```

## Prerequisites

1. **Cloudflare account** (free): https://dash.cloudflare.com/sign-up
2. **Supabase account** (free): https://supabase.com/
3. **Resend account** (free): https://resend.com/
4. **Wrangler CLI**:
   ```bash
   npm install -g wrangler
   wrangler login
   ```

## Step 1: Set Up Supabase Database

1. **Create project** at https://app.supabase.com/
   - Project name: comandr
   - Database password: (save this!)
   - Region: Choose closest to you

2. **Run migrations**:
   ```bash
   cd /Users/david/Downloads/comandr
   npx supabase link --project-ref your-project-ref
   npx supabase db push
   ```

3. **Get credentials** from Supabase dashboard → Settings → API:
   - **Project URL**: `https://xxx.supabase.co`
   - **anon/public key**: `eyJhbGci...`
   - **service_role key**: `eyJhbGci...` (keep secret!)

## Step 2: Deploy API to Cloudflare Workers

1. **Navigate to API**:
   ```bash
   cd /Users/david/Downloads/comandr
   ```

2. **Set secrets** (one-time setup):
   ```bash
   wrangler secret put SUPABASE_URL
   # Paste: https://xnmmwqrezspgjspdllzb.supabase.co

   wrangler secret put SUPABASE_ANON_KEY
   # Paste your anon key

   wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   # Paste your service role key

   wrangler secret put RESEND_API_KEY
   # Paste: re_NvqKHepA_2Vn8HoXm8R4a5Xa1R92urXr8

   wrangler secret put RESEND_FROM_EMAIL
   # Paste: auth@dhwebsiteservices.co.uk

   wrangler secret put WEB_APP_URL
   # Paste: https://comandr.pages.dev (or your custom domain)
   ```

3. **Deploy**:
   ```bash
   wrangler deploy
   ```

4. **Get your API URL**:
   ```
   ✅ Deployed to: https://comandr-api.workers.dev
   ```

5. **Test it**:
   ```bash
   curl https://comandr-api.workers.dev/v1/health
   # Should return: {"status":"ok"}
   ```

## Step 3: Deploy Web Console to Cloudflare Pages

### Option A: GitHub Integration (Recommended - Auto-deploy)

1. **Push to GitHub**:
   ```bash
   git add -A
   git commit -m "feat: Cloudflare deployment"
   git push origin main
   ```

2. **Connect to Cloudflare Pages**:
   - Go to https://dash.cloudflare.com/ → Pages
   - Click "Create a project"
   - Click "Connect to Git"
   - Select your `comandr` repository
   - Configure build:
     - **Build command**: `cd apps/web-console && pnpm install && pnpm build`
     - **Build output directory**: `apps/web-console/dist`
     - **Root directory**: `/`

3. **Set environment variables**:
   - Add variable: `VITE_API_GATEWAY_URL` = `https://comandr-api.workers.dev`

4. **Deploy**:
   - Click "Save and Deploy"
   - Wait 2-3 minutes for build
   - Get your URL: `https://comandr.pages.dev`

### Option B: Direct Upload (Manual)

1. **Build locally**:
   ```bash
   cd apps/web-console
   VITE_API_GATEWAY_URL=https://comandr-api.workers.dev pnpm build
   ```

2. **Deploy**:
   ```bash
   npx wrangler pages deploy dist --project-name=comandr
   ```

## Step 4: Update Desktop App

Edit `apps/desktop-app/src/main.ts`:

```typescript
const API_BASE = "https://comandr-api.workers.dev"; // Your Workers URL
```

Rebuild desktop app:
```bash
cd apps/desktop-app
pnpm install
pnpm build:mac  # or build:win
```

New installer will be in `apps/desktop-app/release/`

## Step 5: Test Everything

1. **API Health Check**:
   ```bash
   curl https://comandr-api.workers.dev/v1/health
   ```

2. **Open Web Console**:
   - Visit: https://comandr.pages.dev
   - Sign up for account
   - Verify email works

3. **Test Desktop App**:
   - Install new build
   - App appears in system tray
   - Click → Login
   - Should open to your Cloudflare Pages URL
   - Try sending a command!

## Cloudflare Free Tier Limits

### Workers (API)
- ✅ 100,000 requests/day
- ✅ 10ms CPU time per request
- ✅ 128MB memory
- ✅ Always running (no cold starts)
- **More than enough for personal use + small teams!**

### Pages (Web Console)
- ✅ Unlimited requests
- ✅ Unlimited bandwidth
- ✅ 500 builds per month
- ✅ Auto-deployed from Git
- **Perfect for production!**

### When to Upgrade ($5/month Workers Paid)
- 10M+ requests/month
- Need longer CPU time (50ms+)
- Want custom domains without limits

## Custom Domain Setup (Optional)

### For API (api.yourdomain.com)

1. **Add route** in Cloudflare dashboard:
   - Workers & Pages → Your worker → Triggers → Routes
   - Add route: `api.yourdomain.com/*`
   - Select your worker

2. **Update URLs**:
   - Desktop app: `API_BASE = "https://api.yourdomain.com"`
   - Web console: `VITE_API_GATEWAY_URL=https://api.yourdomain.com`

### For Web Console (app.yourdomain.com)

1. **Add custom domain** in Pages settings:
   - Pages → Your project → Custom domains
   - Add `app.yourdomain.com`
   - Cloudflare auto-configures DNS

2. **Update environment**:
   - Set `WEB_APP_URL=https://app.yourdomain.com` in Workers secrets

## Monitoring & Logs

### View Logs
```bash
# Real-time logs
wrangler tail

# Or in dashboard
Cloudflare Dashboard → Workers → Your worker → Logs
```

### Analytics
- Cloudflare Dashboard → Workers → Your worker → Analytics
- See requests, errors, CPU time, etc.

### Alerts
Set up alerts in Cloudflare Dashboard:
- Error rate spikes
- High CPU usage
- Traffic patterns

## Troubleshooting

### API not working
```bash
# Check logs
wrangler tail

# Verify secrets are set
wrangler secret list

# Test locally first
wrangler dev
```

### Web console not loading
- Check build output in Pages dashboard
- Verify `VITE_API_GATEWAY_URL` is set correctly
- Check browser console for errors

### CORS errors
- Ensure `app.enableCors()` is in `worker.ts`
- Check that API URL matches what web console is calling

## Complete Deployment Checklist

- [ ] Supabase project created
- [ ] Database migrations applied
- [ ] Cloudflare Workers deployed
- [ ] All secrets set in Workers
- [ ] API health check passes
- [ ] Cloudflare Pages deployed
- [ ] Web console loads and works
- [ ] Can sign up and login
- [ ] Email verification works
- [ ] Desktop app built with correct API URL
- [ ] Desktop app installs and runs
- [ ] Can execute commands from desktop app

## Cost Breakdown

**Monthly Costs (Free Tier):**
- Cloudflare Workers: **$0** (up to 100K requests/day)
- Cloudflare Pages: **$0** (unlimited)
- Supabase: **$0** (500MB database, 50K users)
- Resend: **$0** (100 emails/day)
- **Total: $0/month** 🎉

**Paid Tier (if you outgrow free):**
- Cloudflare Workers: $5/month (10M requests)
- Supabase Pro: $25/month (8GB, 100K users)
- Resend Pro: $20/month (50K emails/month)
- **Total: $50/month for serious scale**

## Advantages vs Other Platforms

| Feature | Cloudflare | Railway | Render | Vercel |
|---------|-----------|---------|---------|--------|
| Free requests | 100K/day | 500 hrs/month | Limited | 100GB bandwidth |
| Always on | ✅ Yes | ⚠️ Sleep on free | ⚠️ Sleep on free | ✅ Yes |
| Global edge | ✅ Yes | ❌ Single region | ❌ Single region | ✅ Yes |
| Cold starts | ✅ None | ⚠️ On wake | ⚠️ On wake | ✅ None |
| Setup | Easy | Easiest | Easy | Medium |

**Winner: Cloudflare** for always-on free tier + global distribution!

## Next Steps

1. **Deploy now**: Follow steps above
2. **Share installers**: Put .dmg/.exe on your website
3. **Monitor usage**: Check Cloudflare analytics
4. **Scale up**: Upgrade when you need more

## Support

- **Cloudflare Docs**: https://developers.cloudflare.com/workers/
- **Supabase Docs**: https://supabase.com/docs
- **Issues**: Open GitHub issue

---

**You now have a production-ready, globally distributed, auto-scaling platform that costs $0/month!** 🚀
