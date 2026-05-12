// DailyLogRepository — the central aggregate for each day

import type { PrismaClient, DailyLog, Meal, Prisma } from '@prisma/client'
import { BaseRepository } from './base.repository'
import type { TimeSeriesParams } from '../types/pagination.types'
import { excludeDeleted } from '../helpers/soft-delete'

export type DailyLogWithMeals = DailyLog & { meals: Meal[] }

export class DailyLogRepository extends BaseRepository {
  constructor(db: PrismaClient) {
    super(db)
  }

  async findById(id: string): Promise<DailyLog | null> {
    return this.db.dailyLog.findUnique({ where: { id } })
  }

  async findByDate(userId: string, date: Date): Promise<DailyLog | null> {
    return this.db.dailyLog.findUnique({
      where: { userId_date: { userId, date } },
    })
  }

  async findByDateWithMeals(userId: string, date: Date): Promise<DailyLogWithMeals | null> {
    return this.db.dailyLog.findUnique({
      where: { userId_date: { userId, date } },
      include: {
        meals: {
          where: excludeDeleted,
          orderBy: { createdAt: 'asc' },
        },
      },
    })
  }

  /** Upsert log for a given date — creates if missing, returns existing if present. */
  async upsertForDate(
    userId: string,
    date: Date,
    defaults: { targetCalories: number; targetProteinG: number },
  ): Promise<DailyLog> {
    return this.db.dailyLog.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, ...defaults },
      update: {},
    })
  }

  async update(id: string, data: Prisma.DailyLogUpdateInput): Promise<DailyLog> {
    return this.db.dailyLog.update({ where: { id }, data })
  }

  /**
   * Recalculate and persist the denormalized macro totals.
   * Called after any Meal create/update/delete.
   */
  async recalculateTotals(dailyLogId: string): Promise<DailyLog> {
    const result = await this.db.meal.aggregate({
      where: { dailyLogId, ...excludeDeleted },
      _sum: {
        calories: true,
        proteinG: true,
        carbsG: true,
        fatG: true,
        fiberG: true,
        sodiumMg: true,
        sugarG: true,
      },
    })

    return this.db.dailyLog.update({
      where: { id: dailyLogId },
      data: {
        consumedCalories: result._sum.calories ?? 0,
        consumedProteinG: result._sum.proteinG ?? 0,
        consumedCarbsG: result._sum.carbsG ?? 0,
        consumedFatG: result._sum.fatG ?? 0,
        consumedFiberG: result._sum.fiberG ?? undefined,
        consumedSodiumMg: result._sum.sodiumMg ?? undefined,
        consumedSugarG: result._sum.sugarG ?? undefined,
      },
    })
  }

  /** Fetch a date range of logs — primary analytics query. */
  async findRange(params: TimeSeriesParams): Promise<DailyLog[]> {
    const { userId, from, to, limit = 90 } = params
    return this.db.dailyLog.findMany({
      where: {
        userId,
        date: {
          ...(from && { gte: from }),
          ...(to && { lte: to }),
        },
      },
      orderBy: { date: 'desc' },
      take: limit,
    })
  }

  /** 7-day average of consumed calories — used for AI context. */
  async getSevenDayAvgCalories(userId: string, endDate: Date): Promise<number> {
    const start = new Date(endDate)
    start.setDate(start.getDate() - 7)

    const result = await this.db.dailyLog.aggregate({
      where: { userId, date: { gte: start, lte: endDate } },
      _avg: { consumedCalories: true },
    })

    return result._avg.consumedCalories ?? 0
  }

  async getStreak(userId: string): Promise<number> {
    // Count consecutive days with completed logs going back from today
    const logs = await this.db.dailyLog.findMany({
      where: { userId, completedAt: { not: null } },
      orderBy: { date: 'desc' },
      select: { date: true },
      take: 365,
    })

    let streak = 0
    let expected = new Date()
    expected.setHours(0, 0, 0, 0)

    for (const log of logs) {
      const logDate = new Date(log.date)
      logDate.setHours(0, 0, 0, 0)
      const diff = (expected.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24)
      if (diff > 1) break
      streak++
      expected = logDate
    }

    return streak
  }
}
