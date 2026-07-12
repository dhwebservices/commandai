# Comandr Production Plan

Complete roadmap to transform Comandr into a production-ready, enterprise-grade system automation platform.

---

## 🎯 Executive Summary

**Goal**: Build a polished, secure, professional desktop automation platform that rivals products from Apple/Microsoft, with comprehensive capabilities, enterprise-grade security, and a UI that looks like a million-pound budget.

**Timeline Estimate**: 8 major phases
**Current Status**: Renaming in progress (CommandAI → Comandr)

---

## Phase 1: Complete Renaming ✅ (In Progress)

**Status**: 90% complete, fixing build issues

### Remaining Tasks:
- [ ] Fix desktop-app TypeScript configuration
- [ ] Verify all builds pass
- [ ] Test renamed packages work correctly
- [ ] Update any missed references

**Time**: 30 minutes

---

## Phase 2: AI Architecture Reversal 🔄

**Goal**: Make AI the LAST resort, not the first. Database-driven command matching is primary.

### Current Flow (WRONG):
```
User Input → AI API (requires key) → Intent → Execute
```

### New Flow (CORRECT):
```
User Input → Command Database (instant, free) → Intent → Execute
                ↓ (only if no match)
           AI Fallback (optional, requires key)
```

### Implementation:

**2.1 Expand Command Database** (apps/desktop-app/src/command-database.ts)
- Current: ~30 patterns
- Target: **500+ patterns** covering all capabilities
- Categories to add:
  - Advanced file operations (permissions, ownership, attributes)
  - Developer tools (git, docker, npm, brew, etc.)
  - System internals (launchd, systemd, registry)
  - Network diagnostics (traceroute, netstat, arp, dns)
  - Security tools (keychain, certificates, firewall)
  - Performance tuning (nice, ionice, CPU affinity)
  - Database operations (postgres, mysql, redis)
  - Hidden utilities (diskutil, dscl, scutil on Mac)

**2.2 Pattern Matching Improvements**
- Fuzzy matching for typos
- Synonym detection ("remove" = "delete" = "rm")
- Context awareness (current directory, recent commands)
- Parameter extraction from natural language
- Multi-step command chains

**2.3 AI Controller Update**
- Move AI check to LAST position
- Add clear logging: "Matched from database" vs "Used AI"
- Track success rate of database matches
- Only call Anthropic API if ANTHROPIC_API_KEY is set

**Time**: 2-3 hours

---

## Phase 3: Massive Skillset Expansion 🧠

**Goal**: Knowledge base that rivals senior engineers at Apple, Microsoft, Google + hidden power-user commands.

### 3.1 System Administration (100+ commands)

**macOS Specific:**
```
- defaults (hidden preferences)
- dscl (directory services - user/group management)
- diskutil (disk operations)
- hdiutil (disk images)
- launchctl (services/daemons)
- scutil (system configuration)
- pmset (power management)
- nvram (firmware variables)
- spctl (Gatekeeper control)
- codesign (code signing)
- notarytool (notarization)
- mdutil (Spotlight indexing)
- tmutil (Time Machine)
- airport (WiFi diagnostics)
- networksetup (network config)
- caffeinate (prevent sleep)
- purge (clear memory)
- softwareupdate (system updates)
```

**Windows Specific:**
```
- reg (registry editing)
- sc (service control)
- wmic (WMI queries)
- netsh (network shell)
- powercfg (power config)
- bcdedit (boot config)
- sfc (system file checker)
- dism (deployment imaging)
- chkdsk (disk check)
- defrag (defragmentation)
- gpupdate (group policy)
- eventcreate (event logs)
- taskkill (force kill)
- net user (user management)
- icacls (permissions)
```

**Cross-Platform:**
```
- Process management (nice, renice, pgrep, pkill)
- Network tools (nmap, tcpdump, wireshark commands)
- Performance (top, htop, iotop, vmstat, iostat)
- Disk operations (dd, fdisk, parted)
- Compression (tar, gzip, bzip2, xz, zip, 7z)
- Text processing (awk, sed, grep, cut, sort, uniq)
- File sync (rsync, scp, sftp)
```

### 3.2 Developer Tools (80+ commands)

