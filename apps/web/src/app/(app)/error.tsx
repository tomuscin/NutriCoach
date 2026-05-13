'use client'

// (app)/error.tsx — error boundary for all authenticated app routes.
// Catches: Prisma DB connectivity errors (P1001), timeout errors, and all other
// unhandled server-side exceptions in the (app) route group.
//
// Renders a user-friendly retry UI that preserves the app chrome.

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

// Prisma error code for "can't reach database server"
const DB_UNREACHABLE_MSG = "Can't reach database server"

function isDBError(error: Error): boolean {
  return (
    error.message.includes(DB_UNREACHABLE_MSG) ||
    error.message.includes('P1001') ||
    error.message.includes('P1002') || // Connection timed out
    error.message.includes('ECONNREFUSED') ||
    error.message.includes('ETIMEDOUT')
  )
}

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  const isDB = isDBError(error)

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm text-center space-y-5">

        {/* Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background: 'hsl(var(--destructive) / 0.1)', border: '1px solid hsl(var(--destructive) / 0.2)' }}
        >
          {isDB ? (
            // Database icon
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--destructive))" strokeWidth="1.75">
              <ellipse cx="12" cy="5" rx="9" ry="3"/>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
            </svg>
          ) : (
            // Generic error icon
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--destructive))" strokeWidth="1.75">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <path d="M12 9v4M12 17h.01"/>
            </svg>
          )}
        </div>

        {/* Message */}
        <div className="space-y-1.5">
          <h1 className="text-base font-semibold text-foreground">
            {isDB ? 'Tymczasowy problem z bazą danych' : 'Coś poszło nie tak'}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isDB
              ? 'Serwer bazy danych jest chwilowo niedostępny. Spróbuj ponownie za kilka sekund.'
              : 'Wystąpił nieoczekiwany błąd. Nasz zespół został powiadomiony.'}
          </p>
        </div>

        {/* Error code (only show in dev or if digest present) */}
        {error.digest && (
          <code className="block text-[11px] font-mono text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
            {error.digest}
          </code>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-1">
          <button
            onClick={reset}
            className="w-full rounded-xl py-2.5 text-sm font-semibold bg-primary text-primary-foreground hover:brightness-105 transition-all active:scale-95"
          >
            Spróbuj ponownie
          </button>
          <a
            href="/dashboard"
            className="w-full rounded-xl py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-center"
          >
            Wróć do pulpitu
          </a>
        </div>
      </div>
    </div>
  )
}
