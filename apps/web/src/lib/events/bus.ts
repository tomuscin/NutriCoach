// Lightweight Event Bus — in-process, serverless-safe
// Events are persisted to a log and trigger downstream recalculations.
// No external pub/sub required for current scale.

import 'server-only'
import { logger } from '@/lib/logger'

export type NutriCoachEvent =
  | 'workout_synced'
  | 'recovery_updated'
  | 'readiness_recalculated'
  | 'insight_invalidated'
  | 'adherence_updated'
  | 'token_refreshed'
  | 'sync_failed'
  | 'webhook_received'

type EventPayload = Record<string, unknown>
type EventHandler = (payload: EventPayload) => Promise<void>

const handlers = new Map<NutriCoachEvent, EventHandler[]>()

/** Register a handler for an event type */
export function onEvent(event: NutriCoachEvent, handler: EventHandler): void {
  if (!handlers.has(event)) handlers.set(event, [])
  handlers.get(event)!.push(handler)
}

/**
 * Emit an event — runs all registered handlers sequentially.
 * Non-fatal: handler failures are logged but don't throw.
 */
export async function emitEvent(event: NutriCoachEvent, payload: EventPayload): Promise<void> {
  logger.debug({ event, payload }, 'Event emitted')

  const eventHandlers = handlers.get(event) ?? []
  for (const handler of eventHandlers) {
    try {
      await handler(payload)
    } catch (err) {
      logger.warn({ event, err }, 'Event handler failed (non-fatal)')
    }
  }
}
