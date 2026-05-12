export { registerWorkoutHandlers } from './workout.handler'
export { registerNutritionHandlers } from './nutrition.handler'
export { registerRecoveryHandlers } from './recovery.handler'

/**
 * Register all domain event handlers.
 * Call once at application startup (e.g., in Next.js instrumentation.ts).
 */
export function registerAllHandlers(): void {
  registerWorkoutHandlers()
  registerNutritionHandlers()
  registerRecoveryHandlers()
}
