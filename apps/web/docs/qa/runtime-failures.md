# Leaxaro Auth — Runtime Failures Analysis
**Date**: 2025  
**Scope**: Auth flow runtime risks, failure modes, chaos scenarios, race conditions  
**Status**: Pre-production review

---

## Executive Summary

The auth system is fundamentally sound but has known runtime risks in 3 categories:
1. **Infrastructure failures** — Resend, DB, VAPID — all single points of failure
2. **Concurrency hazards** — In-memory rate limiting breaks in multi-instance deploys
3. **Edge cases** — Token race conditions, session corruption, stale DB states

---

## 1. Email Delivery Failures (Resend)

### Scenario: Resend API down during registration
**Impact**: User registered in DB but email not sent → user can't verify, doesn't know what happened  
**Current behavior**: `register.ts` calls `sendVerificationEmail()`, error is caught but registration still succeeds  
**Risk**: HIGH — user stuck, no retry mechanism

```typescript
// Current: fire-and-forget email
const emailResult = await sendVerificationEmail(email, verificationUrl)
if (!emailResult.success) {
  logger.error({ email }, 'Failed to send verification email')
  // User already created — can resend via /api/auth/resend-verification
}
```

**Mitigation**:
- ✅ `/api/auth/resend-verification` endpoint exists (users can retry)
- ❌ No UI prompt after registration failure ("email might be delayed")
- ❌ No email delivery retry queue
- **Recommended**: Show banner "If you don't receive email in 5 minutes, click here to resend"

### Scenario: Resend rate limit exceeded
**Impact**: All verification emails blocked for entire account  
**Risk**: HIGH in burst registration periods (promotion/launch)  
**Recommended**: Monitor Resend quota, add alert at 80% usage

---

## 2. Database Failures

### Scenario: MySQL connection timeout during login
**Current**: Prisma throws `PrismaClientKnownRequestError` — caught by NextAuth, returns null (treated as wrong password)  
**Impact**: Users can't log in but see generic error — may think password is wrong  
**Risk**: HIGH — affects all users during DB downtime

### Scenario: MySQL slow query during registration
**BCRYPT_ROUNDS=12 timing**: `bcrypt.hash()` takes ~300ms. DB write takes ~50ms. Total: ~350ms acceptable.  
**Risk**: LOW — within normal bounds

### Scenario: Concurrent registration same email
**Race**: Two requests with same email hit `findUnique` simultaneously — both return null → both try to create → one gets unique constraint violation  
**Current**: Prisma unique constraint on `email` field → second request throws P2002  
**Current handling**: Caught and returns generic "registration failed" error  
**Risk**: MEDIUM — user sees error but can retry  
**Recommended**: Return specific "email taken" without leaking (current behavior is already safe)

### Scenario: DB connection pool exhaustion
**Config**: Prisma default pool (10 connections)  
**Risk**: MEDIUM under high load — new connections queue, timeout after 10s  
**Recommended**: Set `connection_limit` in DATABASE_URL and add connection pool monitoring

---

## 3. Rate Limiter — In-Memory Single Instance

### Critical Risk: Multi-instance deploy
The rate limiter uses an in-memory `Map` at module level:
```typescript
const store = new Map<string, RateLimitEntry>()
```

**Problem**: Each process has its own store. On Vercel/Railway with 2+ instances:
- Attacker gets 5 attempts per instance = 10+ on 2 instances
- Rate limit is effectively N × limit on N instances

**Current**: Acceptable for single-instance dev/staging  
**Production**: MUST switch to Redis-backed rate limiting before public launch

**Recommended**:
```typescript
// ETAP: Add Redis backend when REDIS_URL is set
const limit = await checkRateLimit({
  backend: process.env.REDIS_URL ? 'redis' : 'memory',
  key: `login:${ip}`,
  limit: 5,
  windowMs: 15 * 60 * 1000,
})
```

### Rate limit resets on restart
**Impact**: All rate limits cleared on every deploy  
**Risk**: Attacker brute-forces, rate limit kicks in, waits for deploy, resumes  
**Risk Level**: LOW — unlikely in practice, but notable

---

## 4. Token Race Conditions

### Scenario: Verify email token — double tap on link
**Flow**: User clicks "Verify email" twice (mobile double-tap or email client pre-fetch)  
**Risk**: First request deletes token and verifies. Second request finds no token → error shown  
**Current behavior**: `verify-email/route.ts` checks `user.emailVerified` first → idempotent  
```typescript
if (user.emailVerified) {
  return NextResponse.json({ ok: true, message: 'Already verified' })
}
```
**Status**: HANDLED ✅

