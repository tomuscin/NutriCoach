// Registration service
// Creates user, hashes password, initializes profile + goal

import { hash } from 'bcryptjs'
import { prisma } from '@/lib/db'
import { registerSchema } from '@/lib/validators/auth'
import { logAuthEvent, generateCorrelationId } from '@/lib/auth-logger'
import { rateLimits } from '@/lib/rate-limit'
import type { AuthResult } from '@/types/auth'

const BCRYPT_ROUNDS = 12

export async function registerUser(
  input: unknown,
  opts: { ip?: string } = {}
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

  const { email, password, name } = parsed.data

  // ─── Check uniqueness ─────────────────────────────────────────────────────
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })

  if (existing) {
    logAuthEvent({ event: 'register.duplicate_email', email, correlationId })
    // Return same error to prevent email enumeration
    return { ok: false, error: 'Nie można założyć konta z tymi danymi.', field: 'email' }
  }

  // ─── Hash password ────────────────────────────────────────────────────────
  const passwordHash = await hash(password, BCRYPT_ROUNDS)

  // ─── Create user + profile ────────────────────────────────────────────────
  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: 'USER',
      status: 'ACTIVE',
      // UserProfile created during onboarding (requires real data: sex, birthDate, etc.)
    },
    select: { id: true, email: true },
  })

  logAuthEvent({ event: 'register.success', userId: user.id, email: user.email, correlationId })

  // ─── Email verification (foundation — real SMTP in ETAP 5) ───────────────
  // Token generation is wired but email sending is disabled until SMTP configured
  await createVerificationTokenFoundation(user.id, email)

  return { ok: true, data: { userId: user.id } }
}

// ─── Email verification token (foundation) ────────────────────────────────────
// Real email sending wired in ETAP 5 (Resend/SMTP)
async function createVerificationTokenFoundation(userId: string, email: string): Promise<void> {
  try {
    const { randomBytes } = await import('crypto')
    const token = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h

    // Store in Prisma VerificationToken model
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    })

    logAuthEvent({ event: 'email_verify.sent', userId, email, meta: { foundation_only: true } })
    // TODO ETAP 5: await sendVerificationEmail({ email, token, name: userName })
  } catch (err) {
    // Non-fatal — user can request resend
    console.error('[AUTH] Failed to create verification token:', err)
  }
}
