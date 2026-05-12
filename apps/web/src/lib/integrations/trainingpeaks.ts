// TrainingPeaks Integration Layer — Architecture Foundation
// Full OAuth + sync implementation in ETAP 9

export const TP_CONFIG = {
  AUTH_URL: 'https://oauth.trainingpeaks.com/OAuth/Authorize',
  TOKEN_URL: 'https://oauth.trainingpeaks.com/OAuth/Token',
  API_BASE_URL: 'https://api.trainingpeaks.com/v1',
  SCOPE: 'workouts:read athlete:read',
  TOKEN_REFRESH_THRESHOLD_MINUTES: 10,
} as const

export type TPTokens = {
  accessToken: string
  refreshToken: string
  expiresAt: Date
  scope: string
}

export type TPWorkout = {
  workoutId: string
  athleteId: string
  startTime: string
  totalTime: number          // seconds
  distanceInMeters?: number
  calories?: number
  tss?: number
  if_?: number              // Intensity Factor
  normalizedPower?: number
  averageHeartRate?: number
  maxHeartRate?: number
  workoutType: string
  title?: string
  description?: string
}

export type TPAthleteProfile = {
  athleteId: string
  displayName: string
  ftp?: number              // Functional Threshold Power (watts)
  lthr?: number             // Lactate Threshold Heart Rate
  weight?: number           // kg
}

export type TPSyncStatus = 'pending' | 'running' | 'success' | 'failed' | 'partial'

/**
 * Build OAuth authorization URL with PKCE
 * TODO: ETAP 9
 */
export function buildAuthUrl(_state: string, _codeChallenge: string): string {
  throw new Error('TP OAuth not yet implemented — ETAP 9')
}

/**
 * Exchange authorization code for tokens
 * TODO: ETAP 9
 */
export async function exchangeCodeForTokens(
  _code: string,
  _codeVerifier: string
): Promise<TPTokens> {
  throw new Error('TP token exchange not yet implemented — ETAP 9')
}

/**
 * Refresh access token
 * TODO: ETAP 9
 */
export async function refreshAccessToken(_refreshToken: string): Promise<TPTokens> {
  throw new Error('TP token refresh not yet implemented — ETAP 9')
}

/**
 * Fetch workouts for date range
 * TODO: ETAP 9
 */
export async function fetchWorkouts(
  _tokens: TPTokens,
  _startDate: Date,
  _endDate: Date
): Promise<TPWorkout[]> {
  throw new Error('TP workout fetch not yet implemented — ETAP 9')
}

/**
 * Fetch athlete profile (FTP, LTHR, weight)
 * TODO: ETAP 9
 */
export async function fetchAthleteProfile(_tokens: TPTokens): Promise<TPAthleteProfile> {
  throw new Error('TP athlete profile not yet implemented — ETAP 9')
}
