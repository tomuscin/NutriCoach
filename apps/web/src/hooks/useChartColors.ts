'use client'

// useChartColors — theme-aware chart color palette
// Returns exact HSL values based on resolved theme (light/dark).
// SVG attributes (stroke, fill) don't evaluate CSS variables — use this hook.

import { useTheme } from 'next-themes'
import { useState, useEffect } from 'react'

type ChartColors = {
  primary:     string
  primaryFill: string   // primary at 80% opacity
  grid:        string   // CartesianGrid stroke
  axis:        string   // XAxis/YAxis tick fill
  tooltip:     { background: string; border: string; text: string }
  reference:   string   // ReferenceLine stroke
  success:     string
  warning:     string
  destructive: string
  blue:        string
}

const LIGHT: ChartColors = {
  primary:     'hsl(191, 85%, 33%)',
  primaryFill: 'hsl(191, 85%, 33%, 0.85)',
  grid:        'hsl(214, 20%, 88%)',
  axis:        'hsl(217, 12%, 50%)',
  tooltip:     {
    background: 'hsl(0, 0%, 100%)',
    border:     'hsl(214, 20%, 88%)',
    text:       'hsl(222, 20%, 10%)',
  },
  reference:   'hsl(217, 12%, 60%)',
  success:     'hsl(160, 65%, 35%)',
  warning:     'hsl(38, 90%, 48%)',
  destructive: 'hsl(0, 84%, 57%)',
  blue:        'hsl(217, 91%, 60%)',
}

const DARK: ChartColors = {
  primary:     'hsl(191, 85%, 52%)',
  primaryFill: 'hsl(191, 85%, 52%, 0.85)',
  grid:        'hsl(222, 14%, 18%)',
  axis:        'hsl(216, 12%, 58%)',
  tooltip:     {
    background: 'hsl(222, 14%, 16%)',
    border:     'hsl(222, 14%, 28%)',
    text:       'hsl(213, 22%, 93%)',
  },
  reference:   'hsl(216, 12%, 48%)',
  success:     'hsl(160, 55%, 42%)',
  warning:     'hsl(38, 85%, 52%)',
  destructive: 'hsl(0, 65%, 45%)',
  blue:        'hsl(217, 85%, 65%)',
}

export function useChartColors(): ChartColors {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Before mount: return light (SSR safe)
  if (!mounted) return LIGHT

  return resolvedTheme === 'dark' ? DARK : LIGHT
}
