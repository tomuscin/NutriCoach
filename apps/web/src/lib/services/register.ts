// Registration service — ETAP 7
// Creates user, hashes password, sends verification email, logs consent

import { hash } from 'bcryptjs'
import { prisma } from '@/lib/db'
import { registerSchema } from '@/lib/validators/auth'
import { logAuthEvent, generateCorrelationId } from '@/lib/auth-logger'
import { rateLimits } from '@/lib/rate-limit'
import { sendVerificationEmail } from '@/lib/email/email-service'
import { trackEvent } from '@/lib/analytics/events'
import type { AuthResult } from '@/types/auth'

const BCRYPT_ROUNDS = 12
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24h

export async function registerUser(
  input: unknown,
  opts: { ip?: string; userAgent?: string } = {}
): Promise<AuthResult<{ userId: string }>> {
  const correlationId = generateCorrelationId()

  // ─── Rate limit by IP ──────────────────────────────────────────────────────
  if (opts.ip) {
    const rl = rateLimits.register(opts.ip)
    if (!rl.allowed) {
      logAuthEvent({ event: 'register.failed', correlationId, ip: opts.ip, meta: { reason: 'rate_limited', retryAfterMs: rl.retryAfterMs } })
      return { ok: false, error: 'Zbyt wiele prób rejestracji. Spróbuj ponownie za chwilę.' }
    }
  }

  // ─── Validate input ───────────────────────────────────────────────────────
  const parsed = registerSchema.safeParse(input)
  if (!parsed.success) {
    const first = parsed.error.errors[0]
    return { ok: false, error: first?.message ?? 'Nieprawidłowe dane', field: first?.path[0] as string }
  }

  const { email, password, name, acceptTerms } = parsed.data

  if (!acceptTerms) {
    return { ok: false, error: 'Musisz zaakceptować Regulamin i Politykę prywatności.', field: 'acceptTerms' }
  }

  // ─── Check uniqueness ─────────────────────────────────────────────────────
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })

  if (existing) {
    logAuthEvent({ event: 'register.duplicate_email', email, correlationId })
    return { ok: false, error: 'Nie można założyć konta z tymi danymi.', field: 'email' }
  }

  // ─── Hash password ────────────────────────────────────────────────────────
  const passwordHash = await hash(password, BCRYPT_ROUNDS)

  // ─── Create user + consent + preferences ─────────────────────────────────
  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: 'USER',
      status: 'ACTIVE',
      onboardingStep: 0,
      consents: {
        create: [
          { policyType: 'terms', policyVersion: '1.0', ip: opts.ip, userAgent: opts.userAgent },
          { policyType: 'privacy', policyVersion: '1.0', ip: opts.ip, userAgent: opts.userAgent },
          { policyType: 'health_disclaimer', policyVersion: '1.0', ip: opts.ip, userAgent: opts.userAgent },
        ],
      },
      preferences: {
        create: {},
      },
    },
    select: { id: true, email: true, name: true },
  })

  logAuthEvent({ event: 'register.success', userId: user.id, email: user.email, correlationId })
  await trackEvent({ userId: user.id, event: 'registration.completed', ip: opts.ip })
  trackEvent({ event: 'email.verification.sent', userId: user.id, ip: opts.ip })

  // ─── Send verification email ──────────────────────────────────────────────
  await createAndSendVerificationToken(user.id, user.email, user.name ?? 'sportowcze')

  return { ok: true, data: { userId: user.id } }
}

// ─── Email verification token ──────────────────────────────────────────────────
export async function createAndSendVerificationToken(userId: string, email: string, name: string): Promise<void> {
  try {
    const { randomBytes } = await import('crypto')
    const token = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + VERIFY_TOKEN_TTL_MS)

    // Clear any existing tokens first
    await prisma.verificationToken.deleteMany({
      where: { identifier: `verify:${email}` },
    })

    await prisma.verificationToken.create({
      data: { identifier: `verify:${email}`, token, expires },
    })

    // Send email (fire-and-forget — non-critical path)
    sendVerificationEmail(email, name, token).catch(err => {
      logAuthEvent({ event: 'email_verify.send_failed', email, meta: { error: String(err) } })
    })

    logAuthEvent({ event: 'email_verify.sent', userId, email })
  } catch (err) {
    // Non-fatal — user can request resend
    logAuthEvent({ event: 'email_verify.create_failed', email, meta: { error: String(err) } })
  }
}
