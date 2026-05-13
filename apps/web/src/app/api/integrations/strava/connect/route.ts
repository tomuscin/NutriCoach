// GET /api/integrations/strava/connect
// Initiates OAuth flow: creates CSRF state, redirects to Strava authorization page.

import { redirect } from 'next/navigation'
import { randomBytes } from 'crypto'
import { requireAuth } from '@/lib/auth'
import { prisma as db } from '@/lib/db'
import { stravaProvider } from '@/lib/integrations/providers/strava/provider'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await requireAuth()

    // Guard: Strava OAuth not configured
    if (!process.env.STRAVA_CLIENT_ID || !process.env.STRAVA_CLIENT_SECRET) {
      const url = new URL('/integrations', process.env.NEXTAUTH_URL ?? 'http://localhost:3100')
      url.searchParams.set('error', 'strava_not_configured')
      return NextResponse.redirect(url)
    }

    // Generate CSRF state token
    const state = randomBytes(32).toString('hex')

    // Persist state with 10-minute TTL
    await db.oAuthState.create({
      data: {
        userId: user.id,
        state,
        provider: 'STRAVA',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    })

    // Upsert integration record as PENDING
    await db.integration.upsert({
      where: { userId_provider: { userId: user.id, provider: 'STRAVA' } },
      create: {
        userId: user.id,
        provider: 'STRAVA',
        status: 'PENDING',
      },
      update: {
        status: 'PENDING',
        errorMessage: null,
      },
    })

    const authUrl = stravaProvider.buildAuthUrl(state)
    redirect(authUrl)
  } catch (err) {
    // redirect() throws a NEXT_REDIRECT object — let it propagate
    if (
      err != null &&
      typeof err === 'object' &&
      'digest' in err &&
      String((err as { digest: unknown }).digest).startsWith('NEXT_REDIRECT')
    ) {
      throw err
    }
    const url = new URL('/integrations', process.env.NEXTAUTH_URL ?? 'http://localhost:3100')
    url.searchParams.set('error', 'strava_connect_failed')
    return NextResponse.redirect(url)
  }
}
