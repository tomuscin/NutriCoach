// AI Quality Engine — ETAP 5.5
// Multi-dimensional confidence scoring before and after AI generation.
//
// Analyzes:
//   - Data completeness (what signals are present)
//   - Data freshness (how old is the data)
//   - Physiological reliability (HRV, CTL/ATL consistency)
//   - Nutrition tracking consistency
//   - Outlier detection
//
// Returns AIConfidenceBreakdown used for:
//   - Prompt calibration (tell AI what data it can rely on)
//   - UX warnings ("not enough data to generate reliable insight")
//   - Insight persistence (stored per insight for analytics)
//   - Observability (Sentry, pino logs)

import type { AIContext } from './context-builder'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AIConfidenceBreakdown = {
  overall: number               // 0-1, weighted composite
  nutritionConfidence: number   // 0-1
  trainingConfidence: number    // 0-1
  recoveryConfidence: number    // 0-1
  dataCompleteness: number      // 0-1, fraction of signals present
  dataFreshness: number         // 0-1, recency-weighted
  physiologicalReliability: number // 0-1, HRV/CTL/ATL plausibility
  missingSignals: string[]      // human-readable, in Polish
}

export type QualityTier = 'high' | 'medium' | 'low' | 'insufficient'

export type QualityReport = {
  breakdown: AIConfidenceBreakdown
  tier: QualityTier
  canGenerate: boolean          // false = not enough data to produce anything useful
  primaryWarnings: string[]     // surface to user in UI
}

// ─── Thresholds ────────────────────────────────────────────────────────────────

export const QUALITY_THRESHOLDS = {
  HIGH: 0.75,
  MEDIUM: 0.45,
  MINIMUM: 0.20,  // below = canGenerate: false
} as const

// ─── Main entry point ────────────────────────────────────────────────────────

export function computeQuality(ctx: AIContext): QualityReport {
  const nutrition = scoreNutrition(ctx)
  const training = scoreTraining(ctx)
  const recovery = scoreRecovery(ctx)
  const completeness = scoreCompleteness(ctx)
  const freshness = scoreDataFreshness(ctx)
  const physiological = scorePhysiological(ctx)
  const missing = collectMissingSignals(ctx)

  // Weighted overall score
  // Nutrition + recovery most important for daily coaching
  const overall = clamp(
    nutrition * 0.30 +
    recovery  * 0.25 +
    training  * 0.15 +
    completeness * 0.15 +
    freshness * 0.10 +
    physiological * 0.05,
    0, 1,
  )

  const rounded = round2(overall)
  const tier = scoreTier(rounded)
  const canGenerate = rounded >= QUALITY_THRESHOLDS.MINIMUM

  const primaryWarnings = buildWarnings(ctx, rounded, missing)

  return {
    breakdown: {
      overall: rounded,
      nutritionConfidence: round2(nutrition),
      trainingConfidence: round2(training),
      recoveryConfidence: round2(recovery),
      dataCompleteness: round2(completeness),
      dataFreshness: round2(freshness),
      physiologicalReliability: round2(physiological),
      missingSignals: missing,
    },
    tier,
    canGenerate,
    primaryWarnings,
  }
}

// ─── Dimension scorers ────────────────────────────────────────────────────────

function scoreNutrition(ctx: AIContext): number {
  let score = 0
  let signals = 0

  // Yesterday's nutrition — most important
  if (ctx.caloriesYesterday !== null) {
    score += 0.40
    signals++
    // Bonus: we have protein too
    if (ctx.proteinYesterday !== null) score += 0.15
    // Bonus: we have carbs + fat
    if (ctx.carbsYesterday !== null && ctx.fatYesterday !== null) score += 0.10
  }

  // Target known
  if (ctx.calorieTargetYesterday !== null || ctx.goal.caloricTarget !== null) {
    score += 0.15
    signals++
  }

  // 7-day trend — better historical confidence
  const caloriesLogged = ctx.caloriesLast7d.filter((c) => c > 0).length
  if (caloriesLogged >= 5) {
    score += 0.20
    signals++
  } else if (caloriesLogged >= 2) {
    score += 0.10
  }

  // Streak bonus — consistent tracker
  if (ctx.streakDays >= 7) score += 0.10
  else if (ctx.streakDays >= 3) score += 0.05

  // Today's data for midday/evening
  if (ctx.caloriesToday !== null && ctx.caloriesToday > 0) score += 0.05

  // Outlier detection: suspiciously low or high
  if (ctx.caloriesYesterday !== null) {
    if (ctx.caloriesYesterday < 500 || ctx.caloriesYesterday > 6000) {
      score -= 0.15  // plausibility penalty
    }
  }

  return clamp(signals === 0 ? 0 : score, 0, 1)
}

