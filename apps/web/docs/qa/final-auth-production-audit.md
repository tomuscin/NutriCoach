# Leaxaro Auth — Final Production Audit
**Date**: 2025  
**Auditor**: Automated QA Pass (ETAP 7 + ETAP 8)  
**Scope**: Registration → Email Verify → Login → Onboarding → Settings → Push → TP Integration  
**Verdict**: CONDITIONAL PASS — 2 pre-production blockers remain

---

## Executive Summary

The Leaxaro authentication system underwent a comprehensive end-to-end audit covering security, UX, mobile ergonomics, runtime reliability, and code correctness. **8 bugs were found and fixed** during this audit — including 2 critical security/correctness issues that would have prevented email verification from working entirely.

The system is **solid in its architectural choices** (NextAuth v5 JWT, Prisma ORM, bcrypt-12, Resend email, VAPID push) and **ready for single-instance production** with 2 blockers addressed pre-launch.

---

## Production Readiness Scores

| Dimension | Score | Grade | Notes |
|-----------|-------|-------|-------|
| **Overall** | **74/100** | C+ | Conditional pass |
| Security | 78/100 | B- | Open redirect fixed; rate limit needs Redis |
| UX | 65/100 | C+ | Core flows work; email pre-fetch UX risk |
| Mobile | 72/100 | C+ | Touch targets ok; safe-area needs check |
| Reliability | 70/100 | C+ | Single-instance ok; multi-instance risk |
| Code Quality | 85/100 | B+ | Clean architecture, good separation |
| Observability | 75/100 | B- | Analytics events in place; alerting missing |

---

## Critical Bugs Fixed (This Audit)

### BUG-01 — Email Verification Completely Broken (CRITICAL)
**Severity**: Production blocker  
**Location**: `src/lib/services/register.ts`  
**Root cause**: Token created with `identifier: email` but consumed with `identifier: { startsWith: 'verify:' }` — identifier mismatch meant no token would ever be found  
**Fix**: Changed to `` identifier: `verify:${email}` `` in both `deleteMany` and `create` calls  
**Status**: FIXED ✅

### BUG-02 — Open Redirect via callbackUrl (CRITICAL SECURITY)
**Severity**: A01 OWASP — Broken Access Control  
**Location**: `src/components/auth/LoginForm.tsx`  
**Root cause**: `router.push(decodeURIComponent(callbackUrl))` with no validation — any URL could be injected via `?callbackUrl=https://evil.com`  
**Fix**: Added `safeCallbackUrl()` — validates relative path, blocks `://` and `//` prefix  
**Status**: FIXED ✅

### BUG-03 — Legal Pages Inaccessible (HIGH)
**Severity**: UX + compliance blocker  
**Location**: `src/middleware.ts`  
**Root cause**: `/terms`, `/privacy`, `/health-disclaimer` not in public routes — unauthenticated users got 401, authenticated users got redirected to dashboard  
**Fix**: Added `STATIC_ROUTES` + `isStaticRoute()` — legal pages bypass all auth redirects  
**Status**: FIXED ✅

### BUG-04 — Onboarding Progress Reset on Refresh (HIGH)
**Severity**: Data loss / UX degradation  
**Location**: `OnboardingWizard.tsx` + `onboarding/page.tsx`  
**Root cause**: `useState(0)` always reset to step 0 regardless of DB state  
**Fix**: Added `initialStep?: number` prop, DB fetch in page.tsx passes saved step, value clamped with `Math.min(Math.max(initialStep, 0), STEPS.length - 2)`  
**Status**: FIXED ✅

### BUG-05 — Name Regex Rejected Apostrophes (MEDIUM)
**Severity**: Registration broken for O'Brien, D'Angelo, etc.  
**Location**: `src/lib/validators/auth.ts`  
**Fix**: Added `'` to name regex character class  
**Status**: FIXED ✅

### BUG-06 — Generic Password Error, No Specific Feedback (MEDIUM)
**Severity**: UX — users don't know which password requirement fails  
**Location**: `src/components/auth/RegisterForm.tsx`  
**Fix**: Added per-requirement analysis: "Uzupełnij: Wielka litera, Znak specjalny"  
**Status**: FIXED ✅

### BUG-07 — Double-Submit Possible on Registration (MEDIUM)
**Severity**: Potential duplicate registrations, UX confusion  
**Location**: `src/components/auth/RegisterForm.tsx`  
**Fix**: Added `if (isPending || success) return` guard at top of `handleSubmit`; also added email trim+lowercase, name trim  
**Status**: FIXED ✅

### BUG-08 — resend-verification Used Wrong Rate Limit Bucket (MEDIUM)
**Severity**: Cross-contamination — password reset attempts counted against email resend  
**Location**: `src/app/api/auth/resend-verification/route.ts`  
**Fix**: Changed to `rateLimits.emailVerify(ip)` — uses dedicated bucket  
**Status**: FIXED ✅

