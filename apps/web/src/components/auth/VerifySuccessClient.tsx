'use client'

// VerifySuccessClient — shown after email link is clicked and verified.
// Auto-redirects to /auth/login after 4 seconds.
// Clean, premium success state.

import { useEffect, useState } from 'react'
import { CheckCircle2, LogIn } from 'lucide-react'
import { useRouter } from 'next/navigation'

const REDIRECT_DELAY_S = 4

export function VerifySuccessClient() {
  const router = useRouter()
  const [countdown, setCountdown] = useState(REDIRECT_DELAY_S)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push('/auth/login?verified=1')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [router])

  return (
    <div className="flex flex-col items-center gap-6 py-4 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Success icon ──────────────────────────────────────────────────── */}
      <div
        className="relative flex h-20 w-20 items-center justify-center rounded-3xl"
        style={{
          background: 'hsl(var(--success, 142 76% 36%) / 0.12)',
          boxShadow: '0 0 0 1px hsl(var(--success, 142 76% 36%) / 0.20)',
        }}
      >
        <CheckCircle2 className="h-9 w-9 text-green-500" />
        {/* Ripple */}
        <span className="absolute inset-0 rounded-3xl animate-ping bg-green-500/20" style={{ animationDuration: '1.5s', animationIterationCount: '2' }} />
      </div>

      {/* ── Text ─────────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <h1 className="text-xl font-bold tracking-tight">Email potwierdzony!</h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
          Twoje konto jest aktywne. Możesz teraz zalogować się i korzystać z Leaxaro.
        </p>
      </div>

      {/* ── Auto-redirect info ────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Przekierowanie za</span>
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary font-mono font-semibold text-xs tabular-nums">
          {countdown}
        </span>
        <span>s…</span>
      </div>

      {/* ── Progress bar ─────────────────────────────────────────────────── */}
      <div className="w-full max-w-xs h-0.5 rounded-full bg-border overflow-hidden">
        <div
          className="h-full bg-green-500 transition-all ease-linear"
          style={{
            width: `${((REDIRECT_DELAY_S - countdown) / REDIRECT_DELAY_S) * 100}%`,
            transitionDuration: '1000ms',
          }}
        />
      </div>

      {/* ── Manual CTA ───────────────────────────────────────────────────── */}
      <a
        href="/auth/login?verified=1"
        className="flex items-center justify-center gap-2 w-full max-w-xs rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all"
        style={{ minHeight: '44px' }}
      >
        <LogIn className="h-4 w-4" />
        Przejdź do logowania
      </a>
    </div>
  )
}
