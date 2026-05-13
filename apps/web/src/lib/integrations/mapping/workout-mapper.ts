// Workout Mapper — TrainingPeaks → NutriCoach normalized workout
import type { TPWorkout } from '../providers/trainingpeaks/types'
import { TP_SPORT_MAP } from '../providers/trainingpeaks/types'
import type { StravaSummaryActivity } from '../providers/strava/types'
import { STRAVA_SPORT_MAP } from '../providers/strava/types'
import type { NormalizedWorkout } from '../core/types'

export function normalizeTPWorkout(raw: TPWorkout): NormalizedWorkout {
  const durationSec = raw.CompletedWorkoutTime ?? raw.TotalTime ?? raw.PlannedDuration ?? 0

  // WorkoutDay is "YYYY-MM-DD" local date
  const date = new Date(raw.WorkoutDay + 'T00:00:00Z')

  const startedAt = raw.StartTime ? new Date(raw.StartTime) : undefined
  const finishedAt =
    startedAt && durationSec ? new Date(startedAt.getTime() + durationSec * 1000) : undefined

  return {
    externalId: String(raw.WorkoutId),
    date,
    startedAt,
    finishedAt,
    durationMinutes: Math.round(durationSec / 60),
    title: raw.Title ?? undefined,
    sportType: TP_SPORT_MAP[raw.WorkoutType ?? ''] ?? 'OTHER',
    distanceKm: raw.Distance ? raw.Distance / 1000 : undefined,
    elevationGainM: raw.ElevationGain ?? undefined,
    avgHR: raw.AverageHeartRate ?? undefined,
    maxHR: raw.MaximumHeartRate ?? undefined,
    avgPowerW: raw.AveragePower ?? undefined,
    normalizedPowerW: raw.NormalizedPower ?? undefined,
    caloriesBurned: raw.Calories ?? undefined,
    tss: raw.Tss ?? undefined,
    intensityFactor: raw.If ?? undefined,
    ftpSnapshot: raw.FtpUsed ?? undefined,
    rpe: raw.Perceived ?? undefined,
    isPlanned: raw.IsPlanned ?? (raw.Completed !== true),
    plannedDurationMin: raw.PlannedDuration ? Math.round(raw.PlannedDuration / 60) : undefined,
    plannedTSS: raw.PlannedTss ?? undefined,
    indoor: raw.Indoor ?? false,
    raw: raw as unknown as Record<string, unknown>,
  }
}

export function normalizeStravaActivity(raw: StravaSummaryActivity): NormalizedWorkout {
  const startedAt = new Date(raw.start_date)
  const finishedAt = new Date(startedAt.getTime() + raw.moving_time * 1000)

  // Strava date is UTC ISO string; derive local date from start_date_local
  const localDateStr = raw.start_date_local.substring(0, 10)
  const date = new Date(localDateStr + 'T00:00:00Z')

  return {
    externalId: String(raw.id),
    date,
    startedAt,
    finishedAt,
    durationMinutes: Math.round(raw.moving_time / 60),
    title: raw.name ?? undefined,
    sportType: STRAVA_SPORT_MAP[raw.sport_type] ?? 'OTHER',
    distanceKm: raw.distance ? raw.distance / 1000 : undefined,
    elevationGainM: raw.total_elevation_gain ?? undefined,
    avgHR: raw.average_heartrate ?? undefined,
    maxHR: raw.max_heartrate ?? undefined,
    avgPowerW: raw.average_watts ?? undefined,
    normalizedPowerW: raw.weighted_average_watts ?? undefined,
    // calories not available in SummaryActivity — only DetailedActivity
    caloriesBurned: undefined,
    indoor: raw.trainer ?? false,
    isPlanned: false,
    raw: raw as unknown as Record<string, unknown>,
  }
}
