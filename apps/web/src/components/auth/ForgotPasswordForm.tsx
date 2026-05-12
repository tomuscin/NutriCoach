'use client'

// ForgotPasswordForm — foundation UI
// SMTP wired in ETAP 5

import { useTransition, useState } from 'react'
import { forgotPasswordAction } from '@/lib/actions/auth'

export function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition()
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await forgotPasswordAction(formData)
      if (result.ok) {
        setSubmitted(true)
      } else {
        setError(result.error)
      }
    })
  }

  if (submitted) {
    return (
      <div className="rounded-lg bg-green-500/10 border border-green-500/20 px-6 py-8 text-center space-y-2">
        <p className="text-sm font-medium text-foreground">Sprawdź swoją skrzynkę</p>
        <p className="text-sm text-muted-foreground">
          Jeśli konto istnieje, wyślemy link do resetowania hasła.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-foreground">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={isPending}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
          placeholder="twoj@email.pl"
        />
      </div>

      {error && (
        <div role="alert" className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? 'Wysyłanie...' : 'Wyślij link do resetowania'}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        <a href="/auth/login" className="text-brand-500 hover:text-brand-400 font-medium transition-colors">
          Wróć do logowania
        </a>
      </p>
    </form>
  )
}
