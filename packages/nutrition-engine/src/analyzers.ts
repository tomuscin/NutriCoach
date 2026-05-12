// @nutricoach/nutrition-engine — Trend analyzers
// Operates on arrays of DailyLog — no DB access here (pure functions)

import type { DailyLog, NutritionTrend, DailyNutritionSummary } from '@nutricoach/types'

// ─── Daily Summary ────────────────────────────────────────────────────────────

export function buildDailySummary(log: DailyLog): DailyNutritionSummary {
  const deficit = log.tdeeSnapshot
    ? log.consumedCalories - log.tdeeSnapshot
    : null

  return {
    date: typeof log.date === 'string' ? log.date : log.date.toISOString().slice(0, 10),
    targetCalories: log.targetCalories,
    consumedCalories: log.consumedCalories,
    deficit: deficit ?? (log.consumedCalories - log.targetCalories),
    macroProgress: {
      protein: {
        consumed: log.consumedProteinG,
        target: log.targetProteinG,
        percent: log.targetProteinG > 0 ? (log.consumedProteinG / log.targetProteinG) * 100 : 0,
      },
      carbs: {
        consumed: log.consumedCarbsG,
        target: log.targetCarbsG ?? 0,
        percent: (log.targetCarbsG ?? 0) > 0
          ? (log.consumedCarbsG / (log.targetCarbsG as number)) * 100
          : 0,
      },
      fat: {
        consumed: log.consumedFatG,
        target: log.targetFatG ?? 0,
        percent: (log.targetFatG ?? 0) > 0
          ? (log.consumedFatG / (log.targetFatG as number)) * 100
          : 0,
      },
    },
    calorieProgress: log.targetCalories > 0
      ? Math.min(100, (log.consumedCalories / log.targetCalories) * 100)
      : 0,
    isComplete: log.completedAt !== null,
  }
}

// ─── Trend Analysis ───────────────────────────────────────────────────────────

/** 7-day and 30-day nutrition trend from an ordered array of DailyLogs. */
export function analyzeNutritionTrend(
  logs: DailyLog[],
  streakDays: number,
): NutritionTrend {
  const recent7 = logs.slice(0, 7)
  const recent30 = logs.slice(0, 30)

  const avg7 = avg(recent7.map((l) => l.consumedCalories))
  const avgProtein7 = avg(recent7.map((l) => l.consumedProteinG))

  const avgDeficit7 = avg(
    recent7.map((l) =>
      l.tdeeSnapshot
        ? l.tdeeSnapshot - l.consumedCalories
        : l.targetCalories - l.consumedCalories,
    ),
  )

  // Compliance: within 10% of target
  const compliance7 = recent7.filter((l) => {
    const delta = Math.abs(l.consumedCalories - l.targetCalories)
    return delta <= l.targetCalories * 0.1
  }).length / Math.max(1, recent7.length)

  return {
    avgCalories7d: Math.round(avg7),
    avgProtein7d: Math.round(avgProtein7),
    avgDeficit7d: Math.round(avgDeficit7),
    complianceRate7d: Math.round(compliance7 * 100),
    streakDays,
  }
}

/** Projected goal achievement date given current deficit rate. */
export function projectGoalDate(
  currentWeightKg: number,
  targetWeightKg: number,
  avgDailyDeficitKcal: number,
): Date | null {
  if (avgDailyDeficitKcal <= 0) return null
  const kgToLose = currentWeightKg - targetWeightKg
  if (kgToLose <= 0) return null
  const kcalToLose = kgToLose * 7700
  const daysRequired = kcalToLose / avgDailyDeficitKcal
  const date = new Date()
  date.setDate(date.getDate() + Math.round(daysRequired))
  return date
}

/** Protein sufficiency check — flag if below threshold. */
export function isProteinSufficient(
  consumedG: number,
  targetG: number,
  threshold = 0.85,
): boolean {
  return consumedG >= targetG * threshold
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function avg(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}
