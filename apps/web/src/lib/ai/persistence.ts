// AI Persistence Layer — ETAP 5 + ETAP 5.5
// Every AI insight is stored with full provenance:
//   - prompt version, model, token counts
//   - context snapshot (for debugging + prompt improvement)
//   - confidence score + multi-dimensional quality breakdown
//   - explainability (primaryDrivers, supportingSignals, explanationWarnings)
//   - request correlation

import 'server-only'
import { prisma as db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import type { AIContext } from './context-builder'
import type { AIConfidenceBreakdown } from './quality-engine'

export type PersistInsightInput = {
  userId: string
  insightType: string    // InsightType enum value
  deliveryMoment: string // InsightDeliveryMoment enum value
  content: string
  recommendation?: string
  promptVersion: string
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  contextSnapshot: AIContext
  confidenceScore?: number
  dailyLogId?: string
  // ETAP 5.5
  qualityBreakdown?: AIConfidenceBreakdown
  primaryDrivers?: string[]
  supportingSignals?: string[]
  explanationWarnings?: string[]
}

export async function persistInsight(input: PersistInsightInput): Promise<string> {
  const insight = await db.aIInsight.create({
    data: {
      userId: input.userId,
      dailyLogId: input.dailyLogId ?? null,
      insightType: input.insightType as never,
      deliveryMoment: input.deliveryMoment as never,
      content: input.content,
      recommendation: input.recommendation ?? null,
      promptVersion: input.promptVersion,
      model: input.model,
      promptTokens: input.promptTokens,
      completionTokens: input.completionTokens,
      totalTokens: input.totalTokens,
      contextSnapshot: input.contextSnapshot as object,
      // Quality breakdown
      confidenceScore: input.qualityBreakdown?.overall ?? input.confidenceScore ?? null,
      nutritionConfidence: input.qualityBreakdown?.nutritionConfidence ?? null,
      trainingConfidence: input.qualityBreakdown?.trainingConfidence ?? null,
      recoveryConfidence: input.qualityBreakdown?.recoveryConfidence ?? null,
      dataCompleteness: input.qualityBreakdown?.dataCompleteness ?? null,
      dataFreshness: input.qualityBreakdown?.dataFreshness ?? null,
      missingSignals: input.qualityBreakdown?.missingSignals != null
        ? (input.qualityBreakdown.missingSignals as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      // Explainability
      primaryDrivers: input.primaryDrivers?.length
        ? (input.primaryDrivers as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      supportingSignals: input.supportingSignals?.length
        ? (input.supportingSignals as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      explanationWarnings: input.explanationWarnings?.length
        ? (input.explanationWarnings as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    },
    select: { id: true },
  })
  return insight.id
}

// ─── Feedback persistence ─────────────────────────────────────────────────────

export type FeedbackInput = {
  insightId: string
  userId: string
  feedback: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
  feedbackNote?: string
}

export async function submitInsightFeedback(input: FeedbackInput): Promise<boolean> {
  const updated = await db.aIInsight.updateMany({
    where: { id: input.insightId, userId: input.userId },
    data: {
      feedback: input.feedback as never,
      feedbackNote: input.feedbackNote ?? null,
      feedbackAt: new Date(),
    },
  })
  return updated.count > 0
}

// ─── Deduplication — only one insight per type per hour ──────────────────────

export async function hasRecentInsight(
  userId: string,
  insightType: string,
  withinMinutes = 60,
): Promise<boolean> {
  const since = new Date(Date.now() - withinMinutes * 60_000)
  const existing = await db.aIInsight.findFirst({
    where: {
      userId,
      insightType: insightType as never,
      createdAt: { gte: since },
    },
    select: { id: true },
  })
  return existing !== null
}

// ─── Get latest insight for dashboard ────────────────────────────────────────

export async function getLatestInsight(userId: string) {
  return db.aIInsight.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      insightType: true,
      content: true,
      confidenceScore: true,
      nutritionConfidence: true,
      trainingConfidence: true,
      recoveryConfidence: true,
      dataCompleteness: true,
      missingSignals: true,
      primaryDrivers: true,
      supportingSignals: true,
      explanationWarnings: true,
      feedback: true,
      createdAt: true,
    },
  })
}

// ─── Paginated insight history ────────────────────────────────────────────────

export async function getInsightHistory(
  userId: string,
  options: { page?: number; pageSize?: number; type?: string } = {},
) {
  const { page = 1, pageSize = 20, type } = options
  const skip = (page - 1) * pageSize

  const where = {
    userId,
    ...(type ? { insightType: type as never } : {}),
  }

  const [items, total] = await Promise.all([
    db.aIInsight.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      select: {
        id: true,
        insightType: true,
        content: true,
        recommendation: true,
        confidenceScore: true,
        nutritionConfidence: true,
        trainingConfidence: true,
        recoveryConfidence: true,
        dataCompleteness: true,
        missingSignals: true,
        primaryDrivers: true,
        supportingSignals: true,
        explanationWarnings: true,
        feedback: true,
        feedbackNote: true,
        feedbackAt: true,
        promptVersion: true,
        model: true,
        totalTokens: true,
        createdAt: true,
      },
    }),
    db.aIInsight.count({ where }),
  ])

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

// ─── Aggregate metrics for AI Runtime dashboard ───────────────────────────────

export async function getAIMetrics(userId: string, days = 30) {
  const since = new Date(Date.now() - days * 86_400_000)

  const insights = await db.aIInsight.findMany({
    where: { userId, createdAt: { gte: since } },
    select: {
      confidenceScore: true,
      totalTokens: true,
      feedback: true,
      missingSignals: true,
      promptVersion: true,
      model: true,
      insightType: true,
      createdAt: true,
    },
  })

  const count = insights.length
  if (count === 0) return null

  const avgConfidence = avg(insights.map((i) => i.confidenceScore ?? 0))
  const avgTokens = avg(insights.map((i) => i.totalTokens))
  const positiveRate = insights.filter((i) => i.feedback === 'POSITIVE').length / count
  const negativeRate = insights.filter((i) => i.feedback === 'NEGATIVE').length / count
  const feedbackRate = insights.filter((i) => i.feedback !== null).length / count

  // Top missing signals
  const allMissing: string[] = []
  for (const i of insights) {
    if (Array.isArray(i.missingSignals)) allMissing.push(...(i.missingSignals as string[]))
  }
  const missingCounts = countOccurrences(allMissing)

  // By type breakdown
  const byType: Record<string, number> = {}
  for (const i of insights) {
    byType[i.insightType] = (byType[i.insightType] ?? 0) + 1
  }

  return {
    totalInsights: count,
    avgConfidence: round2(avgConfidence),
    avgTokens: Math.round(avgTokens),
    positiveRate: round2(positiveRate),
    negativeRate: round2(negativeRate),
    feedbackRate: round2(feedbackRate),
    topMissingSignals: missingCounts.slice(0, 5),
    byType,
    periodDays: days,
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function avg(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function round2(val: number): number {
  return Math.round(val * 100) / 100
}

function countOccurrences(arr: string[]): { signal: string; count: number }[] {
  const map: Record<string, number> = {}
  for (const s of arr) map[s] = (map[s] ?? 0) + 1
  return Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .map(([signal, count]) => ({ signal, count }))
}