function scoreTraining(ctx: AIContext): number {
  let score = 0

  if (ctx.lastWorkout !== null) {
    score += 0.30

    // Duration plausibility
    if (ctx.lastWorkout.durationMin > 0 && ctx.lastWorkout.durationMin < 600) {
      score += 0.10
    }

    // TSS available
    if (ctx.lastWorkout.tss !== null) score += 0.10

    // Recency — how long ago was the last workout
    const daysSince = daysBetween(ctx.lastWorkout.date, ctx.date)
    if (daysSince <= 1) score += 0.20
    else if (daysSince <= 3) score += 0.10
    else if (daysSince <= 7) score += 0.05
  }

  // Training load metrics
  if (ctx.ctl !== null && ctx.atl !== null && ctx.tsb !== null) {
    score += 0.30
    // Plausibility checks
    if (ctx.ctl >= 0 && ctx.ctl <= 200 && ctx.atl >= 0 && ctx.atl <= 300) {
      score += 0.05
    }
  } else if (ctx.ctl !== null || ctx.tsb !== null) {
    score += 0.10
  }

  return clamp(score, 0, 1)
}

function scoreRecovery(ctx: AIContext): number {
  let score = 0

  // Readiness score
  if (ctx.readiness !== null) {
    score += 0.30
    // Plausibility
    if (ctx.readiness >= 0 && ctx.readiness <= 100) score += 0.05
  }

  // Sleep hours — fundamental
  if (ctx.sleepHours !== null) {
    score += 0.25
    if (ctx.sleepQuality !== null) score += 0.10
    // Plausibility
    if (ctx.sleepHours >= 2 && ctx.sleepHours <= 14) score += 0.05
  }

  // HRV — gold signal
  if (ctx.hrv !== null) {
    score += 0.20
    if (ctx.hrv >= 5 && ctx.hrv <= 200) score += 0.05  // plausibility
  }

  // Resting HR
  if (ctx.restingHR !== null) {
    score += 0.10
    if (ctx.restingHR >= 30 && ctx.restingHR <= 120) score += 0.05  // plausibility
  }

  return clamp(score, 0, 1)
}

function scoreCompleteness(ctx: AIContext): number {
  const checks = [
    ctx.weightKg !== null,
    ctx.caloriesYesterday !== null,
    ctx.proteinYesterday !== null,
    ctx.readiness !== null || ctx.sleepHours !== null,
    ctx.hrv !== null,
    ctx.ctl !== null,
    ctx.lastWorkout !== null,
    ctx.goal.caloricTarget !== null || ctx.calorieTargetYesterday !== null,
    ctx.streakDays >= 3,
    ctx.caloriesLast7d.filter((c) => c > 0).length >= 3,
  ]
  return checks.filter(Boolean).length / checks.length
}

function scoreDataFreshness(ctx: AIContext): number {
  let score = 0.5  // base: some data assumed present
  let signals = 0

  // Recovery data — ideally yesterday
  if (ctx.readiness !== null || ctx.hrv !== null || ctx.sleepHours !== null) {
    score += 0.25
    signals++
  }

  // Nutrition data — yesterday
  if (ctx.caloriesYesterday !== null) {
    score += 0.20
    signals++
  }

  // Weight — recent
  if (ctx.weightKg !== null) {
    score += 0.15
    signals++
    if (ctx.weightLast7d.length >= 3) score += 0.05
  }

  // Training load — needs recent workout to be meaningful
  if (ctx.ctl !== null && ctx.lastWorkout !== null) {
    const daysSince = daysBetween(ctx.lastWorkout.date, ctx.date)
    if (daysSince <= 2) score += 0.15
    else if (daysSince <= 7) score += 0.05
    signals++
  }

  return clamp(signals === 0 ? 0.20 : score, 0, 1)
}

function scorePhysiological(ctx: AIContext): number {
  // Check internal consistency of physiological signals
  let consistency = 0.5  // neutral base
  let checks = 0

  // HRV + resting HR consistency: low HRV often correlates with high HR
  if (ctx.hrv !== null && ctx.restingHR !== null) {
    checks++
    // Very rough heuristic: these moving in opposite directions is normal
    consistency += 0.20
  }

  // CTL/ATL/TSB relationship
  if (ctx.ctl !== null && ctx.atl !== null && ctx.tsb !== null) {
    checks++
    const expectedTsb = ctx.ctl - ctx.atl
    const delta = Math.abs(ctx.tsb - expectedTsb)
    if (delta < 10) consistency += 0.20   // internally consistent
    else if (delta < 25) consistency += 0.10
  }

  // Readiness vs sleep: poor sleep usually lowers readiness
  if (ctx.readiness !== null && ctx.sleepHours !== null) {
    checks++
    if (ctx.sleepHours < 5 && ctx.readiness > 80) {
      consistency -= 0.10  // suspicious — penalize
    } else {
      consistency += 0.10
    }
  }

  return clamp(checks === 0 ? 0.50 : consistency, 0, 1)
}

// ─── Missing signals collector ─────────────────────────────────────────────────

