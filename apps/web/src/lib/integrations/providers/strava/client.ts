// Strava API client — server-only
// Handles authenticated requests to the Strava v3 REST API.

import 'server-only'
import { IntegrationError } from '../../core/types'
import type {
  StravaSummaryActivity,
  StravaDetailedActivity,
  StravaAthleteSummary,
  StravaTokenResponse,
} from './types'

const BASE_URL = 'https://www.strava.com/api/v3'
const TOKEN_URL = 'https://www.strava.com/oauth/token'

// ─── Internal fetch wrapper ────────────────────────────────────────────────────

async function stravaFetch<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    next: { revalidate: 0 },
  })

  if (res.status === 401) {
    throw new IntegrationError(
      'Strava access token expired or invalid',
      'STRAVA',
      'TOKEN_EXPIRED',
      true,
    )
  }
  if (res.status === 429) {
    throw new IntegrationError(
      'Strava rate limit exceeded',
      'STRAVA',
      'RATE_LIMITED',
      true,
    )
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new IntegrationError(
      `Strava API error ${res.status}: ${body}`,
      'STRAVA',
      'INVALID_RESPONSE',
      res.status >= 500,
    )
  }

  return res.json() as Promise<T>
}

// ─── OAuth ────────────────────────────────────────────────────────────────────

function getClientCredentials() {
  const id = process.env.STRAVA_CLIENT_ID
  const secret = process.env.STRAVA_CLIENT_SECRET
  if (!id || !secret) throw new Error('STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET not set')
  return { id, secret }
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
): Promise<StravaTokenResponse> {
  const { id, secret } = getClientCredentials()

  const body = new URLSearchParams({
    client_id: id,
    client_secret: secret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  })

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new IntegrationError(
      `Strava token exchange failed ${res.status}: ${text}`,
      'STRAVA',
      'AUTH_FAILED',
    )
  }

  return res.json() as Promise<StravaTokenResponse>
}

export async function refreshAccessToken(refreshToken: string): Promise<StravaTokenResponse> {
  const { id, secret } = getClientCredentials()

  const body = new URLSearchParams({
    client_id: id,
    client_secret: secret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (res.status === 400) {
    throw new IntegrationError(
      'Strava refresh token revoked or invalid',
      'STRAVA',
      'TOKEN_REVOKED',
    )
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new IntegrationError(
      `Strava token refresh failed ${res.status}: ${text}`,
      'STRAVA',
      'AUTH_FAILED',
    )
  }

  return res.json() as Promise<StravaTokenResponse>
}

// ─── Athletes ─────────────────────────────────────────────────────────────────

export async function fetchAthleteProfile(accessToken: string): Promise<StravaAthleteSummary> {
  return stravaFetch<StravaAthleteSummary>('/athlete', accessToken)
}

// ─── Activities ───────────────────────────────────────────────────────────────

/**
 * List athlete activities since a given epoch timestamp.
 * Strava returns up to 200 per page — paginates automatically.
 */
export async function fetchActivities(
  accessToken: string,
  afterEpoch: number,
): Promise<StravaSummaryActivity[]> {
  const all: StravaSummaryActivity[] = []
  let page = 1
  const perPage = 200

  while (true) {
    const url = `/athlete/activities?after=${afterEpoch}&page=${page}&per_page=${perPage}`
    const batch = await stravaFetch<StravaSummaryActivity[]>(url, accessToken)
    all.push(...batch)

    if (batch.length < perPage) break // last page
    page++

    // Safety cap: 5 pages = 1000 activities per sync
    if (page > 5) break
  }

  return all
}

/**
 * Fetch a single detailed activity (includes calories, description).
 */
export async function fetchDetailedActivity(
  accessToken: string,
  activityId: number,
): Promise<StravaDetailedActivity> {
  return stravaFetch<StravaDetailedActivity>(`/activities/${activityId}`, accessToken)
}
