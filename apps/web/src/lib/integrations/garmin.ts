// Garmin Connect Integration — Architecture Foundation
// Full implementation in ETAP 10

export const GARMIN_CONFIG = {
  AUTH_URL: 'https://connect.garmin.com/oauthConfirm',
  API_BASE_URL: 'https://apis.garmin.com/wellness-api/rest',
} as const

export type GarminActivity = {
  activityId: string
  startTimeInSeconds: number
  durationInSeconds: number
  averageHeartRateInBeatsPerMinute?: number
  activeKilocalories?: number
  steps?: number
  activityType: string
}

export type GarminSleepData = {
  calendarDate: string
  durationInSeconds: number
  remSleepInSeconds?: number
  deepSleepInSeconds?: number
  lightSleepInSeconds?: number
  awakeSleepInSeconds?: number
  averageSpO2Value?: number
  averageStressLevel?: number
}

export type GarminBodyBattery = {
  calendarDate: string
  charged: number
  drained: number
}

// TODO: ETAP 10 — implement full Garmin OAuth + activity sync

export async function fetchGarminActivities(): Promise<GarminActivity[]> {
  throw new Error('Garmin integration not yet implemented — ETAP 10')
}
