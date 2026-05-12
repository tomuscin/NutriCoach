// Nutrition event handlers — recalculate daily log totals, etc.
// ETAP 4 will fully implement these. Foundation only.

import { domainEvents } from '../emitter'
import type { MealCreatedEvent, MealUpdatedEvent, MealDeletedEvent } from '../types'

/**
 * When a meal is created/updated/deleted → recalculate DailyLog totals.
 * ETAP 4: call DailyLogRepository.recalculateTotals(dailyLogId).
 */
export function registerNutritionHandlers(): void {
  const handler = async (event: MealCreatedEvent | MealUpdatedEvent | MealDeletedEvent) => {
    console.info(
      `[event] ${event.eventName} userId=${event.userId} dailyLogId=${event.payload.dailyLogId}`,
    )
    // TODO ETAP 4: await dailyLogRepo.recalculateTotals(event.payload.dailyLogId)
  }

  domainEvents.on<MealCreatedEvent>('meal.created', handler)
  domainEvents.on<MealUpdatedEvent>('meal.updated', handler)
  domainEvents.on<MealDeletedEvent>('meal.deleted', handler)
}
