# Cloudflare Pages Configuration

This repo uses **Cloudflare Pages** for the web console deployment.

## Dashboard Configuration

Go to: https://dash.cloudflare.com/pages → Your Project → Settings → Builds & deployments

### Build Settings

**Framework preset:** None (custom)

**Build command:**
```bash
./build-web-console.sh
```

**Build output directory:**
```
dist
```

**Root directory:**
```
(leave empty - use repository root)
```

**Install command:**
```bash
pnpm install
```

**Node version:**
```
20
```

### Environment Variables

Set these in Pages dashboard → Settings → Environment variables:

```
VITE_API_GATEWAY_URL=https://comandr-api.onrender.com
NODE_VERSION=20
```

## Current Deployment

- **URL:** https://ee725405.comandr.pages.dev
- **Auto-deploy:** Yes (from `main` branch)
- **Status:** ✅ Active

## Troubleshooting

If build fails with "wrangler.toml" errors:
- Cloudflare Pages **does not** use `wrangler.toml`
- That file is for Cloudflare Workers, not Pages
- All config is in the dashboard

If build fails with "dist not found":
- Make sure build output directory is `apps/web-console/dist`
- Make sure build command includes `cd apps/web-console`
