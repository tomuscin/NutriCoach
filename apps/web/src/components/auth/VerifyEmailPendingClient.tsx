'use client'

// VerifyEmailPendingClient — premium SaaS email verification pending screen
// Shown immediately after registration.
// Features:
//  - Email display (masked for privacy)
//  - "Open Gmail" deep link
//  - Resend with 60s cooldown timer + disabled state + loading state
//  - "Change email" (back to register)
//  - Spam/24h expiry info
//  - CROSS-DEVICE POLLING: detects verification from another device every 5s
//  - AUTO-TRANSITION: when verified → shows "first login" UI (email pre-filled)

import { useEffect, useState, useRef, useTransition } from 'react'
import { Mail, RefreshCw, ExternalLink, AlertTriangle, CheckCircle2, Clock, ChevronLeft, Inbox, Eye, EyeOff, Zap } from 'lucide-react'
import { loginAction } from '@/lib/actions/auth'

interface Props {
  email: string
}

const COOLDOWN_S = 60
const POLL_INTERVAL_MS = 5000

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return email
  if (local.length <= 2) return `${local[0]}***@${domain}`
  return `${local.slice(0, 2)}***@${domain}`
}

export function VerifyEmailPendingClient({ email }: Props) {
  const [cooldown, setCooldown] = useState(COOLDOWN_S)
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cross-device verification polling
  const [isVerified, setIsVerified] = useState(false)
  const [showLoginForm, setShowLoginForm] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // First-login form state
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Start countdown on mount (email was just sent)
  useEffect(() => {
    startCooldown()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Poll for cross-device verification
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/auth/check-verification?email=${encodeURIComponent(email)}`
        )
        if (!res.ok) return
        const data: { verified: boolean } = await res.json()
        if (data.verified) {
          if (pollRef.current) clearInterval(pollRef.current)
          setIsVerified(true)
          // Brief animation pause before showing login form
          setTimeout(() => setShowLoginForm(true), 700)
        }
      } catch {
        // Silent fail — polling is best-effort
      }
    }, POLL_INTERVAL_MS)

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [email])

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
    if (cooldown > 0 || resendStatus === 'sending') return
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

  function handleFirstLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoginError(null)
    const formData = new FormData()
    formData.append('email', email)
    formData.append('password', password)
    startTransition(async () => {
      const result = await loginAction(formData)
      if (result.ok) {
        // Hard navigation — picks up new auth cookie, no router race conditions
        window.location.href = '/dashboard'
      } else {
        setLoginError(result.error)
      }
    })
  }

  const gmailUrl = `https://mail.google.com/mail/u/0/#search/from%3Acoach%40tomaszuscinski.pl`
  const canResend = cooldown === 0 && resendStatus !== 'sending'

  // ── Verified state (cross-device detection or manual) ─────────────────────
  if (isVerified) {
    return (
      <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-2 duration-500">

        {/* Success header */}
        <div className="flex flex-col items-center gap-4 text-center pt-2">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-3xl"
            style={{
              background: 'hsl(142 76% 36% / 0.12)',
              boxShadow: '0 0 0 1px hsl(142 76% 36% / 0.2)',
            }}
          >
            <CheckCircle2 className="h-9 w-9 text-green-500" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight">Email potwierdzony!</h1>
            <p className="text-sm text-muted-foreground">
              Adres <strong className="text-foreground">{maskEmail(email)}</strong> został aktywowany.
            </p>
          </div>
        </div>

        {/* First-login form — appears after brief animation */}
        {showLoginForm && (
          <form
            onSubmit={handleFirstLogin}
            className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-400"
          >
            {/* Email — pre-filled, display-only */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">Email</label>
              <div
                className="form-input flex items-center gap-2 cursor-default select-none opacity-70"
                aria-label={`Email: ${email}`}
              >
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm text-muted-foreground truncate">{email}</span>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="first-login-password" className="block text-sm font-medium text-foreground">
                Hasło
              </label>
              <div className="relative">
                <input
                  id="first-login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  required
                  disabled={isPending}
                  className="form-input pr-10"
                  placeholder="Twoje hasło"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Login error */}
            {loginError && (
              <div role="alert" className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {loginError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending || !password}
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
              style={{ minHeight: '44px' }}
            >
              {isPending ? (
                <><RefreshCw className="h-4 w-4 animate-spin" />Logowanie…</>
              ) : (
                <><Zap className="h-4 w-4" />Wejdź do NutriCoach</>
              )}
            </button>
          </form>
        )}

        {/* Fallback — if user doesn't want to log in now */}
        <p className="text-center text-xs text-muted-foreground">
          Zaloguj się później na stronie{' '}
          <a href="/auth/login" className="text-primary hover:text-primary/80 transition-colors">
            logowania
          </a>
          .
        </p>
      </div>
    )
  }

  // ── Pending state (waiting for verification) ───────────────────────────────
  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Icon + heading ─────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-4 text-center pt-2">
        <div
          className="relative flex h-20 w-20 items-center justify-center rounded-3xl"
          style={{
            background: 'hsl(var(--brand-600) / 0.12)',
            boxShadow: '0 0 0 1px hsl(var(--brand-600) / 0.15)',
          }}
        >
          <Mail className="h-9 w-9 text-primary" />
          {/* Animated dot */}
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-4 w-4 rounded-full bg-green-500" />
          </span>
        </div>

        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight">Sprawdź swoją skrzynkę</h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
            Wysłaliśmy link aktywacyjny na
          </p>
          <p className="text-sm font-semibold text-foreground">{maskEmail(email)}</p>
        </div>
      </div>

      {/* ── Resend sent toast ──────────────────────────────────────────────── */}
      {resendStatus === 'sent' && (
        <div className="flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/8 px-4 py-3 text-sm text-green-400 animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Nowy link został wysłany. Sprawdź skrzynkę.</span>
        </div>
      )}

      {resendStatus === 'error' && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive animate-in fade-in duration-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Błąd wysyłania. Spróbuj ponownie za chwilę.</span>
        </div>
      )}

      {/* ── Primary action: Open Gmail ─────────────────────────────────────── */}
      <a
        href={gmailUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2.5 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all"
        style={{ minHeight: '44px' }}
      >
        <Inbox className="h-4 w-4" />
        Otwórz Gmail
        <ExternalLink className="h-3.5 w-3.5 opacity-70" />
      </a>

      {/* ── Resend button ──────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <button
          onClick={handleResend}
          disabled={!canResend}
          className="flex items-center justify-center gap-2 w-full rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground hover:bg-accent/50 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
          style={{ minHeight: '44px' }}
        >
          {resendStatus === 'sending' ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Wysyłanie…
            </>
          ) : cooldown > 0 ? (
            <>
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Wyślij ponownie</span>
              <span className="ml-auto font-mono text-xs text-muted-foreground tabular-nums">
                {cooldown}s
              </span>
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Wyślij ponownie
            </>
          )}
        </button>

        {/* Cooldown progress bar */}
        {cooldown > 0 && (
          <div className="h-0.5 w-full rounded-full bg-border overflow-hidden">
            <div
              className="h-full bg-primary/40 transition-all duration-1000 ease-linear"
              style={{ width: `${((COOLDOWN_S - cooldown) / COOLDOWN_S) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* ── Info section: spam + expiry ────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-accent/30 p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Nie otrzymałeś/aś wiadomości?
        </p>
        <ul className="space-y-2 text-xs text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-amber-400">●</span>
            <span>Sprawdź folder <strong className="text-foreground">Spam</strong> lub <strong className="text-foreground">Oferty</strong> — maile aktywacyjne czasem tam trafiają.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-muted-foreground">●</span>
            <span>Upewnij się, że adres <strong className="text-foreground">{maskEmail(email)}</strong> jest poprawny.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-muted-foreground">●</span>
            <span>Link aktywacyjny jest ważny przez <strong className="text-foreground">24 godziny</strong>.</span>
          </li>
        </ul>
      </div>

      {/* ── Change email ──────────────────────────────────────────────────── */}
      <div className="text-center space-y-2">
        <a
          href="/auth/register"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Podaj inny adres email
        </a>
        <p className="text-xs text-muted-foreground">
          lub{' '}
          <a href="/auth/login" className="text-primary hover:text-primary/80 transition-colors">
            zaloguj się
          </a>
          {' '}jeśli konto zostało już zweryfikowane.
        </p>
      </div>
    </div>
  )
}
