// In-process event emitter — lightweight Node.js EventEmitter wrapper
// Not a message queue — used for synchronous in-process side-effects.
// For async cross-process work, events are forwarded to BullMQ queues.

import { EventEmitter } from 'events'
import type { DomainEvent, DomainEventName } from './types'

type EventHandler<T extends DomainEvent> = (event: T) => void | Promise<void>

class DomainEventEmitter extends EventEmitter {
  constructor() {
    super()
    this.setMaxListeners(50) // many handlers expected
  }

  /** Emit a typed domain event. */
  emit<T extends DomainEvent>(eventName: T['eventName'], event: T): boolean {
    return super.emit(eventName, event)
  }

  /** Subscribe to a typed domain event. */
  on<T extends DomainEvent>(
    eventName: T['eventName'],
    handler: EventHandler<T>,
  ): this {
    return super.on(eventName as string, handler as (...args: unknown[]) => void)
  }

  /** Subscribe once to a typed domain event. */
  once<T extends DomainEvent>(
    eventName: T['eventName'],
    handler: EventHandler<T>,
  ): this {
    return super.once(eventName as string, handler as (...args: unknown[]) => void)
  }

  /** Remove a specific handler. */
  off<T extends DomainEvent>(
    eventName: T['eventName'],
    handler: EventHandler<T>,
  ): this {
    return super.off(eventName as string, handler as (...args: unknown[]) => void)
  }
}

const globalForEmitter = globalThis as unknown as {
  domainEvents: DomainEventEmitter | undefined
}

/** Singleton domain event emitter — import this across the app. */
export const domainEvents: DomainEventEmitter =
  globalForEmitter.domainEvents ?? new DomainEventEmitter()

if (process.env.NODE_ENV !== 'production') {
  globalForEmitter.domainEvents = domainEvents
}

/** Helper — emit a domain event in a fire-and-forget manner. */
export function emitEvent<T extends DomainEvent>(event: T): void {
  domainEvents.emit(event.eventName, event)
}
