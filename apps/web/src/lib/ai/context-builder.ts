// AI Coach — Context Builder
// ETAP 5 — Deterministic AI Coaching Runtime
//
// Builds a canonical, typed, minimal AI context from DB.
// AI receives ONLY this structured snapshot — no raw tables, no uncontrolled data.
// Context is versioned — bump CONTEXT_VERSION on any structural change.

import 'server-only'
import { prisma as db } from '@/lib/db'

export const CONTEXT_VERSION = '1.0'

// ─── Canonical AI Context ─────────────────────────────────────────────────────
// Small, deterministic, typed — exactly what goes into the prompt.

export type AIContext = {
  _version: string
  date: string                      // YYYY-MM-DD

  // Identity
  userFirstName: string
  sex: 'male' | 'female' | 'other'

  // Body
  weightKg: number | null
  weightTrend7d: number | null      // delta vs 7 days ago (negative = loss)

  // Recovery (yesterday's data)
  readiness: number | null          // 0-100
  sleepHours: number | null
  sleepQuality: 'low' | 'medium' | 'high' | null
  hrv: number | null
  restingHR: number | null

  // Training load
  tsb: number | null                // Training Stress Balance (form)
  ctl: number | null                // Chronic Training Load (fitness)
  atl: number | null                // Acute Training Load (fatigue)

  // Yesterday nutrition
  caloriesYesterday: number | null
  proteinYesterday: number | null
  carbsYesterday: number | null
  fatYesterday: number | null
  calorieTargetYesterday: number | null

  // Today nutrition (so far — for midday/evening)
  caloriesToday: number | null
  proteinToday: number | null
  calorieTargetToday: number | null

  // Last workout
  lastWorkout: {
    date: string
    type: string
    durationMin: number
    tss: number | null
  } | null

  // Goal
  goal: {
    type: string
    targetWeightKg: number | null
    caloricTarget: number | null
    proteinTargetG: number | null
  }

  // Trends (last 7 days, oldest first)
  weightLast7d: number[]
  caloriesLast7d: number[]

  // Streak
  streakDays: number

  // Data completeness — AI uses this to calibrate confidence
  dataQuality: {
    hasWeight: boolean
    hasRecovery: boolean
    hasNutrition: boolean
    hasTraining: boolean
  }
}

// ─── Context Builder ──────────────────────────────────────────────────────────

