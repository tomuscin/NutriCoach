// @nutricoach/recovery-engine
// Recovery scoring: HRV, sleep quality, readiness composite score

import type { SleepMetric, RecoveryMetric } from '@nutricoach/types'

// ─────────────────────────────────────────────────────────────────────────────
// READINESS SCORE (0–100)
// Composite score from HRV, sleep, subjective quality
// Inspired by WHOOP/Oura methodology
// ─────────────────────────────────────────────────────────────────────────────

export type ReadinessInputs = {
  hrv?: number              // ms RMSSD (current morning)
  hrvBaseline?: number      // ms RMSSD (30-day baseline)
  sleepHours?: number
  sleepQuality?: number     // 1–5 or 0–100
  restingHr?: number
  restingHrBaseline?: number
  tsb?: number              // Training Stress Balance
}

export type ReadinessScore = {
  score: number             // 0–100
  status: 'peak' | 'high' | 'moderate' | 'low' | 'very_low'
  components: {
    hrvScore: number
    sleepScore: number
    hrScore: number
    formScore: number
  }
}

export function calculateReadiness(inputs: ReadinessInputs): ReadinessScore {
  const { hrv, hrvBaseline, sleepHours, sleepQuality, restingHr, restingHrBaseline, tsb } = inputs

  // HRV component (0–100)
  let hrvScore = 50
  if (hrv && hrvBaseline) {
    const ratio = hrv / hrvBaseline
    hrvScore = Math.round(Math.min(100, Math.max(0, (ratio - 0.6) * 250)))
  }

  // Sleep component (0–100)
  let sleepScore = 50
  if (sleepHours !== undefined) {
    // Optimal: 7–9h
    const hoursScore = sleepHours >= 8 ? 100 : sleepHours >= 7 ? 80 : sleepHours >= 6 ? 55 : 30
    const qualityBonus = sleepQuality
      ? typeof sleepQuality === 'number' && sleepQuality <= 5
        ? (sleepQuality / 5) * 20
        : (sleepQuality / 100) * 20
      : 0
    sleepScore = Math.min(100, hoursScore + qualityBonus)
  }

  // Resting HR component (0–100)
  let hrScore = 50
  if (restingHr && restingHrBaseline) {
    const delta = restingHr - restingHrBaseline
    // +5 bpm above baseline = fatigue signal
    hrScore = Math.round(Math.min(100, Math.max(0, 80 - delta * 10)))
  }

  // Training form component (0–100)
  let formScore = 50
  if (tsb !== undefined) {
    // TSB -30 to +30 mapped to 0–100
    formScore = Math.round(Math.min(100, Math.max(0, ((tsb + 30) / 60) * 100)))
  }

  // Composite: HRV most important (40%), sleep (30%), HR (15%), form (15%)
  const score = Math.round(
    hrvScore * 0.4 + sleepScore * 0.3 + hrScore * 0.15 + formScore * 0.15
  )

  const status: ReadinessScore['status'] =
    score >= 85 ? 'peak'
    : score >= 70 ? 'high'
    : score >= 50 ? 'moderate'
    : score >= 30 ? 'low'
    : 'very_low'

  return {
    score,
    status,
    components: { hrvScore, sleepScore, hrScore, formScore },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SLEEP ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

export type SleepAnalysis = {
  averageDuration: number
  averageQuality: number
  trend: 'improving' | 'stable' | 'declining'
  deficit: number   // hours of sleep debt vs 8h target
}

export function analyzeSleep(history: SleepMetric[], targetHours = 8): SleepAnalysis {
  if (history.length === 0) {
    return { averageDuration: 0, averageQuality: 0, trend: 'stable', deficit: 0 }
  }

  const durations = history.map((s) => s.durationHours)
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
  const avgQuality = history.reduce((a, s) => a + (s.quality ?? 3), 0) / history.length
  const deficit = Math.max(0, targetHours - avgDuration) * history.length

  // Simple trend: compare last 3 vs previous 3
  let trend: SleepAnalysis['trend'] = 'stable'
  if (history.length >= 6) {
    const recent = durations.slice(-3).reduce((a, b) => a + b, 0) / 3
    const older = durations.slice(-6, -3).reduce((a, b) => a + b, 0) / 3
    if (recent > older + 0.25) trend = 'improving'
    else if (recent < older - 0.25) trend = 'declining'
  }

  return {
    averageDuration: Math.round(avgDuration * 10) / 10,
    averageQuality: Math.round(avgQuality * 10) / 10,
    trend,
    deficit: Math.round(deficit * 10) / 10,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HRV BASELINE
// ─────────────────────────────────────────────────────────────────────────────

export function calculateHRVBaseline(measurements: RecoveryMetric[]): number | null {
  const hrvsWithValues = measurements.filter((m) => m.hrv !== undefined)
  if (hrvsWithValues.length < 5) return null
  const values = hrvsWithValues.map((m) => m.hrv as number)
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length)
}
