'use client'

// LoginForm — functional auth UI
// Uses loginAction server action + redirect on success

import { useTransition, useState } from 'react'
import { loginAction } from '@/lib/actions/auth'
import { useRouter, useSearchParams } from 'next/navigation'

// Validate that a redirect target is a relative path on the same origin (prevent open redirect)
function safeCallbackUrl(raw: string | null): string {
  if (!raw) return '/dashboard'
  try {
    const decoded = decodeURIComponent(raw)
    // Must start with '/' and NOT be a protocol-relative URL like //evil.com
    if (decoded.startsWith('/') && !decoded.startsWith('//') && !decoded.includes('://')) {
      return decoded
    }
  } catch {
    // decodeURIComponent failed — malformed, ignore
  }
  return '/dashboard'
}

export function LoginForm() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = safeCallbackUrl(searchParams?.get('callbackUrl') ?? null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await loginAction(formData)
      if (result.ok) {
        router.push(callbackUrl)
        router.refresh()
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
          placeholder="twoj@email.pl"
        />
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="block text-sm font-medium text-foreground">
            Hasło
          </label>
          <a
            href="/auth/forgot-password"
            className="text-xs text-brand-500 hover:text-brand-400 transition-colors"
          >
            Nie pamiętam hasła
          </a>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={isPending}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
          placeholder="••••••••"
        />
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
        {isPending ? 'Logowanie...' : 'Zaloguj się'}
      </button>

      {/* Register link */}
      <p className="text-center text-sm text-muted-foreground">
        Nie masz konta?{' '}
        <a href="/auth/register" className="text-brand-500 hover:text-brand-400 font-medium transition-colors">
          Zarejestruj się
        </a>
      </p>
    </form>
  )
}
