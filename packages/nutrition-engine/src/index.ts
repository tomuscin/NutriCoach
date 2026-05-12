// @nutricoach/nutrition-engine
// Core nutrition logic: calorie targets, macro splits, deficit calculations
// Derived from the Excel "redukcjaod 04.05.2026.xlsx" logic

import type { GoalType, ActivityLevel, Macros } from '@nutricoach/types'

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY MULTIPLIERS
// ─────────────────────────────────────────────────────────────────────────────

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
}

// ─────────────────────────────────────────────────────────────────────────────
// BMR (Mifflin-St Jeor)
// ─────────────────────────────────────────────────────────────────────────────

export type BMRParams = {
  weightKg: number
  heightCm: number
  ageYears: number
  sex: 'male' | 'female'
}

export function calculateBMR(params: BMRParams): number {
  const { weightKg, heightCm, ageYears, sex } = params
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears
  return sex === 'male' ? base + 5 : base - 161
}

// ─────────────────────────────────────────────────────────────────────────────
// TDEE
// ─────────────────────────────────────────────────────────────────────────────

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel])
}

// ─────────────────────────────────────────────────────────────────────────────
// CALORIC TARGET
// ─────────────────────────────────────────────────────────────────────────────

export type CaloricTargetParams = {
  tdee: number
  goalType: GoalType
  weeklyWeightChangeKg?: number  // negative = loss, positive = gain
}

export function calculateCaloricTarget(params: CaloricTargetParams): number {
  const { tdee, goalType, weeklyWeightChangeKg = -0.5 } = params

  if (goalType === 'maintenance') return tdee

  // 1 kg body mass ≈ 7700 kcal
  const dailyDelta = Math.round((weeklyWeightChangeKg * 7700) / 7)

  return Math.max(1200, tdee + dailyDelta) // never below 1200 kcal
}

// ─────────────────────────────────────────────────────────────────────────────
// MACRO SPLIT
// ─────────────────────────────────────────────────────────────────────────────

export type MacroSplitParams = {
  targetCalories: number
  weightKg: number
  goalType: GoalType
  proteinPerKg?: number  // default 2.0 for reduction, 1.8 for maintenance
}

export function calculateMacroSplit(params: MacroSplitParams): Macros {
  const { targetCalories, weightKg, goalType, proteinPerKg } = params

  // Protein priority (high protein for body recomposition)
  const defaultProteinPerKg = goalType === 'reduction' ? 2.0 : goalType === 'gain' ? 2.2 : 1.8
  const proteinG = Math.round(weightKg * (proteinPerKg ?? defaultProteinPerKg))
  const proteinKcal = proteinG * 4

  // Fat minimum: 20% of total calories, minimum 1g/kg
  const fatMinKcal = Math.max(targetCalories * 0.25, weightKg * 9)
  const fatG = Math.round(fatMinKcal / 9)
  const fatKcal = fatG * 9

  // Carbs: remaining calories
  const carbsKcal = Math.max(0, targetCalories - proteinKcal - fatKcal)
  const carbsG = Math.round(carbsKcal / 4)

  return {
    calories: targetCalories,
    protein: proteinG,
    carbs: carbsG,
    fat: fatG,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DAILY BALANCE
// ─────────────────────────────────────────────────────────────────────────────

export type DailyBalance = {
  caloriesIn: number
  caloriesOut: number  // BMR*activity + training
  deficit: number      // negative = surplus
  proteinProgress: number  // %
  carbsProgress: number
  fatProgress: number
  overallProgress: number  // % of calorie target
}

export function calculateDailyBalance(params: {
  consumed: Macros
  target: Macros
  caloriesBurned?: number
}): DailyBalance {
  const { consumed, target, caloriesBurned = 0 } = params
  const caloriesOut = target.calories + caloriesBurned

  return {
    caloriesIn: consumed.calories,
    caloriesOut,
    deficit: consumed.calories - caloriesOut,
    proteinProgress: target.protein > 0 ? (consumed.protein / target.protein) * 100 : 0,
    carbsProgress: target.carbs > 0 ? (consumed.carbs / target.carbs) * 100 : 0,
    fatProgress: target.fat > 0 ? (consumed.fat / target.fat) * 100 : 0,
    overallProgress: target.calories > 0 ? (consumed.calories / target.calories) * 100 : 0,
  }
}
