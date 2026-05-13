'use client'

// useThemeColor — updates <meta name="theme-color"> dynamically based on active theme
// Handles: system preference, manual override, iOS Safari, Chrome Android

import { useEffect } from 'react'
import { useTheme } from 'next-themes'

const THEME_COLORS = {
  light: '#f8fafc',   // --background light
  dark:  '#0d1117',   // --background dark (hsl 222 15% 7%)
}

export function useThemeColor() {
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const color = resolvedTheme === 'dark' ? THEME_COLORS.dark : THEME_COLORS.light

    // Update all existing theme-color meta tags
    const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    if (metas.length > 0) {
      metas.forEach(m => { m.content = color })
    } else {
      // Insert if missing
      const meta = document.createElement('meta')
      meta.name = 'theme-color'
      meta.content = color
      document.head.appendChild(meta)
    }
  }, [resolvedTheme])
}
