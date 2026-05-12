// Dashboard Aggregation Service — ETAP 4 + ETAP 4.5 Observability
// Server-side only. Orchestrates all queries in parallel, applies analyzers,
// returns a typed DashboardData object ready for rendering.

import * as Sentry from '@sentry/nextjs'
import { prisma as db } from '@/lib/db'
import { dashboardLogger, timer } from '@/lib/logger'

// ─── Types ───────────────────────────────────────────────────────────────────

export type WeightPoint = { date: string; weightKg: number }

export type MacroSnapshot = {
  calories: { consumed: number; target: number; percent: number }
  protein: { consumed: number; target: number; percent: number }
  carbs: { consumed: number; target: number; percent: number }
  fat: { consumed: number; target: number; percent: number }
}

export type TrainingSnapshot = {
  ctl: number | null  // Chronic Training Load (Fitness)
  atl: number | null  // Acute Training Load (Fatigue)
  tsb: number | null  // Training Stress Balance (Form)
  tssToday: number | null
  workoutsLast7d: number
  totalTssLast7d: number
}

export type RecoverySnapshot = {
  latestHRV: number | null
  latestRestingHR: number | null
  latestSleepTotalMinutes: number | null
  latestReadinessScore: number | null
  avgSleep7d: number | null
  avgHRV7d: number | null
}

export type TrendPoint = { date: string; value: number }

export type DashboardData = {
  // Top summary
  currentWeightKg: number | null
  weightTrend7d: number | null   // delta vs 7d ago (negative = loss)
  weightHistory30d: WeightPoint[]

  // Nutrition
  todayNutrition: MacroSnapshot | null
  avgCalories7d: number | null
  avgProtein7d: number | null
  calorieHistory14d: TrendPoint[]
  complianceRate7d: number | null
  streakDays: number

  // Training
  training: TrainingSnapshot

  // Recovery
  recovery: RecoverySnapshot
  hrvHistory14d: TrendPoint[]
  sleepHistory14d: TrendPoint[]

  // Calorie target (from profile/goal)
  calorieTarget: number | null

  // Last AI insight
  lastInsight: { summary: string; type: string; createdAt: string; confidenceScore?: number | null } | null

  // Meta
  queriedAt: string
  timings: Record<string, number>
}

// ─── Main aggregation ─────────────────────────────────────────────────────────

export async function getDashboardData(userId: string): Promise<DashboardData> {
  return Sentry.startSpan(
    { name: 'getDashboardData', op: 'function', attributes: { userId } },
    () => _getDashboardData(userId),
  )
}

