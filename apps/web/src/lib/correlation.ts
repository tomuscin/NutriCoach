// Correlation ID utilities
// Generates and propagates x-request-id across the request lifecycle.
//
// Flow:
//   Middleware → generates x-request-id (UUID) → sets on request + response headers
//   Server Components / Actions → read via headers() from 'next/headers'
//   Sentry → attached to scope as tag 'request_id'

import { headers } from 'next/headers'

export const REQUEST_ID_HEADER = 'x-request-id'
export const CORRELATION_ID_HEADER = 'x-correlation-id'

/**
 * Reads the current request ID from Next.js headers (App Router only).
 * Returns undefined if called outside of a request context.
 */
export async function getRequestId(): Promise<string | undefined> {
  try {
    const h = await headers()
    return h.get(REQUEST_ID_HEADER) ?? undefined
  } catch {
    // Outside request context (e.g. build time)
    return undefined
  }
}

/**
 * Generates a new correlation ID (UUID v4).
 * Available in both Node.js and Edge runtimes.
 */
export function generateRequestId(): string {
  return crypto.randomUUID()
}
