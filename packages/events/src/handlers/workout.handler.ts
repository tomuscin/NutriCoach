// Workout event handlers — side-effects triggered by workout events
// ETAP 5 will fully implement these. Foundation only.

import { domainEvents } from '../emitter'
import type { WorkoutCreatedEvent, WorkoutSyncedEvent } from '../types'

/**
 * When a workout is created/synced → schedule training load recalculation.
 * Implementation: queue an analytics job via BullMQ.
 * ETAP 5: implement full PMC recalculation.
 */
export function registerWorkoutHandlers(): void {
  domainEvents.on<WorkoutCreatedEvent>('workout.created', async (event) => {
    console.info(
      `[event] workout.created userId=${event.userId} date=${event.payload.date} tss=${event.payload.tss}`,
    )
    // TODO ETAP 5: queueTrainingLoadUpdate(event.userId, event.payload.date)
  })

  domainEvents.on<WorkoutSyncedEvent>('workout.synced', async (event) => {
    console.info(
      `[event] workout.synced userId=${event.userId} source=${event.payload.source} created=${event.payload.created}`,
    )
    // TODO ETAP 5: queueTrainingLoadUpdate(event.userId, event.payload.date)
  })
}