```
Git operations (clone, commit, push, pull, rebase, cherry-pick, bisect)
Docker (build, run, compose, logs, exec, prune)
Kubernetes (kubectl commands)
Package managers (npm, yarn, pnpm, pip, gem, cargo, brew, apt, yum)
Build tools (make, cmake, gradle, maven)
Database clients (psql, mysql, redis-cli, mongo)
API testing (curl, httpie, jq)
Code analysis (eslint, prettier, sonar)
SSH operations (keygen, config, tunneling)
SSL/TLS (openssl commands)
```

### 3.3 Security & Forensics (50+ commands)

```
Password management (keychain, pass, gpg)
Encryption (openssl, gpg, age)
Firewall rules (iptables, pf, Windows Firewall)
Port scanning (nmap, netcat)
Process monitoring (lsof, fuser)
Network sniffing (tcpdump, tshark)
Certificate operations
Hash generation (md5, sha256)
Secure deletion (shred, srm)
Audit logs (ausearch, lastlog)
```

### 3.4 Hidden "Pro" Commands

**Things most people don't know about:**
```
macOS:
- caffeinate -u -t 3600 (prevent sleep for 1 hour)
- pmset -g (detailed battery info)
- sudo purge (clear RAM)
- mdfind (Spotlight from terminal)
- say "hello" (text to speech)
- screencapture -T 5 screenshot.png (delayed screenshot)
- networkQuality (Apple's network speed test)
- log stream (live system logs)

Windows:
- cleanmgr /sageset:1 (disk cleanup wizard)
- perfmon /report (performance report)
- resmon (resource monitor)
- msconfig (system config)
- eventvwr (event viewer)
- regedit (registry editor)
- msinfo32 (system info)
- certmgr.msc (certificates)
```

### 3.5 Data Structure

```typescript
interface CommandPattern {
  patterns: string[];           // Natural language patterns
  capabilityId: string;         // Capability to execute
  extractParams: (input: string) => any;
  description: string;          // What it does
  riskLevel: 'safe' | 'warning' | 'danger' | 'critical';
  requiresConfirmation: boolean;
  examples: string[];           // Example inputs
  platforms: ('mac' | 'windows' | 'linux')[];
  category: string;             // For organization
  aliases: string[];            // Alternative names
  learnMoreUrl?: string;        // Documentation link
}
```

**Time**: 4-6 hours

---

## Phase 4: Safety & Permission System 🛡️

**Goal**: Only ask for confirmation when truly necessary. Protect users from mistakes.

### 4.1 Risk Classification

**Safe (no confirmation needed):**
- Read operations (list files, show info, get status)
- Non-destructive queries (CPU usage, memory, disk space)
- Clipboard read
- Screenshot capture

**Warning (show warning, auto-proceed after 3s):**
- File modifications (write, move, copy)
- Application launch/quit
- Network operations (download, ping)
- Process list

**Danger (require explicit confirmation):**
- File deletion
- Process termination
- Directory removal
- Permission changes
- Service start/stop

**Critical (require confirmation + liability acceptance):**
- System shutdown/restart
- Disk formatting
- Firewall changes
- Registry modifications (Windows)
- LaunchDaemon changes (Mac)
- User account modifications
- Batch deletions
- Recursive operations on system directories

### 4.2 Confirmation UI

```typescript
interface ConfirmationDialog {
  title: string;
  message: string;
  riskLevel: 'danger' | 'critical';
  details: {
    command: string;
    affectedFiles?: string[];
    canUndo: boolean;
    estimatedImpact: string;
  };
  requireLiabilityAcceptance: boolean;  // Only for critical
  buttons: {
    confirm: string;     // e.g., "Yes, Delete File"
    cancel: string;      // e.g., "Cancel"
  };
}
```

**Example for Critical Operation:**
```
⚠️ CRITICAL OPERATION

You are about to DELETE 147 files in /Users/david/Documents

This action:
• Cannot be undone
• Will permanently remove all files
• May affect running applications

☑️ I understand this is permanent and accept liability

[Cancel]  [Yes, Delete Files]
```

### 4.3 Undo/Rollback System

- Trash instead of permanent delete (when possible)
- Backup before modify
- Transaction log for batch operations
- Rollback capability for service changes

### 4.4 Audit Logging

Every executed command logged to:
- Local database (SQLite in desktop app)
- Supabase (cloud backup)
- Includes: timestamp, user, command, result, risk level

**Time**: 3-4 hours

---

## Phase 5: Admin Backend 👨‍💼

**Goal**: Staff can monitor usage, manage users, view analytics.

### 5.1 Architecture Decision

