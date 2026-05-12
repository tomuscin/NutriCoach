// GoalRepository — goal management with full audit history

import type { PrismaClient, Goal, GoalStatus, GoalHistory, Prisma } from '@prisma/client'
import { BaseRepository } from './base.repository'
import type { PaginationParams, PaginatedResult } from '../types/pagination.types'
import { buildPage } from '../helpers/pagination'

export class GoalRepository extends BaseRepository {
  constructor(db: PrismaClient) {
    super(db)
  }

  async findById(id: string): Promise<Goal | null> {
    return this.db.goal.findUnique({ where: { id } })
  }

  async findActiveByUser(userId: string): Promise<Goal | null> {
    return this.db.goal.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findManyByUser(
    userId: string,
    params?: PaginationParams,
  ): Promise<PaginatedResult<Goal>> {
    const { skip, take } = this.paginate(params)
    const [items, total] = await Promise.all([
      this.db.goal.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.db.goal.count({ where: { userId } }),
    ])
    return buildPage(items, total, params)
  }

  async create(data: Prisma.GoalCreateInput): Promise<Goal> {
    return this.db.goal.create({ data })
  }

  async update(id: string, data: Prisma.GoalUpdateInput): Promise<Goal> {
    return this.db.goal.update({ where: { id }, data })
  }

  /**
   * Change goal status and create an immutable GoalHistory entry.
   * Always use this instead of update() for status changes.
   */
  async changeStatus(
    id: string,
    userId: string,
    newStatus: GoalStatus,
    reason?: string,
    triggeredBy: 'user' | 'system' | 'auto' = 'user',
  ): Promise<Goal> {
    const current = await this.db.goal.findUniqueOrThrow({ where: { id } })

    return this.db.$transaction(async (tx) => {
      const updated = await tx.goal.update({
        where: { id },
        data: { status: newStatus },
      })

      await tx.goalHistory.create({
        data: {
          goalId: id,
          userId,
          previousStatus: current.status,
          newStatus,
          reason,
          triggeredBy,
          snapshot: current as unknown as Prisma.InputJsonValue,
        },
      })

      return updated
    })
  }

  async findHistory(goalId: string): Promise<GoalHistory[]> {
    return this.db.goalHistory.findMany({
      where: { goalId },
      orderBy: { changedAt: 'desc' },
    })
  }

  async archive(id: string, userId: string): Promise<Goal> {
    return this.changeStatus(id, userId, 'ARCHIVED', 'User archived goal', 'user')
  }
}
