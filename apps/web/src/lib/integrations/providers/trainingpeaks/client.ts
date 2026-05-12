// TrainingPeaks API client — server-only
// Handles authenticated requests to the TP v1 REST API with
// rate-limit awareness and structured error handling.

import 'server-only'
import { IntegrationError } from '../../core/types'
import type { TPAthleteProfile, TPWorkout, TPTokenResponse } from './types'

const BASE_URL = 'https://api.trainingpeaks.com/v1'
const TOKEN_URL = 'https://oauth.trainingpeaks.com/OAuth/Token'

// ─── Internal fetch wrapper ────────────────────────────────────────────────────

async function tpFetch<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (res.status === 401) {
    throw new IntegrationError(
      'TrainingPeaks access token expired or invalid',
      'TRAININGPEAKS',
      'TOKEN_EXPIRED',
      true,
    )
  }
  if (res.status === 429) {
    throw new IntegrationError(
      'TrainingPeaks rate limit exceeded',
      'TRAININGPEAKS',
      'RATE_LIMITED',
      true,
    )
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new IntegrationError(
      `TrainingPeaks API error ${res.status}: ${body}`,
      'TRAININGPEAKS',
      'INVALID_RESPONSE',
      res.status >= 500,
    )
  }

  return res.json() as Promise<T>
}

// ─── OAuth ────────────────────────────────────────────────────────────────────

function getClientCredentials() {
  const id = process.env.TRAININGPEAKS_CLIENT_ID
  const secret = process.env.TRAININGPEAKS_CLIENT_SECRET
  if (!id || !secret) throw new Error('TRAININGPEAKS_CLIENT_ID / CLIENT_SECRET not set')
  return { id, secret }
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
): Promise<TPTokenResponse> {
  const { id, secret } = getClientCredentials()

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: id,
    client_secret: secret,
  })

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new IntegrationError(
      `Token exchange failed ${res.status}: ${text}`,
      'TRAININGPEAKS',
      'AUTH_FAILED',
    )
  }

  return res.json() as Promise<TPTokenResponse>
}

export async function refreshAccessToken(refreshToken: string): Promise<TPTokenResponse> {
  const { id, secret } = getClientCredentials()

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: id,
    client_secret: secret,
  })

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (res.status === 400) {
    throw new IntegrationError(
      'TrainingPeaks refresh token revoked or invalid',
      'TRAININGPEAKS',
      'TOKEN_REVOKED',
    )
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new IntegrationError(
      `Token refresh failed ${res.status}: ${text}`,
      'TRAININGPEAKS',
      'AUTH_FAILED',
      true,
    )
  }

  return res.json() as Promise<TPTokenResponse>
}

// ─── API methods ──────────────────────────────────────────────────────────────

export async function fetchAthleteProfile(accessToken: string): Promise<TPAthleteProfile> {
  return tpFetch<TPAthleteProfile>('/athlete/profile', accessToken)
}

/**
 * Fetch workouts between startDate and endDate (inclusive, ISO format YYYY-MM-DD)
 */
export async function fetchWorkouts(
  accessToken: string,
  athleteId: string,
  startDate: string,
  endDate: string,
): Promise<TPWorkout[]> {
  const result = await tpFetch<TPWorkout[]>(
    `/workouts/${athleteId}/${startDate}/${endDate}`,
    accessToken,
  )
  return Array.isArray(result) ? result : []
}
