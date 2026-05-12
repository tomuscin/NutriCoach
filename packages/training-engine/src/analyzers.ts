// @nutricoach/training-engine — Trend and form analyzers
// PMC (Performance Management Chart) computation, zone analysis

import type { TrainingLoad, Workout, PMCData, FormStatus, FTPZone } from '@nutricoach/types'

// ─── TSS Computation ──────────────────────────────────────────────────────────

/**
 * Estimate TSS from duration and RPE when power data is unavailable.
 * Uses: TSS = duration_hours * RPE^2 * 100 / 81
 * (Friel's RPE-based approximation)
 */
export function estimateTSSFromRPE(durationMinutes: number, rpe: number): number {
  const hours = durationMinutes / 60
  return Math.round((hours * rpe * rpe * 100) / 81)
}

/**
 * Calculate TSS from power data (accurate).
 * TSS = (duration_sec * NP * IF) / (FTP * 3600) * 100
 */
export function calculateTSSFromPower(params: {
  durationSeconds: number
  normalizedPowerW: number
  ftp: number
}): number {
  const { durationSeconds, normalizedPowerW, ftp } = params
  const intensityFactor = normalizedPowerW / ftp
  return Math.round(
    (durationSeconds * normalizedPowerW * intensityFactor) / (ftp * 3600) * 100,
  )
}

// ─── PMC Computation ──────────────────────────────────────────────────────────

const ATL_DAYS = 7    // Acute Training Load window
const CTL_DAYS = 42   // Chronic Training Load window

/**
 * Compute full PMC from an ordered array of daily TSS values (oldest first).
 * Returns one PMCData per day.
 */
export function computePMC(
  tssHistory: Array<{ date: string; tss: number }>,
): PMCData[] {
  let ctl = 0
  let atl = 0
  const ctlFactor = 2 / (CTL_DAYS + 1)
  const atlFactor = 2 / (ATL_DAYS + 1)

  return tssHistory.map(({ date, tss }) => {
    ctl = tss * ctlFactor + ctl * (1 - ctlFactor)
    atl = tss * atlFactor + atl * (1 - atlFactor)
    const tsb = ctl - atl

    return {
      date,
      ctl: Math.round(ctl * 10) / 10,
      atl: Math.round(atl * 10) / 10,
      tsb: Math.round(tsb * 10) / 10,
      dailyTSS: tss,
      formStatus: classifyForm(tsb),
    }
  })
}

/** Update CTL/ATL/TSB for a single new day — incremental update. */
export function incrementalPMCUpdate(
  previous: { ctl: number; atl: number },
  dailyTSS: number,
): { ctl: number; atl: number; tsb: number } {
  const ctlFactor = 2 / (CTL_DAYS + 1)
  const atlFactor = 2 / (ATL_DAYS + 1)

  const ctl = dailyTSS * ctlFactor + previous.ctl * (1 - ctlFactor)
  const atl = dailyTSS * atlFactor + previous.atl * (1 - atlFactor)
  const tsb = ctl - atl

  return {
    ctl: Math.round(ctl * 10) / 10,
    atl: Math.round(atl * 10) / 10,
    tsb: Math.round(tsb * 10) / 10,
  }
}

// ─── Form Classification ──────────────────────────────────────────────────────

/**
 * Classify form from TSB.
 * Based on Coggan/Allen training theory:
 * TSB > 25      = peak/fresh (maybe detrained if too long)
 * TSB 5-25      = fresh (optimal for racing)
 * TSB -10 to 5  = optimal training zone
 * TSB -30 to -10 = tired (building fitness)
 * TSB < -30     = overreached (injury risk)
 */
export function classifyForm(tsb: number): FormStatus {
  if (tsb > 25) return 'peak'
  if (tsb > 5) return 'fresh'
  if (tsb > -10) return 'optimal'
  if (tsb > -30) return 'tired'
  return 'overreached'
}

// ─── FTP Zones ────────────────────────────────────────────────────────────────

/** Generate Coggan 7-zone FTP model from FTP. */
export function calculateFTPZones(ftp: number): FTPZone[] {
  return [
    { zone: 1, name: 'Active Recovery', minPercent: 0, maxPercent: 55, minWatts: 0, maxWatts: Math.round(ftp * 0.55) },
    { zone: 2, name: 'Endurance', minPercent: 56, maxPercent: 75, minWatts: Math.round(ftp * 0.56), maxWatts: Math.round(ftp * 0.75) },
    { zone: 3, name: 'Tempo', minPercent: 76, maxPercent: 90, minWatts: Math.round(ftp * 0.76), maxWatts: Math.round(ftp * 0.90) },
    { zone: 4, name: 'Lactate Threshold', minPercent: 91, maxPercent: 105, minWatts: Math.round(ftp * 0.91), maxWatts: Math.round(ftp * 1.05) },
    { zone: 5, name: 'VO2 Max', minPercent: 106, maxPercent: 120, minWatts: Math.round(ftp * 1.06), maxWatts: Math.round(ftp * 1.20) },
    { zone: 6, name: 'Anaerobic Capacity', minPercent: 121, maxPercent: 150, minWatts: Math.round(ftp * 1.21), maxWatts: Math.round(ftp * 1.50) },
    { zone: 7, name: 'Neuromuscular Power', minPercent: 151, maxPercent: 300, minWatts: Math.round(ftp * 1.51), maxWatts: null },
  ] as FTPZone[]
}

// ─── Training Trend ───────────────────────────────────────────────────────────

export function analyzeTrainingTrend(workouts: Workout[]) {
  const recent7 = workouts.filter((w) => {
    const wDate = new Date(w.date)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)
    return wDate >= cutoff
  })

  const recent28 = workouts.filter((w) => {
    const wDate = new Date(w.date)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 28)
    return wDate >= cutoff
  })

  const totalTSS7d = recent7.reduce((sum, w) => sum + (w.tss ?? 0), 0)
  const totalTSS28d = recent28.reduce((sum, w) => sum + (w.tss ?? 0), 0)

  // Find dominant sport
  const sportCounts = recent28.reduce<Record<string, number>>((acc, w) => {
    acc[w.sportType] = (acc[w.sportType] ?? 0) + 1
    return acc
  }, {})

  const dominantSport = Object.keys(sportCounts).length > 0
    ? (Object.entries(sportCounts).sort((a, b) => b[1] - a[1])[0][0] as import('@nutricoach/types').SportType)
    : null

  return {
    totalTSS7d: Math.round(totalTSS7d),
    totalTSS28d: Math.round(totalTSS28d),
    avgTSS7d: recent7.length > 0 ? Math.round(totalTSS7d / recent7.length) : 0,
    dominantSport,
    workoutsThisWeek: recent7.length,
  }
}

/** FTP/kg — key performance ratio for cyclists. */
export function calculateFTPPerKg(ftpWatts: number, weightKg: number): number {
  return Math.round((ftpWatts / weightKg) * 100) / 100
}
