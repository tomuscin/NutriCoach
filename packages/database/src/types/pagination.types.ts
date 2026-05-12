// Pagination types shared across all repositories

export type PaginationParams = {
  page?: number     // 1-indexed, default 1
  pageSize?: number // default 20, max 100
  cursor?: string   // cursor-based pagination (cuid)
}

export type PaginatedResult<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export type CursorPaginatedResult<T> = {
  items: T[]
  nextCursor: string | null
  hasPrev: boolean
}

export type SortOrder = 'asc' | 'desc'

export type DateRangeFilter = {
  from?: Date
  to?: Date
}

export type TimeSeriesParams = {
  userId: string
  from?: Date
  to?: Date
  limit?: number
}
