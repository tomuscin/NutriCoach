// Next.js Instrumentation — startup diagnostics + Sentry init
// Runs ONCE on server start (Node.js runtime only).
// Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

import { assertEnv } from './lib/env'

export async function register() {
  // ── Sentry: must be first ─────────────────────────────────────────────────
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }

  // Only run startup diagnostics in Node.js (not Edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const startMs = Date.now()

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('  Leaxaro — starting up')
    console.log(`  Env: ${process.env.NODE_ENV ?? 'unknown'}`)
    console.log(`  Node: ${process.version}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // ── ENV validation (fail-fast in production) ──────────────────────────
    assertEnv()

    // ── DB connectivity check (non-blocking, logging only) ────────────────
    if (process.env.DATABASE_URL) {
      // Lazy import to avoid breaking startup if Prisma is not generated
      try {
        const { prisma } = await import('@nutricoach/database')
        const rows = await prisma.$queryRawUnsafe<{ version: string }[]>(
          'SELECT VERSION() as version',
        )
        console.log(`  DB: connected — MySQL ${rows[0]?.version ?? 'unknown'} @ mn05.webd.pl`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        // Log but don't crash — healthcheck will surface it
        console.error(`  DB: connection failed — ${msg}`)
      }
    } else {
      console.warn('  DB: DATABASE_URL not set — skipping startup check')
    }

    // ── Redis status (informational only) ─────────────────────────────────
    if (process.env.REDIS_URL) {
      console.log('  Redis: REDIS_URL configured')
    } else {
      console.warn('  Redis: not configured — queue features disabled')
    }

    console.log(`  Ready in ${Date.now() - startMs}ms`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  }
}

// ─── Sentry error capture hook (Next.js 15) ───────────────────────────────────
// Called by Next.js on every unhandled server error.
// Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#errors-from-nested-react-server-components

export const onRequestError = async (
  err: unknown,
  request: { path: string; method: string; headers: Record<string, string | string[] | undefined> },
  context: { routerKind: string; routePath: string; routeType: string },
) => {
  const { captureRequestError } = await import('@sentry/nextjs')
  captureRequestError(err, request, context)
}