function collectMissingSignals(ctx: AIContext): string[] {
  const missing: string[] = []

  if (!ctx.dataQuality.hasWeight) missing.push('Brak pomiaru wagi')
  if (ctx.caloriesYesterday === null) missing.push('Brak logów żywieniowych z wczoraj')
  if (ctx.proteinYesterday === null) missing.push('Brak danych o białku z wczoraj')
  if (ctx.sleepHours === null) missing.push('Brak danych snu')
  if (ctx.hrv === null) missing.push('Brak HRV')
  if (ctx.readiness === null && ctx.sleepHours === null) missing.push('Brak danych regeneracji')
  if (ctx.ctl === null) missing.push('Brak load treningowego (CTL/ATL/TSB)')
  if (ctx.lastWorkout === null) missing.push('Brak historii treningów')
  if (ctx.goal.caloricTarget === null) missing.push('Brak celu kalorycznego')
  if (ctx.streakDays < 3) missing.push('Zbyt mało dni danych (streak < 3)')

  return missing
}

// ─── Warnings for UI ─────────────────────────────────────────────────────────

function buildWarnings(ctx: AIContext, overall: number, missing: string[]): string[] {
  const warnings: string[] = []

  if (overall < QUALITY_THRESHOLDS.MINIMUM) {
    warnings.push('Za mało danych, aby wygenerować wiarygodny insight. Dodaj dane snu, żywienia i wagi.')
    return warnings
  }

  if (overall < QUALITY_THRESHOLDS.MEDIUM) {
    warnings.push('Niska pewność zalecenia. Uzupełnij brakujące dane dla lepszej personalizacji.')
  }

  if (ctx.sleepHours === null) {
    warnings.push('Brak danych snu — regeneracja nieznana.')
  } else if (ctx.sleepHours < 6) {
    warnings.push(`Krótki sen (${ctx.sleepHours}h) — readiness może być obniżona.`)
  }

  if (ctx.hrv === null) {
    warnings.push('Brak HRV — połącz urządzenie (Garmin/Oura) dla pełnej analizy regeneracji.')
  }

  if (ctx.caloriesYesterday === null) {
    warnings.push('Brak logów żywieniowych z wczoraj — rekomendacja kaloryczna oparta na celu, nie rzeczywistości.')
  }

  if (ctx.lastWorkout !== null) {
    const daysSince = daysBetween(ctx.lastWorkout.date, ctx.date)
    if (daysSince > 7) {
      warnings.push(`Ostatni trening ${daysSince} dni temu — dane load treningowego mogą być nieaktualne.`)
    }
  }

  if (ctx.ctl === null && ctx.lastWorkout !== null) {
    warnings.push('Brak CTL/ATL — load treningowy nieokreślony.')
  }

  // Outlier warning
  if (ctx.caloriesYesterday !== null && ctx.caloriesYesterday < 800) {
    warnings.push('Bardzo niskie kalorie z wczoraj — sprawdź log żywieniowy.')
  }

  return warnings.slice(0, 4)  // max 4 warnings to avoid overwhelming
}

// ─── Quality tier mapping ─────────────────────────────────────────────────────

function scoreTier(overall: number): QualityTier {
  if (overall >= QUALITY_THRESHOLDS.HIGH) return 'high'
  if (overall >= QUALITY_THRESHOLDS.MEDIUM) return 'medium'
  if (overall >= QUALITY_THRESHOLDS.MINIMUM) return 'low'
  return 'insufficient'
}

// ─── Serializer — for prompt injection ───────────────────────────────────────

export function serializeQualityForPrompt(report: QualityReport): string {
  const { breakdown, tier } = report
  const lines: string[] = [
    `JAKOŚĆ DANYCH: ${tierLabel(tier)} (${Math.round(breakdown.overall * 100)}%)`,
  ]

  if (breakdown.missingSignals.length > 0) {
    lines.push(`Brakujące sygnały: ${breakdown.missingSignals.slice(0, 4).join(', ')}`)
  }

  lines.push(`Żywienie: ${Math.round(breakdown.nutritionConfidence * 100)}% | Regeneracja: ${Math.round(breakdown.recoveryConfidence * 100)}% | Trening: ${Math.round(breakdown.trainingConfidence * 100)}%`)

  if (tier === 'low' || tier === 'insufficient') {
    lines.push('INSTRUKCJA: Zaznacz niską pewność w odpowiedzi. Poinformuj użytkownika o brakujących danych w polu warnings.')
  }

  return lines.join('\n')
}

function tierLabel(tier: QualityTier): string {
  const map: Record<QualityTier, string> = {
    high: 'Wysoka',
    medium: 'Średnia',
    low: 'Niska',
    insufficient: 'Niewystarczająca',
  }
  return map[tier]
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max)
}

function round2(val: number): number {
  return Math.round(val * 100) / 100
}

function daysBetween(dateStr: string, refDateStr: string): number {
  const a = new Date(dateStr).getTime()
  const b = new Date(refDateStr).getTime()
  return Math.abs(Math.round((b - a) / 86_400_000))
}
