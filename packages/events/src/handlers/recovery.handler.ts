// Recovery event handlers
// ETAP 5 will fully implement these. Foundation only.

import { domainEvents } from '../emitter'
import type { RecoveryUpdatedEvent, SleepSyncedEvent, BodyMetricCreatedEvent } from '../types'

/**
 * When recovery/sleep/body metrics are recorded:
 * - Update HRV baseline in UserProfile
 * - Update currentWeightKg in UserProfile (when new body metric recorded)
 * - Trigger readiness recalculation for the day
 * ETAP 5: full implementation.
 */
export function registerRecoveryHandlers(): void {
  domainEvents.on<RecoveryUpdatedEvent>('recovery.updated', async (event) => {
    console.info(
      `[event] recovery.updated userId=${event.userId} date=${event.payload.date} readiness=${event.payload.readinessScore}`,
    )
    // TODO ETAP 5: update HRV baseline in UserProfile
  })

  domainEvents.on<SleepSyncedEvent>('sleep.synced', async (event) => {
    console.info(
      `[event] sleep.synced userId=${event.userId} date=${event.payload.date}`,
    )
  })

  domainEvents.on<BodyMetricCreatedEvent>('body-metric.created', async (event) => {
    console.info(
      `[event] body-metric.created userId=${event.userId} weight=${event.payload.weightKg}`,
    )
    // TODO ETAP 5: update UserProfile.currentWeightKg
  })
}
