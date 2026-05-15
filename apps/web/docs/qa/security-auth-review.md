# Leaxaro Auth — Security Review
**Date**: 2025  
**Scope**: Authentication, Authorization, Session Management, Input Validation, Rate Limiting  
**Framework**: OWASP Top 10 (2021), OWASP ASVS 4.0 Level 2

---

## OWASP Top 10 Coverage

### A01: Broken Access Control

| Check | Status | Notes |
|-------|--------|-------|
| Protected routes require auth | ✅ PASS | middleware.ts enforces |
| API routes check auth | ✅ PASS | requireAuth() on all protected endpoints |
| Legal pages accessible without auth | ✅ FIXED | STATIC_ROUTES in middleware |
| Role-based access (admin routes) | ⚠️ PARTIAL | Role in JWT but no admin routes yet |
| IDOR on notification IDs | ⚠️ CHECK | Verify user owns notification before update |
| JWT contains userId | ✅ PASS | Sub claim = userId |

### A02: Cryptographic Failures

| Check | Status | Notes |
|-------|--------|-------|
| Passwords hashed with bcrypt | ✅ PASS | BCRYPT_ROUNDS=12 |
| Bcrypt rounds sufficient (≥10) | ✅ PASS | 12 rounds |
| JWT signed with secret | ✅ PASS | AUTH_SECRET env |
| Tokens are random/unguessable | ✅ PASS | `crypto.randomBytes(32).toString('hex')` |
| No plaintext passwords in logs | ✅ PASS | logAuthEvent never logs passwords |
| HTTPS in production | ⚠️ INFRA | Verify TLS cert on hosting |
| Sensitive data in cookies | ✅ PASS | HttpOnly, Secure (prod) |

### A03: Injection

| Check | Status | Notes |
|-------|--------|-------|
| SQL injection via Prisma ORM | ✅ PASS | Parameterized queries always |
| XSS in name field | ✅ PASS | Regex validation rejects script chars |
| XSS in email field | ✅ PASS | Email format validation + ORM escaping |
| Email header injection | ✅ PASS | Resend SDK handles escaping |
| Log injection | ⚠️ CHECK | Ensure user input is quoted in pino logs |
| NoSQL injection | N/A | MySQL only |

### A04: Insecure Design

| Check | Status | Notes |
|-------|--------|-------|
| Email enumeration — registration | ✅ PASS | Generic error message |
| Email enumeration — login | ✅ PASS | Generic "invalid credentials" |
| Email enumeration — reset | ✅ PASS | Always 200 response |
| Email enumeration — resend | ✅ PASS | Always 200 response |
| Token timing attacks | ⚠️ RISK | Token comparison is DB lookup — timing may vary |
| Password reset flow — secure | ✅ PASS | Token = random hex, single-use |

### A05: Security Misconfiguration

| Check | Status | Notes |
|-------|--------|-------|
| Environment variables in repo | ✅ PASS | .env.local in .gitignore |
| VAPID private key server-only | ✅ PASS | Not NEXT_PUBLIC_ |
| Error messages leak internals | ✅ PASS | Generic messages to client |
| Database credentials exposed | ✅ PASS | Server-only |
| Debug mode in production | ⚠️ CHECK | Verify NODE_ENV=production |
| CORS configuration | ✅ PASS | Next.js default — same-origin |

### A06: Vulnerable Components

| Check | Status | Notes |
|-------|--------|-------|
| NextAuth beta.31 | ⚠️ RISK | Beta — check for security advisories |
| Prisma v5 | ✅ PASS | Stable, maintained |
| bcryptjs | ✅ PASS | Well-maintained |
| Dependencies up-to-date | ⚠️ CHECK | Run `npm audit` |

### A07: Auth & Session Management Failures

