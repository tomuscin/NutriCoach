'use client'

// RegisterForm — functional registration UI
// Uses registerAction server action + redirect to onboarding on success

import { useTransition, useState } from 'react'
import { registerAction } from '@/lib/actions/auth'
import { useRouter } from 'next/navigation'

export function RegisterForm() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setFieldError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await registerAction(formData)
      if (result.ok) {
        // After registration → sign in automatically → redirect to onboarding
        // The middleware will handle the redirect to /onboarding
        router.push('/auth/login?registered=1')
      } else {
        setError(result.error)
        if (result.field) setFieldError(result.field)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Name */}
      <div className="space-y-1.5">
        <label htmlFor="name" className="block text-sm font-medium text-foreground">
          Imię
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="given-name"
          required
          disabled={isPending}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
          placeholder="Tomasz"
        />
      </div>

      {/* Email */}
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
          className={`w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 ${
            fieldError === 'email' ? 'border-destructive' : 'border-border'
          }`}
          placeholder="twoj@email.pl"
        />
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-foreground">
          Hasło
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          disabled={isPending}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
          placeholder="Min. 8 znaków"
        />
        <p className="text-xs text-muted-foreground">
          Wymagane: wielka litera, cyfra, znak specjalny
        </p>
      </div>

      {/* Error */}
      {error && (
        <div role="alert" className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? 'Tworzenie konta...' : 'Utwórz konto'}
      </button>

      {/* Login link */}
      <p className="text-center text-sm text-muted-foreground">
        Masz już konto?{' '}
        <a href="/auth/login" className="text-brand-500 hover:text-brand-400 font-medium transition-colors">
          Zaloguj się
        </a>
      </p>

      {/* Terms */}
      <p className="text-center text-xs text-muted-foreground">
        Rejestrując się, akceptujesz{' '}
        <a href="/terms" className="underline underline-offset-2 hover:text-foreground">Regulamin</a>
        {' '}i{' '}
        <a href="/privacy" className="underline underline-offset-2 hover:text-foreground">Politykę prywatności</a>
      </p>
    </form>
  )
}
