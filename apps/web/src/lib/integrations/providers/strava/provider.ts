// Strava Provider — implements HealthDataProvider
// Orchestrates OAuth + API calls + normalization for Strava.

import 'server-only'
import { createHmac, timingSafeEqual } from 'crypto'
import type { HealthDataProvider, OAuthTokens, SyncResult } from '../../core/types'
import { IntegrationError } from '../../core/types'
import {
  exchangeCodeForTokens,
  fetchAthleteProfile,
  fetchActivities,
  refreshAccessToken,
} from './client'
import { normalizeStravaActivity } from '../../mapping/workout-mapper'
import { prisma as db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { encryptToken } from '@/lib/security/token-encryption'
import type { StravaTokenResponse } from './types'

const AUTH_URL = 'https://www.strava.com/oauth/authorize'

function toOAuthTokens(res: StravaTokenResponse): OAuthTokens {
  return {
    accessToken: res.access_token,
    refreshToken: res.refresh_token,
    // Strava returns expires_at (epoch) instead of expires_in
    expiresAt: new Date(res.expires_at * 1000),
    scope: res.scope,
  }
}

function getRedirectUri(): string {
  const uri = process.env.STRAVA_REDIRECT_URI
  if (!uri) throw new Error('STRAVA_REDIRECT_URI not set')
  return uri
}

export const stravaProvider: HealthDataProvider = {
  provider: 'STRAVA',

  buildAuthUrl(state: string): string {
    const clientId = process.env.STRAVA_CLIENT_ID
    if (!clientId) throw new Error('STRAVA_CLIENT_ID not set')

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: getRedirectUri(),
      response_type: 'code',
      approval_prompt: 'auto',
      // activity:read_all gives access to private activities + webhook events
      scope: 'activity:read_all',
      state,
    })
    return `${AUTH_URL}?${params.toString()}`
  },

  async exchangeCode(code: string): Promise<OAuthTokens> {
    const raw = await exchangeCodeForTokens(code, getRedirectUri())
    return toOAuthTokens(raw)
  },

  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    const raw = await refreshAccessToken(refreshToken)
    return toOAuthTokens(raw)
  },

  async syncAthleteProfile(userId: string, tokens: OAuthTokens): Promise<void> {
    const profile = await fetchAthleteProfile(tokens.accessToken)

    // Store Strava athlete ID on integration record
    await db.integration.updateMany({
      where: { userId, provider: 'STRAVA' },
      data: { athleteExternalId: String(profile.id) },
    })

    // Optionally update weight if available
    if (profile.weight) {
      await db.userProfile.updateMany({
        where: { userId },
        data: { currentWeightKg: profile.weight },
      })
    }

    logger.info({ userId, provider: 'STRAVA', stravaId: profile.id }, 'Strava athlete profile synced')
  },

  async syncWorkouts(userId: string, tokens: OAuthTokens, since: Date): Promise<SyncResult> {
    const afterEpoch = Math.floor(since.getTime() / 1000)
    const rawActivities = await fetchActivities(tokens.accessToken, afterEpoch)

    const result: SyncResult = {
      status: 'SUCCESS',
      recordsProcessed: rawActivities.length,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      recordsFailed: 0,
      errors: [],
    }

    for (const raw of rawActivities) {
      try {
        const w = normalizeStravaActivity(raw)
        const externalId = String(raw.id)

        const existing = await db.workout.findFirst({
          where: { userId, externalId, source: 'STRAVA' as never },
          select: { id: true },
        })

        const sportTypeValue = w.sportType as never

        if (!existing) {
          await db.workout.create({
            data: {
              userId,
              source: 'STRAVA' as never,
              externalId,
              externalWorkoutType: raw.sport_type ?? raw.type ?? null,
              date: w.date,
              startedAt: w.startedAt ?? null,
              finishedAt: w.finishedAt ?? null,
              durationMinutes: w.durationMinutes,
              title: w.title ?? null,
              sportType: sportTypeValue,
              distanceKm: w.distanceKm ?? null,
              elevationGainM: w.elevationGainM ?? null,
              avgHR: w.avgHR ?? null,
              maxHR: w.maxHR ?? null,
              avgPowerW: w.avgPowerW ?? null,
              normalizedPowerW: w.normalizedPowerW ?? null,
              caloriesBurned: w.caloriesBurned ?? null,
              indoor: w.indoor ?? false,
              isPlanned: false,
            },
          })
          result.recordsCreated++
        } else {
          // Update mutable fields (title, HR, power can change after upload)
          await db.workout.update({
            where: { id: existing.id },
            data: {
              title: w.title ?? null,
              durationMinutes: w.durationMinutes,
              distanceKm: w.distanceKm ?? null,
              avgHR: w.avgHR ?? null,
              maxHR: w.maxHR ?? null,
              avgPowerW: w.avgPowerW ?? null,
              caloriesBurned: w.caloriesBurned ?? null,
            },
          })
          result.recordsUpdated++
        }
      } catch (err) {
        result.recordsFailed++
        result.errors?.push({
          record: String(raw.id),
          message: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    if (result.recordsFailed > 0 && result.recordsFailed < result.recordsProcessed) {
      result.status = 'PARTIAL_SUCCESS'
    } else if (result.recordsFailed === result.recordsProcessed && result.recordsProcessed > 0) {
      result.status = 'FAILED'
    }

    return result
  },

  async syncRecoveryMetrics(
    _userId: string,
    _tokens: OAuthTokens,
    _since: Date,
  ): Promise<SyncResult> {
    // Strava doesn't expose HRV/recovery data.
    return {
      status: 'SKIPPED',
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      recordsFailed: 0,
    }
  },

  /**
   * Validates Strava X-Strava-Signature header.
   * Header format: t=<timestamp>,v1=<hmac-sha256>
   * Signed payload: {t}.{raw_body}
   * Tolerance: 300 seconds (5 min)
   */
  validateWebhookSignature(payload: string, signatureHeader: string, secret: string): boolean {
    try {
      const parts = Object.fromEntries(
        signatureHeader.split(',').map(p => p.split('=') as [string, string]),
      )
      const t = parts['t']
      const v1 = parts['v1']
      if (!t || !v1) return false

      // Replay protection: reject events > 5 minutes old
      const tolerance = 300
      if (Math.abs(Date.now() / 1000 - Number(t)) > tolerance) return false

      const signedPayload = `${t}.${payload}`
      const expected = createHmac('sha256', secret).update(signedPayload).digest('hex')

      const expectedBuf = Buffer.from(expected, 'hex')
      const receivedBuf = Buffer.from(v1, 'hex')
      if (expectedBuf.length !== receivedBuf.length) return false

      return timingSafeEqual(expectedBuf, receivedBuf)
    } catch {
      return false
    }
  },
}

// ─── Token persistence helper ──────────────────────────────────────────────────

export async function persistStravaTokens(userId: string, tokens: OAuthTokens): Promise<void> {
  await db.integration.update({
    where: { userId_provider: { userId, provider: 'STRAVA' } },
    data: {
      accessToken: encryptToken(tokens.accessToken),
      refreshToken: encryptToken(tokens.refreshToken),
      tokenExpiresAt: tokens.expiresAt,
      scope: tokens.scope ?? null,
      status: 'ACTIVE',
      errorCount: 0,
      errorMessage: null,
    },
  })
}