| Check | Status | Notes |
|-------|--------|-------|
| Open redirect via callbackUrl | ✅ FIXED | safeCallbackUrl() validates |
| Protocol-relative redirect | ✅ FIXED | `//evil.com` rejected |
| Session fixation | ✅ PASS | JWT rotated on each login |
| Session expires | ✅ PASS | JWT expiry configured |
| Logout invalidates session | ⚠️ PARTIAL | Client-side cookie deleted; server-side: no blocklist |
| Concurrent sessions | ⚠️ ACCEPTED | Multiple sessions allowed (JWT) |
| Suspended user with active JWT | ⚠️ RISK | JWT still valid until expiry |

### A08: Software and Data Integrity

| Check | Status | Notes |
|-------|--------|-------|
| Server Actions use CSRF protection | ✅ PASS | Next.js same-origin enforcement |
| Token integrity (signed JWT) | ✅ PASS | AUTH_SECRET sign |
| Supply chain — npm audit | ⚠️ CHECK | Run before production |

### A09: Security Logging & Monitoring

| Check | Status | Notes |
|-------|--------|-------|
| Login success logged | ✅ PASS | logAuthEvent('login.success') |
| Login failure logged | ✅ PASS | logAuthEvent('login.failed') with reason |
| Registration logged | ✅ PASS | logAuthEvent('register.success/failed') |
| Rate limit events logged | ⚠️ PARTIAL | Rate limit check doesn't log blocked attempts |
| Suspicious patterns alertable | ❌ MISSING | No alerting configured |
| Log sensitive data (passwords) | ✅ PASS | Never logged |
| Unverified email login logged | ✅ ADDED | Now logs with `emailVerified: false` meta |

### A10: Server-Side Request Forgery

| Check | Status | Notes |
|-------|--------|-------|
| External URLs from user input | ✅ PASS | safeCallbackUrl() blocks external |
| OAuth redirectURI validated | ⚠️ CHECK | Verify TP OAuth redirectURI whitelist |
| Webhook endpoints | N/A | No webhooks in auth flow |

---

## Detailed Security Analysis

### 1. Rate Limiting

**Current implementation**:
```typescript
rateLimits = {
  login: (key) => checkRateLimit({ key: `login:${key}`, limit: 5, windowMs: 15 * 60 * 1000 }),
  register: (key) => checkRateLimit({ key: `register:${key}`, limit: 3, windowMs: 60 * 60 * 1000 }),
  passwordReset: (key) => checkRateLimit({ key: `reset:${key}`, limit: 3, windowMs: 60 * 60 * 1000 }),
  emailVerify: (key) => checkRateLimit({ key: `verify:${key}`, limit: 5, windowMs: 60 * 60 * 1000 }),
}
```

**Issues**:
- ❌ In-memory: resets on restart, breaks in multi-instance
- ✅ resend-verification now uses `emailVerify` bucket (fixed in ETAP 7)
- ❌ No distributed rate limiting (Redis)
- ⚠️ Rate limit key is IP only — not IP + email combo

**Recommendations**:
1. Add Redis backend for production
2. Consider IP + email combined key for password reset
3. Log blocked attempts with `logAuthEvent('ratelimit.blocked', { endpoint, ip })`

### 2. Token Security

**Verification token format**:
```
identifier: "verify:user@example.com"
token: "<64 hex chars from crypto.randomBytes(32)>"
expires: now + 24h
```

**Strengths**:
- Random token (256 bits) — cryptographically secure
- Single-use (deleted on first use)
- 24h TTL
- Compound unique index prevents duplicate tokens

**Risks**:
- Token in URL → stored in browser history and server logs
- Mitigation: Use POST for actual verification (see UX audit)
- DB timing: `findFirst` before compare — timing side-channel unlikely but notable

### 3. Session Security

**JWT claims**:
```typescript
{
  id: userId,
  email,
  name,
  role,
  status,
  emailVerified,     // Added in ETAP 7 audit
  onboardingCompleted,
  iat, exp
}
```

**Cookie settings** (NextAuth defaults):
- `HttpOnly: true`
- `Secure: true` (in production)
- `SameSite: lax`
- `Path: /`

