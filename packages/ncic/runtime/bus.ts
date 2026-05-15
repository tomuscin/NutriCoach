/**
 * NCIC Runtime Event Bus
 *
 * Minimal in-memory event bus for the conversational runtime.
 * API: emitEvent / subscribe / unsubscribe — nothing more.
 *
 * Design:
 *   - Synchronous dispatch (handlers called in subscription order)
 *   - Async handlers supported (fire-and-forget; errors logged, not rethrown)
 *   - Singleton pattern — one bus per process
 *   - Development logging built in (controlled by NODE_ENV)
 *
 * NOT a message queue. NOT distributed. NOT Redis. Just wiring.
 */

import type { RuntimeEvent, RuntimeEventType } from '../events/types'

// ─── Handler Type ─────────────────────────────────────────────────────────────

type EventHandler<T extends RuntimeEvent> = (event: T) => void | Promise<void>

type HandlerEntry = {
  handler: EventHandler<RuntimeEvent>
}

// ─── Runtime Event Bus ────────────────────────────────────────────────────────

export class RuntimeEventBus {
  private readonly handlers = new Map<string, HandlerEntry[]>()

  /**
   * Emit a runtime event.
   * Handlers are called synchronously in subscription order.
   * Async handlers are awaited; errors are logged and swallowed (never crash the bus).
   */
  async emitEvent(event: RuntimeEvent): Promise<void> {
    this.logEvent(event)

    const entries = this.handlers.get(event.type) ?? []
    for (const entry of entries) {
      try {
        await Promise.resolve(entry.handler(event))
      } catch (err) {
        console.error(
          `[event-bus] Handler error for type="${event.type}" userId="${event.userId}"`,
          err,
        )
      }
    }
  }

  /**
   * Subscribe a handler to a specific event type.
   * Returns an unsubscribe function for convenience.
   */
  subscribe<T extends RuntimeEvent>(
    type: T['type'],
    handler: EventHandler<T>,
  ): () => void {
    const entries = this.handlers.get(type) ?? []
    const entry: HandlerEntry = { handler: handler as EventHandler<RuntimeEvent> }
    this.handlers.set(type, [...entries, entry])

    return () => this.unsubscribe(type, handler)
  }

  /**
   * Remove a specific handler from an event type.
   */
  unsubscribe<T extends RuntimeEvent>(
    type: T['type'],
    handler: EventHandler<T>,
  ): void {
    const entries = this.handlers.get(type) ?? []
    this.handlers.set(
      type,
      entries.filter((e) => e.handler !== (handler as EventHandler<RuntimeEvent>)),
    )
  }

  /**
   * Remove all handlers for a given event type.
   * Useful for testing cleanup.
   */
  clearHandlers(type?: RuntimeEventType): void {
    if (type) {
      this.handlers.delete(type)
    } else {
      this.handlers.clear()
    }
  }

  /** Current handler count for a given type (useful for testing). */
  handlerCount(type: RuntimeEventType): number {
    return (this.handlers.get(type) ?? []).length
  }

  // ─── Observability ──────────────────────────────────────────────────────────

  private logEvent(event: RuntimeEvent): void {
    if (process.env.NODE_ENV === 'production') return
    console.info(
      `[event] type="${event.type}" userId="${event.userId}" source="${event.source}" priority="${event.priority}" timestamp="${event.timestamp}"`,
    )
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

const globalForBus = globalThis as unknown as {
  runtimeEventBus: RuntimeEventBus | undefined
}

export const runtimeEventBus: RuntimeEventBus =
  globalForBus.runtimeEventBus ?? new RuntimeEventBus()

if (process.env.NODE_ENV !== 'production') {
  globalForBus.runtimeEventBus = runtimeEventBus
}

// ─── Convenience Re-exports ───────────────────────────────────────────────────

/** Emit a runtime event through the singleton bus. */
export async function emitEvent(event: RuntimeEvent): Promise<void> {
  return runtimeEventBus.emitEvent(event)
}

/** Subscribe a handler to a runtime event type. Returns unsubscribe fn. */
export function subscribe<T extends RuntimeEvent>(
  type: T['type'],
  handler: (event: T) => void | Promise<void>,
): () => void {
  return runtimeEventBus.subscribe(type, handler)
}

/** Remove a specific handler from a runtime event type. */
export function unsubscribe<T extends RuntimeEvent>(
  type: T['type'],
  handler: (event: T) => void | Promise<void>,
): void {
  return runtimeEventBus.unsubscribe(type, handler)
}
