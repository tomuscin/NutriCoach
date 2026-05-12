// IntegrationRepository — manage TP/Garmin integration state and sync logs

import type {
  PrismaClient,
  Integration,
  SyncLog,
  IntegrationProvider,
  SyncType,
  SyncStatus,
  Prisma,
} from '@prisma/client'
import { BaseRepository } from './base.repository'

export class IntegrationRepository extends BaseRepository {
  constructor(db: PrismaClient) {
    super(db)
  }

  // ─── Integration ─────────────────────────────────────────────────────────────

  async findByUserAndProvider(
    userId: string,
    provider: IntegrationProvider,
  ): Promise<Integration | null> {
    return this.db.integration.findUnique({
      where: { userId_provider: { userId, provider } },
    })
  }

  async findAllByUser(userId: string): Promise<Integration[]> {
    return this.db.integration.findMany({ where: { userId } })
  }

  async upsert(
    userId: string,
    provider: IntegrationProvider,
    data: Omit<Prisma.IntegrationCreateInput, 'user' | 'provider'>,
  ): Promise<Integration> {
    return this.db.integration.upsert({
      where: { userId_provider: { userId, provider } },
      create: { provider, user: { connect: { id: userId } }, ...data },
      update: data,
    })
  }

  async update(id: string, data: Prisma.IntegrationUpdateInput): Promise<Integration> {
    return this.db.integration.update({ where: { id }, data })
  }

  async markConnected(
    id: string,
    tokens: {
      accessToken: string
      refreshToken?: string
      tokenExpiresAt?: Date
      scope?: string
      athleteExternalId?: string
    },
  ): Promise<Integration> {
    return this.db.integration.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        errorMessage: null,
        errorCount: 0,
        ...tokens,
      },
    })
  }

  async markError(id: string, message: string): Promise<Integration> {
    return this.db.integration.update({
      where: { id },
      data: {
        status: 'ERROR',
        errorMessage: message,
        errorCount: { increment: 1 },
        lastErrorAt: new Date(),
      },
    })
  }

  async updateSyncSchedule(
    id: string,
    lastSyncAt: Date,
    nextSyncAt: Date,
  ): Promise<Integration> {
    return this.db.integration.update({
      where: { id },
      data: { lastSyncAt, nextSyncAt },
    })
  }

  /** Find integrations due for sync — used by the sync scheduler. */
  async findDueForSync(now = new Date()): Promise<Integration[]> {
    return this.db.integration.findMany({
      where: {
        status: 'ACTIVE',
        nextSyncAt: { lte: now },
      },
    })
  }

  // ─── Sync Logs ───────────────────────────────────────────────────────────────

  async createSyncLog(data: Prisma.SyncLogCreateInput): Promise<SyncLog> {
    return this.db.syncLog.create({ data })
  }

  async updateSyncLog(
    id: string,
    data: Partial<{
      status: SyncStatus
      recordsProcessed: number
      recordsCreated: number
      recordsUpdated: number
      recordsSkipped: number
      recordsFailed: number
      finishedAt: Date
      errors: Prisma.InputJsonValue
    }>,
  ): Promise<SyncLog> {
    return this.db.syncLog.update({ where: { id }, data })
  }

  async findRecentSyncLogs(integrationId: string, limit = 10): Promise<SyncLog[]> {
    return this.db.syncLog.findMany({
      where: { integrationId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    })
  }

  async findLastSuccessfulSync(
    userId: string,
    provider: IntegrationProvider,
    syncType: SyncType,
  ): Promise<SyncLog | null> {
    const integration = await this.findByUserAndProvider(userId, provider)
    if (!integration) return null

    return this.db.syncLog.findFirst({
      where: {
        integrationId: integration.id,
        syncType,
        status: 'SUCCESS',
      },
      orderBy: { startedAt: 'desc' },
    })
  }
}
