// GET /api/integrations/trainingpeaks/callback
// Handles OAuth callback: validates state, exchanges code for tokens, persists.

import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma as db } from '@/lib/db'
import { trainingPeaksProvider, persistTokens } from '@/lib/integrations/providers/trainingpeaks/provider'
import { encryptToken } from '@/lib/security/token-encryption'
import { runTrainingPeaksSync } from '@/lib/integrations/sync/training-sync'
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
    logger.warn({ error }, 'TP OAuth rejected by user')
    redirect('/settings/integrations?error=access_denied')
  }

  if (!code || !state) {
    redirect('/settings/integrations?error=invalid_callback')
  }

  try {
    const user = await requireAuth()

    // Validate CSRF state
    const storedState = await db.oAuthState.findUnique({ where: { state } })
    if (
      !storedState ||
      storedState.userId !== user.id ||
      storedState.provider !== 'TRAININGPEAKS' ||
      storedState.expiresAt < new Date()
    ) {
      redirect('/settings/integrations?error=invalid_state')
    }

    // Consume state (one-time use)
    await db.oAuthState.delete({ where: { state } })

    // Exchange code for tokens
    const tokens = await trainingPeaksProvider.exchangeCode(code)

    // Upsert integration as ACTIVE with encrypted tokens
    await db.integration.upsert({
      where: { userId_provider: { userId: user.id, provider: 'TRAININGPEAKS' } },
      create: {
        userId: user.id,
        provider: 'TRAININGPEAKS',
        status: 'ACTIVE',
        accessToken: encryptToken(tokens.accessToken),
        refreshToken: encryptToken(tokens.refreshToken),
        tokenExpiresAt: tokens.expiresAt,
        scope: tokens.scope ?? null,
        nextSyncAt: new Date(), // sync immediately
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

    // Trigger initial background sync (fire and forget — non-blocking)
    runTrainingPeaksSync(user.id).catch(err => {
      logger.warn({ userId: user.id, err }, 'Initial TP sync failed')
      Sentry.captureException(err)
    })

    redirect('/settings/integrations?connected=trainingpeaks')
  } catch (err) {
    logger.error({ err }, 'TP OAuth callback error')
    Sentry.captureException(err)
    redirect('/settings/integrations?error=auth_failed')
  }
}
