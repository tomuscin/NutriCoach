// Repository interface contracts — all repositories implement these

import type { PaginationParams, PaginatedResult } from './pagination.types'

export interface IRepository<T, CreateInput, UpdateInput> {
  findById(id: string): Promise<T | null>
  create(data: CreateInput): Promise<T>
  update(id: string, data: UpdateInput): Promise<T>
  delete(id: string): Promise<void>
}

export interface IUserScopedRepository<T, CreateInput, UpdateInput>
  extends IRepository<T, CreateInput, UpdateInput> {
  findManyByUser(
    userId: string,
    params?: PaginationParams,
  ): Promise<PaginatedResult<T>>
}

// Soft-delete marker type — tables that support soft delete have deletedAt
export type WithSoftDelete = {
  deletedAt: Date | null
}

// Audit fields present on all mutable records
export type AuditFields = {
  createdAt: Date
  updatedAt: Date
}
