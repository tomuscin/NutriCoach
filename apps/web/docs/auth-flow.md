# Auth Flow — Leaxaro ETAP 7

## Overview

Leaxaro uses NextAuth v5 (beta) with JWT strategy. All passwords are hashed with bcryptjs. Tokens (email verify, password reset) are stored in the `VerificationToken` table with `identifier` namespacing.

## Registration Flow

```
POST /api/auth/register (via registerAction server action)
  → registerSchema validation (name, email, password, confirmPassword, acceptTerms)
  → bcrypt.hash(password, 12)
  → prisma.user.create({ email, name, password, onboardingStep: 0 })
      → nested: UserConsent ×3 (terms, privacy, health_disclaimer v1.0)
      → nested: UserPreferences (defaults)
  → trackEvent({ event: 'registration.completed' })
  → createAndSendVerificationToken(userId, email, name)
      → prisma.verificationToken.deleteMany({ identifier: `verify:${email}` })
      → prisma.verificationToken.create({ identifier: `verify:${email}`, token: uuid, expires: +24h })
      → sendVerificationEmail(email, name, token)  ← fire-and-forget
  → redirect to /auth/login?registered=1
```

## Email Verification Flow

```
User clicks link in email → GET /api/auth/verify-email?token=…
  → consumeVerificationToken(token)
      → find VerificationToken where token=… AND identifier startsWith 'verify:'
      → check expires > now
      → $transaction: user.update({ emailVerified: now }) + token.delete()
      → trackEvent({ event: 'email.verified' })
  → redirect to /auth/login?verified=1

OR: VerifyEmailClient (client component) calls POST /api/auth/verify-email { token }
  → same consumeVerificationToken logic
  → returns { ok: true } or { ok: false, error, code: 'EXPIRED' | 'INVALID' }
```

### Resend Verification

```
POST /api/auth/resend-verification { email }
  → rate-limited (passwordReset rate limiter)
  → find user, check not already verified
  → createAndSendVerificationToken(userId, email, name)
  → always returns { ok: true }  ← prevents email enumeration
```

## Login Flow

```
NextAuth credentials provider
  → loginSchema validation (email, password)
  → prisma.user.findUnique({ email })
  → bcrypt.compare(password, user.password)
  → returns { id, email, name, onboardingStep } to JWT
  → JWT persisted in HttpOnly cookie (NEXTAUTH_SECRET)
```

## Password Reset Flow

```
POST /api/auth/forgot-password { email }  (via forgotPasswordAction)
  → find user by email
  → prisma.verificationToken.create({ identifier: `reset:${email}`, token: uuid, expires: +1h })
  → sendPasswordResetEmail(email, name, token)  ← fire-and-forget
  → always returns success (prevents enumeration)

User clicks link → /auth/reset-password?token=…
  → ResetPasswordForm validates token presence on mount
  → POST /api/auth/reset-password { token, password, confirmPassword }  (via resetPasswordAction)
      → find VerificationToken where token=… AND identifier startsWith 'reset:'
      → check expires > now
      → bcrypt.hash(newPassword, 12)
      → $transaction: user.update({ password }) + token.delete()
```

## Auth Helpers

- `requireAuth()` — returns session or redirects to `/auth/login`
- `requireOnboarded()` — returns session or redirects to `/onboarding` (if onboardingStep < 8)
- `DEV_BYPASS_AUTH=true` — mock user `{ id: 'dev-user-bypass' }` for local dev

## Token Identifier Namespacing

| Prefix | Usage |
|--------|-------|
| `verify:${email}` | Email verification tokens |
| `reset:${email}` | Password reset tokens |