**Option A: Web Console Admin Panel** (RECOMMENDED)
- Separate route: `/admin/dashboard`
- Role-based access (admin role in database)
- Accessible from anywhere
- Better for team collaboration

**Option B: Desktop App Admin Mode**
- Special login for staff
- Opens admin interface in app
- More secure (local only)
- Harder to share access

**RECOMMENDATION: Option A** - Web-based admin panel

### 5.2 Admin Features

**Dashboard Overview:**
- Total users
- Active agents (desktop apps online)
- Commands executed today/week/month
- Error rate
- Most used capabilities
- Geographic distribution

**User Management:**
- View all users
- User details (join date, last active, email verified)
- Usage statistics per user
- Ban/suspend users
- Password reset (admin-initiated)
- Delete accounts

**Command Audit Log:**
- Real-time command feed
- Filter by user, date, capability, risk level
- Search functionality
- Export to CSV
- Flag suspicious activity

**System Monitoring:**
- API health status
- Database performance
- Error logs
- Cloudflare metrics (requests, bandwidth)
- Alert system (email on high error rate)

**Analytics:**
- Most popular commands
- Peak usage hours
- Platform breakdown (Mac/Windows/Linux)
- Success vs failure rate
- AI usage vs database matches

### 5.3 Implementation

**Database Schema:**
```sql
-- Add admin role
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
-- Roles: 'user' | 'admin' | 'super_admin'

-- Command execution log (already exists, expand it)
CREATE TABLE command_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  tenant_id UUID REFERENCES tenants(id),
  capability_id TEXT NOT NULL,
  parameters JSONB,
  result JSONB,
  status TEXT, -- success | error | blocked
  risk_level TEXT,
  executed_at TIMESTAMP DEFAULT NOW(),
  execution_time_ms INTEGER,
  ip_address INET,
  user_agent TEXT
);

-- Create indexes for fast queries
CREATE INDEX idx_command_logs_user ON command_logs(user_id);
CREATE INDEX idx_command_logs_executed_at ON command_logs(executed_at DESC);
CREATE INDEX idx_command_logs_risk_level ON command_logs(risk_level);
```

**API Endpoints:**
```typescript
// Admin routes (protected by admin role check)
GET  /v1/admin/stats              // Dashboard stats
GET  /v1/admin/users              // List all users
GET  /v1/admin/users/:id          // User details
POST /v1/admin/users/:id/suspend  // Suspend user
GET  /v1/admin/commands           // Command audit log
GET  /v1/admin/analytics          // Analytics data
GET  /v1/admin/health             // System health
```

**UI Components:**
- New route: `apps/web-console/src/pages/admin/`
- AdminDashboard.tsx
- UserManagement.tsx
- CommandLogs.tsx
- Analytics.tsx
- SystemHealth.tsx

**Time**: 5-6 hours

---

## Phase 6: UI Overhaul 🎨

**Goal**: Professional, polished, modern UI. No "AI-generated" look. Million-pound budget aesthetic.

### 6.1 Design System Upgrade

**Current Issues:**
- ✗ Basic boxes layout
- ✗ No visual hierarchy
- ✗ Generic login screen
- ✗ Placeholder UI elements
- ✗ Lacks personality
- ✗ No animations/transitions
- ✗ Inconsistent spacing

**Target Aesthetic:**
- ✓ Apple-level polish (macOS Ventura style)
- ✓ Smooth animations
- ✓ Glassmorphism effects
- ✓ Dark mode by default (light mode optional)
- ✓ Microinteractions
- ✓ Professional typography
- ✓ Consistent design language

### 6.2 Color Palette

**Dark Mode (Primary):**
```css
--bg-primary: #0f0f0f;        /* Deep black */
--bg-secondary: #1a1a1a;      /* Slightly lighter */
--bg-tertiary: #242424;       /* Cards/panels */
--accent-primary: #0066ff;    /* Blue (Apple-like) */
--accent-hover: #0052cc;      /* Darker blue */
--text-primary: #ffffff;      /* White */
--text-secondary: #a0a0a0;    /* Gray */
--border: rgba(255,255,255,0.1);
--glass: rgba(255,255,255,0.05);
--shadow: rgba(0,0,0,0.5);
```

**Light Mode (Optional):**
```css
--bg-primary: #ffffff;
--bg-secondary: #f5f5f7;
--bg-tertiary: #ffffff;
--accent-primary: #0066ff;
--text-primary: #1d1d1f;
--text-secondary: #6e6e73;
```

