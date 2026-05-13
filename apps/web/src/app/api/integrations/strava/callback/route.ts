// GET /api/integrations/strava/callback
// Handles OAuth callback: validates state, exchanges code for tokens, persists.

import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma as db } from '@/lib/db'
import { stravaProvider, persistStravaTokens } from '@/lib/integrations/providers/strava/provider'
import { encryptToken } from '@/lib/security/token-encryption'
import { runStravaSync } from '@/lib/integrations/sync/strava-sync'
import { trackEvent } from '@/lib/analytics/events'
import { logger } from '@/lib/logger'
import * as Sentry from '@sentry/nextjs'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Provider-side rejection (user denied access)
  if (error) {
    logger.warn({ error }, 'Strava OAuth rejected by user')
    redirect('/integrations?error=access_denied')
  }

  if (!code || !state) {
    redirect('/integrations?error=invalid_callback')
  }

  try {
    const user = await requireAuth()

    // Validate CSRF state
    const storedState = await db.oAuthState.findUnique({ where: { state } })
    if (
      !storedState ||
      storedState.userId !== user.id ||
      storedState.provider !== 'STRAVA' ||
      storedState.expiresAt < new Date()
    ) {
      redirect('/integrations?error=invalid_state')
    }

    // Consume state (one-time use)
    await db.oAuthState.delete({ where: { state } })

    // Exchange code for tokens
    const tokens = await stravaProvider.exchangeCode(code)

    // Upsert integration as ACTIVE with encrypted tokens
    await db.integration.upsert({
      where: { userId_provider: { userId: user.id, provider: 'STRAVA' } },
      create: {
        userId: user.id,
        provider: 'STRAVA',
        status: 'ACTIVE',
        accessToken: encryptToken(tokens.accessToken),
        refreshToken: encryptToken(tokens.refreshToken),
        tokenExpiresAt: tokens.expiresAt,
        scope: tokens.scope ?? null,
        nextSyncAt: new Date(),
      },
      update: {
        status: 'ACTIVE',
        accessToken: encryptToken(tokens.accessToken),
        refreshToken: encryptToken(tokens.refreshToken),
        tokenExpiresAt: tokens.expiresAt,
        scope: tokens.scope ?? null,
        errorCount: 0,
        errorMessage: null,
        nextSyncAt: new Date(),
      },
    })

    trackEvent({ userId: user.id, event: 'strava.connected' })

    // Trigger initial background sync (fire and forget — non-blocking)
    runStravaSync(user.id).catch(err => {
      logger.warn({ userId: user.id, err }, 'Initial Strava sync failed')
      Sentry.captureException(err)
    })

    redirect('/integrations?connected=strava')
  } catch (err) {
    logger.error({ err }, 'Strava OAuth callback error')
    Sentry.captureException(err)
    redirect('/integrations?error=auth_failed')
  }
}
