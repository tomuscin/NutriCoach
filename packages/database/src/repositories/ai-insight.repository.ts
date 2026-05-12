// AIInsightRepository — store and query AI-generated insights

import type { PrismaClient, AIInsight, InsightType, InsightDeliveryMoment, Prisma } from '@prisma/client'
import { BaseRepository } from './base.repository'
import type { PaginationParams, PaginatedResult } from '../types/pagination.types'
import { buildPage } from '../helpers/pagination'

export class AIInsightRepository extends BaseRepository {
  constructor(db: PrismaClient) {
    super(db)
  }

  async findById(id: string): Promise<AIInsight | null> {
    return this.db.aIInsight.findUnique({ where: { id } })
  }

  async create(data: Prisma.AIInsightCreateInput): Promise<AIInsight> {
    return this.db.aIInsight.create({ data })
  }

  async findManyByUser(
    userId: string,
    params?: PaginationParams,
  ): Promise<PaginatedResult<AIInsight>> {
    const { skip, take } = this.paginate(params)
    const where = { userId }
    const [items, total] = await Promise.all([
      this.db.aIInsight.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.db.aIInsight.count({ where }),
    ])
    return buildPage(items, total, params)
  }

  /** Find today's insight of a specific type — prevents duplicate generation. */
  async findTodayByType(
    userId: string,
    insightType: InsightType,
    deliveryMoment: InsightDeliveryMoment,
    date: Date,
  ): Promise<AIInsight | null> {
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(date)
    end.setHours(23, 59, 59, 999)

    return this.db.aIInsight.findFirst({
      where: {
        userId,
        insightType,
        deliveryMoment,
        createdAt: { gte: start, lte: end },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /** Unacknowledged insights — for notification badge count. */
  async countUnacknowledged(userId: string): Promise<number> {
    return this.db.aIInsight.count({
      where: { userId, acknowledgedAt: null },
    })
  }

  async acknowledge(id: string): Promise<AIInsight> {
    return this.db.aIInsight.update({
      where: { id },
      data: { acknowledgedAt: new Date() },
    })
  }

  async submitFeedback(
    id: string,
    feedback: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL',
    note?: string,
  ): Promise<AIInsight> {
    return this.db.aIInsight.update({
      where: { id },
      data: { feedback, feedbackNote: note },
    })
  }

  /** Token usage stats — for cost monitoring. */
  async getTokenUsageSummary(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<{ totalTokens: number; insightCount: number }> {
    const result = await this.db.aIInsight.aggregate({
      where: { userId, createdAt: { gte: from, lte: to } },
      _sum: { totalTokens: true },
      _count: { id: true },
    })
    return {
      totalTokens: result._sum.totalTokens ?? 0,
      insightCount: result._count.id,
    }
  }
}
