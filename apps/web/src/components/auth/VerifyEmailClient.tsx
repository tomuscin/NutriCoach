'use client'

// VerifyEmailClient — three display modes:
//  1. No token: show "check your inbox" prompt with resend option
//  2. Error code: show appropriate error with resend option
//  3. Token present: auto-verify on mount, show loader → success/fail

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Mail, Loader2, AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  token?: string
  errorCode?: string
}

type Mode = 'no_token' | 'verifying' | 'success' | 'expired' | 'invalid' | 'error'

const errorMessages: Record<string, { mode: Mode; title: string; body: string }> = {
  expired: { mode: 'expired', title: 'Link wygasł', body: 'Ten link weryfikacyjny już nie jest ważny. Możesz poprosić o nowy poniżej.' },
  invalid: { mode: 'invalid', title: 'Nieprawidłowy link', body: 'Ten link weryfikacyjny jest nieprawidłowy. Sprawdź czy skopiowałeś/aś pełny adres z emaila.' },
  missing_token: { mode: 'invalid', title: 'Brak tokenu', body: 'Link weryfikacyjny jest niekompletny.' },
  not_found: { mode: 'invalid', title: 'Nie znaleziono konta', body: 'Nie możemy znaleźć konta powiązanego z tym linkiem.' },
  server_error: { mode: 'error', title: 'Błąd serwera', body: 'Wystąpił błąd po naszej stronie. Spróbuj ponownie za chwilę.' },
}

export function VerifyEmailClient({ token, errorCode }: Props) {
  const [mode, setMode] = useState<Mode>(() => {
    if (errorCode && errorMessages[errorCode]) return errorMessages[errorCode].mode
    if (token) return 'verifying'
    return 'no_token'
  })
  const [resendEmail, setResendEmail] = useState('')
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  useEffect(() => {
    if (!token || mode !== 'verifying') return
    verifyToken(token)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function verifyToken(t: string) {
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: t }),
      })
      const data = await res.json()
      if (data.ok) {
        setMode('success')
        setTimeout(() => { window.location.href = '/auth/verify-success' }, 1500)
      } else {
        const mapped = errorMessages[data.code ?? 'invalid'] ?? errorMessages.invalid
        setMode(mapped.mode)
      }
    } catch {
      setMode('error')
    }
  }

  async function handleResend(e: React.FormEvent) {
    e.preventDefault()
    if (!resendEmail) return
    setResendStatus('sending')
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail }),
      })
      const data = await res.json()
      setResendStatus(data.ok ? 'sent' : 'error')
    } catch {
      setResendStatus('error')
    }
  }

  // ─── Verifying (loading) ──────────────────────────────────────────────────
  if (mode === 'verifying') {
    return (
      <Card>
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Loader2 className="h-7 w-7 text-primary animate-spin" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Weryfikacja adresu email…</h1>
            <p className="mt-1 text-sm text-muted-foreground">Trwa sprawdzanie Twojego linku.</p>
          </div>
        </div>
      </Card>
    )
  }

  // ─── Success ──────────────────────────────────────────────────────────────
  if (mode === 'success') {
    return (
      <Card>
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15">
            <CheckCircle2 className="h-7 w-7 text-green-500" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Email zweryfikowany!</h1>
            <p className="mt-1 text-sm text-muted-foreground">Twoje konto jest aktywne. Za chwilę zostaniesz przekierowany/a do logowania.</p>
          </div>
          <a href="/auth/login" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
            Przejdź do logowania
          </a>
        </div>
      </Card>
    )
  }

  // ─── No token — check inbox ───────────────────────────────────────────────
  if (mode === 'no_token') {
    return (
      <Card>
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Sprawdź skrzynkę email</h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Wysłaliśmy link weryfikacyjny na Twój adres email. Kliknij w link, aby aktywować konto.
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">Sprawdź też folder Spam lub Oferty.</p>
          </div>
        </div>
        <ResendSection onResend={handleResend} email={resendEmail} setEmail={setResendEmail} status={resendStatus} />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <a href="/auth/login" className="text-primary hover:text-primary/80 font-medium">Wróć do logowania</a>
        </p>
      </Card>
    )
  }

  // ─── Error states ─────────────────────────────────────────────────────────
  const info = errorCode && errorMessages[errorCode]
    ? errorMessages[errorCode]
    : { mode: mode, title: 'Wystąpił błąd', body: 'Nie udało się zweryfikować adresu email.' }

  const canResend = mode === 'expired' || mode === 'error'

  return (
    <Card>
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <div className={`flex h-14 w-14 items-center justify-center rounded-full ${mode === 'expired' ? 'bg-amber-500/10' : 'bg-destructive/10'}`}>
          {mode === 'expired'
            ? <AlertCircle className="h-7 w-7 text-amber-500" />
            : <XCircle className="h-7 w-7 text-destructive" />
          }
        </div>
        <div>
          <h1 className="text-lg font-semibold">{info.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{info.body}</p>
        </div>
      </div>
      {canResend && (
        <ResendSection onResend={handleResend} email={resendEmail} setEmail={setResendEmail} status={resendStatus} />
      )}
      <p className="mt-4 text-center text-sm text-muted-foreground">
        <a href="/auth/login" className="text-primary hover:text-primary/80 font-medium">Wróć do logowania</a>
      </p>
    </Card>
  )
}

// ─── Resend section ───────────────────────────────────────────────────────────

function ResendSection({ onResend, email, setEmail, status }: {
  onResend: (e: React.FormEvent) => void
  email: string; setEmail: (v: string) => void
  status: 'idle' | 'sending' | 'sent' | 'error'
}) {
  if (status === 'sent') {
    return (
      <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
        Link weryfikacyjny został wysłany ponownie.
      </div>
    )
  }

  return (
    <form onSubmit={onResend} className="mt-4 space-y-2">
      <p className="text-center text-xs text-muted-foreground">Wyślij link ponownie:</p>
      <div className="flex gap-2">
        <input
          type="email" required value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Twój adres email"
          disabled={status === 'sending'}
          className="flex-1 min-w-0 rounded-xl border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
        />
        <button type="submit" disabled={status === 'sending' || !email}
          className="flex items-center gap-1.5 rounded-xl bg-muted px-3 py-2.5 text-sm font-medium hover:bg-muted/80 disabled:opacity-50 transition-colors flex-shrink-0">
          {status === 'sending' ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <RefreshCw className="h-3.5 w-3.5"/>}
          Wyślij
        </button>
      </div>
      {status === 'error' && <p className="text-xs text-destructive text-center">Wystąpił błąd. Spróbuj ponownie.</p>}
    </form>
  )
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm space-y-2">
        {children}
      </div>
    </div>
  )
}
