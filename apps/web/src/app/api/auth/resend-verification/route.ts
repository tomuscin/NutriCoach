// POST /api/auth/resend-verification — resend email verification link
// Rate-limited to prevent abuse

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { rateLimits } from '@/lib/rate-limit'
import { createAndSendVerificationToken } from '@/lib/services/register'
import { trackEvent } from '@/lib/analytics/events'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''

  if (ip) {
    const rl = rateLimits.emailVerify(ip) // dedicated email verify bucket
    if (!rl.allowed) {
      return NextResponse.json(
        { ok: false, error: 'Zbyt wiele prób. Spróbuj ponownie za godzinę.' },
        { status: 429 }
      )
    }
  }

  try {
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : ''

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: 'Nieprawidłowy email' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, emailVerified: true },
    })

    // Always return success (prevent user enumeration)
    if (!user || user.emailVerified) {
      return NextResponse.json({ ok: true })
    }

    await createAndSendVerificationToken(user.id, email, user.name ?? 'Użytkowniku')
    trackEvent({ event: 'email.verification.resent', userId: user.id, ip })
    logger.info({ userId: user.id }, 'verification.resent')

    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error({ err }, 'resend-verification.error')
    return NextResponse.json({ ok: false, error: 'Błąd serwera' }, { status: 500 })
  }
}
