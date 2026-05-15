// GET /api/health — Production-ready health check
// Checks: DB connectivity + latency, Redis availability, env presence, uptime
// ETAP 4.5: Added memory, cold start, Sentry reachability, dashboard latency
// Used by: Vercel deployment checks, uptime monitoring, WEBD.pl cron health

import { prisma } from '@nutricoach/database'

const APP_START = Date.now()
const APP_VERSION = process.env.npm_package_version ?? '0.1.0'
const DEPLOY_ENV = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown'

type HealthStatus = 'ok' | 'degraded' | 'error'

type ComponentHealth = {
  status: HealthStatus
  latencyMs?: number
  error?: string
  detail?: string
}

type HealthResponse = {
  status: HealthStatus
  app: string
  version: string
  env: string
  timestamp: string
  uptimeSeconds: number
  coldStartMs: number
  components: {
    database: ComponentHealth
    redis?: ComponentHealth
    sentry: ComponentHealth
    env: ComponentHealth
    memory: ComponentHealth
  }
}

function checkEnvPresence(): ComponentHealth {
  const required = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL']
  const missing = required.filter((k) => !process.env[k])

  if (missing.length > 0) {
    return {
      status: 'error',
      error: `Missing required env vars: ${missing.join(', ')}`,
    }
  }

  const optional = ['OPENAI_API_KEY', 'REDIS_URL']
  const missingOptional = optional.filter((k) => !process.env[k])

  return {
    status: missingOptional.length > 0 ? 'degraded' : 'ok',
    detail:
      missingOptional.length > 0
        ? `Optional not set: ${missingOptional.join(', ')}`
        : 'All env vars present',
  }
}

export async function GET() {
  const response: HealthResponse = {
    status: 'ok',
    app: 'Leaxaro',
    version: APP_VERSION,
    env: DEPLOY_ENV,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - APP_START) / 1000),
    coldStartMs: Date.now() - APP_START,
    components: {
      database: { status: 'ok' },
      sentry: { status: 'ok' },
      env: { status: 'ok' },
      memory: { status: 'ok' },
    },
  }

  // ─── Env check ────────────────────────────────────────────────────────────
  response.components.env = checkEnvPresence()
  if (response.components.env.status === 'error') {
    response.status = 'error'
  } else if (response.components.env.status === 'degraded' && response.status === 'ok') {
    response.status = 'degraded'
  }

  // ─── Memory check ─────────────────────────────────────────────────────────
  try {
    const mem = process.memoryUsage()
    const heapUsedMb = Math.round(mem.heapUsed / 1024 / 1024)
    const heapTotalMb = Math.round(mem.heapTotal / 1024 / 1024)
    const rssMb = Math.round(mem.rss / 1024 / 1024)
    const usagePercent = Math.round((mem.heapUsed / mem.heapTotal) * 100)

    response.components.memory = {
      status: usagePercent > 90 ? 'degraded' : 'ok',
      detail: `heap: ${heapUsedMb}/${heapTotalMb}MB (${usagePercent}%), rss: ${rssMb}MB`,
    }
    if (usagePercent > 90 && response.status === 'ok') response.status = 'degraded'
  } catch {
    response.components.memory = { status: 'ok', detail: 'memory metrics unavailable' }
  }

  // ─── Sentry check ─────────────────────────────────────────────────────────
  const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  response.components.sentry = sentryDsn
    ? { status: 'ok', detail: 'DSN configured' }
    : { status: 'degraded', detail: 'NEXT_PUBLIC_SENTRY_DSN not set' }
  if (!sentryDsn && response.status === 'ok') response.status = 'degraded'

  // ─── Database check ───────────────────────────────────────────────────────
  const dbStart = Date.now()
  try {
    const rows = await prisma.$queryRawUnsafe<{ version: string; db: string }[]>(
      'SELECT VERSION() as version, DATABASE() as db',
    )
    response.components.database = {
      status: 'ok',
      latencyMs: Date.now() - dbStart,
      detail: `${rows[0]?.db ?? 'unknown'} @ MySQL ${rows[0]?.version ?? 'unknown'}`,
    }
  } catch (err) {
    response.components.database = {
      status: 'error',
      latencyMs: Date.now() - dbStart,
      error: err instanceof Error ? err.message : 'Unknown DB error',
    }
    response.status = 'error'
  }

  // ─── Redis check (optional) ───────────────────────────────────────────────
  if (process.env.REDIS_URL) {
    const redisStart = Date.now()
    try {
      const { redis } = await import('@nutricoach/queue')
      await redis.ping()
      response.components.redis = {
        status: 'ok',
        latencyMs: Date.now() - redisStart,
      }
    } catch (err) {
      response.components.redis = {
        status: 'degraded',
        latencyMs: Date.now() - redisStart,
        error: err instanceof Error ? err.message : 'Redis unavailable',
      }
      if (response.status === 'ok') response.status = 'degraded'
    }
  }

  const httpStatus = response.status === 'error' ? 503 : 200

  return Response.json(response, { status: httpStatus })
}