async function _getDashboardData(userId: string): Promise<DashboardData> {
  const t = timer(dashboardLogger, 'getDashboardData')
  const start = Date.now()
  const timings: Record<string, number> = {}

  const now = new Date()
  const today = startOfDay(now)
  const d30ago = daysAgo(now, 30)
  const d14ago = daysAgo(now, 14)
  const d7ago = daysAgo(now, 7)

  // ── Parallel data fetches ─────────────────────────────────────────────────
  const t0 = Date.now()
  const [
    profile,
    activeGoal,
    bodyMetrics30d,
    dailyLogs30d,
    workouts30d,
    sleepMetrics14d,
    recoveryMetrics14d,
    latestInsight,
    streak,
  ] = await Promise.all([
    db.userProfile.findUnique({ where: { userId } }),
    db.goal.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    }),
    db.bodyMetric.findMany({
      where: { userId, date: { gte: d30ago } },
      orderBy: { date: 'asc' },
      select: { date: true, weightKg: true },
    }),
    db.dailyLog.findMany({
      where: { userId, date: { gte: d30ago } },
      orderBy: { date: 'desc' },
      take: 30,
    }),
    db.workout.findMany({
      where: { userId, date: { gte: d30ago }, deletedAt: null },
      orderBy: { date: 'desc' },
      take: 30,
      select: { date: true, tss: true },
    }),
    db.sleepMetric.findMany({
      where: { userId, date: { gte: d14ago } },
      orderBy: { date: 'asc' },
      select: { date: true, totalSleepMinutes: true },
    }),
    db.recoveryMetric.findMany({
      where: { userId, date: { gte: d14ago } },
      orderBy: { date: 'desc' },
      take: 14,
      select: { date: true, readinessScore: true, restingHR: true, hrv: true },
    }),
    db.aIInsight.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { content: true, insightType: true, createdAt: true, confidenceScore: true },
    }),
    getStreakCount(userId, today),
  ])
  timings.dbQueries = Date.now() - t0

  // ── Weight ────────────────────────────────────────────────────────────────
  const t1 = Date.now()
  const weightHistory30d: WeightPoint[] = bodyMetrics30d.map((m) => ({
    date: isoDate(m.date),
    weightKg: Number(m.weightKg),
  }))

  const latestWeight = bodyMetrics30d.length > 0
    ? Number(bodyMetrics30d[bodyMetrics30d.length - 1].weightKg)
    : profile?.currentWeightKg ? Number(profile.currentWeightKg) : null

  const weightD7 = bodyMetrics30d.find((m) => m.date <= d7ago)
  const weightTrend7d = latestWeight !== null && weightD7
    ? latestWeight - Number(weightD7.weightKg)
    : null
  timings.weight = Date.now() - t1

  // ── Nutrition ─────────────────────────────────────────────────────────────
  const t2 = Date.now()
  const todayLog = dailyLogs30d.find(
    (l) => isoDate(l.date) === isoDate(today),
  )
  const calorieTarget = activeGoal?.targetCaloricDeficit != null
    ? (profile?.tdee ?? 0) - activeGoal.targetCaloricDeficit
    : profile?.tdee ?? null

  let todayNutrition: MacroSnapshot | null = null
  if (todayLog) {
    const caloriePercent = todayLog.targetCalories > 0
      ? Math.min(100, (todayLog.consumedCalories / todayLog.targetCalories) * 100)
      : 0
    const proteinPercent = todayLog.targetProteinG > 0
      ? (todayLog.consumedProteinG / todayLog.targetProteinG) * 100
      : 0
    const carbsTarget = todayLog.targetCarbsG ?? 0
    const carbsPercent = carbsTarget > 0
      ? (todayLog.consumedCarbsG / carbsTarget) * 100
      : 0
    const fatTarget = todayLog.targetFatG ?? 0
    const fatPercent = fatTarget > 0
      ? (todayLog.consumedFatG / fatTarget) * 100
      : 0

    todayNutrition = {
      calories: { consumed: todayLog.consumedCalories, target: todayLog.targetCalories, percent: caloriePercent },
      protein: { consumed: todayLog.consumedProteinG, target: todayLog.targetProteinG, percent: proteinPercent },
      carbs: { consumed: todayLog.consumedCarbsG, target: carbsTarget, percent: carbsPercent },
      fat: { consumed: todayLog.consumedFatG, target: fatTarget, percent: fatPercent },
    }
  }

  const recent7Logs = dailyLogs30d.slice(0, 7)
  const avgCalories7d = recent7Logs.length > 0
    ? Math.round(avg(recent7Logs.map((l) => l.consumedCalories)))
    : null
  const avgProtein7d = recent7Logs.length > 0
    ? Math.round(avg(recent7Logs.map((l) => l.consumedProteinG)))
    : null

  let complianceRate7d: number | null = null
  let calorieHistory14d: TrendPoint[] = []
  if (dailyLogs30d.length > 0) {
    // Compliance: within 10% of target
    const recent7 = dailyLogs30d.slice(0, 7)
    const compliantDays = recent7.filter((l) => {
      const delta = Math.abs(l.consumedCalories - l.targetCalories)
      return delta <= l.targetCalories * 0.1
    }).length
    complianceRate7d = Math.round((compliantDays / Math.max(1, recent7.length)) * 100)

    calorieHistory14d = dailyLogs30d
      .slice(0, 14)
      .reverse()
      .map((l) => ({ date: isoDate(l.date), value: l.consumedCalories }))
  }
  timings.nutrition = Date.now() - t2

  // ── Training ─────────────────────────────────────────────────────────────
  const t3 = Date.now()
  const workoutsLast7d = workouts30d.filter(
    (w) => new Date(w.date) >= d7ago,
  )
  const totalTssLast7d = workoutsLast7d.reduce(
    (sum, w) => sum + (w.tss ? Number(w.tss) : 0),
    0,
  )
  // Find most recent training load row (may be pre-stored by TP sync)
  const latestLoad = await db.trainingLoad.findFirst({
    where: { userId },
    orderBy: { date: 'desc' },
    select: { ctl: true, atl: true, tsb: true, dailyTSS: true, date: true },
  }).catch(() => null)  // table may be empty

  const training: TrainingSnapshot = {
    ctl: latestLoad?.ctl ? Number(latestLoad.ctl) : null,
    atl: latestLoad?.atl ? Number(latestLoad.atl) : null,
    tsb: latestLoad?.tsb ? Number(latestLoad.tsb) : null,
    tssToday: latestLoad?.date && isoDate(latestLoad.date) === isoDate(today)
      ? Number(latestLoad.dailyTSS)
      : null,
    workoutsLast7d: workoutsLast7d.length,
    totalTssLast7d: Math.round(totalTssLast7d),
  }
  timings.training = Date.now() - t3

  // ── Recovery ─────────────────────────────────────────────────────────────
  const t4 = Date.now()
  const latestRecovery = recoveryMetrics14d[0] ?? null
  const latestSleep = sleepMetrics14d.length > 0
    ? sleepMetrics14d[sleepMetrics14d.length - 1]
    : null

  const avgSleep7d = sleepMetrics14d.length > 0
    ? Math.round(avg(sleepMetrics14d.slice(-7).map((s) => s.totalSleepMinutes ?? 0)))
    : null

  const hrvValues = recoveryMetrics14d.filter((r) => r.hrv !== null).map((r) => Number(r.hrv))
  const avgHRV7d = hrvValues.length > 0
    ? Math.round(avg(hrvValues.slice(-7)))
    : null

  const recovery: RecoverySnapshot = {
    latestHRV: latestRecovery?.hrv ? Number(latestRecovery.hrv) : null,
    latestRestingHR: latestRecovery?.restingHR ?? null,
    latestSleepTotalMinutes: latestSleep?.totalSleepMinutes ?? null,
    latestReadinessScore: latestRecovery?.readinessScore ?? null,
    avgSleep7d,
    avgHRV7d,
  }

  const hrvHistory14d: TrendPoint[] = recoveryMetrics14d
    .filter((r) => r.hrv !== null)
    .reverse()
    .map((r) => ({ date: isoDate(r.date), value: Number(r.hrv) }))

  const sleepHistory14d: TrendPoint[] = sleepMetrics14d
    .filter((s) => s.totalSleepMinutes !== null)
    .map((s) => ({ date: isoDate(s.date), value: Math.round((s.totalSleepMinutes ?? 0) / 60 * 10) / 10 }))

  timings.recovery = Date.now() - t4

  timings.total = Date.now() - start

  // Structured log — replaces console.warn
  t.end({ userId, ...timings })

  if (timings.total > 800) {
    Sentry.addBreadcrumb({
      category: 'dashboard',
      message: `Slow aggregation: ${timings.total}ms`,
      level: 'warning',
      data: timings,
    })
  }

  return {
    currentWeightKg: latestWeight,
    weightTrend7d,
    weightHistory30d,
    todayNutrition,
    avgCalories7d,
    avgProtein7d,
    calorieHistory14d,
    complianceRate7d,
    streakDays: streak,
    training,
    recovery,
    hrvHistory14d,
    sleepHistory14d,
    calorieTarget: calorieTarget ? Number(calorieTarget) : null,
    lastInsight: latestInsight
      ? {
          summary: latestInsight.content,
          type: latestInsight.insightType,
          createdAt: latestInsight.createdAt.toISOString(),
          confidenceScore: latestInsight.confidenceScore ?? null,
        }
      : null,
    queriedAt: now.toISOString(),
    timings,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avg(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((s, n) => s + n, 0) / nums.length
}

function startOfDay(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  return out
}

function daysAgo(from: Date, days: number): Date {
  const d = new Date(from)
  d.setDate(d.getDate() - days)
  d.setHours(0, 0, 0, 0)
  return d
}

function isoDate(d: Date | string): string {
  if (typeof d === 'string') return d.slice(0, 10)
  return d.toISOString().slice(0, 10)
}

async function getStreakCount(userId: string, today: Date): Promise<number> {
  // Look back up to 90 days to count consecutive tracked days
  const logs = await db.dailyLog.findMany({
    where: {
      userId,
      date: { gte: daysAgo(today, 90) },
      consumedCalories: { gt: 0 },
    },
    orderBy: { date: 'desc' },
    select: { date: true },
  })

  let streak = 0
  let cursor = new Date(today)
  for (const log of logs) {
    const logDate = isoDate(log.date)
    const cursorDate = isoDate(cursor)
    if (logDate === cursorDate) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}