### 6.3 Typography

```css
/* Use SF Pro (Apple) or Inter (fallback) */
--font-display: 'SF Pro Display', 'Inter', system-ui;
--font-text: 'SF Pro Text', 'Inter', system-ui;
--font-mono: 'SF Mono', 'Menlo', monospace;

/* Sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 2rem;      /* 32px */
```

### 6.4 Component Redesigns

**Login Page:**
```
Before: Basic HTML form on white background

After:
- Full-screen gradient background (animated)
- Glassmorphism card
- Floating labels
- Social login icons (future)
- Animated logo
- Smooth transitions
- "Forgot password?" inline
- "Sign up" prominent CTA
```

**Dashboard:**
```
Before: Large boxes in a grid

After:
- Sidebar navigation (collapsible)
- Top bar with search, notifications, profile
- Card-based layout with shadows
- Hover effects
- Loading skeletons
- Empty states with illustrations
- Stat cards with trend indicators
- Recent activity feed
- Quick actions toolbar
```

**Agent Interface:**
```
Before: Input box + text results

After:
- Chat-like interface (similar to ChatGPT UI)
- Message bubbles for commands and results
- Typing indicators
- Command suggestions as you type
- Syntax highlighting for code/output
- Collapsible sections
- Copy buttons
- Export conversation
- Favorite/pin commands
```

### 6.5 Animations & Microinteractions

```typescript
// Smooth transitions
transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);

// Hover effects
transform: translateY(-2px);
box-shadow: 0 10px 40px rgba(0,0,0,0.2);

// Loading states
Skeleton loaders (shimmer effect)

// Success/error feedback
Toast notifications (slide in from top)
Green checkmark animation
Red shake on error

// Page transitions
Fade in/out between routes
Slide animations for modals

// Button states
Scale down on click (0.95)
Ripple effect
```

### 6.6 Remove AI Indicators

**Things to remove/change:**
- ✗ "AI Assistant" branding
- ✗ "Powered by Claude" mentions
- ✗ Generic chatbot language
- ✗ "Generate" or "AI-generated" text

**Replace with:**
- ✓ "Smart Automation"
- ✓ "Intelligent Commands"
- ✓ "Advanced System Control"
- ✓ Focus on capabilities, not AI

### 6.7 Desktop App Tray Icon

- Custom icon (not generic)
- Menu animations
- Status indicator (green = online, gray = offline)
- Notification badges
- Quick command palette

**Time**: 8-10 hours

---

## Phase 7: Security Hardening 🔒

**Goal**: Fort Knox security. No secrets exposed. Unhackable.

### 7.1 Frontend Security (Web Console)

**Environment Variables:**
```bash
# ✅ SAFE (public)
VITE_API_GATEWAY_URL=https://comandr-api.workers.dev

# ❌ NEVER in frontend
ANTHROPIC_API_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=...
```

**Verify No Secrets:**
```bash
# Check built files for leaked secrets
grep -r "sk-ant-" apps/web-console/dist/
grep -r "eyJ" apps/web-console/dist/  # JWT patterns
grep -r "re_" apps/web-console/dist/  # Resend keys
```

**Content Security Policy:**
```typescript
// Add to web console
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self';
           script-src 'self';
           style-src 'self' 'unsafe-inline';
           img-src 'self' data: https:;
           connect-src 'self' https://comandr-api.workers.dev">
```

### 7.2 Desktop App Security

**Code Obfuscation:**
```javascript
// Use electron-builder asar to package code
"build": {
  "asar": true,
  "asarUnpack": ["**/*.node"]
}
```

**Prevent Reverse Engineering:**
- No sensitive logic in frontend
- API calls require auth token
- Token stored in system keychain (not plaintext)
- Encrypt local database

**Electron Security Best Practices:**
```typescript
// In main.ts
const mainWindow = new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,        // Don't expose Node to renderer
    contextIsolation: true,        // Isolate contexts
    sandbox: true,                 // Sandbox renderer process
    webSecurity: true,             // Enable web security
    allowRunningInsecureContent: false,
    enableRemoteModule: false,
  }
});

// Use preload script for controlled IPC
```

**Auto-Update Security:**
```typescript
// Code signing for updates
"build": {
  "mac": {
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "entitlements.mac.plist"
  },
  "win": {
    "certificateFile": "cert.pfx",
    "certificatePassword": process.env.CERT_PASSWORD
  }
}
```

