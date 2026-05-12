// @nutricoach/database — Prisma client singleton
// Uses globalThis pattern to survive Next.js hot-reload in development.
// Serverless-safe: connection_limit enforced via DATABASE_URL params.
// Observability: slow query logging in dev (>200ms) and prod (>500ms).

import { PrismaClient, Prisma } from '@prisma/client'

const isDev = process.env.NODE_ENV === 'development'
// Lower threshold in dev (catch local regressions), higher in prod (avoid noise on cold starts).
const SLOW_QUERY_THRESHOLD_MS = isDev ? 200 : 500

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: isDev
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'warn' },
          { emit: 'stdout', level: 'error' },
        ]
      : [
          // Production: emit query events for slow-query detection below
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'warn' },
          { emit: 'stdout', level: 'error' },
        ],
  })

  // Slow query logger — fires in both dev and production
  client.$on('query' as never, (e: Prisma.QueryEvent) => {
    if (e.duration >= SLOW_QUERY_THRESHOLD_MS) {
      console.warn(
        `[DB SLOW ${e.duration}ms] ${e.query.slice(0, 120)}${e.query.length > 120 ? '...' : ''}`,
      )
    }
  })

  // Warn logger
  client.$on('warn' as never, (e: Prisma.LogEvent) => {
    console.warn('[DB WARN]', e.message)
  })

  return client
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient()

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma
}

export { PrismaClient } from '@prisma/client'
export type { Prisma } from '@prisma/client'

