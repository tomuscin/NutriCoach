// @nutricoach/recovery-engine — Readiness scoring and trend analyzers

import type { RecoveryMetric, SleepMetric, TrainingLoad, ReadinessScore, RecoveryStatus } from '@nutricoach/types'

// ─── Readiness Score ──────────────────────────────────────────────────────────

/**
 * Composite readiness score:
 * - HRV vs baseline:     40%
 * - Sleep quality:       30%
 * - Resting HR:          15%
 * - Training form (TSB): 15%
 */
export function calculateReadinessScore(params: {
  recovery: RecoveryMetric
  latestSleep: SleepMetric | null
  trainingLoad: TrainingLoad | null
  hrvBaseline: number | null
}): ReadinessScore {
  const { recovery, latestSleep, trainingLoad, hrvBaseline } = params

  // HRV component (0-100)
  let hrvScore: number | null = null
  if (recovery.hrv !== null && hrvBaseline !== null && hrvBaseline > 0) {
    const ratio = recovery.hrv / hrvBaseline
    hrvScore = Math.min(100, Math.max(0, (ratio - 0.5) * 200))
  }

  // Sleep component (0-100) — based on total sleep hours vs 8h target
  let sleepScore: number | null = null
  if (latestSleep?.totalSleepMinutes !== null && latestSleep?.totalSleepMinutes !== undefined) {
    const targetMinutes = 480 // 8 hours
    const ratio = latestSleep.totalSleepMinutes / targetMinutes
    sleepScore = Math.min(100, Math.max(0, ratio * 100))
    // Boost for REM/deep quality
    if (latestSleep.sleepScore !== null) {
      sleepScore = (sleepScore + latestSleep.sleepScore) / 2
    }
  }

  // Resting HR component (0-100) — lower = better
  let hrScore: number | null = null
  if (recovery.restingHR !== null) {
    // Typical resting HR 40-80 → mapped to score 100-0
    hrScore = Math.min(100, Math.max(0, ((80 - recovery.restingHR) / 40) * 100))
  }

  // Training form component (0-100) from TSB
  let formScore: number | null = null
  if (trainingLoad !== null) {
    const tsb = trainingLoad.tsb
    // TSB: -30 to +25 → score 0-100, optimal at TSB ~0 to +10
    formScore = Math.min(100, Math.max(0, ((tsb + 30) / 55) * 100))
  }

  // Weighted composite
  const weights = { hrv: 0.4, sleep: 0.3, hr: 0.15, form: 0.15 }
  let totalWeight = 0
  let totalScore = 0

  if (hrvScore !== null) { totalScore += hrvScore * weights.hrv; totalWeight += weights.hrv }
  if (sleepScore !== null) { totalScore += sleepScore * weights.sleep; totalWeight += weights.sleep }
  if (hrScore !== null) { totalScore += hrScore * weights.hr; totalWeight += weights.hr }
  if (formScore !== null) { totalScore += formScore * weights.form; totalWeight += weights.form }

  const score = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 50
  const status = classifyReadiness(score)

  return {
    score,
    status,
    components: {
      hrv: hrvScore !== null ? Math.round(hrvScore) : null,
      sleep: sleepScore !== null ? Math.round(sleepScore) : null,
      restingHR: hrScore !== null ? Math.round(hrScore) : null,
      form: formScore !== null ? Math.round(formScore) : null,
    },
    recommendation: generateRecommendation(status, params),
  }
}

// ─── Status Classification ────────────────────────────────────────────────────

export function classifyReadiness(score: number): RecoveryStatus {
  if (score >= 85) return 'PEAK'
  if (score >= 70) return 'HIGH'
  if (score >= 50) return 'MODERATE'
  if (score >= 30) return 'LOW'
  return 'VERY_LOW'
}

// ─── HRV Baseline ────────────────────────────────────────────────────────────

/**
 * Rolling HRV baseline — exponentially-weighted moving average.
 * More recent values have higher weight.
 */
export function calculateHRVBaseline(measurements: number[]): number | null {
  if (measurements.length === 0) return null
  const alpha = 2 / (measurements.length + 1)
  return measurements.reduce((ema, v) => v * alpha + ema * (1 - alpha))
}

// ─── Sleep Analysis ───────────────────────────────────────────────────────────

export type SleepAnalysis = {
  avgTotalMinutes: number
  avgDeepMinutes: number | null
  avgREMMinutes: number | null
  avgSleepScore: number | null
  sleepDebtMinutes: number  // vs 8h target
  consistency: number       // 0-100, based on bedtime variance
}

export function analyzeSleep(history: SleepMetric[], targetHours = 8): SleepAnalysis {
  if (history.length === 0) {
    return { avgTotalMinutes: 0, avgDeepMinutes: null, avgREMMinutes: null, avgSleepScore: null, sleepDebtMinutes: 0, consistency: 0 }
  }

  const targetMinutes = targetHours * 60

  const totalMinutes = history.filter(h => h.totalSleepMinutes !== null).map(h => h.totalSleepMinutes as number)
  const deepMinutes = history.filter(h => h.deepSleepMinutes !== null).map(h => h.deepSleepMinutes as number)
  const remMinutes = history.filter(h => h.remSleepMinutes !== null).map(h => h.remSleepMinutes as number)
  const scores = history.filter(h => h.sleepScore !== null).map(h => h.sleepScore as number)

  const avgTotal = avg(totalMinutes)
  const sleepDebt = targetMinutes - avgTotal

  // Consistency: measure variance in sleep start times
  const startHours = history
    .map(h => {
      const d = new Date(h.sleepStart)
      return d.getHours() + d.getMinutes() / 60
    })
    .filter(h => !isNaN(h))

  const consistency = startHours.length >= 2
    ? Math.max(0, 100 - variance(startHours) * 10)
    : 100

  return {
    avgTotalMinutes: Math.round(avgTotal),
    avgDeepMinutes: deepMinutes.length ? Math.round(avg(deepMinutes)) : null,
    avgREMMinutes: remMinutes.length ? Math.round(avg(remMinutes)) : null,
    avgSleepScore: scores.length ? Math.round(avg(scores)) : null,
    sleepDebtMinutes: Math.round(sleepDebt),
    consistency: Math.round(consistency),
  }
}

// ─── Recommendation Generator ─────────────────────────────────────────────────

function generateRecommendation(
  status: RecoveryStatus,
  params: Parameters<typeof calculateReadinessScore>[0],
): string {
  const { latestSleep, trainingLoad } = params

  switch (status) {
    case 'PEAK':
      return 'Optimal recovery — great day for a high-intensity session or race effort.'
    case 'HIGH':
      return 'Good recovery — quality training is appropriate today.'
    case 'MODERATE': {
      const sleepOk = (latestSleep?.totalSleepMinutes ?? 0) >= 420
      if (!sleepOk) return 'Moderate recovery, with some sleep deficit. Consider a lighter session.'
      if (trainingLoad && trainingLoad.tsb < -15) {
        return 'Moderate recovery under accumulated fatigue. Keep intensity controlled.'
      }
      return 'Moderate recovery — aerobic or technique work is appropriate.'
    }
    case 'LOW':
      return 'Low recovery today. Prioritise Z1-Z2 work, mobility, or full rest.'
    case 'VERY_LOW':
      return 'Very low recovery. Rest day strongly recommended — avoid intensity.'
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function avg(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function variance(values: number[]): number {
  if (values.length < 2) return 0
  const mean = avg(values)
  return avg(values.map((v) => (v - mean) ** 2))
}
