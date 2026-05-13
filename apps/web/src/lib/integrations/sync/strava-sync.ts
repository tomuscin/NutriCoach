// Strava Sync Engine — orchestrates a full sync cycle for a user
// Mirrors training-sync.ts pattern.
// Handles: token refresh, workout sync, SyncLog, integration status update.

import 'server-only'
import { prisma as db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { safeDecryptToken } from '@/lib/security/token-encryption'
import { stravaProvider, persistStravaTokens } from '../providers/strava/provider'
import { IntegrationError } from '../core/types'
import { trackEvent } from '@/lib/analytics/events'
import * as Sentry from '@sentry/nextjs'

const TOKEN_REFRESH_BUFFER_MINUTES = 15

// ─── Main sync entry point ────────────────────────────────────────────────────

export async function runStravaSync(userId: string): Promise<{
  success: boolean
  message: string
  workoutsCreated: number
  workoutsUpdated: number
}> {
  // Load integration
  const integration = await db.integration.findUnique({
    where: { userId_provider: { userId, provider: 'STRAVA' } },
  })

  if (!integration || integration.status === 'DISCONNECTED' || integration.status === 'REVOKED') {
    return { success: false, message: 'Integration not active', workoutsCreated: 0, workoutsUpdated: 0 }
  }

  // ── Concurrency guard ─────────────────────────────────────────────────────
  const runningSync = await db.syncLog.findFirst({
    where: {
      integrationId: integration.id,
      status: 'RUNNING',
      createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
    },
  })
  if (runningSync) {
    logger.warn({ userId }, 'strava.sync.skipped — already running')
    return { success: false, message: 'Sync already running', workoutsCreated: 0, workoutsUpdated: 0 }
  }

  // Create sync log
  const syncLog = await db.syncLog.create({
    data: {
      integrationId: integration.id,
      userId,
      syncType: 'WORKOUTS',
      status: 'RUNNING',
    },
  })

  let tokens = {
    accessToken: safeDecryptToken(integration.accessToken) ?? '',
    refreshToken: safeDecryptToken(integration.refreshToken) ?? '',
    expiresAt: integration.tokenExpiresAt ?? new Date(0),
    scope: integration.scope ?? undefined,
  }

  try {
    // Refresh token if near expiry
    const expiresInMs = tokens.expiresAt.getTime() - Date.now()
    const bufferMs = TOKEN_REFRESH_BUFFER_MINUTES * 60 * 1000
    if (expiresInMs < bufferMs && tokens.refreshToken) {
      logger.info({ userId }, 'Refreshing Strava access token')
      tokens = await stravaProvider.refreshTokens(tokens.refreshToken)
      await persistStravaTokens(userId, tokens)
      trackEvent({ userId, event: 'strava.token.refreshed' })
    }

    if (!tokens.accessToken) {
      throw new IntegrationError('No valid Strava access token', 'STRAVA', 'TOKEN_EXPIRED')
    }

    // Determine sync window (from last sync or 60 days back)
    const since = integration.lastSyncAt
      ? new Date(integration.lastSyncAt.getTime() - 24 * 60 * 60 * 1000) // 1-day overlap
      : new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) // 60 days default

    // Sync athlete profile on first sync or every 24h
    const profileAgeMs = integration.lastSyncAt
      ? Date.now() - integration.lastSyncAt.getTime()
      : Infinity
    if (profileAgeMs > 24 * 60 * 60 * 1000) {
      await stravaProvider.syncAthleteProfile(userId, tokens)
    }

    // Sync workouts
    trackEvent({ userId, event: 'strava.sync.started' })
    const result = await stravaProvider.syncWorkouts(userId, tokens, since)

    // Update sync log
    await db.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: result.status,
        recordsProcessed: result.recordsProcessed,
        recordsCreated: result.recordsCreated,
        recordsUpdated: result.recordsUpdated,
        recordsSkipped: result.recordsSkipped,
        recordsFailed: result.recordsFailed,
        errors: (result.errors?.length ? result.errors : undefined) as never,
        finishedAt: new Date(),
      },
    })

    // Update integration
    const nextSync = new Date(Date.now() + (integration.syncFrequencyMinutes ?? 360) * 60 * 1000)
    await db.integration.update({
      where: { id: integration.id },
      data: {
        lastSyncAt: new Date(),
        nextSyncAt: nextSync,
        status: 'ACTIVE',
        errorCount: 0,
        errorMessage: null,
      },
    })

    trackEvent({ userId, event: 'strava.sync.completed' })
    logger.info({ userId, result }, 'Strava sync complete')

    return {
      success: true,
      message: `Synced ${result.recordsCreated} new, ${result.recordsUpdated} updated`,
      workoutsCreated: result.recordsCreated,
      workoutsUpdated: result.recordsUpdated,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const isRevoked = err instanceof IntegrationError && err.code === 'TOKEN_REVOKED'

    Sentry.captureException(err, { extra: { userId, provider: 'STRAVA' } })

    await db.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'FAILED',
        errors: [{ record: 'sync', message }] as never,
        finishedAt: new Date(),
      },
    })

    await db.integration.update({
      where: { id: integration.id },
      data: {
        status: isRevoked ? 'REVOKED' : 'ERROR',
        errorMessage: message,
        errorCount: { increment: 1 },
        lastErrorAt: new Date(),
      },
    })

    trackEvent({ userId, event: 'strava.sync.failed' })
    logger.error({ userId, err }, 'Strava sync failed')

    return {
      success: false,
      message,
      workoutsCreated: 0,
      workoutsUpdated: 0,
    }
  }
}
