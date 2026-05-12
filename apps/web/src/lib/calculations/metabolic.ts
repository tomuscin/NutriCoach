// Metabolic calculations engine
// Based on user's Excel logic — extended and validated

export type MetabolicProfile = {
  bmr: number
  tdee: number
  caloricTarget: number
  deficit: number
  proteinTarget: number   // g
  carbsTarget: number     // g
  fatTarget: number       // g
}

export type MetabolicInputs = {
  weight: number          // kg
  height: number          // cm
  age: number
  sex: 'male' | 'female'
  activityFactor: number  // 1.2 – 1.9
  goalType: 'reduction' | 'maintenance' | 'gain'
  weeklyWeightChangeTarget?: number  // kg/week (e.g. -0.5)
  proteinPerKg?: number   // default 2.0 g/kg for reduction
}

/**
 * Calculate full metabolic profile
 * TODO: ETAP 4 — align with Excel formulas
 */
export function calculateMetabolicProfile(_inputs: MetabolicInputs): MetabolicProfile {
  throw new Error('Metabolic calculator not yet implemented — ETAP 4')
}

/**
 * Adjust daily calorie target based on training load
 * High TSS day → consider small calorie increase
 * TODO: ETAP 5
 */
export function adjustCaloriesForTraining(
  _baseTarget: number,
  _tss: number
): number {
  throw new Error('Training calorie adjustment not yet implemented — ETAP 5')
}
