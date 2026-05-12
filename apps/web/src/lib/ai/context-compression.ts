// AI Context Compression — ETAP 6
// Manages rolling summaries, signal prioritization, token budgets.
// Prevents context from growing unboundedly as history accumulates.

import 'server-only'
import { prisma as db } from '@/lib/db'
import { aiLogger, timer } from '@/lib/logger'

// ─── Types ────────────────────────────────────────────────────────────────────

export type TrendSignal = {
  metric: string
  direction: 'improving' | 'declining' | 'stable'
  magnitude: 'small' | 'moderate' | 'large'
}

export type RollingSummary = {
  summaryText: string   // 200-400 token condensed narrative
  keyThemes: string[]
  openLoops: string[]
  trendSignals: TrendSignal[]
  weekScore: number | null
  tokenCount: number
}

// ─── Token Budget Constants ───────────────────────────────────────────────────

export const TOKEN_BUDGETS = {
  ROLLING_SUMMARY: 400,    // rolling 7-day compressed context
  CURRENT_DATA: 800,       // today's signals and metrics
  INSIGHT_HISTORY: 200,    // last 2-3 insights (brief)
  SYSTEM_PROMPT: 300,      // persona and instructions
  TOTAL_BUDGET: 2000,      // total context budget (leave room for completion)
} as const

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get the most recent rolling summary for a user.
 * Returns null if no summaries exist yet.
 */
export async function getRollingSummary(
  userId: string,
): Promise<RollingSummary | null> {
  const today = startOfDay(new Date())

  const rec = await db.aIRollingSummary.findFirst({
    where: { userId, date: { lte: today } },
    orderBy: { date: 'desc' },
  })

  if (!rec) return null

  return {
    summaryText: rec.summaryText,
    keyThemes: (rec.keyThemes as string[]) ?? [],
    openLoops: (rec.openLoops as string[]) ?? [],
    trendSignals: (rec.trendSignals as TrendSignal[]) ?? [],
    weekScore: rec.weekScore,
    tokenCount: rec.tokenCount ?? estimateTokens(rec.summaryText),
  }
}

/**
 * Build and persist a fresh rolling summary from the last 7 days.
 * Called after evening insight generation or on-demand.
 */
