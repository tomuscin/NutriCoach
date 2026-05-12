// Pagination helpers — consistent across all repositories

import type { PaginationParams, PaginatedResult } from '../types/pagination.types'

export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

/** Normalise pagination params and guard against invalid values. */
export function normalisePagination(params?: PaginationParams): Required<Omit<PaginationParams, 'cursor'>> & Pick<PaginationParams, 'cursor'> {
  const page = Math.max(1, params?.page ?? 1)
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, params?.pageSize ?? DEFAULT_PAGE_SIZE),
  )
  return { page, pageSize, cursor: params?.cursor }
}

/** Build Prisma skip/take from pagination params. */
export function toSkipTake(params?: PaginationParams): { skip: number; take: number } {
  const { page, pageSize } = normalisePagination(params)
  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
  }
}

/** Wrap a list + total into a PaginatedResult. */
export function buildPage<T>(
  items: T[],
  total: number,
  params?: PaginationParams,
): PaginatedResult<T> {
  const { page, pageSize } = normalisePagination(params)
  const totalPages = Math.ceil(total / pageSize)
  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  }
}