export async function buildAIContext(
  userId: string,
  date: Date = new Date(),
): Promise<AIContext> {
  const today = isoDate(date)
  const yesterday = isoDate(daysAgo(date, 1))
  const d7ago = daysAgo(date, 7)
  const d8ago = daysAgo(date, 8)

  // ── Parallel DB queries ────────────────────────────────────────────────────
  const [
    user,
    profile,
    activeGoal,
    bodyMetrics8d,
    recoveryYesterday,
    sleepYesterday,
    todayLog,
    yesterdayLog,
    dailyLogs7d,
    lastWorkout,
    trainingLoad,
  ] = await Promise.all([
    // User name
    db.user.findUnique({
      where: { id: userId },
      select: { name: true },
    }),

    // Profile — caloric target, sex, height
    db.userProfile.findUnique({
      where: { userId },
      select: {
        sex: true,
        caloricTarget: true,
        tdee: true,
      },
    }),

    // Active goal
    db.goal.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: {
        type: true,
        targetWeightKg: true,
        targetCaloricDeficit: true,
      },
    }),

    // Body metrics last 8 days (for 7d trend)
    db.bodyMetric.findMany({
      where: { userId, date: { gte: d8ago }, weightKg: { not: null } },
      orderBy: { date: 'asc' },
      select: { date: true, weightKg: true },
    }),

    // Recovery yesterday
    db.recoveryMetric.findFirst({
      where: { userId, date: { gte: new Date(yesterday), lte: new Date(yesterday + 'T23:59:59Z') } },
      orderBy: { recordedAt: 'desc' },
      select: { hrv: true, restingHR: true, readinessScore: true, fatigueScore: true },
    }),

    // Sleep yesterday
    db.sleepMetric.findFirst({
      where: { userId, date: { gte: new Date(yesterday), lte: new Date(yesterday + 'T23:59:59Z') } },
      orderBy: { createdAt: 'desc' },
      select: { totalSleepMinutes: true, sleepScore: true, restfulness: true },
    }),

    // Today's nutrition log
    db.dailyLog.findFirst({
      where: { userId, date: { gte: new Date(today), lte: new Date(today + 'T23:59:59Z') } },
      select: {
        consumedCalories: true,
        consumedProteinG: true,
        targetCalories: true,
      },
    }),

    // Yesterday's nutrition log
    db.dailyLog.findFirst({
      where: { userId, date: { gte: new Date(yesterday), lte: new Date(yesterday + 'T23:59:59Z') } },
      select: {
        consumedCalories: true,
        consumedProteinG: true,
        consumedCarbsG: true,
        consumedFatG: true,
        targetCalories: true,
      },
    }),

    // Last 7 days daily logs for trends
    db.dailyLog.findMany({
      where: { userId, date: { gte: d7ago } },
      orderBy: { date: 'asc' },
      select: { date: true, consumedCalories: true },
    }),

    // Last workout
    db.workout.findFirst({
      where: { userId },
      orderBy: { date: 'desc' },
      select: {
        date: true,
        sportType: true,
        durationMinutes: true,
        tss: true,
      },
    }),

    // Latest training load
    db.trainingLoad.findFirst({
      where: { userId },
      orderBy: { date: 'desc' },
      select: { ctl: true, atl: true, tsb: true },
    }),
  ])

  // ── Weight processing ──────────────────────────────────────────────────────
  const latestWeight = bodyMetrics8d.length > 0
    ? Number(bodyMetrics8d[bodyMetrics8d.length - 1].weightKg)
    : null

  const oldestWeight = bodyMetrics8d.length >= 2
    ? Number(bodyMetrics8d[0].weightKg)
    : null

  const weightTrend7d = latestWeight !== null && oldestWeight !== null
    ? Math.round((latestWeight - oldestWeight) * 10) / 10
    : null

  const weightLast7d = bodyMetrics8d
    .slice(-7)
    .map((m) => Math.round(Number(m.weightKg) * 10) / 10)

  // ── Sleep quality mapping ──────────────────────────────────────────────────
  const sleepMinutes = sleepYesterday?.totalSleepMinutes ?? null
  const sleepHours = sleepMinutes !== null
    ? Math.round((sleepMinutes / 60) * 10) / 10
    : null

  // Map sleep quality from sleepScore (0-100) or restfulness (0-1) or heuristic
  let sleepQuality: 'low' | 'medium' | 'high' | null = null
  if (sleepYesterday?.sleepScore != null) {
    const sc = sleepYesterday.sleepScore
    if (sc >= 70) sleepQuality = 'high'
    else if (sc >= 45) sleepQuality = 'medium'
    else sleepQuality = 'low'
  } else if (sleepYesterday?.restfulness != null) {
    const rf = sleepYesterday.restfulness
    if (rf >= 0.7) sleepQuality = 'high'
    else if (rf >= 0.45) sleepQuality = 'medium'
    else sleepQuality = 'low'
  } else if (sleepHours !== null) {
    // Heuristic fallback
    if (sleepHours < 6) sleepQuality = 'low'
    else if (sleepHours < 7.5) sleepQuality = 'medium'
    else sleepQuality = 'high'
  }

  // ── Goal data ──────────────────────────────────────────────────────────────
  const goalType = activeGoal?.type ?? 'MAINTENANCE'
  // Goal doesn't store per-nutrient targets — use profile snapshot
  const caloricTarget = profile?.caloricTarget ?? null
  const proteinTarget: number | null = null

  // ── Streak ────────────────────────────────────────────────────────────────
  const streakDays = computeStreak(dailyLogs7d, date)

  // ── Data quality ──────────────────────────────────────────────────────────
  const dataQuality = {
    hasWeight: latestWeight !== null,
    hasRecovery: recoveryYesterday !== null || sleepYesterday !== null,
    hasNutrition: yesterdayLog !== null && (yesterdayLog.consumedCalories > 0),
    hasTraining: lastWorkout !== null,
  }

  // ── Sex mapping ────────────────────────────────────────────────────────────
  const sexRaw = String(profile?.sex ?? 'OTHER').toUpperCase()
  const sex: 'male' | 'female' | 'other' =
    sexRaw === 'MALE' ? 'male' : sexRaw === 'FEMALE' ? 'female' : 'other'

  return {
    _version: CONTEXT_VERSION,
    date: today,

    userFirstName: (user?.name ?? 'Użytkowniku').split(' ')[0],
    sex,

    weightKg: latestWeight,
    weightTrend7d,

    readiness: recoveryYesterday?.readinessScore ?? null,
    sleepHours,
    sleepQuality,
    hrv: recoveryYesterday?.hrv ? Number(recoveryYesterday.hrv) : null,
    restingHR: recoveryYesterday?.restingHR ?? null,

    tsb: trainingLoad?.tsb ? Number(trainingLoad.tsb) : null,
    ctl: trainingLoad?.ctl ? Number(trainingLoad.ctl) : null,
    atl: trainingLoad?.atl ? Number(trainingLoad.atl) : null,

    caloriesYesterday: yesterdayLog?.consumedCalories ?? null,
    proteinYesterday: yesterdayLog?.consumedProteinG ?? null,
    carbsYesterday: yesterdayLog?.consumedCarbsG ?? null,
    fatYesterday: yesterdayLog?.consumedFatG ?? null,
    calorieTargetYesterday: yesterdayLog?.targetCalories ?? null,

    caloriesToday: todayLog?.consumedCalories ?? null,
    proteinToday: todayLog?.consumedProteinG ?? null,
    calorieTargetToday: todayLog?.targetCalories ?? caloricTarget ? Number(caloricTarget) : null,

    lastWorkout: lastWorkout
      ? {
          date: isoDate(lastWorkout.date),
          type: lastWorkout.sportType ?? 'unknown',
          durationMin: Math.round(Number(lastWorkout.durationMinutes)),
          tss: lastWorkout.tss ? Number(lastWorkout.tss) : null,
        }
      : null,

    goal: {
      type: String(goalType),
      targetWeightKg: activeGoal?.targetWeightKg ?? null,
      caloricTarget: caloricTarget ? Number(caloricTarget) : null,
      proteinTargetG: proteinTarget ? Number(proteinTarget) : null,
    },

    weightLast7d,
    caloriesLast7d: dailyLogs7d.map((l) => Math.round(l.consumedCalories)),

    streakDays,
    dataQuality,
  }
}

