// @nutricoach/utils — Shared utility functions

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// ─────────────────────────────────────────────────────────────────────────────
// TAILWIND
// ─────────────────────────────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMATTING
// ─────────────────────────────────────────────────────────────────────────────

export function formatKcal(value: number): string {
  return `${Math.round(value).toLocaleString('pl-PL')} kcal`
}

export function formatGrams(value: number): string {
  return `${Math.round(value)} g`
}

export function formatWeight(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)} kg`
}

export function formatPercent(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`
}

export function formatDate(date: Date | string, locale = 'pl-PL'): string {
  return new Date(date).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatDateShort(date: Date | string): string {
  return new Date(date).toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
  })
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  return `${h}h ${m > 0 ? `${m}min` : ''}`
}

// ─────────────────────────────────────────────────────────────────────────────
// DATES
// ─────────────────────────────────────────────────────────────────────────────

export function today(): string {
  return new Date().toISOString().split('T')[0]
}

export function dateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const current = new Date(startDate)
  const end = new Date(endDate)
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }
  return dates
}

export function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

// ─────────────────────────────────────────────────────────────────────────────
// MATH
// ─────────────────────────────────────────────────────────────────────────────

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0)
}

export function round(value: number, decimals = 1): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)
}

// ─────────────────────────────────────────────────────────────────────────────
// ARRAYS
// ─────────────────────────────────────────────────────────────────────────────

export function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((groups, item) => {
    const groupKey = String(item[key])
    return {
      ...groups,
      [groupKey]: [...(groups[groupKey] ?? []), item],
    }
  }, {} as Record<string, T[]>)
}

export function sortByDate<T extends { date: string }>(arr: T[], order: 'asc' | 'desc' = 'asc'): T[] {
  return [...arr].sort((a, b) => {
    const diff = new Date(a.date).getTime() - new Date(b.date).getTime()
    return order === 'asc' ? diff : -diff
  })
}
