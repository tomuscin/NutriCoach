// WorkoutRepository — workout CRUD + training load queries

import type { PrismaClient, Workout, TrainingLoad, Prisma, WorkoutSource } from '@prisma/client'
import { BaseRepository } from './base.repository'
import type { PaginationParams, PaginatedResult, TimeSeriesParams } from '../types/pagination.types'
import { buildPage } from '../helpers/pagination'
import { excludeDeleted, softDeletePayload } from '../helpers/soft-delete'

export class WorkoutRepository extends BaseRepository {
  constructor(db: PrismaClient) {
    super(db)
  }

  async findById(id: string): Promise<Workout | null> {
    return this.db.workout.findUnique({
      where: { id, ...excludeDeleted },
    })
  }

  async findManyByUser(
    userId: string,
    params?: PaginationParams,
  ): Promise<PaginatedResult<Workout>> {
    const { skip, take } = this.paginate(params)
    const where = { userId, ...excludeDeleted }
    const [items, total] = await Promise.all([
      this.db.workout.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take,
      }),
      this.db.workout.count({ where }),
    ])
    return buildPage(items, total, params)
  }

  async findRange(params: TimeSeriesParams): Promise<Workout[]> {
    const { userId, from, to, limit = 90 } = params
    return this.db.workout.findMany({
      where: {
        userId,
        ...excludeDeleted,
        date: {
          ...(from && { gte: from }),
          ...(to && { lte: to }),
        },
      },
      orderBy: { date: 'desc' },
      take: limit,
    })
  }

  async findByDate(userId: string, date: Date): Promise<Workout[]> {
    return this.db.workout.findMany({
      where: { userId, date, ...excludeDeleted },
      orderBy: { startedAt: 'asc' },
    })
  }

  /** Check if an external workout already exists (deduplication). */
  async findByExternalId(
    userId: string,
    externalId: string,
    source: WorkoutSource,
  ): Promise<Workout | null> {
    return this.db.workout.findFirst({
      where: { userId, externalId, source },
    })
  }

  async create(data: Prisma.WorkoutCreateInput): Promise<Workout> {
    return this.db.workout.create({ data })
  }

  /** Upsert by externalId — used during TP/Garmin sync. */
  async upsertExternal(
    userId: string,
    externalId: string,
    source: WorkoutSource,
    data: Omit<Prisma.WorkoutCreateInput, 'user'>,
  ): Promise<{ workout: Workout; created: boolean }> {
    const existing = await this.findByExternalId(userId, externalId, source)
    if (existing) {
      const workout = await this.db.workout.update({
        where: { id: existing.id },
        data,
      })
      return { workout, created: false }
    }
    const workout = await this.db.workout.create({
      data: { ...data, user: { connect: { id: userId } } },
    })
    return { workout, created: true }
  }

  async update(id: string, data: Prisma.WorkoutUpdateInput): Promise<Workout> {
    return this.db.workout.update({ where: { id }, data })
  }

  async softDelete(id: string): Promise<Workout> {
    return this.db.workout.update({
      where: { id },
      data: softDeletePayload(),
    })
  }

  /** Sum TSS for a specific date — used for TrainingLoad computation. */
  async sumTSSForDate(userId: string, date: Date): Promise<number> {
    const result = await this.db.workout.aggregate({
      where: { userId, date, ...excludeDeleted, tss: { not: null } },
      _sum: { tss: true },
    })
    return result._sum.tss ?? 0
  }

  // ─── TrainingLoad ────────────────────────────────────────────────────────────

  async upsertTrainingLoad(
    userId: string,
    date: Date,
    data: { ctl: number; atl: number; tsb: number; dailyTSS: number },
  ): Promise<TrainingLoad> {
    return this.db.trainingLoad.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, ...data },
      update: { ...data, computedAt: new Date() },
    })
  }

  async findTrainingLoadRange(params: TimeSeriesParams): Promise<TrainingLoad[]> {
    const { userId, from, to, limit = 90 } = params
    return this.db.trainingLoad.findMany({
      where: {
        userId,
        date: {
          ...(from && { gte: from }),
          ...(to && { lte: to }),
        },
      },
      orderBy: { date: 'asc' },
      take: limit,
    })
  }

  async findLatestTrainingLoad(userId: string): Promise<TrainingLoad | null> {
    return this.db.trainingLoad.findFirst({
      where: { userId },
      orderBy: { date: 'desc' },
    })
  }
}
