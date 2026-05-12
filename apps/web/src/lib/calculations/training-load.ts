// Training load calculations — TSS, ATL, CTL, TSB
// Based on TrainingPeaks methodology

export type TrainingLoadMetrics = {
  tss: number    // Training Stress Score (single workout)
  atl: number    // Acute Training Load (7-day avg) — Fatigue
  ctl: number    // Chronic Training Load (42-day avg) — Fitness
  tsb: number    // Training Stress Balance (CTL - ATL) — Form
  if_: number    // Intensity Factor (normalized power / FTP)
}

/**
 * Calculate TSS from duration, IF, and FTP
 * TSS = (duration_s × NP × IF) / (FTP × 3600) × 100
 * TODO: ETAP 5
 */
export function calculateTSS(_params: {
  durationSeconds: number
  normalizedPower: number
  ftp: number
}): number {
  throw new Error('TSS calculator not yet implemented — ETAP 5')
}

/**
 * Calculate ATL/CTL/TSB from TSS history
 * TODO: ETAP 5
 */
export function calculatePerformanceManagement(
  _tssHistory: Array<{ date: Date; tss: number }>
): Array<TrainingLoadMetrics & { date: Date }> {
  throw new Error('PMC calculator not yet implemented — ETAP 5')
}
