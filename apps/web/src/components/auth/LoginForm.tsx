'use client'

// LoginForm — functional auth UI
// Uses loginAction server action + redirect on success
// Handles email_not_verified code with rich UI state

import { useTransition, useState, useRef } from 'react'
import { loginAction } from '@/lib/actions/auth'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, RefreshCw, Inbox, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'

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

const COOLDOWN_S = 60

// ─── Unverified Email Block ───────────────────────────────────────────────────
function UnverifiedEmailBlock({ email }: { email: string }) {
  const [cooldown, setCooldown] = useState(0)
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function startCooldown() {
    setCooldown(COOLDOWN_S)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          timerRef.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  async function handleResend() {
    if (cooldown > 0 || resendStatus === 'sending' || !email) return
    setResendStatus('sending')
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (data.ok) {
        setResendStatus('sent')
        startCooldown()
        setTimeout(() => setResendStatus('idle'), 3000)
      } else {
        setResendStatus('error')
        setTimeout(() => setResendStatus('idle'), 4000)
      }
    } catch {
      setResendStatus('error')
      setTimeout(() => setResendStatus('idle'), 4000)
    }
  }

  const gmailUrl = `https://mail.google.com/mail/u/0/#search/from%3Acoach%40tomaszuscinski.pl`
  const canResend = cooldown === 0 && resendStatus !== 'sending' && !!email

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-4 animate-in fade-in duration-200" role="alert">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15">
          <Mail className="h-4.5 w-4.5 text-amber-400" />
        </div>
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-foreground">Potwierdź adres email</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Twoje konto nie zostało jeszcze aktywowane. Sprawdź skrzynkę i kliknij link weryfikacyjny.
          </p>
        </div>
      </div>

      {/* Resend status messages */}
      {resendStatus === 'sent' && (
        <div className="flex items-center gap-2 text-xs text-green-400">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          Nowy link został wysłany. Sprawdź skrzynkę.
        </div>
      )}
      {resendStatus === 'error' && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Błąd wysyłania. Spróbuj ponownie.
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-2">
        <a
          href={gmailUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-accent/50 transition-colors"
          style={{ minHeight: '36px' }}
        >
          <Inbox className="h-3.5 w-3.5" />
          Otwórz Gmail
        </a>

        <button
          type="button"
          onClick={handleResend}
          disabled={!canResend}
          className="flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-accent/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          style={{ minHeight: '36px' }}
        >
          {resendStatus === 'sending' ? (
            <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Wysyłanie…</>
          ) : cooldown > 0 ? (
            <>
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Wyślij ponownie</span>
              <span className="ml-auto font-mono text-muted-foreground tabular-nums">{cooldown}s</span>
            </>
          ) : (
            <><RefreshCw className="h-3.5 w-3.5" />Wyślij link ponownie</>
          )}
        </button>
      </div>

      {/* Change email link */}
      <p className="text-center text-xs text-muted-foreground">
        <a href="/auth/register" className="text-primary hover:text-primary/80 transition-colors">
          Podaj inny adres email
        </a>
      </p>
    </div>
  )
}

// ─── LoginForm ────────────────────────────────────────────────────────────────
export function LoginForm() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [blockedEmail, setBlockedEmail] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = safeCallbackUrl(searchParams?.get('callbackUrl') ?? null)

  // Show verified success banner if redirected from verify-success
  const justVerified = searchParams?.get('verified') === '1'

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setErrorCode(null)
    setBlockedEmail(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await loginAction(formData)
      if (result.ok) {
        router.push(callbackUrl)
        router.refresh()
      } else {
        setError(result.error)
        const code = result.code ?? null
        setErrorCode(code)
        if (code === 'email_not_verified') {
          setBlockedEmail((formData.get('email') as string ?? '').toLowerCase().trim())
        }
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Verified success banner */}
      {justVerified && (
        <div className="flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/8 px-4 py-3 text-sm text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Email potwierdzony! Możesz się zalogować.</span>
        </div>
      )}

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
            className="form-input"
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
            className="form-input"
            placeholder="••••••••"
          />
        </div>

        {/* Error: generic */}
        {error && errorCode !== 'email_not_verified' && (
          <div role="alert" className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Error: email not verified — rich UI */}
        {errorCode === 'email_not_verified' && blockedEmail && (
          <UnverifiedEmailBlock email={blockedEmail} />
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
    </div>
  )
}