**Risks**:
- JWT contains user state — stale after role/status change
- No server-side session invalidation (JWT-based)
- **Recommendation**: Add `status` re-check in session callback (DB read per request)

### 4. Password Policy

**Current requirements** (from validators/auth.ts):
- Minimum 8 characters
- At least 1 uppercase
- At least 1 lowercase  
- At least 1 digit
- At least 1 special character

**Assessment**: Strong. NIST SP 800-63B compliant.

**Recommendations**:
- Add common password check (HaveIBeenPwned API) — post-MVP
- Consider max length (currently no max, bcrypt truncates at 72 chars)

### 5. Input Validation

**Name field** (fixed):
```regex
^[A-Za-zÀ-ÖØ-öø-ÿĄąĆćĘęŁłŃńÓóŚśŹźŻż\s\-']+$
```
Now accepts Polish chars, spaces, hyphens, apostrophes (O'Brien).  
Max length: 50 chars (client-side) — also enforce server-side.

**Email field**:
- Format validation: Zod `z.string().email()`
- Max length: 254 chars (RFC 5321)
- Normalized to lowercase

**Password field**:
- Strength checked client-side
- Bcrypt handles server-side with 12 rounds

### 6. Open Redirect (FIXED)

**Fix location**: `apps/web/src/components/auth/LoginForm.tsx`

```typescript
function safeCallbackUrl(raw: string | null): string {
  if (!raw) return '/dashboard'
  const decoded = decodeURIComponent(raw)
  // Must be relative path starting with /
  if (decoded.startsWith('/') && !decoded.startsWith('//') && !decoded.includes('://')) {
    return decoded
  }
  return '/dashboard'
}
```

**Blocked patterns**:
- `https://evil.com` — contains `://`
- `//evil.com` — starts with `//`
- `javascript:alert(1)` — contains `://`
- `` `data:text/html,...` `` — contains `://`

**Allowed patterns**:
- `/dashboard` ✅
- `/settings?tab=push` ✅
- `/onboarding` ✅

### 7. Security Headers (Recommended)

Add to `next.config.ts`:
```typescript
headers: async () => [{
  source: '/(.*)',
  headers: [
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" },
  ],
}]
```

Note: CSP with `unsafe-inline` due to Next.js — use nonces in production.

---

## Security Checklist — Pre-Production

- [ ] `npm audit` — zero critical vulnerabilities
- [ ] Switch rate limiter to Redis
- [ ] Add security headers (X-Frame-Options, CSP, etc.)
- [ ] Verify HTTPS / TLS in production
- [ ] Rotate AUTH_SECRET in production (use new random value)
- [ ] Verify DATABASE_URL not in source control
- [ ] Test open redirect fix with /auth/login?callbackUrl=//evil.com
- [ ] Verify VAPID_PRIVATE_KEY not in page source
- [ ] Add log alerting for brute-force patterns
- [ ] Review NextAuth beta.31 security advisories
- [ ] Add status re-check in session callback
- [ ] Server-side name length validation (max 50)
- [ ] Add max password length (72 bcrypt chars)
- [ ] Verify SameSite=lax doesn't break OAuth flow

---

## Risk Register

| Risk | Likelihood | Impact | Residual Risk | Mitigation |
|------|-----------|--------|---------------|-----------|
| Rate limit bypass (multi-instance) | HIGH | HIGH | HIGH | Migrate to Redis before scale |
| Stale JWT after status change | MEDIUM | HIGH | MEDIUM | Add session callback check |
| Email pre-fetch consumes token | HIGH | MEDIUM | MEDIUM | POST-redirect pattern |
| NextAuth beta vulnerability | LOW | HIGH | LOW | Monitor advisories |
| In-memory rate limit reset on deploy | MEDIUM | MEDIUM | LOW | Acceptable in single-instance |
| Log injection | LOW | LOW | LOW | Quote user input in logs |
