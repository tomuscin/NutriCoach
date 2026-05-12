// Rate limiting for auth endpoints
// In-memory store with Redis foundation (graceful fallback)
//
// In-memory store is per-process — fine for Vercel Edge / single instance.
// When REDIS_URL is set, swap to Redis-backed store in ETAP 6.

interface RateLimitEntry {
  count: number
  resetAt: number
}

// Per-key in-memory store
const store = new Map<string, RateLimitEntry>()

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key)
  }
}, 5 * 60 * 1000)

interface RateLimitConfig {
  key: string      // e.g. `login:${ip}` or `register:${email}`
  limit: number    // max attempts
  windowMs: number // time window in ms
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfterMs: number
}

export function checkRateLimit(config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const entry = store.get(config.key)

  // New or expired window
  if (!entry || entry.resetAt < now) {
    store.set(config.key, { count: 1, resetAt: now + config.windowMs })
    return {
      allowed: true,
      remaining: config.limit - 1,
      resetAt: now + config.windowMs,
      retryAfterMs: 0,
    }
  }

  // Increment
  entry.count++

  if (entry.count > config.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfterMs: entry.resetAt - now,
    }
  }

  return {
    allowed: true,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
    retryAfterMs: 0,
  }
}

// ─── Pre-defined rate limit configs ──────────────────────────────────────────
export const rateLimits = {
  login: (key: string) =>
    checkRateLimit({ key: `login:${key}`, limit: 5, windowMs: 15 * 60 * 1000 }),

  register: (key: string) =>
    checkRateLimit({ key: `register:${key}`, limit: 3, windowMs: 60 * 60 * 1000 }),

  passwordReset: (key: string) =>
    checkRateLimit({ key: `reset:${key}`, limit: 3, windowMs: 60 * 60 * 1000 }),

  emailVerify: (key: string) =>
    checkRateLimit({ key: `verify:${key}`, limit: 5, windowMs: 60 * 60 * 1000 }),
}
