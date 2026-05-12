// Password reset service (foundation)
// Token generation, storage, expiration — SMTP wired in ETAP 5

import { prisma } from '@/lib/db'
import { hash } from 'bcryptjs'
import { logAuthEvent, generateCorrelationId } from '@/lib/auth-logger'
import { rateLimits } from '@/lib/rate-limit'
import { forgotPasswordSchema, resetPasswordSchema } from '@/lib/validators/auth'
import type { AuthResult } from '@/types/auth'

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour

export async function requestPasswordReset(
  input: unknown,
  opts: { ip?: string } = {}
): Promise<AuthResult> {
  const correlationId = generateCorrelationId()

  if (opts.ip) {
    const rl = rateLimits.passwordReset(opts.ip)
    if (!rl.allowed) {
      return { ok: false, error: 'Zbyt wiele prób. Spróbuj ponownie za godzinę.' }
    }
  }

  const parsed = forgotPasswordSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Nieprawidłowy email' }
  }

  const { email } = parsed.data

  // Always return success (prevent email enumeration)
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })

  if (!user) {
    // Intentionally same response
    logAuthEvent({ event: 'password_reset.requested', email, correlationId, meta: { found: false } })
    return { ok: true }
  }

  // Invalidate existing tokens for this email
  await prisma.verificationToken.deleteMany({
    where: { identifier: `reset:${email}` },
  })

  // Generate secure token
  const { randomBytes } = await import('crypto')
  const token = randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS)

  await prisma.verificationToken.create({
    data: {
      identifier: `reset:${email}`,
      token,
      expires,
    },
  })

  logAuthEvent({ event: 'password_reset.requested', userId: user.id, email, correlationId })

  // TODO ETAP 5: await sendPasswordResetEmail({ email, token })
  console.log('[AUTH] Password reset token created (SMTP not configured yet):', { email, token: `${token.slice(0, 8)}...` })

  return { ok: true }
}

export async function resetPassword(
  input: unknown,
  opts: { ip?: string } = {}
): Promise<AuthResult> {
  const correlationId = generateCorrelationId()

  const parsed = resetPasswordSchema.safeParse(input)
  if (!parsed.success) {
    const first = parsed.error.errors[0]
    return { ok: false, error: first?.message ?? 'Nieprawidłowe dane', field: first?.path[0] as string }
  }

  const { token, password } = parsed.data

  // Find token — search across all reset identifiers
  const stored = await prisma.verificationToken.findFirst({
    where: {
      token,
      identifier: { startsWith: 'reset:' },
      expires: { gt: new Date() },
    },
  })

  if (!stored) {
    logAuthEvent({ event: 'password_reset.invalid_token', correlationId, meta: { reason: 'not_found_or_expired' } })
    return { ok: false, error: 'Token jest nieprawidłowy lub wygasł.' }
  }

  const email = stored.identifier.replace('reset:', '')

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })

  if (!user) {
    return { ok: false, error: 'Nie znaleziono konta.' }
  }

  // Hash + update
  const passwordHash = await hash(password, 12)
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  })

  // Invalidate token
  await prisma.verificationToken.delete({
    where: { identifier_token: { identifier: stored.identifier, token } },
  })

  logAuthEvent({ event: 'password_reset.completed', userId: user.id, email, correlationId })

  return { ok: true }
}
