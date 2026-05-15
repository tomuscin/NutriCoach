'use client'

// ThemeProvider — wraps next-themes for SSR-safe dark mode
// Modes: system | light | dark
// Persistence: localStorage (key: "leaxaro-theme")

import { ThemeProvider as NextThemesProvider } from 'next-themes'

interface Props {
  children: React.ReactNode
  /** Server-resolved initial theme from DB (system | light | dark) */
  defaultTheme?: string
}

export function ThemeProvider({ children, defaultTheme = 'system' }: Props) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem
      storageKey="leaxaro-theme"
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemesProvider>
  )
}