export async function buildAndPersistRollingSummary(
  userId: string,
): Promise<RollingSummary> {
  const t = timer(aiLogger, 'buildRollingSummary')
  const today = startOfDay(new Date())
  const d7ago = daysBack(today, 7)

  const [
    recentInsights,
    adherenceRecords,
    dailyScores,
    bodyMetrics,
    recoveryMetrics,
  ] = await Promise.all([
    db.aIInsight.findMany({
      where: { userId, createdAt: { gte: d7ago } },
      orderBy: { createdAt: 'desc' },
      take: 7,
      select: {
        insightType: true,
        content: true,
        confidenceScore: true,
        feedback: true,
        createdAt: true,
        primaryDrivers: true,
      },
    }),
    db.adherenceRecord.findMany({
      where: { userId, date: { gte: d7ago } },
      select: { date: true, dailyAdherenceScore: true, kcalAdherence: true, workoutCompleted: true },
    }),
    db.dailyScore.findMany({
      where: { userId, date: { gte: d7ago } },
      select: { date: true, overallScore: true, recoveryScore: true, nutritionScore: true },
    }),
    db.bodyMetric.findMany({
      where: { userId, date: { gte: d7ago } },
      orderBy: { date: 'asc' },
      select: { date: true, weightKg: true },
    }),
    db.recoveryMetric.findMany({
      where: { userId, date: { gte: d7ago } },
      select: { date: true, hrv: true, readinessScore: true },
    }),
  ])

  // ── Extract key themes ─────────────────────────────────────────────────────
  const keyThemes: string[] = []

  const avgAdherence =
    adherenceRecords.length > 0
      ? adherenceRecords.reduce((s, r) => s + (r.dailyAdherenceScore ?? 0), 0) /
        adherenceRecords.length
      : null

  if (avgAdherence !== null) {
    if (avgAdherence >= 0.8) keyThemes.push('Wysoka konsekwencja w ostatnim tygodniu')
    else if (avgAdherence < 0.5) keyThemes.push('Trudności z realizacją planu żywieniowego')
  }

  const workoutDays = adherenceRecords.filter(r => r.workoutCompleted).length
  if (workoutDays >= 5) keyThemes.push('Intensywny tydzień treningowy')
  else if (workoutDays <= 1) keyThemes.push('Tydzień z niską aktywnością fizyczną')

  const avgOverallScore =
    dailyScores.length > 0
      ? dailyScores.reduce((s, r) => s + (r.overallScore ?? 0), 0) / dailyScores.length
      : null

  // ── Weight trend ───────────────────────────────────────────────────────────
  let weightTrendText = ''
  if (bodyMetrics.length >= 2) {
    const first = bodyMetrics[0].weightKg
    const last = bodyMetrics[bodyMetrics.length - 1].weightKg
    if (first !== null && last !== null) {
      const delta = last - first
      if (Math.abs(delta) > 0.3) {
        weightTrendText = delta < 0
          ? `Waga: -${Math.abs(delta).toFixed(1)} kg w 7 dni`
          : `Waga: +${delta.toFixed(1)} kg w 7 dni`
        keyThemes.push(weightTrendText)
      }
    }
  }

  // ── Open loops (unresolved issues from previous insights) ─────────────────
  const openLoops: string[] = []
  const negativeInsights = recentInsights.filter(i => i.feedback === 'NEGATIVE')
  if (negativeInsights.length > 0) {
    openLoops.push('Poprzednie rekomendacje ocenione negatywnie — sprawdź dostosowanie')
  }

  const lowConfidenceInsights = recentInsights.filter(
    i => i.confidenceScore !== null && (i.confidenceScore ?? 0) < 0.4
  )
  if (lowConfidenceInsights.length >= 3) {
    openLoops.push('Braki danych przez kilka dni — aktualizuj dane wejściowe')
  }

  // ── Trend signals ──────────────────────────────────────────────────────────
  const trendSignals: TrendSignal[] = []

  const avgHRV =
    recoveryMetrics.length > 0
      ? recoveryMetrics.filter(r => r.hrv !== null).reduce((s, r) => s + (r.hrv ?? 0), 0) /
        Math.max(1, recoveryMetrics.filter(r => r.hrv !== null).length)
      : null

  if (avgHRV && avgHRV > 0) {
    const recentHRV = recoveryMetrics.slice(-3).filter(r => r.hrv !== null)
    const olderHRV = recoveryMetrics.slice(0, 4).filter(r => r.hrv !== null)
    if (recentHRV.length > 0 && olderHRV.length > 0) {
      const recentAvg = recentHRV.reduce((s, r) => s + (r.hrv ?? 0), 0) / recentHRV.length
      const olderAvg = olderHRV.reduce((s, r) => s + (r.hrv ?? 0), 0) / olderHRV.length
      const change = (recentAvg - olderAvg) / olderAvg
      if (Math.abs(change) > 0.05) {
        trendSignals.push({
          metric: 'HRV',
          direction: change > 0 ? 'improving' : 'declining',
          magnitude: Math.abs(change) > 0.15 ? 'large' : 'moderate',
        })
      }
    }
  }

  // ── Build summary narrative ────────────────────────────────────────────────
  const lines: string[] = []
  lines.push(`Podsumowanie ostatnich 7 dni (${isoDate(d7ago)} - ${isoDate(today)}):`)

  if (avgAdherence !== null) {
    lines.push(`Adherencja: ${Math.round(avgAdherence * 100)}% (${workoutDays}/7 dni z treningiem)`)
  }

  if (avgOverallScore !== null) {
    lines.push(`Średni wynik dnia: ${Math.round(avgOverallScore)}/100`)
  }

  if (weightTrendText) lines.push(weightTrendText)

  if (keyThemes.length > 0) {
    lines.push(`Kluczowe tematy: ${keyThemes.slice(0, 3).join('; ')}`)
  }

  if (openLoops.length > 0) {
    lines.push(`Otwarte kwestie: ${openLoops.join('; ')}`)
  }

  if (trendSignals.length > 0) {
    const signalText = trendSignals
      .map(s => `${s.metric} ${s.direction === 'improving' ? 'rośnie' : 'spada'} (${s.magnitude})`)
      .join(', ')
    lines.push(`Trendy: ${signalText}`)
  }

  // Trim to token budget
  const summaryText = trimToTokens(lines.join('\n'), TOKEN_BUDGETS.ROLLING_SUMMARY)
  const tokenCount = estimateTokens(summaryText)

  const weekScore = avgOverallScore !== null ? Math.round(avgOverallScore) : null

  // ── Persist ───────────────────────────────────────────────────────────────
  try {
    await db.aIRollingSummary.upsert({
      where: { userId_date: { userId, date: today } },
      create: {
        userId,
        date: today,
        summaryText,
        keyThemes,
        openLoops,
        trendSignals,
        weekScore,
        tokenCount,
      },
      update: {
        summaryText,
        keyThemes,
        openLoops,
        trendSignals,
        weekScore,
        tokenCount,
        generatedAt: new Date(),
      },
    })
  } catch (err) {
    aiLogger.warn({ userId, err }, 'rolling summary persistence failed (non-fatal)')
  }

  t.end({ userId, tokenCount })

  return { summaryText, keyThemes, openLoops, trendSignals, weekScore, tokenCount }
}

/**
 * Serialize rolling summary for injection into AI prompts.
 * Token-budget aware.
 */
export function serializeRollingSummaryForPrompt(summary: RollingSummary | null): string {
  if (!summary) return ''

  return [
    '=== ROLLING CONTEXT (last 7 days) ===',
    summary.summaryText,
    '=== END ROLLING CONTEXT ===',
  ].join('\n')
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Rough token estimation: ~4 chars per token for Polish text */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5)
}

/** Trim text to stay within approximate token budget */
function trimToTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 3.5
  if (text.length <= maxChars) return text
  return text.slice(0, Math.floor(maxChars)) + '...'
}

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

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0]
}