### 7.3 Backend Security (API)

**Authentication:**
```typescript
// Already implemented, verify:
- JWT tokens
- Token expiration (7 days)
- Refresh tokens
- Password hashing (bcrypt)
```

**Authorization:**
```typescript
// Add role-based access control
interface User {
  id: string;
  role: 'user' | 'admin' | 'super_admin';
  permissions: string[];
}

// Middleware
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}
```

**Rate Limiting:**
```typescript
// Cloudflare Workers has built-in DDoS protection
// Add application-level rate limiting:

import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests'
});

app.use('/v1/', limiter);

// Stricter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts
});

app.use('/v1/auth/login', authLimiter);
```

**Input Validation:**
```typescript
// Already using Zod, verify all endpoints:
import { z } from 'zod';

const commandSchema = z.object({
  prompt: z.string().min(1).max(500),
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
});

// Sanitize inputs
function sanitize(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .trim();
}
```

**SQL Injection Prevention:**
```typescript
// Already using Supabase client (parameterized queries)
// Verify NO raw SQL with string concatenation

// ✅ SAFE
supabase.from('users').select('*').eq('id', userId);

// ❌ DANGEROUS
supabase.rpc('raw_query', { sql: `SELECT * FROM users WHERE id = '${userId}'` });
```

**XSS Prevention:**
```typescript
// Frontend: React already escapes by default
// Backend: Set headers

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  next();
});
```

**CORS Configuration:**
```typescript
// Restrict to known origins only
app.enableCors({
  origin: [
    'https://comandr.pages.dev',
    'https://app.yourdomain.com',
    'http://localhost:5173', // Dev only
  ],
  credentials: true,
});
```

### 7.4 Database Security

**Row Level Security (RLS):**
```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE intents ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY users_self ON users
  FOR ALL
  USING (auth.uid() = id);

-- Intents only visible to owning user
CREATE POLICY intents_user ON intents
  FOR ALL
  USING (user_id = auth.uid());

-- Admins can see everything
CREATE POLICY admin_all ON users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );
```

**Audit Logging:**
```sql
-- Log all data changes
CREATE TABLE audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT,
  record_id UUID,
  action TEXT, -- INSERT | UPDATE | DELETE
  old_data JSONB,
  new_data JSONB,
  user_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Trigger function
CREATE OR REPLACE FUNCTION audit_trigger() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_trail (table_name, record_id, action, old_data, new_data, user_id)
  VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW), auth.uid());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 7.5 Secrets Management

**Cloudflare Workers Secrets:**
```bash
# Store securely (NOT in code)
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put RESEND_API_KEY

# Verify not in git
git grep -i "sk-ant-"  # Should return nothing
git grep -i "eyJhbGci"  # Should return nothing
```

**Environment Files:**
```bash
# .gitignore should include:
.env
.env.local
.env.*.local
*.pem
*.key
*.pfx
credentials.json
service-account.json
```

### 7.6 Penetration Testing Checklist

Before launch, test for:
- [ ] SQL injection (all endpoints)
- [ ] XSS vulnerabilities (all inputs)
- [ ] CSRF (verify tokens on state-changing operations)
- [ ] Authentication bypass
- [ ] Authorization flaws (access other users' data)
- [ ] Rate limiting (brute force prevention)
- [ ] Secrets in frontend bundle
- [ ] Secrets in git history
- [ ] Open redirects
- [ ] Path traversal (file operations)
- [ ] Command injection (system commands)
- [ ] Session fixation
- [ ] Insecure dependencies (npm audit, Snyk)

**Time**: 4-5 hours

---

## Phase 8: Cloudflare Deployment 🚀

**Goal**: Live production deployment on Cloudflare infrastructure.

### 8.1 Pre-Deployment Checklist

- [ ] All builds passing
- [ ] Tests passing (if any)
- [ ] No secrets in code
- [ ] Environment variables documented
- [ ] Database migrations ready
- [ ] Admin panel working
- [ ] UI polished
- [ ] Security audit complete
- [ ] Rate limiting configured
- [ ] Error monitoring setup

### 8.2 Supabase Setup

```bash
# 1. Create project at supabase.com
# 2. Get credentials
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# 3. Push migrations
npx supabase link --project-ref xxx
npx supabase db push
```

### 8.3 Cloudflare Workers Deployment (API)

```bash
# 1. Login
wrangler login

