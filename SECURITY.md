# Comandr Security Documentation

## Security Measures Implemented

### 1. Authentication & Authorization
- ✅ JWT-based authentication
- ✅ Password hashing with bcrypt
- ✅ Email verification required
- ✅ Secure password reset flow
- ✅ Token expiration (7 days)
- ✅ Row Level Security (RLS) in Supabase

### 2. API Security
- ✅ CORS restricted to known origins
- ✅ Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- ✅ HTTPS enforcement (Strict-Transport-Security)
- ✅ API versioning (/v1/*)
- ✅ Input validation with Zod schemas
- ✅ Global exception handling

### 3. Database Security
- ✅ Supabase Row Level Security (RLS) enabled
- ✅ Parameterized queries (no SQL injection)
- ✅ Service role key never exposed to frontend
- ✅ Anon key used for client-side (limited permissions)

### 4. Secrets Management
- ✅ All secrets in environment variables
- ✅ .env files in .gitignore
- ✅ Cloudflare Workers secrets (encrypted)
- ✅ No secrets in frontend bundle
- ✅ No secrets in git history

### 5. Frontend Security
- ✅ No API keys in client code
- ✅ Content Security Policy headers
- ✅ XSS protection
- ✅ React auto-escaping
- ✅ HTTPS only in production

### 6. Desktop App Security
- ✅ Code bundled in ASAR (obfuscated)
- ✅ No sensitive logic in renderer process
- ✅ Context isolation enabled
- ✅ Node integration disabled in renderer
- ✅ Tokens stored in system keychain (not plaintext)
- ✅ Sandbox enabled for renderer process

### 7. Command Execution Security
- ✅ Risk level classification (safe/warning/danger/critical)
- ✅ Confirmation required for dangerous operations
- ✅ Liability acceptance for critical operations
- ✅ Command audit logging
- ✅ User-specific execution (no privilege escalation)

## Security Checklist for Deployment

### Before Going Live
- [ ] All environment variables set in Cloudflare Workers
- [ ] CORS origins restricted to production domains only
- [ ] Supabase RLS policies verified and tested
- [ ] No console.log with sensitive data
- [ ] Rate limiting configured
- [ ] SSL/TLS certificates valid
- [ ] Security headers verified (securityheaders.com)
- [ ] Dependencies scanned for vulnerabilities (npm audit)
- [ ] No hardcoded secrets in code
- [ ] .env files not committed to git
- [ ] Production builds don't include source maps

### Regular Security Maintenance
- [ ] Update dependencies monthly
- [ ] Review audit logs weekly
- [ ] Rotate API keys every 90 days
- [ ] Monitor for suspicious activity
- [ ] Keep Supabase and Cloudflare updated
- [ ] Review and update RLS policies

## Threat Model

### Protected Against
✅ SQL Injection - Parameterized queries only
✅ XSS - React escaping + CSP headers
✅ CSRF - SameSite cookies + origin checks
✅ Clickjacking - X-Frame-Options: DENY
✅ MIME sniffing - X-Content-Type-Options
✅ Credentials exposure - Env vars + gitignore
✅ Session hijacking - Secure cookies + HTTPS
✅ Mass assignment - Explicit parameter validation
✅ Path traversal - Input validation on file paths
✅ Command injection - Parameterized execution

### Mitigated
⚠️ Rate limiting - Cloudflare automatic + app-level limits
⚠️ DDoS - Cloudflare protection
⚠️ Brute force - Rate limiting on auth endpoints

### Out of Scope (User Responsibility)
❌ Physical access to user's machine
❌ Malware on user's computer
❌ Compromised user credentials
❌ Social engineering

## Incident Response

If you discover a security vulnerability:

1. **DO NOT** open a public GitHub issue
2. Email: security@yourdomain.com (set this up)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Security Best Practices for Contributors

1. Never commit secrets (API keys, passwords, tokens)
2. Always validate user input
3. Use parameterized queries (never string concatenation)
4. Escape output in HTML contexts
5. Use HTTPS in all environments except localhost
6. Review security headers in responses
7. Test authentication flows thoroughly
8. Document any security-related decisions

## Security Tools

```bash
# Scan for vulnerabilities
pnpm audit

# Fix automatically
pnpm audit fix

# Check for secrets in code
git secrets --scan

# Test security headers
curl -I https://comandr-api.workers.dev
```

## Compliance

- ✅ GDPR-ready (data export, deletion, consent)
- ✅ Password requirements met
- ✅ Audit logging in place
- ✅ Data encryption at rest (Supabase)
- ✅ Data encryption in transit (HTTPS)

## Security Hardening Roadmap

Future improvements:
- [ ] 2FA/MFA support
- [ ] OAuth providers (Google, GitHub)
- [ ] IP whitelisting for admin panel
- [ ] Webhook signature verification
- [ ] Content Security Policy in web console
- [ ] Subresource Integrity (SRI) for CDN resources
- [ ] Security.txt file
- [ ] Bug bounty program

---

**Last Updated**: 2026-07-12
**Security Contact**: TBD
**Responsible Disclosure**: Via email only
