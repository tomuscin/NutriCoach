// GET /api/auth/check-verification?email=...
// Polling endpoint — returns { verified: boolean }.
// Used by VerifyEmailPendingClient to detect cross-device verification without
// requiring a page reload (desktop registers, phone verifies, desktop auto-advances).
//
// Safe: returns the same { verified: false } for unknown emails and unverified emails,
// so it doesn't leak email existence to unauthenticated callers.

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { rateLimits } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  // Rate limit: 30 checks/minute per IP (polling every 5s = 12/min, so plenty of headroom)
  const rl = rateLimits.checkVerification(ip)
  if (!rl.allowed) {
    return NextResponse.json({ verified: false }, { status: 429 })
  }

  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')?.toLowerCase().trim()

  if (!email || !email.includes('@')) {
    return NextResponse.json({ verified: false })
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { emailVerified: true },
  })

  return NextResponse.json({ verified: !!user?.emailVerified })
}