---

## Pre-Production Blockers

### BLOCKER-1: In-Memory Rate Limiting (CRITICAL for multi-instance)
**Risk**: On Vercel, Railway, or any multi-instance deploy, each process has independent rate limit store → attacker gets N×limit attempts across N instances  
**Action required**: Migrate to Redis-backed rate limiting before scaling past 1 instance  
**Effort**: 4-8h  
**Workaround for single instance**: Acceptable in MVP

### BLOCKER-2: Email Pre-Fetch Consumes Verification Token
**Risk**: Outlook, Gmail, iOS Mail pre-fetch links for safety scanning → token consumed before user clicks  
**Impact**: Users who use affected email clients will always see "invalid token" error  
**Action required**: Implement GET-shows-confirmation, POST-verifies pattern  
**Effort**: 4-6h  
**Workaround**: None — affects significant % of users

---

## Top Security Issues

| Issue | Status | Action |
|-------|--------|--------|
| Open redirect | ✅ FIXED | safeCallbackUrl() |
| SQL injection | ✅ PROTECTED | Prisma parameterized |
| Email enumeration (all endpoints) | ✅ PROTECTED | Generic responses |
| Brute force login | ✅ PROTECTED | 5/15min rate limit |
| Token replay | ✅ PROTECTED | Single-use tokens |
| In-memory rate limit | ⚠️ RISK | Redis pre-scale |
| Stale JWT after status change | ⚠️ RISK | Add session callback check |
| No security headers | ⚠️ MISSING | Add X-Frame, CSP, etc. |
| NextAuth beta.31 | ⚠️ MONITOR | Check advisories |

---

## Top UX Issues

| Issue | Severity | Effort |
|-------|---------|--------|
| Email pre-fetch token problem | HIGH | Medium |
| No "check spam" hint | MEDIUM | Trivial |
| Loading states on forms | MEDIUM | Low |
| Expired token → no resend CTA | MEDIUM | Low |
| TP step: no guidance for non-TP users | MEDIUM | Low |
| Bottom nav safe area (iOS) | MEDIUM | Low |
| No verification pending banner on login | HIGH | Medium |

---

## Top Runtime Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Resend API down post-registration | MEDIUM | HIGH | Resend endpoint exists; add UI hint |
| Rate limit bypass multi-instance | HIGH (if scaled) | HIGH | Redis migration |
| Stale JWT (role/status change) | LOW | MEDIUM | Session callback |
| Push subscription stale (410) | MEDIUM | LOW | Cleanup on 410 |
| Concurrent registration same email | LOW | LOW | Prisma unique constraint |

---

## Remaining Technical Debt

| Item | Priority | Notes |
|------|---------|-------|
| Redis rate limiting | P1 | Before multi-instance |
| POST-redirect for email verify | P1 | Email client compat |
| Security response headers | P1 | Standard web security |
| Session callback role/status check | P2 | Stale JWT risk |
| Push subscription cleanup (410) | P2 | Stale subscription cleanup |
| Password max length (72 bcrypt) | P2 | Document/enforce |
| Common password check (HaveIBeenPwned) | P3 | Post-MVP |
| Social login (Google/Apple) | P3 | NextAuth already supports |
| Playwright test DB seeding | P2 | For full E2E coverage |

---

## Observability Coverage

Events now tracked in production:

| Event | Trigger | Status |
|-------|---------|--------|
| `registration.completed` | registerUser() success | ✅ |
| `email.verification.sent` | After register | ✅ ADDED |
| `email.verification.completed` | verify-email API | ✅ |
| `onboarding.started` | First visit to /onboarding | ✅ ADDED |
| `onboarding.step_completed` | Per step save | ✅ |
| `onboarding.completed` | Final step | ✅ |
| `tp.connect.started` | TP connect flow | ✅ |
| `tp.connect.completed` | After OAuth | ✅ |
| `push.subscribed` | subscribe API | ✅ ADDED |
| `push.denied` | Client-side (if tracked) | ⚠️ Partial |
| `session.started` | Login | ⚠️ Missing |
| `login.success` | Auth logger (not analytics) | ⚠️ Partial |

**Missing analytics events**:
- `registration.started` — client-side, add in RegisterForm
- `login.started` + `login.failed` — move from auth-logger to analytics
- `push.denied` — client-side browser event

---

## Recommended Next Sprint

### Sprint: Pre-Production Hardening

**Must-have (P0)**:
1. Fix email pre-fetch verification (POST-redirect pattern) — 4h
2. Add security headers in next.config.ts — 1h
3. Add `npm audit` CI gate — 30min

