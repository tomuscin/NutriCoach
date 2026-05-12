// GET /api/health — Production-ready health check
// Checks: DB connectivity + latency, Redis availability, env presence, uptime
// Used by: Vercel deployment checks, uptime monitoring, WEBD.pl cron health

import { prisma } from '@nutricoach/database'

const APP_START = Date.now()

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
  components: {
    database: ComponentHealth
    redis?: ComponentHealth
    env: ComponentHealth
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
    app: 'NutriCoach',
    version: process.env.npm_package_version ?? '0.1.0',
    env: process.env.NODE_ENV ?? 'unknown',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - APP_START) / 1000),
    components: {
      database: { status: 'ok' },
      env: { status: 'ok' },
    },
  }

  // ─── Env check ────────────────────────────────────────────────────────────
  response.components.env = checkEnvPresence()
  if (response.components.env.status === 'error') {
    response.status = 'error'
  } else if (response.components.env.status === 'degraded' && response.status === 'ok') {
    response.status = 'degraded'
  }

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