# 2. Set secrets
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put RESEND_API_KEY
wrangler secret put RESEND_FROM_EMAIL
wrangler secret put WEB_APP_URL
wrangler secret put ANTHROPIC_API_KEY  # Optional

# 3. Deploy
wrangler deploy

# 4. Get URL
# https://comandr-api.workers.dev
```

### 8.4 Cloudflare Pages Deployment (Web Console)

**Option A: GitHub (Recommended)**
```bash
# 1. Push to GitHub
git add -A
git commit -m "feat: production-ready Comandr"
git push origin main

# 2. Connect at dash.cloudflare.com/pages
# 3. Configure:
# - Build command: cd apps/web-console && pnpm install && pnpm build
# - Build output: apps/web-console/dist
# - Environment variable: VITE_API_GATEWAY_URL=https://comandr-api.workers.dev

# 4. Deploy
# URL: https://comandr.pages.dev
```

**Option B: Direct Upload**
```bash
cd apps/web-console
VITE_API_GATEWAY_URL=https://comandr-api.workers.dev pnpm build
npx wrangler pages deploy dist --project-name=comandr
```

### 8.5 Desktop App Distribution

**macOS:**
```bash
cd apps/desktop-app
pnpm build:mac

# Output: release/Comandr-1.0.0.dmg
# Upload to website or GitHub Releases
```

**Windows:**
```bash
pnpm build:win

# Output: release/Comandr-Setup-1.0.0.exe
```

### 8.6 Custom Domain (Optional)

```bash
# If you have yourdomain.com:

# API: api.yourdomain.com
# 1. Add route in Cloudflare Workers
# 2. DNS: CNAME api -> comandr-api.workers.dev

# Web: app.yourdomain.com
# 1. Add custom domain in Cloudflare Pages
# 2. DNS auto-configured by Cloudflare
```

### 8.7 Monitoring Setup

**Cloudflare Analytics:**
- Workers → comandr-api → Analytics
- View requests, errors, CPU time

**Error Tracking:**
```typescript
// Add Sentry (optional)
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: "https://xxx@sentry.io/xxx",
  environment: "production",
});

// Catch errors
app.use((err, req, res, next) => {
  Sentry.captureException(err);
  res.status(500).json({ error: "Internal error" });
});
```

**Uptime Monitoring:**
- Use UptimeRobot or Pingdom
- Monitor: https://comandr-api.workers.dev/v1/health
- Alert on downtime

### 8.8 Post-Deployment Testing

```bash
# 1. API health
curl https://comandr-api.workers.dev/v1/health

# 2. Web console loads
open https://comandr.pages.dev

# 3. Sign up works
# 4. Email verification works
# 5. Login works
# 6. Desktop app connects
# 7. Commands execute
# 8. Admin panel accessible
```

**Time**: 2-3 hours

---

## 📊 Summary

| Phase | Task | Time | Priority |
|-------|------|------|----------|
| 1 | Complete renaming | 0.5h | P0 (blocker) |
| 2 | AI architecture reversal | 3h | P0 |
| 3 | Massive skillset expansion | 6h | P0 |
| 4 | Safety & permissions | 4h | P1 |
| 5 | Admin backend | 6h | P1 |
| 6 | UI overhaul | 10h | P1 |
| 7 | Security hardening | 5h | P0 |
| 8 | Cloudflare deployment | 3h | P0 |

**Total Estimated Time**: 35-40 hours
**Completion Target**: Production-ready enterprise platform

---

## 🎯 Success Criteria

Upon completion, Comandr will have:

✅ **Professional UI** - Looks like a million-pound product
✅ **Comprehensive Skills** - 500+ command patterns
✅ **Enterprise Security** - Fort Knox level protection
✅ **Smart Safety** - Only confirms truly dangerous operations
✅ **Admin Backend** - Full monitoring and management
✅ **24/7 Availability** - Cloud deployment, always online
✅ **Zero API Dependencies** - Works without AI (AI is optional fallback)
✅ **Cross-Platform** - Mac, Windows, Linux support
✅ **Production Deployed** - Live on Cloudflare

---

## 🚦 Next Steps

1. **Review this plan** - Any changes needed?
2. **Approve to proceed** - I'll execute in order
3. **Provide feedback** - After each phase if needed

Ready to start Phase 1 (finish renaming) and continue through all phases?
