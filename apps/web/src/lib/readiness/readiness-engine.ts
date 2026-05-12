// Readiness Engine — ETAP 6
// Deterministic, versioned, typed daily readiness scoring.
// Combines HRV, sleep, training load, nutrition balance and adherence into
// a unified 0-100 score with explainability.

import 'server-only'
import { prisma as db } from '@/lib/db'
import { aiLogger, timer } from '@/lib/logger'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReadinessLevel = 'low' | 'moderate' | 'high'

export type DailyReadiness = {
  score: number            // 0-100
  level: ReadinessLevel
  confidence: number       // 0-1, based on how many signals were present
  drivers: string[]        // top factors contributing to score
  warnings: string[]       // notable flags to surface to user
  recommendedTrainingLoad: number   // suggested TSS today
  recommendedRecoveryFocus: string[]
}

export type ReadinessContext = {
  hrv?: number | null
  restingHR?: number | null
  sleepScore?: number | null
  totalSleepMinutes?: number | null
  atl?: number | null
  ctl?: number | null
  tsb?: number | null
  calorieBalance7d?: number | null   // avg daily deficit (negative = surplus)
  weightTrend7d?: number | null      // kg change over 7 days
  adherenceScore7d?: number | null   // 0-1
  hrvBaseline?: number | null        // user's 30-day HRV baseline
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ENGINE_VERSION = '1.0'

// Signal weights (must sum to 1.0)
const WEIGHTS = {
  hrv: 0.28,
  sleep: 0.22,
  tsb: 0.20,
  nutrition: 0.15,
  adherence: 0.15,
} as const

// Training load targets by readiness level
const LOAD_TARGETS: Record<ReadinessLevel, number> = {
  high: 80,
  moderate: 50,
  low: 20,
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Compute and persist daily readiness for a user.
 * Returns the readiness object even if persistence fails (graceful).
 */
export async function computeAndPersistReadiness(
  userId: string,
  date: Date,
): Promise<DailyReadiness> {
  const t = timer(aiLogger, 'computeReadiness')
  const dateOnly = startOfDay(date)

  const ctx = await gatherContext(userId, dateOnly)
  const readiness = computeReadiness(ctx)

  // Persist (non-blocking, fail-safe)
  try {
    await db.dailyReadiness.upsert({
      where: { userId_date: { userId, date: dateOnly } },
      create: {
        userId,
        date: dateOnly,
        score: readiness.score,
        level: readiness.level,
        confidence: readiness.confidence,
        hrv: ctx.hrv ?? null,
        restingHR: ctx.restingHR ?? null,
        sleepScore: ctx.sleepScore ?? null,
        sleepMinutes: ctx.totalSleepMinutes ?? null,
        atl: ctx.atl ?? null,
        ctl: ctx.ctl ?? null,
        tsb: ctx.tsb ?? null,
        calorieBalance7d: ctx.calorieBalance7d ?? null,
        weightTrend7d: ctx.weightTrend7d ?? null,
        adherenceScore7d: ctx.adherenceScore7d ?? null,
        recommendedTrainingLoad: readiness.recommendedTrainingLoad,
        recommendedFocus: readiness.recommendedRecoveryFocus,
        drivers: readiness.drivers,
        warnings: readiness.warnings,
      },
      update: {
        score: readiness.score,
        level: readiness.level,
        confidence: readiness.confidence,
        recommendedTrainingLoad: readiness.recommendedTrainingLoad,
        recommendedFocus: readiness.recommendedRecoveryFocus,
        drivers: readiness.drivers,
        warnings: readiness.warnings,
        computedAt: new Date(),
      },
    })
  } catch (err) {
    aiLogger.warn({ userId, err }, 'readiness persistence failed (non-fatal)')
  }

  t.end({ userId, score: readiness.score })
  return readiness
}

/**
 * Get today's readiness — from DB if available, else compute on-demand.
 */
export async function getTodayReadiness(
  userId: string,
): Promise<DailyReadiness | null> {
  const today = startOfDay(new Date())

  const cached = await db.dailyReadiness.findUnique({
    where: { userId_date: { userId, date: today } },
  })

  if (cached) {
    return {
      score: cached.score,
      level: cached.level as ReadinessLevel,
      confidence: cached.confidence,
      drivers: (cached.drivers as string[]) ?? [],
      warnings: (cached.warnings as string[]) ?? [],
      recommendedTrainingLoad: cached.recommendedTrainingLoad,
      recommendedRecoveryFocus: (cached.recommendedFocus as string[]) ?? [],
    }
  }

  // Compute on-demand
  return computeAndPersistReadiness(userId, today)
}

// ─── Core Computation ─────────────────────────────────────────────────────────

export function computeReadiness(ctx: ReadinessContext): DailyReadiness {
  const signals: Array<{ name: string; score: number; weight: number }> = []
  const drivers: string[] = []
  const warnings: string[] = []
  let totalWeight = 0
  let weightedSum = 0

  // ── HRV Score ──────────────────────────────────────────────────────────────
  const hrvScore = scoreHRV(ctx.hrv, ctx.hrvBaseline)
  if (hrvScore !== null) {
    signals.push({ name: 'hrv', score: hrvScore, weight: WEIGHTS.hrv })
    totalWeight += WEIGHTS.hrv
    weightedSum += hrvScore * WEIGHTS.hrv

    if (hrvScore >= 70) {
      drivers.push(`HRV dobry (${Math.round(ctx.hrv ?? 0)} ms)`)
    } else if (hrvScore < 35) {
      warnings.push(`Niskie HRV — układ nerwowy wymaga regeneracji`)
    }
  }

  // ── Sleep Score ────────────────────────────────────────────────────────────
  const sleepScore = scoreSleep(ctx.sleepScore, ctx.totalSleepMinutes)
  if (sleepScore !== null) {
    signals.push({ name: 'sleep', score: sleepScore, weight: WEIGHTS.sleep })
    totalWeight += WEIGHTS.sleep
    weightedSum += sleepScore * WEIGHTS.sleep

    if (sleepScore >= 75) {
      drivers.push(`Sen dobrej jakości (${Math.round((ctx.totalSleepMinutes ?? 0) / 60 * 10) / 10} h)`)
    } else if (sleepScore < 40) {
      warnings.push(`Niedobór snu — ogranicza regenerację`)
    }
  }

  // ── TSB (Training Stress Balance) ─────────────────────────────────────────
  const tsbScore = scoreTSB(ctx.tsb)
  if (tsbScore !== null) {
    signals.push({ name: 'tsb', score: tsbScore, weight: WEIGHTS.tsb })
    totalWeight += WEIGHTS.tsb
    weightedSum += tsbScore * WEIGHTS.tsb

    if (ctx.tsb !== null && ctx.tsb !== undefined) {
      if (ctx.tsb > 10) {
        drivers.push(`Dobra forma (TSB: ${Math.round(ctx.tsb)})`)
      } else if (ctx.tsb < -20) {
        warnings.push(`Duże zmęczenie treningowe (TSB: ${Math.round(ctx.tsb)})`)
      }
    }
  }

  // ── Nutrition Balance ──────────────────────────────────────────────────────
  const nutritionScore = scoreNutrition(ctx.calorieBalance7d)
  if (nutritionScore !== null) {
    signals.push({ name: 'nutrition', score: nutritionScore, weight: WEIGHTS.nutrition })
    totalWeight += WEIGHTS.nutrition
    weightedSum += nutritionScore * WEIGHTS.nutrition

    if (ctx.calorieBalance7d !== null && ctx.calorieBalance7d !== undefined) {
      if (Math.abs(ctx.calorieBalance7d) > 700) {
        warnings.push(`Duży deficyt kaloryczny (${Math.round(ctx.calorieBalance7d)} kcal/d) — ogranicza regenerację`)
      }
    }
  }

  // ── Adherence ─────────────────────────────────────────────────────────────
  const adherenceScore = ctx.adherenceScore7d !== null && ctx.adherenceScore7d !== undefined
    ? ctx.adherenceScore7d * 100
    : null
  if (adherenceScore !== null) {
    signals.push({ name: 'adherence', score: adherenceScore, weight: WEIGHTS.adherence })
    totalWeight += WEIGHTS.adherence
    weightedSum += adherenceScore * WEIGHTS.adherence

    if (adherenceScore >= 80) {
      drivers.push(`Wysoka konsekwencja (${Math.round(adherenceScore)}%)`)
    }
  }

  // ── Composite Score ────────────────────────────────────────────────────────
  const confidence = totalWeight // max 1.0 when all signals present
  const rawScore = totalWeight > 0 ? weightedSum / totalWeight : 50
  const score = Math.round(Math.max(0, Math.min(100, rawScore)))

  const level: ReadinessLevel =
    score >= 70 ? 'high' :
    score >= 45 ? 'moderate' :
    'low'

  // ── Recovery Focus ─────────────────────────────────────────────────────────
  const recommendedRecoveryFocus: string[] = []
  if (sleepScore !== null && sleepScore < 50) recommendedRecoveryFocus.push('sen')
  if (hrvScore !== null && hrvScore < 40) recommendedRecoveryFocus.push('regeneracja aktywna')
  if (tsbScore !== null && tsbScore < 40) recommendedRecoveryFocus.push('roztciąganie/mobilność')
  if (nutritionScore !== null && nutritionScore < 50) recommendedRecoveryFocus.push('odżywienie')
  if (recommendedRecoveryFocus.length === 0) recommendedRecoveryFocus.push('utrzymaj rytm')

  // ── Low confidence warning ─────────────────────────────────────────────────
  if (confidence < 0.4) {
    warnings.push('Mało danych — wynik przybliżony. Wprowadź wagę i dane snu dla lepszej oceny.')
  }

  return {
    score,
    level,
    confidence: Math.min(1, confidence),
    drivers: drivers.slice(0, 3),
    warnings: warnings.slice(0, 3),
    recommendedTrainingLoad: LOAD_TARGETS[level],
    recommendedRecoveryFocus: recommendedRecoveryFocus.slice(0, 3),
  }
}

// ─── Signal Scorers ───────────────────────────────────────────────────────────

function scoreHRV(hrv?: number | null, baseline?: number | null): number | null {
  if (hrv === null || hrv === undefined) return null

  if (baseline && baseline > 0) {
    // Score relative to personal baseline
    const ratio = hrv / baseline
    if (ratio >= 1.05) return 95
    if (ratio >= 0.95) return 80
    if (ratio >= 0.85) return 60
    if (ratio >= 0.75) return 40
    return 20
  }

  // Absolute scale (typical RMSSD ranges)
  if (hrv >= 70) return 90
  if (hrv >= 55) return 75
  if (hrv >= 40) return 60
  if (hrv >= 25) return 40
  return 20
}

function scoreSleep(
  sleepScore?: number | null,
  totalMinutes?: number | null,
): number | null {
  if (sleepScore !== null && sleepScore !== undefined) {
    return Math.min(100, Math.max(0, sleepScore))
  }

  // Fallback: score by duration
  if (totalMinutes === null || totalMinutes === undefined) return null
  if (totalMinutes >= 480) return 90  // 8h+
  if (totalMinutes >= 420) return 75  // 7h
  if (totalMinutes >= 360) return 55  // 6h
  if (totalMinutes >= 300) return 35  // 5h
  return 15
}

function scoreTSB(tsb?: number | null): number | null {
  if (tsb === null || tsb === undefined) return null

  // TSB: positive = fresh, negative = fatigue
  // Optimal: -10 to +15 (in form without being too fresh)
  if (tsb >= 15) return 70   // very fresh — good but may have lost fitness
  if (tsb >= 5) return 90    // optimal
  if (tsb >= -5) return 80   // slight fatigue — fine
  if (tsb >= -15) return 60  // moderate fatigue
  if (tsb >= -25) return 35  // significant fatigue
  return 15                   // overreached
}

function scoreNutrition(calorieBalance7d?: number | null): number | null {
  if (calorieBalance7d === null || calorieBalance7d === undefined) return null

  // calorieBalance7d: positive = deficit, negative = surplus
  const deficit = calorieBalance7d  // positive means eating less than TDEE
  if (deficit <= 100) return 90       // minimal deficit / maintenance
  if (deficit <= 300) return 80       // moderate deficit (good for reduction)
  if (deficit <= 500) return 65       // significant deficit
  if (deficit <= 700) return 45       // large deficit — reduces recovery
  return 25                           // severe deficit — recovery impaired
}

// ─── Context Gathering ────────────────────────────────────────────────────────

async function gatherContext(userId: string, date: Date): Promise<ReadinessContext> {
  const d7ago = new Date(date)
  d7ago.setDate(d7ago.getDate() - 7)

  const [profile, latestRecovery, latestSleep, latestTrainingLoad, dailyLogs7d, adherenceRecord] = await Promise.all([
    db.userProfile.findUnique({ where: { userId }, select: { hrvBaseline: true } }),
    db.recoveryMetric.findFirst({
      where: { userId, date: { lte: date } },
      orderBy: { date: 'desc' },
      select: { hrv: true, restingHR: true, readinessScore: true },
    }),
    db.sleepMetric.findFirst({
      where: { userId, date: { lte: date } },
      orderBy: { date: 'desc' },
      select: { sleepScore: true, totalSleepMinutes: true },
    }),
    db.trainingLoad.findFirst({
      where: { userId, date: { lte: date } },
      orderBy: { date: 'desc' },
      select: { atl: true, ctl: true, tsb: true },
    }),
    db.dailyLog.findMany({
      where: { userId, date: { gte: d7ago, lte: date } },
      select: { calorieBalance: true },
    }),
    db.adherenceRecord.findFirst({
      where: { userId, date: { lte: date } },
      orderBy: { date: 'desc' },
      select: { dailyAdherenceScore: true },
    }),
  ])

  // Avg calorie balance over last 7 days
  const calorieBalance7d =
    dailyLogs7d.length > 0
      ? dailyLogs7d.reduce((s, l) => s + (l.calorieBalance ?? 0), 0) / dailyLogs7d.length
      : null

  return {
    hrv: latestRecovery?.hrv ?? null,
    restingHR: latestRecovery?.restingHR ?? null,
    sleepScore: latestSleep?.sleepScore ?? null,
    totalSleepMinutes: latestSleep?.totalSleepMinutes ?? null,
    atl: latestTrainingLoad?.atl ?? null,
    ctl: latestTrainingLoad?.ctl ?? null,
    tsb: latestTrainingLoad?.tsb ?? null,
    calorieBalance7d,
    adherenceScore7d: adherenceRecord?.dailyAdherenceScore ?? null,
    hrvBaseline: profile?.hrvBaseline ?? null,
  }
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export { ENGINE_VERSION }
