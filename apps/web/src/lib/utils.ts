// Shared utilities — cn, formatting, validation

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merges Tailwind CSS class names safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a number as kcal */
export function formatKcal(value: number): string {
  return `${Math.round(value).toLocaleString('pl-PL')} kcal`
}

/** Format grams */
export function formatGrams(value: number): string {
  return `${Math.round(value)} g`
}

/** Format weight in kg */
export function formatWeight(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)} kg`
}

/** Format a percentage */
export function formatPercent(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`
}

/** Format date as Polish locale string */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  return new Date(date).toLocaleDateString('pl-PL', options ?? {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Calculate BMR using Mifflin-St Jeor equation */
export function calculateBMR(params: {
  weight: number   // kg
  height: number   // cm
  age: number
  sex: 'male' | 'female'
}): number {
  const { weight, height, age, sex } = params
  if (sex === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5
  }
  return 10 * weight + 6.25 * height - 5 * age - 161
}

/** Calculate TDEE from BMR and activity factor */
export function calculateTDEE(bmr: number, activityFactor: number): number {
  return Math.round(bmr * activityFactor)
}

/** Activity multipliers */
export const ACTIVITY_FACTORS = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  VERY_ACTIVE: 1.725,
  EXTRA_ACTIVE: 1.9,
} as const
