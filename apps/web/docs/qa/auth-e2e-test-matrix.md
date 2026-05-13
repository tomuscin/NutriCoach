# NutriCoach Auth — E2E Test Matrix
**Scope**: Authentication, Email Verification, Password Reset, Onboarding, Sessions, Push, Notifications, Integrations  
**Environment**: Local dev (port 3100), MySQL 8 (webd.pl), Resend email  
**Coverage**: Functional, Security, UX, Mobile, Edge Cases

---

## Severity Legend
| Severity | Meaning |
|----------|---------|
| CRITICAL | Production blocker — data loss / security breach / auth broken |
| HIGH | Major functionality broken — must fix before launch |
| MEDIUM | Degraded UX — workaround exists but affects trust |
| LOW | Polish / edge case — nice to fix |

---

## Area 1: REGISTRATION

| # | Scenario | Expected Result | Severity | Spec File |
|---|----------|----------------|----------|-----------|
| R-01 | Valid name, email, password, terms checked | Account created, success state shown, redirect to login | CRITICAL | register.spec.ts |
| R-02 | Email already registered | Generic error (no "email already exists" leak) | CRITICAL | register.spec.ts |
| R-03 | Password < 8 chars | Strength meter shows "Słabe", submit blocked | HIGH | register.spec.ts |
| R-04 | Password missing special char | Specific hint: "Uzupełnij: Znak specjalny" | MEDIUM | register.spec.ts |
| R-05 | Password missing uppercase | Specific hint: "Uzupełnij: Wielka litera" | MEDIUM | register.spec.ts |
| R-06 | Passwords don't match | "Hasła muszą być identyczne" on confirm field | HIGH | register.spec.ts |
| R-07 | Terms not accepted | Terms error shown, submit blocked | HIGH | register.spec.ts |
| R-08 | XSS in name field | Input rejected by name regex, no script execution | CRITICAL | register.spec.ts |
| R-09 | SQL injection in email | Format validation rejects — Prisma parameterized anyway | CRITICAL | register.spec.ts |
| R-10 | Name > 50 chars | Client-side length validation error | MEDIUM | register.spec.ts |
| R-11 | Email > 254 chars | Client-side length validation error | MEDIUM | register.spec.ts |
| R-12 | Double-click submit | Only one registration attempt sent (guard in handleSubmit) | HIGH | register.spec.ts |
| R-13 | Unicode name (Łukasz Żółtowski) | Accepted — regex includes Polish chars | MEDIUM | register.spec.ts |
| R-14 | Apostrophe in name (O'Brien) | Accepted — regex fixed in ETAP 7 | MEDIUM | register.spec.ts |
| R-15 | Emoji in name | Rejected by name regex | LOW | register.spec.ts |
| R-16 | Terms links clickable | Opens /terms and /privacy without auth redirect | MEDIUM | register.spec.ts |
| R-17 | Email whitespace trimmed | Leading/trailing spaces removed before submission | MEDIUM | register.spec.ts |
| R-18 | Email uppercased | Normalized to lowercase before API call | MEDIUM | register.spec.ts |
| R-19 | Rate limit: 3 regs/hour/IP | 4th attempt returns 429 | HIGH | register.spec.ts |
| R-20 | Slow network (throttle 3G) | Loading state shown on submit button, no double submit | MEDIUM | register.spec.ts |

**Repro Steps (R-01)**:
1. Navigate to /auth/register
2. Fill name="Jan Kowalski", email=(unique), password="ValidPass1!", confirm="ValidPass1!"
3. Check terms checkbox
4. Click "Zarejestruj się"
5. Expect: success message visible, redirect to /auth/login?registered=1

**Runtime Dependencies**: Resend API (email), MySQL (user create), BCRYPT_ROUNDS=12

---

## Area 2: EMAIL VERIFICATION

| # | Scenario | Expected Result | Severity | Spec File |
|---|----------|----------------|----------|-----------|
| EV-01 | Valid token, unexpired | Account marked emailVerified, redirect to login | CRITICAL | email-verification.spec.ts |
| EV-02 | Token expired (>24h) | "Token wygasł" message, prompt to resend | HIGH | email-verification.spec.ts |
| EV-03 | Token already used | Either ok (idempotent) or "invalid token" — no 500 | HIGH | email-verification.spec.ts |
| EV-04 | Invalid/tampered token | Error message, no raw DB error shown | CRITICAL | email-verification.spec.ts |
| EV-05 | Missing token param | Error page shown, not 500 | HIGH | email-verification.spec.ts |
| EV-06 | Token identifier format correct | register.ts uses `verify:${email}` prefix | CRITICAL | email-verification.spec.ts |
| EV-07 | Resend verification — any email | Always 200 { ok: true } (enumeration-safe) | CRITICAL | email-verification.spec.ts |
| EV-08 | Resend rate limit | 429 after 5 attempts/hour (emailVerify bucket) | HIGH | email-verification.spec.ts |
| EV-09 | Concurrent verify same token | One succeeds, other fails gracefully | HIGH | email-verification.spec.ts |
| EV-10 | Verify while logged in | No crash, session remains valid | MEDIUM | email-verification.spec.ts |

**Critical Bug Fixed (EV-06)**:  
`register.ts` was creating tokens with `identifier: email` but `verify-email/route.ts` searched for `identifier: { startsWith: 'verify:' }`. Fixed to `identifier: \`verify:${email}\``.

---

## Area 3: LOGIN

| # | Scenario | Expected Result | Severity | Spec File |
|---|----------|----------------|----------|-----------|
| L-01 | Valid credentials | JWT session, redirect to /dashboard or /onboarding | CRITICAL | login.spec.ts |
| L-02 | Wrong password | Generic error, stays on login (no specific reason) | CRITICAL | login.spec.ts |
| L-03 | Non-existent user | Generic error (not "user not found" — enumeration) | CRITICAL | login.spec.ts |
| L-04 | Empty fields | HTML5 or custom validation, no 500 | HIGH | login.spec.ts |
| L-05 | Suspended user | Login blocked, generic status error | HIGH | login.spec.ts |
| L-06 | Open redirect via callbackUrl | Blocked — redirects to /dashboard | CRITICAL | login.spec.ts |
| L-07 | Protocol-relative redirect (//evil.com) | Blocked — redirects to /dashboard | CRITICAL | login.spec.ts |
| L-08 | Internal callbackUrl (/dashboard) | Honored after successful login | MEDIUM | login.spec.ts |
| L-09 | Already logged in visits /auth/login | Redirected to /dashboard | MEDIUM | login.spec.ts |
| L-10 | Session persists on reload | Still authenticated after F5 | HIGH | login.spec.ts |
| L-11 | Brute force: 6 failed attempts | Rate limit 429 after 5 attempts | HIGH | login.spec.ts |
| L-12 | "Forgot password" link | Navigates to /auth/forgot-password | MEDIUM | login.spec.ts |
| L-13 | "Register" link | Navigates to /auth/register | MEDIUM | login.spec.ts |
| L-14 | Unverified email login | Allowed (product decision) — logged with warning | LOW | login.spec.ts |

**Security Note (L-06, L-07)**:  
Open redirect was fixed in ETAP 7 via `safeCallbackUrl()` in LoginForm.tsx. Validates: starts with `/`, not starts with `//`, does not contain `://`.

---

## Area 4: PASSWORD RESET

| # | Scenario | Expected Result | Severity | Spec File |
|---|----------|----------------|----------|-----------|
| PR-01 | Valid reset token + strong password | Password updated, redirect to login | CRITICAL | reset-password.spec.ts |
| PR-02 | Expired reset token | "Token wygasł" error, no crash | HIGH | reset-password.spec.ts |
| PR-03 | Reused reset token | Second use fails — token deleted after first use | HIGH | reset-password.spec.ts |
| PR-04 | Invalid/tampered token | Error shown, no DB error leak | CRITICAL | reset-password.spec.ts |
| PR-05 | Missing token param | Error page, not 500 | HIGH | reset-password.spec.ts |
| PR-06 | Weak new password | Client validation blocks submit | HIGH | reset-password.spec.ts |
| PR-07 | Forgot-password request for any email | Always 200 (enumeration-safe) | CRITICAL | reset-password.spec.ts |
| PR-08 | Rate limit: 3 requests/hour | 429 after threshold | HIGH | reset-password.spec.ts |
| PR-09 | Token identifier: `reset:${email}` | Correct prefix used in DB | CRITICAL | reset-password.spec.ts |

---

## Area 5: ONBOARDING

| # | Scenario | Expected Result | Severity | Spec File |
|---|----------|----------------|----------|-----------|
| OB-01 | Fresh user after registration | Directed to /onboarding | HIGH | onboarding.spec.ts |
| OB-02 | Navigate Next/Back through steps | Steps advance and retreat correctly | HIGH | onboarding.spec.ts |
| OB-03 | Refresh mid-onboarding | Resumes at last saved step (DB) | HIGH | onboarding.spec.ts |
| OB-04 | Skip TrainingPeaks step | Advances without error | HIGH | onboarding.spec.ts |
| OB-05 | Complete all steps | Redirected to /dashboard | HIGH | onboarding.spec.ts |
| OB-06 | Already onboarded user visits /onboarding | Redirected to /dashboard | HIGH | onboarding.spec.ts |
| OB-07 | Logout mid-onboarding + re-login | Step persistence via DB | HIGH | onboarding.spec.ts |
| OB-08 | Mobile viewport — next button visible | Button in viewport on 390px screen | MEDIUM | onboarding.spec.ts |
| OB-09 | initialStep clamped to valid range | Cannot start on success screen | HIGH | onboarding.spec.ts |
| OB-10 | DB fetch error during onboarding load | Graceful fallback to step 0 | MEDIUM | onboarding.spec.ts |

**Fix Applied (OB-03, OB-09)**:  
`OnboardingWizard` now accepts `initialStep?: number` prop. Step is clamped: `Math.min(Math.max(initialStep, 0), STEPS.length - 2)`.  
`onboarding/page.tsx` fetches `profile.onboardingStep` from DB and passes as `initialStep`.

---

## Area 6: SESSION MANAGEMENT

| # | Scenario | Expected Result | Severity | Spec File |
|---|----------|----------------|----------|-----------|
| S-01 | Unauthenticated → /dashboard | Redirect to /auth/login | CRITICAL | session.spec.ts |
| S-02 | Unauthenticated → /onboarding | Redirect to /auth/login | CRITICAL | session.spec.ts |
| S-03 | Unauthenticated → /settings | Redirect to /auth/login | CRITICAL | session.spec.ts |
| S-04 | Unauthenticated → /terms | Accessible (no redirect) | HIGH | session.spec.ts |
| S-05 | Unauthenticated → /privacy | Accessible (no redirect) | HIGH | session.spec.ts |
| S-06 | Unauthenticated → /health-disclaimer | Accessible (no redirect) | HIGH | session.spec.ts |
| S-07 | Authenticated → /terms | Accessible (not redirected to dashboard) | HIGH | session.spec.ts |
| S-08 | Session persists on reload | Still authenticated | HIGH | session.spec.ts |
| S-09 | Logout clears session | /dashboard → redirect to login | HIGH | session.spec.ts |
| S-10 | Session cookie changed after login | No session fixation | CRITICAL | session.spec.ts |
| S-11 | /api/auth/session returns JSON | 200 with content-type: json | MEDIUM | session.spec.ts |

**Fix Applied (S-04, S-05, S-06, S-07)**:  
`middleware.ts` now has `STATIC_ROUTES` and `isStaticRoute()`. Legal pages not redirected regardless of auth state.

---

## Area 7: NOTIFICATIONS

| # | Scenario | Expected Result | Severity | Spec File |
|---|----------|----------------|----------|-----------|
| N-01 | /notifications loads without error | Page renders, no 500 | HIGH | notifications.spec.ts |
| N-02 | Empty state shown | "Brak powiadomień" when empty | MEDIUM | notifications.spec.ts |
| N-03 | Mark notification as read | UI updates, unread indicator removed | MEDIUM | notifications.spec.ts |
| N-04 | "Mark all read" button | Clears all unread indicators | MEDIUM | notifications.spec.ts |
| N-05 | PATCH /api/notifications/[id] — no auth | 401 | HIGH | notifications.spec.ts |
| N-06 | PATCH /api/notifications/fake-id | 404 or 401, not 500 | MEDIUM | notifications.spec.ts |
| N-07 | Notification badge in nav | Shows count or hides gracefully | LOW | notifications.spec.ts |

---

## Area 8: PUSH NOTIFICATIONS

| # | Scenario | Expected Result | Severity | Spec File |
|---|----------|----------------|----------|-----------|
| P-01 | POST /api/push/subscribe without auth | 401 | CRITICAL | push.spec.ts |
| P-02 | DELETE /api/push/subscribe without auth | 401 | CRITICAL | push.spec.ts |
| P-03 | Permission granted → subscribe | UI shows subscribed state | HIGH | push.spec.ts |
| P-04 | Permission denied → graceful message | No crash, helpful UI | HIGH | push.spec.ts |
| P-05 | Duplicate subscribe (idempotent) | No error, no 500 | MEDIUM | push.spec.ts |
| P-06 | VAPID private key not in page source | Never exposed to client | CRITICAL | push.spec.ts |
| P-07 | NEXT_PUBLIC_VAPID_PUBLIC_KEY available | Baked at build time | MEDIUM | push.spec.ts |

---

## Area 9: TRAININGPEAKS INTEGRATION

| # | Scenario | Expected Result | Severity | Spec File |
|---|----------|----------------|----------|-----------|
| TP-01 | Connect button visible | Present in onboarding or settings | MEDIUM | integrations.spec.ts |
| TP-02 | OAuth callback — invalid state | Error handled, no 500 | HIGH | integrations.spec.ts |
| TP-03 | OAuth callback — access_denied | Error shown, redirect to settings | HIGH | integrations.spec.ts |
| TP-04 | Expired state parameter | Rejected, no crash | HIGH | integrations.spec.ts |
| TP-05 | Disconnect TP | Integration removed, no crash | MEDIUM | integrations.spec.ts |
| TP-06 | POST /api/integrations/tp without auth | 401 | CRITICAL | integrations.spec.ts |
| TP-07 | Reconnect after disconnect | OAuth flow restarts cleanly | MEDIUM | integrations.spec.ts |

---

## Area 10: MOBILE COVERAGE

| # | Scenario | Viewport | Expected Result | Severity | Spec File |
|---|----------|---------|----------------|----------|-----------|
| M-01 | Register form — no horizontal overflow | iPhone 14 (390px) | scrollWidth ≤ 390 | HIGH | mobile-auth.spec.ts |
| M-02 | Input touch targets ≥ 36px height | Pixel 5 (393px) | box.height ≥ 36 | HIGH | mobile-auth.spec.ts |
| M-03 | Submit button ≥ 44px (iOS HIG) | iPhone 14 | box.height ≥ 44 | MEDIUM | mobile-auth.spec.ts |
| M-04 | Onboarding next button in viewport | All viewports | box.y ≤ viewport.height | HIGH | mobile-auth.spec.ts |
| M-05 | Validation error visible without scroll | iPhone SE (375px) | box.y ≤ 667 | HIGH | mobile-auth.spec.ts |
| M-06 | Password toggle tappable | All viewports | box.width/height ≥ 24px | MEDIUM | mobile-auth.spec.ts |
| M-07 | Bottom nav — safe area compliant | iPhone 14 | Not obscured by home indicator | HIGH | mobile-auth.spec.ts |
| M-08 | Landscape orientation — form usable | 844×390 | No crash, submit visible | MEDIUM | mobile-auth.spec.ts |

---

## Area 11: DATA INTEGRITY

| # | Scenario | Expected Result | Severity |
|---|----------|----------------|----------|
| DI-01 | Concurrent registration same email | Only one user created | CRITICAL |
| DI-02 | Token cleanup on verify | Old tokens for email deleted before new created | HIGH |
| DI-03 | Password hash rounds = 12 | BCRYPT_ROUNDS env respected | HIGH |
| DI-04 | User.status checked on every login | Suspended users blocked | CRITICAL |
| DI-05 | Session JWT contains role/status | Authorization claims accurate | HIGH |
| DI-06 | onboardingStep saved on each step | DB updated, not just in-memory | HIGH |

---

## Area 12: SECURITY COVERAGE SUMMARY

| # | Attack Vector | Mitigation | Status |
|---|--------------|-----------|--------|
| SEC-01 | Open redirect | safeCallbackUrl() validation | FIXED |
| SEC-02 | SQL injection | Prisma parameterized queries | PROTECTED |
| SEC-03 | XSS in name | Name regex validation | PROTECTED |
| SEC-04 | Brute force login | Rate limit: 5/15min | PROTECTED |
| SEC-05 | Email enumeration (register) | Generic error messages | PROTECTED |
| SEC-06 | Email enumeration (reset) | Always 200 response | PROTECTED |
| SEC-07 | Email enumeration (resend) | Always 200 response | PROTECTED |
| SEC-08 | Token replay (verify) | Token deleted after use | PROTECTED |
| SEC-09 | Token replay (reset) | Token deleted after use | PROTECTED |
| SEC-10 | Session fixation | JWT rotated on login | PROTECTED |
| SEC-11 | CSRF | Next.js same-origin server actions | PROTECTED |
| SEC-12 | VAPID key leak | Private key server-only | PROTECTED |
| SEC-13 | Rate limit multi-instance | In-memory (dev ok, Redis needed prod) | RISK |
| SEC-14 | Unverified email login | Allowed (product decision, logged) | ACCEPTED |

---

## Browser × Device Coverage Matrix

| Browser | Desktop | Mobile | Notes |
|---------|---------|--------|-------|
| Chromium | ✅ Primary | ✅ (Pixel 5) | Main test suite |
| WebKit (Safari) | Deferred | ✅ (iPhone 14) | Mobile-only for now |
| Firefox | Deferred | - | Add post-launch |

---

## Run Instructions

```bash
# Prerequisites: dev server running on :3100
cd /Users/tomaszuscinski/Projects/private/NutriCoach/apps/web

# Run all tests
npx playwright test

# Run specific area
npx playwright test e2e/auth/register.spec.ts

# Run mobile tests only
npx playwright test --project=mobile-chrome

# With UI (interactive)
npx playwright test --ui

# Generate report
npx playwright show-report
```

### Required Environment Variables for Full Coverage
```
E2E_TEST_EMAIL=testuser@test.local
E2E_TEST_PASSWORD=ValidPass1!
E2E_VERIFY_TOKEN=<from DB seed>
E2E_VERIFY_EMAIL=<email for above token>
E2E_RESET_TOKEN=<from DB seed>
PLAYWRIGHT_BASE_URL=http://localhost:3100
```
