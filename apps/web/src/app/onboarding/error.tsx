'use client'

// Onboarding error boundary — catches errors in /onboarding so they don't
// bubble up to global-error.tsx (which has no app chrome).

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { RefreshCw } from 'lucide-react'

export default function OnboardingError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center space-y-5">
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{
            background: 'hsl(var(--destructive) / 0.1)',
            border: '1px solid hsl(var(--destructive) / 0.2)',
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="hsl(var(--destructive))"
            strokeWidth="1.75"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <h1 className="text-xl font-semibold text-foreground">Coś poszło nie tak</h1>
        <p className="text-sm text-muted-foreground">
          Wystąpił błąd podczas ładowania konfiguracji profilu.
        </p>

        {error.digest && (
          <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded font-mono block">
            {error.digest}
          </code>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Spróbuj ponownie
          </button>
          <a
            href="/auth/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Wróć do logowania
          </a>
        </div>
      </div>
    </div>
  )
}
