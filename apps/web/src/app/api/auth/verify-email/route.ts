// POST /api/auth/verify-email — consume email verification token
// GET  /api/auth/verify-email?token=… — redirect flow from email link

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { trackEvent } from '@/lib/analytics/events'
import * as Sentry from '@sentry/nextjs'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined

  if (!token) {
    return NextResponse.redirect(new URL('/auth/verify-email?error=missing_token', request.url))
  }

  // Track that user clicked the link (even before verification succeeds)
  trackEvent({ event: 'email.verification.clicked', ip })

  try {
    const result = await consumeVerificationToken(token, request)
    if (result.ok) {
      return NextResponse.redirect(new URL('/auth/verify-success', request.url))
    }
    return NextResponse.redirect(new URL(`/auth/verify-email?error=${result.code}`, request.url))
  } catch (err) {
    logger.error({ err }, 'verify-email.get.error')
    Sentry.captureException(err, { extra: { context: 'verify-email.GET' } })
    return NextResponse.redirect(new URL('/auth/verify-email?error=server_error', request.url))
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const token = typeof body.token === 'string' ? body.token.trim() : ''

    if (!token) {
      return NextResponse.json({ ok: false, error: 'Brakuje tokenu' }, { status: 400 })
    }

    const result = await consumeVerificationToken(token, request)
    if (result.ok) {
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ ok: false, error: result.error, code: result.code }, { status: 400 })
  } catch (err) {
    logger.error({ err }, 'verify-email.post.error')
    Sentry.captureException(err, { extra: { context: 'verify-email.POST' } })
    return NextResponse.json({ ok: false, error: 'Błąd serwera' }, { status: 500 })
  }
}

// ─── Core logic ───────────────────────────────────────────────────────────────

async function consumeVerificationToken(
  token: string,
  request: Request
): Promise<{ ok: true } | { ok: false; error: string; code: string }> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined

  const stored = await prisma.verificationToken.findFirst({
    where: {
      token,
      identifier: { startsWith: 'verify:' },
    },
  })

  if (!stored) {
    trackEvent({ event: 'email.verification.failed', ip })
    Sentry.captureMessage('email.verification.failed: token not found', { level: 'warning', extra: { context: 'consumeVerificationToken' } })
    return { ok: false, error: 'Token jest nieprawidłowy lub nie istnieje.', code: 'invalid' }
  }

  if (stored.expires < new Date()) {
    // Clean up expired token
    await prisma.verificationToken.delete({
      where: { identifier_token: { identifier: stored.identifier, token } },
    }).catch(() => {})
    trackEvent({ event: 'email.verification.expired', ip })
    return { ok: false, error: 'Token wygasł. Poproś o nowy link weryfikacyjny.', code: 'expired' }
  }

  const email = stored.identifier.replace('verify:', '')

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, emailVerified: true },
  })

  if (!user) {
    return { ok: false, error: 'Nie znaleziono konta.', code: 'not_found' }
  }

  if (user.emailVerified) {
    // Already verified — idempotent
    await prisma.verificationToken.delete({
      where: { identifier_token: { identifier: stored.identifier, token } },
    }).catch(() => {})
    return { ok: true }
  }

  // Mark verified + delete token atomically
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    }),
    prisma.verificationToken.delete({
      where: { identifier_token: { identifier: stored.identifier, token } },
    }),
  ])

  trackEvent({ userId: user.id, event: 'email.verification.completed', ip })
  logger.info({ userId: user.id }, 'email.verification.completed')

  return { ok: true }
}
