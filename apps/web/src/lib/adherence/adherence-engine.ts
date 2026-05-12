// Adherence Engine — ETAP 6
// Tracks how well users follow AI coaching recommendations.
// Deterministic, daily, persisted to DB.

import 'server-only'
import { prisma as db } from '@/lib/db'
import { aiLogger, timer } from '@/lib/logger'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AdherenceResult = {
  dailyAdherenceScore: number   // 0-1
  kcalAdherence: number | null  // 0-1
  proteinAdherence: number | null
  workoutCompleted: boolean
  streakDays: number
  components: {
    nutrition: number | null
    training: number | null
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Compute and persist adherence record for a user on a given date.
 */
export async function computeAndPersistAdherence(
  userId: string,
  date: Date,
): Promise<AdherenceResult> {
  const t = timer(aiLogger, 'computeAdherence')
  const dateOnly = startOfDay(date)

  const [profile, dailyLog, workoutsOnDate] = await Promise.all([
    db.userProfile.findUnique({
      where: { userId },
      select: { caloricTarget: true, proteinTargetG: true },
    }),
    db.dailyLog.findFirst({
      where: { userId, date: dateOnly },
      select: {
        targetCalories: true,
        targetProteinG: true,
        consumedCalories: true,
        consumedProteinG: true,
      },
    }),
    db.workout.findMany({
      where: { userId, date: dateOnly, deletedAt: null },
      select: { isPlanned: true },
    }),
  ])

  // ── Nutrition Adherence ────────────────────────────────────────────────────
  let kcalAdherence: number | null = null
  let proteinAdherence: number | null = null
  let nutritionScore: number | null = null

  if (dailyLog) {
    const kcalTarget = dailyLog.targetCalories ?? profile?.caloricTarget
    const proteinTarget = dailyLog.targetProteinG ?? profile?.proteinTargetG

    if (kcalTarget && kcalTarget > 0 && dailyLog.consumedCalories > 0) {
      const ratio = dailyLog.consumedCalories / kcalTarget
      // Perfect = 90-110% of target
      kcalAdherence = ratio >= 0.9 && ratio <= 1.1
        ? 1.0
        : ratio >= 0.8 && ratio <= 1.2
        ? 0.8
        : ratio >= 0.7 && ratio <= 1.3
        ? 0.6
        : ratio >= 0.6 && ratio <= 1.4
        ? 0.4
        : 0.2
    }

    if (proteinTarget && proteinTarget > 0 && dailyLog.consumedProteinG > 0) {
      const ratio = dailyLog.consumedProteinG / proteinTarget
      proteinAdherence = ratio >= 0.9
        ? 1.0
        : ratio >= 0.75
        ? 0.8
        : ratio >= 0.6
        ? 0.6
        : 0.3
    }

    if (kcalAdherence !== null || proteinAdherence !== null) {
      const parts: number[] = []
      if (kcalAdherence !== null) parts.push(kcalAdherence * 0.6)  // kcal = 60% of nutrition
      if (proteinAdherence !== null) parts.push(proteinAdherence * 0.4)  // protein = 40%
      nutritionScore = parts.reduce((a, b) => a + b, 0)
    }
  }

  // ── Training Adherence ─────────────────────────────────────────────────────
  const plannedWorkouts = workoutsOnDate.filter(w => w.isPlanned).length
  const completedWorkouts = workoutsOnDate.length
  const workoutCompleted = completedWorkouts > 0

  let trainingScore: number | null = null
  if (plannedWorkouts > 0) {
    trainingScore = Math.min(1, completedWorkouts / plannedWorkouts)
  } else if (workoutCompleted) {
    trainingScore = 0.85  // unplanned workout still counts positively
  }

  // ── Composite Score ────────────────────────────────────────────────────────
  const components: number[] = []
  const weights: number[] = []

  if (nutritionScore !== null) {
    components.push(nutritionScore)
    weights.push(0.6)
  }
  if (trainingScore !== null) {
    components.push(trainingScore)
    weights.push(0.4)
  }

  const dailyAdherenceScore =
    components.length > 0
      ? components.reduce((sum, s, i) => sum + s * weights[i], 0) /
        weights.reduce((a, b) => a + b, 0)
      : 0.5  // no data — neutral

  // ── Streak Calculation ─────────────────────────────────────────────────────
  const streakDays = await getStreakDays(userId, dateOnly)

  // ── Persist ───────────────────────────────────────────────────────────────
  try {
    await db.adherenceRecord.upsert({
      where: { userId_date: { userId, date: dateOnly } },
      create: {
        userId,
        date: dateOnly,
        kcalTarget: dailyLog?.targetCalories ?? null,
        kcalActual: dailyLog?.consumedCalories ?? null,
        kcalAdherence,
        proteinTarget: dailyLog?.targetProteinG ?? null,
        proteinActual: dailyLog?.consumedProteinG ?? null,
        proteinAdherence,
        workoutCompleted,
        plannedWorkouts,
        completedWorkouts,
        dailyAdherenceScore,
        streakDays,
      },
      update: {
        kcalAdherence,
        proteinAdherence,
        workoutCompleted,
        completedWorkouts,
        dailyAdherenceScore,
        streakDays,
      },
    })
  } catch (err) {
    aiLogger.warn({ userId, err }, 'adherence persistence failed (non-fatal)')
  }

  t.end({ userId, score: dailyAdherenceScore })

  return {
    dailyAdherenceScore,
    kcalAdherence,
    proteinAdherence,
    workoutCompleted,
    streakDays,
    components: {
      nutrition: nutritionScore,
      training: trainingScore,
    },
  }
}

/**
 * Get adherence score for a user over the last N days.
 */
export async function getAdherenceSummary(
  userId: string,
  days = 7,
): Promise<{ avgScore: number; streakDays: number; records: Array<{ date: string; score: number }> }> {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const records = await db.adherenceRecord.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { date: 'asc' },
    select: { date: true, dailyAdherenceScore: true, streakDays: true },
  })

  const avgScore =
    records.length > 0
      ? records.reduce((s, r) => s + (r.dailyAdherenceScore ?? 0.5), 0) / records.length
      : 0

  const latestStreak = records.length > 0 ? (records[records.length - 1].streakDays ?? 0) : 0

  return {
    avgScore,
    streakDays: latestStreak,
    records: records.map(r => ({
      date: r.date.toISOString().split('T')[0],
      score: r.dailyAdherenceScore ?? 0,
    })),
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getStreakDays(userId: string, date: Date): Promise<number> {
  // Count consecutive days with adherenceScore > 0.5 ending on date
  let streak = 0
  const check = new Date(date)

  for (let i = 0; i < 60; i++) {  // max 60-day lookback
    const dayRecord = await db.adherenceRecord.findFirst({
      where: { userId, date: check },
      select: { dailyAdherenceScore: true },
    })

    if (!dayRecord || (dayRecord.dailyAdherenceScore ?? 0) < 0.5) break
    streak++
    check.setDate(check.getDate() - 1)
  }

  return streak
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}
