// Base repository — provides db access and shared pagination logic

import type { PrismaClient } from '@prisma/client'
import type { PaginationParams } from '../types/pagination.types'
import { toSkipTake } from '../helpers/pagination'

export abstract class BaseRepository {
  protected readonly db: PrismaClient

  constructor(db: PrismaClient) {
    this.db = db
  }

  /** Convenience — convert PaginationParams to Prisma skip/take. */
  protected paginate(params?: PaginationParams) {
    return toSkipTake(params)
  }
}
