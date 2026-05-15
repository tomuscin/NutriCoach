// Redis connection — singleton IORedis client
// Graceful no-Redis fallback: if REDIS_URL is not set, isRedisAvailable() returns false
// and all queue operations are skipped silently.
// Required from ETAP 3 for: AI briefs, TP sync, notifications, import jobs.

import Redis from 'ioredis'

const REDIS_URL = process.env.REDIS_URL

export const isRedisConfigured = !!REDIS_URL

const globalForRedis = globalThis as unknown as { redis: Redis | undefined }

function createRedisClient(): Redis {
  if (!REDIS_URL) {
    // Return a dummy client that won't connect — operations will throw
    // Callers must check isRedisConfigured before using
    return new Redis('redis://localhost:6379', {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy: () => null, // don't retry — Redis is not configured
    })
  }

  return new Redis(REDIS_URL, {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false,
    lazyConnect: true,
    connectTimeout: 10_000,
    commandTimeout: 5_000,
    retryStrategy: (times) => {
      if (times > 3) return null // stop retrying after 3 attempts
      return Math.min(times * 500, 2000)
    },
  })
}

export const redis: Redis = globalForRedis.redis ?? createRedisClient()

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis
}

/**
 * BullMQ requires a fresh connection per worker (cannot share with queue).
 * Always create new connections for workers, never use the singleton.
 */
export function createWorkerConnection(): Redis {
  if (!REDIS_URL) {
    throw new Error(
      '[Leaxaro] Redis is not configured. Set REDIS_URL to enable queue workers.\n' +
        'Use Upstash (free tier): https://upstash.com',
    )
  }
  return new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    connectTimeout: 10_000,
  })
}

export { Redis }
