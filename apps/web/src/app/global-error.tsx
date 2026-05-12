'use client'

// Global error boundary — catches errors in the root layout
// Required by Next.js App Router for top-level error capture.
// Sentry captures all uncaught errors here.

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function GlobalError({
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
    <html lang="pl">
      <body className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 p-8 max-w-md text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Coś poszło nie tak</h1>
          <p className="text-sm text-muted-foreground">
            Wystąpił nieoczekiwany błąd. Nasz zespół został powiadomiony.
          </p>
          {error.digest && (
            <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded font-mono">
              {error.digest}
            </code>
          )}
          <button
            onClick={reset}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Spróbuj ponownie
          </button>
        </div>
      </body>
    </html>
  )
}