**Should-have (P1)**:
4. Add Redis rate limiting (Upstash or Railway Redis) — 6h
5. Add email verification pending banner on login page — 2h
6. Add loading states to all auth forms — 2h

**Nice-to-have (P2)**:
7. Session callback adds status re-check — 2h
8. Push subscription 410 cleanup — 2h
9. Playwright DB seeding for full E2E — 4h

---

## Pre-Production Checklist

### Security
- [ ] `npm audit` — zero critical/high
- [ ] Security headers added (X-Frame-Options, CSP, X-Content-Type-Options)
- [ ] AUTH_SECRET rotated (new random value in production)
- [ ] DATABASE_URL not in source control (verified)
- [ ] VAPID_PRIVATE_KEY confirmed server-only
- [ ] Open redirect fix tested: `/auth/login?callbackUrl=https://evil.com` → dashboard
- [ ] Protocol-relative redirect tested: `?callbackUrl=//evil.com` → dashboard
- [ ] Rate limiting Redis backend configured OR single-instance deploy confirmed

### Functionality
- [ ] Registration → email → verify → login full flow tested in staging
- [ ] Password reset full flow tested
- [ ] Onboarding wizard step persistence confirmed
- [ ] TrainingPeaks OAuth callback tested (or skipped if not ready)
- [ ] Push subscribe/unsubscribe tested on real device
- [ ] Terms, Privacy, Health Disclaimer pages accessible without login

### Infrastructure
- [ ] HTTPS/TLS confirmed on hosting
- [ ] `NODE_ENV=production` set
- [ ] `NEXT_PUBLIC_APP_URL` set to production domain
- [ ] Resend API key for production domain (verified sender)
- [ ] MySQL accessible from production server
- [ ] Connection pool configured appropriately

### Monitoring
- [ ] Error tracking (Sentry or equivalent) configured
- [ ] Analytics DB queryable
- [ ] Log aggregation accessible
- [ ] Resend quota monitored

### Playwright E2E
- [ ] register.spec.ts — all critical tests pass
- [ ] login.spec.ts — open redirect tests pass
- [ ] session.spec.ts — all protected routes verified
- [ ] email-verification.spec.ts — rate limit test passes
- [ ] mobile-auth.spec.ts — touch targets pass

---

## Files Modified in This Audit

| File | Change | Bug Fixed |
|------|--------|-----------|
| `src/lib/services/register.ts` | Token identifier prefix fix | BUG-01 |
| `src/components/auth/LoginForm.tsx` | safeCallbackUrl() open redirect fix | BUG-02 |
| `src/middleware.ts` | STATIC_ROUTES + isStaticRoute() | BUG-03 |
| `src/components/onboarding/OnboardingWizard.tsx` | initialStep prop + clamp | BUG-04 |
| `src/app/onboarding/page.tsx` | DB fetch + prop pass + telemetry | BUG-04 |
| `src/lib/validators/auth.ts` | Name regex apostrophe | BUG-05 |
| `src/components/auth/RegisterForm.tsx` | Specific errors, double-submit, normalization | BUG-06/07 |
| `src/app/api/auth/resend-verification/route.ts` | emailVerify rate limit bucket | BUG-08 |
| `src/lib/auth.ts` | emailVerified in select + JWT + login logging | Observability |
| `src/app/api/push/subscribe/route.ts` | push.subscribed event | Observability |
| `src/lib/services/register.ts` | email.verification.sent event | Observability |

## Files Created in This Audit

| File | Purpose |
|------|---------|
| `playwright.config.ts` | Playwright E2E configuration |
| `e2e/helpers.ts` | Shared test utilities |
| `e2e/auth/register.spec.ts` | Registration E2E tests |
| `e2e/auth/login.spec.ts` | Login E2E tests |
| `e2e/auth/email-verification.spec.ts` | Verification E2E tests |
| `e2e/auth/reset-password.spec.ts` | Password reset E2E tests |
| `e2e/auth/onboarding.spec.ts` | Onboarding E2E tests |
| `e2e/auth/session.spec.ts` | Session management E2E tests |
| `e2e/auth/notifications.spec.ts` | Notifications E2E tests |
| `e2e/auth/push.spec.ts` | Push notifications E2E tests |
| `e2e/auth/mobile-auth.spec.ts` | Mobile E2E tests |
| `e2e/auth/integrations.spec.ts` | TrainingPeaks E2E tests |
| `docs/qa/auth-e2e-test-matrix.md` | Full test matrix (12 areas, ~80 scenarios) |
| `docs/qa/runtime-failures.md` | Runtime failure analysis |
| `docs/qa/ux-auth-audit.md` | UX audit (50+ findings) |
| `docs/qa/security-auth-review.md` | OWASP-aligned security review |
| `docs/qa/final-auth-production-audit.md` | This document |
