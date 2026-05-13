'use client'

// ThemeToggle — segmented control for System / Light / Dark
// Used in Settings > Appearance and optionally in the app header

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Monitor, Sun, Moon } from 'lucide-react'

const modes = [
  { value: 'system', label: 'System',   icon: Monitor },
  { value: 'light',  label: 'Jasny',    icon: Sun     },
  { value: 'dark',   label: 'Ciemny',   icon: Moon    },
] as const

type ThemeValue = typeof modes[number]['value']

interface Props {
  /** Called after theme changes — use to persist in DB */
  onThemeChange?: (theme: ThemeValue) => void
  size?: 'sm' | 'md'
}

export function ThemeToggle({ onThemeChange, size = 'md' }: Props) {
  const { theme, setTheme, resolvedTheme: _r } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch — render only after mount
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    // Skeleton to avoid layout shift
    return (
      <div
        className={`flex gap-1 rounded-xl bg-muted p-1 ${size === 'sm' ? 'h-9' : 'h-10'}`}
        aria-hidden
      />
    )
  }

  function handleChange(value: ThemeValue) {
    setTheme(value)
    onThemeChange?.(value)
  }

  const activeTheme = (theme ?? 'system') as ThemeValue

  return (
    <div
      className="flex gap-1 rounded-xl bg-muted p-1"
      role="radiogroup"
      aria-label="Motyw kolorystyczny"
    >
      {modes.map(({ value, label, icon: Icon }) => {
        const isActive = activeTheme === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => handleChange(value)}
            className={[
              'flex items-center gap-1.5 rounded-lg px-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              size === 'sm' ? 'py-1.5 text-xs' : 'py-2 text-sm',
              isActive
                ? 'bg-background shadow-sm text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden />
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
