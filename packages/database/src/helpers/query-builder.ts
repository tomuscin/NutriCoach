// Query builder utilities — reusable Prisma where/orderBy fragments

import type { Prisma } from '@prisma/client'

/** Date range filter for Prisma DateTimeFilter. */
export function dateRangeFilter(from?: Date, to?: Date): Prisma.DateTimeFilter | undefined {
  if (!from && !to) return undefined
  return {
    ...(from && { gte: from }),
    ...(to && { lte: to }),
  }
}

/** Date range filter for @db.Date fields (ISO date string). */
export function dateOnlyRangeFilter(from?: Date, to?: Date) {
  if (!from && !to) return undefined
  return {
    ...(from && { gte: from }),
    ...(to && { lte: to }),
  }
}

/** Build a userId scope — always required for user-scoped queries. */
export function userScope(userId: string) {
  return { userId } as const
}

/** Standard createdAt descending sort. */
export const orderByCreatedAtDesc = { createdAt: 'desc' } as const

/** Standard date descending sort (for time-series tables). */
export const orderByDateDesc = { date: 'desc' } as const

/** Standard date ascending sort. */
export const orderByDateAsc = { date: 'asc' } as const
