// Daily Scoring System — ETAP 6
// Four dimension scores + composite. Explainable, deterministic, versioned.

import 'server-only'
import { prisma as db } from '@/lib/db'
import { aiLogger, timer } from '@/lib/logger'

// ─── Types ────────────────────────────────────────────────────────────────────

export type DailyScoreResult = {
  performanceScore: number | null   // 0-100
  recoveryScore: number | null
  consistencyScore: number | null
  nutritionScore: number | null
  overallScore: number | null
  drivers: {
    performance: string[]
    recovery: string[]
    consistency: string[]
    nutrition: string[]
  }
}

const SCORE_VERSION = '1.0'

// ─── Public API ───────────────────────────────────────────────────────────────

export async function computeAndPersistDailyScore(
  userId: string,
  date: Date,
): Promise<DailyScoreResult> {
  const t = timer(aiLogger, 'computeDailyScore')
  const dateOnly = startOfDay(date)
  const d7ago = daysBack(dateOnly, 7)

  const [dailyLog, latestRecovery, latestSleep, trainingLoad, adherenceRecords] =
    await Promise.all([
      db.dailyLog.findFirst({
        where: { userId, date: dateOnly },
        select: {
          consumedCalories: true,
          targetCalories: true,
          consumedProteinG: true,
          targetProteinG: true,
          consumedCarbsG: true,
          consumedFatG: true,
        },
      }),
      db.recoveryMetric.findFirst({
        where: { userId, date: { lte: dateOnly } },
        orderBy: { date: 'desc' },
        select: { readinessScore: true, hrv: true, restingHR: true },
      }),
      db.sleepMetric.findFirst({
        where: { userId, date: { lte: dateOnly } },
        orderBy: { date: 'desc' },
        select: { sleepScore: true, totalSleepMinutes: true },
      }),
      db.trainingLoad.findFirst({
        where: { userId, date: dateOnly },
        select: { tsb: true, atl: true, ctl: true, dailyTSS: true },
      }),
      db.adherenceRecord.findMany({
        where: { userId, date: { gte: d7ago, lte: dateOnly } },
        select: { dailyAdherenceScore: true, streakDays: true },
        orderBy: { date: 'desc' },
      }),
    ])

  // ── Performance Score ──────────────────────────────────────────────────────
  const perfDrivers: string[] = []
  let performanceScore: number | null = null

  if (trainingLoad) {
    const tsb = trainingLoad.tsb ?? 0
    const tss = trainingLoad.dailyTSS ?? 0
    let ps = 50
    if (tss > 0) {
      // Had training
      if (tsb >= -5 && tsb <= 15) { ps = 85; perfDrivers.push('Trening w optymalnej formie') }
      else if (tsb < -20) { ps = 55; perfDrivers.push('Trening przy dużym zmęczeniu') }
      else { ps = 70 }
    } else {
      // Rest day
      if (tsb > 5) { ps = 75; perfDrivers.push('Dzień regeneracyjny przy dobrej formie') }
      else { ps = 60 }
    }
    performanceScore = Math.round(Math.min(100, ps))
  }

  // ── Recovery Score ─────────────────────────────────────────────────────────
  const recDrivers: string[] = []
  let recoveryScore: number | null = null

  const recoveryInputs: number[] = []
  if (latestRecovery?.readinessScore) recoveryInputs.push(latestRecovery.readinessScore)
  if (latestSleep?.sleepScore) recoveryInputs.push(latestSleep.sleepScore)
  if (latestSleep?.totalSleepMinutes) {
    const sleepHours = latestSleep.totalSleepMinutes / 60
    const sleepPointScore = sleepHours >= 7.5 ? 90 : sleepHours >= 7 ? 80 : sleepHours >= 6 ? 60 : 40
    recoveryInputs.push(sleepPointScore)
  }

  if (recoveryInputs.length > 0) {
    recoveryScore = Math.round(recoveryInputs.reduce((a, b) => a + b, 0) / recoveryInputs.length)
    if (recoveryScore >= 75) recDrivers.push('Wysoka gotowość regeneracyjna')
    else if (recoveryScore < 50) recDrivers.push('Regeneracja wymaga uwagi')
    if (latestSleep?.totalSleepMinutes && latestSleep.totalSleepMinutes >= 420) {
      recDrivers.push(`Sen: ${Math.round(latestSleep.totalSleepMinutes / 60 * 10) / 10} h`)
    }
  }

  // ── Consistency Score ──────────────────────────────────────────────────────
  const consDrivers: string[] = []
  let consistencyScore: number | null = null

  if (adherenceRecords.length > 0) {
    const avgAdherence = adherenceRecords.reduce((s, r) => s + (r.dailyAdherenceScore ?? 0.5), 0) / adherenceRecords.length
    const streak = adherenceRecords[0]?.streakDays ?? 0
    consistencyScore = Math.round(avgAdherence * 80 + Math.min(streak, 7) * 2.86)
    consistencyScore = Math.min(100, consistencyScore)
    if (streak >= 5) consDrivers.push(`Seria ${streak} dni`)
    if (avgAdherence >= 0.8) consDrivers.push('Konsekwentne realizowanie planów')
    else if (avgAdherence < 0.5) consDrivers.push('Trudności z realizacją planu')
  }

  // ── Nutrition Score ────────────────────────────────────────────────────────
  const nutDrivers: string[] = []
  let nutritionScore: number | null = null

  if (dailyLog) {
    const kcalTarget = dailyLog.targetCalories
    const kcalActual = dailyLog.consumedCalories
    const protTarget = dailyLog.targetProteinG
    const protActual = dailyLog.consumedProteinG

    if (kcalTarget > 0 && kcalActual > 0) {
      const kcalRatio = kcalActual / kcalTarget
      let ns = 50
      if (kcalRatio >= 0.9 && kcalRatio <= 1.1) { ns = 90; nutDrivers.push('Kcal w celu') }
      else if (kcalRatio >= 0.8 && kcalRatio <= 1.2) { ns = 75; nutDrivers.push('Kcal bliskie celu') }
      else if (kcalRatio < 0.7) { ns = 45; nutDrivers.push('Niedobór kalorii') }
      else { ns = 60 }

      if (protTarget && protTarget > 0 && protActual > 0) {
        const protRatio = protActual / protTarget
        if (protRatio >= 0.9) { ns = Math.min(100, ns + 10); nutDrivers.push('Białko osiągnięte') }
        else if (protRatio < 0.7) { ns = Math.max(0, ns - 10); nutDrivers.push('Niedobór białka') }
      }
      nutritionScore = Math.round(ns)
    }
  }

  // ── Overall Score ──────────────────────────────────────────────────────────
  const dimensionScores: number[] = []
  const dimWeights: number[] = []

  if (performanceScore !== null) { dimensionScores.push(performanceScore); dimWeights.push(0.25) }
  if (recoveryScore !== null) { dimensionScores.push(recoveryScore); dimWeights.push(0.30) }
  if (consistencyScore !== null) { dimensionScores.push(consistencyScore); dimWeights.push(0.25) }
  if (nutritionScore !== null) { dimensionScores.push(nutritionScore); dimWeights.push(0.20) }

  let overallScore: number | null = null
  if (dimensionScores.length > 0) {
    const totalW = dimWeights.reduce((a, b) => a + b, 0)
    overallScore = Math.round(
      dimensionScores.reduce((s, v, i) => s + v * dimWeights[i], 0) / totalW
    )
  }

  // ── Persist ───────────────────────────────────────────────────────────────
  try {
    await db.dailyScore.upsert({
      where: { userId_date: { userId, date: dateOnly } },
      create: {
        userId,
        date: dateOnly,
        performanceScore,
        recoveryScore,
        consistencyScore,
        nutritionScore,
        overallScore,
        performanceDrivers: perfDrivers,
        recoveryDrivers: recDrivers,
        consistencyDrivers: consDrivers,
        nutritionDrivers: nutDrivers,
        scoreVersion: SCORE_VERSION,
      },
      update: {
        performanceScore,
        recoveryScore,
        consistencyScore,
        nutritionScore,
        overallScore,
        performanceDrivers: perfDrivers,
        recoveryDrivers: recDrivers,
        consistencyDrivers: consDrivers,
        nutritionDrivers: nutDrivers,
        computedAt: new Date(),
      },
    })
  } catch (err) {
    aiLogger.warn({ userId, err }, 'daily score persistence failed (non-fatal)')
  }

  t.end({ userId, overallScore })

  return {
    performanceScore,
    recoveryScore,
    consistencyScore,
    nutritionScore,
    overallScore,
    drivers: {
      performance: perfDrivers,
      recovery: recDrivers,
      consistency: consDrivers,
      nutrition: nutDrivers,
    },
  }
}

/**
 * Get today's daily score from DB (fast path, no computation).
 */
export async function getTodayScore(userId: string): Promise<DailyScoreResult | null> {
  const today = startOfDay(new Date())
  const rec = await db.dailyScore.findUnique({
    where: { userId_date: { userId, date: today } },
  })
  if (!rec) return null

  return {
    performanceScore: rec.performanceScore,
    recoveryScore: rec.recoveryScore,
    consistencyScore: rec.consistencyScore,
    nutritionScore: rec.nutritionScore,
    overallScore: rec.overallScore,
    drivers: {
      performance: (rec.performanceDrivers as string[]) ?? [],
      recovery: (rec.recoveryDrivers as string[]) ?? [],
      consistency: (rec.consistencyDrivers as string[]) ?? [],
      nutrition: (rec.nutritionDrivers as string[]) ?? [],
    },
  }
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

function daysBack(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() - n)
  return r
}