### Scenario: Email client pre-fetches verification link
**Many email clients** (Outlook, Gmail) pre-fetch links in emails for safety scanning  
**Impact**: Link consumed before user clicks it → "token not found" when user actually clicks  
**Risk**: HIGH — common real-world failure  
**Mitigation**: Consider `POST` redirect pattern (GET shows confirmation, POST actually verifies)  
**Current**: GET verifies immediately — vulnerable to prefetch

### Scenario: Old verification tokens not cleaned up
**Current**: `register.ts` does `deleteMany` for `identifier: verify:${email}` before creating new token  
**Status**: HANDLED ✅ — old tokens cleaned on each new registration/resend

---

## 5. Session Edge Cases

### Scenario: JWT token with stale user data
**Risk**: User role changed in DB, but JWT still carries old role → wrong authorization  
**Impact**: MEDIUM — JWT default lifetime is 30 days  
**Mitigation**: Use session callbacks to re-fetch role from DB on each request  
**Current**: Role baked into JWT at login — no refresh unless user logs out/in

### Scenario: Deleted user with active session
**Risk**: User deleted from DB but JWT still valid  
**Current**: `status === 'DELETED'` check only at login — active sessions not invalidated  
**Recommended**: Check status in `session` callback (performance cost: DB read per request)

### Scenario: Cookie flags
**Recommended production settings**:
- `Secure: true` (HTTPS only) — ✅ NextAuth default in production
- `HttpOnly: true` — ✅ NextAuth default
- `SameSite: lax` — ✅ NextAuth default
- **Verify**: `SameSite=strict` may break OAuth redirects

---

## 6. Onboarding Race Conditions

### Scenario: User submits step data while navigating back
**Risk**: Stale step data saved if user clicks "Back" during network request  
**Current**: Each step calls API on `Next` click — no optimistic update  
**Status**: LOW RISK — API is idempotent (saves step number)

### Scenario: Duplicate API calls on step advance
**Risk**: User clicks "Next" twice → two concurrent PATCH requests  
**Recommended**: Disable button during pending state (check current implementation)

---

## 7. Push Notification Failures

### Scenario: VAPID subscription expired on push server
**Impact**: Push delivery fails silently  
**Current**: No retry or dead-subscription cleanup  
**Recommended**: Handle `410 Gone` from push server → delete subscription from DB

### Scenario: Device unsubscribed externally (user revoked in browser settings)
**Impact**: Endpoint returns 404 on push attempt  
**Recommended**: Cleanup stale subscriptions on 404/410 response

---

## 8. OpenAI / External AI Failures

*(Not in current scope — no AI in auth flow)*

---

## 9. Observed Runtime Errors (from code analysis)

| Error | Location | Risk | Status |
|-------|---------|------|--------|
| `Cannot read property 'id' of null` | push/subscribe if session null | MEDIUM | Check requireAuth() |
| Token identifier mismatch | register.ts → verify-email | CRITICAL | FIXED ✅ |
| Open redirect callbackUrl | LoginForm.tsx | CRITICAL | FIXED ✅ |
| Legal routes unauthenticated 401 | middleware.ts | HIGH | FIXED ✅ |
| Onboarding step reset on refresh | OnboardingWizard.tsx | HIGH | FIXED ✅ |
| Name apostrophe rejected | validators/auth.ts | MEDIUM | FIXED ✅ |
| Double submit registration | RegisterForm.tsx | MEDIUM | FIXED ✅ |
| resend-verification wrong rate limit bucket | resend-verification/route.ts | MEDIUM | FIXED ✅ |

---

## 10. Chaos Testing Checklist

| Scenario | How to Test | Expected |
|----------|------------|----------|
| DB timeout | `KILL` MySQL connection mid-request | Graceful error, no crash |
| Resend API down | Mock Resend to throw | Registration succeeds, email warning |
| High load (100 concurrent regs) | `ab -n 100 -c 20 /api/auth/register` | Rate limiting, no DB corruption |
| Rate limit bypass (distributed) | Multiple IPs | Each IP tracked independently |
| Clock skew | Change server time by 1h | Token expiry still correct |
| Crash mid-registration | Kill process between createUser and sendEmail | Orphaned user — can resend verify |

---

## Priority Actions (Pre-Production)

1. **CRITICAL**: Switch rate limiter to Redis before multi-instance deploy
2. **HIGH**: Add email verification pre-fetch protection (POST-redirect pattern)  
3. **HIGH**: Add role/status re-check in session callback
4. **MEDIUM**: Add Resend quota monitoring + alerts
5. **MEDIUM**: Handle push subscription cleanup (410/404)
6. **LOW**: Add connection pool config + monitoring