// ─── Serialize context to compact string for LLM ─────────────────────────────
// Token-efficient — only includes non-null fields

export function serializeContext(ctx: AIContext): string {
  const lines: string[] = [
    `Data: ${ctx.date}`,
    `Użytkownik: ${ctx.userFirstName} (${ctx.sex})`,
    ``,
    `=== CIAŁO ===`,
  ]

  if (ctx.weightKg !== null) {
    lines.push(`Waga aktualna: ${ctx.weightKg} kg`)
  }
  if (ctx.weightTrend7d !== null) {
    const dir = ctx.weightTrend7d < 0 ? 'spadek' : ctx.weightTrend7d > 0 ? 'wzrost' : 'bez zmian'
    lines.push(`Trend wagi 7d: ${ctx.weightTrend7d > 0 ? '+' : ''}${ctx.weightTrend7d} kg (${dir})`)
  }
  if (ctx.weightLast7d.length > 0) {
    lines.push(`Historia wagi 7d: ${ctx.weightLast7d.join(', ')} kg`)
  }

  lines.push(``, `=== REGENERACJA (wczoraj) ===`)
  if (ctx.readiness !== null) lines.push(`Readiness: ${ctx.readiness}/100`)
  if (ctx.sleepHours !== null) lines.push(`Sen: ${ctx.sleepHours}h (${ctx.sleepQuality ?? 'nieznana jakość'})`)
  if (ctx.hrv !== null) lines.push(`HRV: ${ctx.hrv} ms`)
  if (ctx.restingHR !== null) lines.push(`HR spoczynkowe: ${ctx.restingHR} bpm`)
  if (ctx.readiness === null && ctx.sleepHours === null && ctx.hrv === null) {
    lines.push(`Brak danych regeneracji`)
  }

  lines.push(``, `=== OBCIĄŻENIE TRENINGOWE ===`)
  if (ctx.ctl !== null) lines.push(`CTL (fitness): ${ctx.ctl}`)
  if (ctx.atl !== null) lines.push(`ATL (fatigue): ${ctx.atl}`)
  if (ctx.tsb !== null) lines.push(`TSB (forma): ${ctx.tsb}`)
  if (ctx.lastWorkout) {
    lines.push(`Ostatni trening: ${ctx.lastWorkout.date} — ${ctx.lastWorkout.type}, ${ctx.lastWorkout.durationMin} min${ctx.lastWorkout.tss !== null ? `, TSS ${ctx.lastWorkout.tss}` : ''}`)
  }
  if (ctx.ctl === null && ctx.lastWorkout === null) {
    lines.push(`Brak danych treningowych`)
  }

  lines.push(``, `=== ŻYWIENIE (wczoraj) ===`)
  if (ctx.caloriesYesterday !== null) {
    lines.push(`Kalorie: ${ctx.caloriesYesterday} kcal${ctx.calorieTargetYesterday ? ` / cel ${ctx.calorieTargetYesterday} kcal` : ''}`)
  }
  if (ctx.proteinYesterday !== null) lines.push(`Białko: ${ctx.proteinYesterday} g`)
  if (ctx.carbsYesterday !== null) lines.push(`Węglowodany: ${ctx.carbsYesterday} g`)
  if (ctx.fatYesterday !== null) lines.push(`Tłuszcze: ${ctx.fatYesterday} g`)
  if (ctx.caloriesYesterday === null) lines.push(`Brak danych żywieniowych za wczoraj`)

  if (ctx.caloriesLast7d.length > 0) {
    lines.push(`Kalorie 7d: ${ctx.caloriesLast7d.join(', ')} kcal`)
  }

  lines.push(``, `=== DZIŚ (do tej pory) ===`)
  if (ctx.caloriesToday !== null) {
    lines.push(`Kalorie dziś: ${ctx.caloriesToday} kcal${ctx.calorieTargetToday ? ` / cel ${ctx.calorieTargetToday} kcal` : ''}`)
  }
  if (ctx.proteinToday !== null) lines.push(`Białko dziś: ${ctx.proteinToday} g`)
  if (ctx.caloriesToday === null) lines.push(`Brak danych żywieniowych na dziś`)

  lines.push(``, `=== CEL ===`)
  lines.push(`Typ celu: ${ctx.goal.type}`)
  if (ctx.goal.targetWeightKg) lines.push(`Cel wagowy: ${ctx.goal.targetWeightKg} kg`)
  if (ctx.goal.caloricTarget) lines.push(`Cel kaloryczny: ${ctx.goal.caloricTarget} kcal`)
  if (ctx.goal.proteinTargetG) lines.push(`Cel białkowy: ${ctx.goal.proteinTargetG} g`)

  lines.push(``, `=== STREAK ===`)
  lines.push(`Seria tracking: ${ctx.streakDays} ${ctx.streakDays === 1 ? 'dzień' : 'dni'}`)

  lines.push(``, `=== JAKOŚĆ DANYCH ===`)
  const missing: string[] = []
  if (!ctx.dataQuality.hasWeight) missing.push('waga')
  if (!ctx.dataQuality.hasRecovery) missing.push('regeneracja')
  if (!ctx.dataQuality.hasNutrition) missing.push('żywienie')
  if (!ctx.dataQuality.hasTraining) missing.push('trening')
  lines.push(missing.length === 0
    ? `Pełne dane — wysoka pewność zaleceń`
    : `Brakujące dane: ${missing.join(', ')} — niższa pewność zaleceń`)

  return lines.join('\n')
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoDate(d: Date | string): string {
  if (typeof d === 'string') return d.slice(0, 10)
  return d.toISOString().slice(0, 10)
}

function daysAgo(from: Date, days: number): Date {
  const d = new Date(from)
  d.setDate(d.getDate() - days)
  d.setHours(0, 0, 0, 0)
  return d
}

function computeStreak(
  logs: { date: Date | string; consumedCalories: number }[],
  today: Date,
): number {
  let streak = 0
  let cursor = new Date(today)
  const sorted = [...logs].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime(),
  )
  for (const log of sorted) {
    const logDate = isoDate(log.date)
    const cursorDate = isoDate(cursor)
    if (logDate === cursorDate && log.consumedCalories > 0) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}
