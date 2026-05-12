// Coaching Feed Service — ETAP 6
// Assembles the daily coaching feed blocks (morning/midday/evening)
// from available data without AI calls. Fast, SSR-safe.

import 'server-only'
import { prisma as db } from '@/lib/db'
import { dashboardLogger, timer } from '@/lib/logger'

// ─── Types ────────────────────────────────────────────────────────────────────

export type MorningBlock = {
  readiness: {
    score: number
    level: 'low' | 'moderate' | 'high'
    confidence: number
    drivers: string[]
    warnings: string[]
    recommendedTrainingLoad: number
  } | null
  targets: {
    kcal: number | null
    proteinG: number | null
    carbsG: number | null
    fatG: number | null
    waterMl: number
  }
  insight: {
    content: string
    confidence: number | null
    createdAt: string
    id: string
    status: string
  } | null
}

export type MiddayBlock = {
  adherence: {
    kcalConsumed: number
    kcalTarget: number | null
    kcalPercent: number | null
    proteinConsumed: number
    proteinTarget: number | null
    workoutDone: boolean
  } | null
  insight: {
    content: string
    confidence: number | null
    createdAt: string
    id: string
    status: string
  } | null
  warnings: string[]
}

export type EveningBlock = {
  daySummary: {
    overallScore: number | null
    recoveryScore: number | null
    nutritionScore: number | null
    performanceScore: number | null
    consistencyScore: number | null
  } | null
  adherence: {
    kcalAdherence: number | null
    workoutCompleted: boolean
    streakDays: number
  } | null
  insight: {
    content: string
    confidence: number | null
    createdAt: string
    id: string
    status: string
  } | null
}

export type CoachingFeed = {
  morning: MorningBlock
  midday: MiddayBlock
  evening: EveningBlock
  hasAnyInsight: boolean
  queriedAt: string
}

// ─── Main Function ────────────────────────────────────────────────────────────

export async function getCoachingFeed(userId: string): Promise<CoachingFeed> {
  const t = timer(dashboardLogger, 'getCoachingFeed')
  const today = startOfDay(new Date())

  const [
    todayReadiness,
    todayScore,
    todayAdherence,
    todayLog,
    profile,
    morningInsight,
    middayInsight,
    eveningInsight,
  ] = await Promise.all([
    db.dailyReadiness.findUnique({ where: { userId_date: { userId, date: today } } }),
    db.dailyScore.findUnique({ where: { userId_date: { userId, date: today } } }),
    db.adherenceRecord.findUnique({ where: { userId_date: { userId, date: today } } }),
    db.dailyLog.findFirst({
      where: { userId, date: today },
      select: {
        consumedCalories: true,
        consumedProteinG: true,
        consumedCarbsG: true,
        consumedFatG: true,
        targetCalories: true,
        targetProteinG: true,
        targetCarbsG: true,
        targetFatG: true,
        waterMl: true,
      },
    }),
    db.userProfile.findUnique({
      where: { userId },
      select: {
        caloricTarget: true,
        proteinTargetG: true,
        carbsTargetG: true,
        fatTargetG: true,
      },
    }),
    db.aIInsight.findFirst({
      where: { userId, insightType: 'MORNING_BRIEF', createdAt: { gte: today } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, content: true, confidenceScore: true, createdAt: true, status: true },
    }),
    db.aIInsight.findFirst({
      where: { userId, insightType: 'MIDDAY_CHECK', createdAt: { gte: today } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, content: true, confidenceScore: true, createdAt: true, status: true },
    }),
    db.aIInsight.findFirst({
      where: { userId, insightType: 'EVENING_REVIEW', createdAt: { gte: today } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, content: true, confidenceScore: true, createdAt: true, status: true },
    }),
  ])

  // ── Morning Block ──────────────────────────────────────────────────────────
  const morning: MorningBlock = {
    readiness: todayReadiness
      ? {
          score: todayReadiness.score,
          level: todayReadiness.level as 'low' | 'moderate' | 'high',
          confidence: todayReadiness.confidence,
          drivers: (todayReadiness.drivers as string[]) ?? [],
          warnings: (todayReadiness.warnings as string[]) ?? [],
          recommendedTrainingLoad: todayReadiness.recommendedTrainingLoad,
        }
      : null,
    targets: {
      kcal: todayLog?.targetCalories ?? profile?.caloricTarget ?? null,
      proteinG: todayLog?.targetProteinG ?? profile?.proteinTargetG ?? null,
      carbsG: todayLog?.targetCarbsG ?? profile?.carbsTargetG ?? null,
      fatG: todayLog?.targetFatG ?? profile?.fatTargetG ?? null,
      waterMl: todayLog?.waterMl ?? 2500,
    },
    insight: morningInsight
      ? {
          id: morningInsight.id,
          content: morningInsight.content,
          confidence: morningInsight.confidenceScore,
          createdAt: morningInsight.createdAt.toISOString(),
          status: morningInsight.status,
        }
      : null,
  }

  // ── Midday Block ───────────────────────────────────────────────────────────
  const kcalConsumed = todayLog?.consumedCalories ?? 0
  const kcalTarget = todayLog?.targetCalories ?? profile?.caloricTarget ?? null
  const middayWarnings: string[] = []

  if (kcalTarget && kcalConsumed < kcalTarget * 0.3 && isAfterNoon()) {
    middayWarnings.push('Mało kalorii do tej pory — zaplanuj posiłki popołudniowe')
  }
  if (todayLog && todayLog.consumedProteinG < (todayLog.targetProteinG ?? 0) * 0.5) {
    middayWarnings.push('Niedobór białka w pierwszej połowie dnia')
  }

  const midday: MiddayBlock = {
    adherence: todayLog
      ? {
          kcalConsumed,
          kcalTarget,
          kcalPercent: kcalTarget && kcalTarget > 0
            ? Math.round((kcalConsumed / kcalTarget) * 100)
            : null,
          proteinConsumed: todayLog.consumedProteinG,
          proteinTarget: todayLog.targetProteinG ?? profile?.proteinTargetG ?? null,
          workoutDone: todayAdherence?.workoutCompleted ?? false,
        }
      : null,
    insight: middayInsight
      ? {
          id: middayInsight.id,
          content: middayInsight.content,
          confidence: middayInsight.confidenceScore,
          createdAt: middayInsight.createdAt.toISOString(),
          status: middayInsight.status,
        }
      : null,
    warnings: middayWarnings,
  }

  // ── Evening Block ──────────────────────────────────────────────────────────
  const evening: EveningBlock = {
    daySummary: todayScore
      ? {
          overallScore: todayScore.overallScore,
          recoveryScore: todayScore.recoveryScore,
          nutritionScore: todayScore.nutritionScore,
          performanceScore: todayScore.performanceScore,
          consistencyScore: todayScore.consistencyScore,
        }
      : null,
    adherence: todayAdherence
      ? {
          kcalAdherence: todayAdherence.kcalAdherence,
          workoutCompleted: todayAdherence.workoutCompleted,
          streakDays: todayAdherence.streakDays,
        }
      : null,
    insight: eveningInsight
      ? {
          id: eveningInsight.id,
          content: eveningInsight.content,
          confidence: eveningInsight.confidenceScore,
          createdAt: eveningInsight.createdAt.toISOString(),
          status: eveningInsight.status,
        }
      : null,
  }

  t.end({ userId })

  return {
    morning,
    midday,
    evening,
    hasAnyInsight: !!(morningInsight || middayInsight || eveningInsight),
    queriedAt: new Date().toISOString(),
  }
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

function isAfterNoon(): boolean {
  return new Date().getHours() >= 12
}
