// RecoveryRepository — sleep, recovery metrics, body metrics

import type {
  PrismaClient,
  BodyMetric,
  SleepMetric,
  RecoveryMetric,
  Prisma,
} from '@prisma/client'
import { BaseRepository } from './base.repository'
import type { TimeSeriesParams } from '../types/pagination.types'

export class RecoveryRepository extends BaseRepository {
  constructor(db: PrismaClient) {
    super(db)
  }

  // ─── Body Metrics ────────────────────────────────────────────────────────────

  async createBodyMetric(data: Prisma.BodyMetricCreateInput): Promise<BodyMetric> {
    return this.db.bodyMetric.create({ data })
  }

  async findLatestBodyMetric(userId: string): Promise<BodyMetric | null> {
    return this.db.bodyMetric.findFirst({
      where: { userId },
      orderBy: { recordedAt: 'desc' },
    })
  }

  async findBodyMetricRange(params: TimeSeriesParams): Promise<BodyMetric[]> {
    const { userId, from, to, limit = 90 } = params
    return this.db.bodyMetric.findMany({
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

  // ─── Sleep Metrics ───────────────────────────────────────────────────────────

  async createSleepMetric(data: Prisma.SleepMetricCreateInput): Promise<SleepMetric> {
    return this.db.sleepMetric.create({ data })
  }

  async findLatestSleep(userId: string): Promise<SleepMetric | null> {
    return this.db.sleepMetric.findFirst({
      where: { userId },
      orderBy: { date: 'desc' },
    })
  }

  async findSleepRange(params: TimeSeriesParams): Promise<SleepMetric[]> {
    const { userId, from, to, limit = 30 } = params
    return this.db.sleepMetric.findMany({
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

  async getAvgSleepMinutes(userId: string, days: number): Promise<number> {
    const from = new Date()
    from.setDate(from.getDate() - days)
    const result = await this.db.sleepMetric.aggregate({
      where: { userId, date: { gte: from } },
      _avg: { totalSleepMinutes: true },
    })
    return result._avg.totalSleepMinutes ?? 0
  }

  // ─── Recovery Metrics ────────────────────────────────────────────────────────

  async createRecoveryMetric(data: Prisma.RecoveryMetricCreateInput): Promise<RecoveryMetric> {
    return this.db.recoveryMetric.create({ data })
  }

  async findLatestRecovery(userId: string): Promise<RecoveryMetric | null> {
    return this.db.recoveryMetric.findFirst({
      where: { userId },
      orderBy: { recordedAt: 'desc' },
    })
  }

  async findRecoveryRange(params: TimeSeriesParams): Promise<RecoveryMetric[]> {
    const { userId, from, to, limit = 30 } = params
    return this.db.recoveryMetric.findMany({
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

  /** Rolling HRV average over N days — for baseline computation. */
  async getHrvBaseline(userId: string, days: number): Promise<number | null> {
    const from = new Date()
    from.setDate(from.getDate() - days)
    const result = await this.db.recoveryMetric.aggregate({
      where: { userId, date: { gte: from }, hrv: { not: null } },
      _avg: { hrv: true },
    })
    return result._avg.hrv
  }
}
