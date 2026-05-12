// @nutricoach/training-engine
// Training load analysis: TSS, ATL, CTL, TSB, FTP zones

import type { TrainingLoad } from '@nutricoach/types'

// ─────────────────────────────────────────────────────────────────────────────
// TSS CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

export type TSSParams = {
  durationSeconds: number
  normalizedPower: number  // watts
  ftp: number              // watts
}

/**
 * TSS = (duration_s × NP × IF) / (FTP × 3600) × 100
 * IF = NP / FTP
 */
export function calculateTSS(params: TSSParams): number {
  const { durationSeconds, normalizedPower, ftp } = params
  if (ftp <= 0) return 0
  const intensityFactor = normalizedPower / ftp
  return Math.round((durationSeconds * normalizedPower * intensityFactor) / (ftp * 3600) * 100)
}

/**
 * Estimate TSS from duration and RPE (when no power data)
 * Rough estimate: 50 TSS/h at moderate effort (RPE 6/10)
 */
export function estimateTSSFromRPE(durationMinutes: number, rpe: number): number {
  const rpeMultiplier = rpe / 6  // normalized to "moderate"
  return Math.round((durationMinutes / 60) * 50 * rpeMultiplier)
}

// ─────────────────────────────────────────────────────────────────────────────
// PERFORMANCE MANAGEMENT CHART (ATL, CTL, TSB)
// ─────────────────────────────────────────────────────────────────────────────

const ATL_CONSTANT = 7   // days (fatigue)
const CTL_CONSTANT = 42  // days (fitness)

/**
 * Calculate ATL/CTL/TSB from TSS history
 * Uses exponential weighted moving average
 */
export function calculatePMC(
  tssHistory: Array<{ date: string; tss: number }>
): Array<TrainingLoad> {
  const sorted = [...tssHistory].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  let atl = 0
  let ctl = 0

  return sorted.map((entry) => {
    const atlDecay = 1 - Math.exp(-1 / ATL_CONSTANT)
    const ctlDecay = 1 - Math.exp(-1 / CTL_CONSTANT)

    atl = atl + (entry.tss - atl) * atlDecay
    ctl = ctl + (entry.tss - ctl) * ctlDecay

    const tsb = ctl - atl

    return {
      date: entry.date,
      tss: entry.tss,
      atl: Math.round(atl * 10) / 10,
      ctl: Math.round(ctl * 10) / 10,
      tsb: Math.round(tsb * 10) / 10,
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// TRAINING ZONES (Coggan FTP-based)
// ─────────────────────────────────────────────────────────────────────────────

export type TrainingZone = {
  zone: 1 | 2 | 3 | 4 | 5 | 6 | 7
  name: string
  label: string
  minPercent: number
  maxPercent: number
  minWatts: number
  maxWatts: number
}

export function calculateFTPZones(ftp: number): TrainingZone[] {
  const zones: Omit<TrainingZone, 'minWatts' | 'maxWatts'>[] = [
    { zone: 1, name: 'Active Recovery', label: 'Z1', minPercent: 0, maxPercent: 55 },
    { zone: 2, name: 'Endurance', label: 'Z2', minPercent: 55, maxPercent: 75 },
    { zone: 3, name: 'Tempo', label: 'Z3', minPercent: 75, maxPercent: 90 },
    { zone: 4, name: 'Lactate Threshold', label: 'Z4', minPercent: 90, maxPercent: 105 },
    { zone: 5, name: 'VO2max', label: 'Z5', minPercent: 105, maxPercent: 120 },
    { zone: 6, name: 'Anaerobic', label: 'Z6', minPercent: 120, maxPercent: 150 },
    { zone: 7, name: 'Neuromuscular', label: 'Z7', minPercent: 150, maxPercent: 999 },
  ]

  return zones.map((z) => ({
    ...z,
    minWatts: Math.round(ftp * z.minPercent / 100),
    maxWatts: z.maxPercent === 999 ? 9999 : Math.round(ftp * z.maxPercent / 100),
  })) as TrainingZone[]
}

// ─────────────────────────────────────────────────────────────────────────────
// READINESS / FORM
// ─────────────────────────────────────────────────────────────────────────────

export type FormStatus = 'optimal' | 'fresh' | 'tired' | 'very_tired' | 'overreaching'

export function interpretTSB(tsb: number): FormStatus {
  if (tsb > 25) return 'fresh'
  if (tsb >= 5) return 'optimal'
  if (tsb >= -10) return 'tired'
  if (tsb >= -30) return 'very_tired'
  return 'overreaching'
}
