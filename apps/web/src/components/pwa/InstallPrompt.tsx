'use client'

// InstallPrompt — intelligent PWA install UX.
// Platform-aware: iOS walkthrough vs Android/Desktop native prompt.
// Timing: shows after 3s on /dashboard (meaningful engagement).
// Dismiss: 7-day cooldown, permanent "never" option.
// Design: ultra-subtle floating card — premium, non-annoying.

import { useState, useEffect } from 'react'
import { usePWAContext } from '@/components/providers/PWAProvider'
import { usePathname } from 'next/navigation'

// ─── iOS Walkthrough Modal ────────────────────────────────────────────────────

function IOSWalkthrough({ onClose }: { onClose: () => void }) {
  const steps = [
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
          <polyline points="16 6 12 2 8 6"/>
          <line x1="12" y1="2" x2="12" y2="15"/>
        </svg>
      ),
      text: 'Naciśnij przycisk Udostępnij w przeglądarce Safari',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      ),
      text: 'Przewiń listę i wybierz „Dodaj do ekranu głównego"',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      ),
      text: 'Potwierdź klikając „Dodaj" w prawym górnym rogu',
    },
  ]

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center pb-safe-bottom animate-fade-in">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal sheet */}
      <div
        className="relative w-full max-w-sm mx-4 mb-4 rounded-2xl p-6 animate-slide-up"
        style={{
          background: 'hsl(var(--surface-3))',
          border: '1px solid hsl(var(--border-strong))',
          boxShadow: 'var(--shadow-xl), var(--inset-highlight)',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 border border-primary/20">
            <svg width="20" height="20" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <rect x="10" y="10" width="17" height="80" rx="2" fill="hsl(var(--primary))"/>
              <rect x="73" y="10" width="17" height="80" rx="2" fill="hsl(var(--primary))"/>
              <polygon points="27,10 44,10 73,90 56,90" fill="hsl(var(--primary))"/>
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-foreground text-sm">Zainstaluj NutriCoach</h2>
            <p className="text-xs text-muted-foreground">Dostęp jak do natywnej aplikacji</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Zamknij"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Steps */}
        <div className="space-y-3.5 mb-5">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                {step.icon}
              </div>
              <p className="text-sm text-foreground leading-snug pt-1">{step.text}</p>
            </div>
          ))}
        </div>

        {/* Arrow indicator pointing to share button */}
        <div
          className="rounded-lg p-3 mb-4"
          style={{ background: 'hsl(var(--primary) / 0.08)', border: '1px solid hsl(var(--primary) / 0.15)' }}
        >
          <p className="text-xs text-center" style={{ color: 'hsl(var(--primary))' }}>
            Przycisk Udostępnij ↑ znajduje się na dole paska Safari
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full rounded-xl py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          Może później
        </button>
      </div>
    </div>
  )
}

// ─── Floating Install Banner ──────────────────────────────────────────────────

function InstallBanner({
  onInstall,
  onDismiss,
  platform,
}: {
  onInstall: () => void
  onDismiss: () => void
  platform: string
}) {
  const isIOS = platform === 'ios-safari'

  return (
    <div
      className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] left-1/2 -translate-x-1/2 z-[9990] animate-slide-up"
      style={{ width: 'calc(100vw - 2rem)', maxWidth: '22rem' }}
    >
      <div
        className="rounded-2xl px-4 py-3.5 flex items-center gap-3"
        style={{
          background: 'hsl(var(--surface-3))',
          border: '1px solid hsl(var(--border-strong))',
          boxShadow: 'var(--shadow-xl), var(--inset-highlight)',
        }}
      >
        {/* App icon */}
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/15 border border-primary/20">
          <svg width="18" height="18" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="10" width="17" height="80" rx="2" fill="hsl(var(--primary))"/>
            <rect x="73" y="10" width="17" height="80" rx="2" fill="hsl(var(--primary))"/>
            <polygon points="27,10 44,10 73,90 56,90" fill="hsl(var(--primary))"/>
          </svg>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight">
            {isIOS ? 'Dodaj do ekranu głównego' : 'Zainstaluj aplikację'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            {isIOS
              ? 'Działaj jak natywna aplikacja'
              : 'Szybszy dostęp, tryb offline'}
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={onInstall}
          className="flex-shrink-0 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:brightness-105 transition-all active:scale-95"
        >
          {isIOS ? 'Jak?' : 'Instaluj'}
        </button>

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Zamknij"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function InstallPrompt() {
  const { platform, canInstall, isStandalone, triggerInstall, dismissInstall, installState } = usePWAContext()
  const pathname = usePathname()
  const [showBanner, setShowBanner] = useState(false)
  const [showIOSModal, setShowIOSModal] = useState(false)
  const [ready, setReady] = useState(false)

  // Show after 3s on /dashboard — meaningful engagement signal
  useEffect(() => {
    if (!canInstall || isStandalone) return

    const SHOW_AFTER_MS = 3000
    const timer = setTimeout(() => {
      setReady(true)
    }, SHOW_AFTER_MS)
    return () => clearTimeout(timer)
  }, [canInstall, isStandalone])

  useEffect(() => {
    if (ready && canInstall && pathname === '/dashboard') {
      setShowBanner(true)
    } else {
      setShowBanner(false)
    }
  }, [ready, canInstall, pathname])

  if (!showBanner && !showIOSModal) return null

  async function handleInstall() {
    if (platform === 'ios-safari') {
      setShowIOSModal(true)
      setShowBanner(false)
    } else {
      setShowBanner(false)
      await triggerInstall()
    }
    // Track
    fetch('/api/pwa/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'pwa.install.prompted', platform, installState }),
    }).catch(() => {})
  }

  function handleDismiss() {
    setShowBanner(false)
    dismissInstall()
  }

  return (
    <>
      {showBanner && (
        <InstallBanner
          platform={platform}
          onInstall={handleInstall}
          onDismiss={handleDismiss}
        />
      )}
      {showIOSModal && (
        <IOSWalkthrough
          onClose={() => {
            setShowIOSModal(false)
            dismissInstall()
          }}
        />
      )}
    </>
  )
}
