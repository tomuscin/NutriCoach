// AI Persistence Layer — ETAP 5
// Every AI insight is stored with full provenance:
//   - prompt version, model, token counts
//   - context snapshot (for debugging + prompt improvement)
//   - confidence score
//   - request correlation

import 'server-only'
import { prisma as db } from '@/lib/db'
import type { AIContext } from './context-builder'

export type PersistInsightInput = {
  userId: string
  insightType: string   // InsightType enum value
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
}

export async function persistInsight(input: PersistInsightInput): Promise<string> {
  const insight = await db.aIInsight.create({
    data: {
      userId: input.userId,
      dailyLogId: input.dailyLogId ?? null,
      insightType: input.insightType as Parameters<typeof db.aIInsight.create>[0]['data']['insightType'],
      deliveryMoment: input.deliveryMoment as Parameters<typeof db.aIInsight.create>[0]['data']['deliveryMoment'],
      content: input.content,
      recommendation: input.recommendation ?? null,
      promptVersion: input.promptVersion,
      model: input.model,
      promptTokens: input.promptTokens,
      completionTokens: input.completionTokens,
      totalTokens: input.totalTokens,
      contextSnapshot: input.contextSnapshot as object,
      confidenceScore: input.confidenceScore ?? null,
    },
    select: { id: true },
  })
  return insight.id
}

// ─── Deduplication — only one insight per type per hour ──────────────────────
// Prevents duplicate insights from rapid re-triggers (e.g., import spam)

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
      createdAt: true,
    },
  })
}
