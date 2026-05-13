'use client'

// ThemeColorSync — invisible component that keeps <meta name="theme-color"> in sync
// Placed inside ThemeProvider so it has access to useTheme()

import { useThemeColor } from '@/hooks/useThemeColor'

export function ThemeColorSync() {
  useThemeColor()
  return null
}
