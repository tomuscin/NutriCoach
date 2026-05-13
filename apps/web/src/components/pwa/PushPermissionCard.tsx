'use client'

// PushPermissionCard — soft-ask in-feed card for push notification permissions.
// Shown on dashboard, day 2+ users, 14-day cooldown after dismiss.
// Two phases:
//   1. Soft ask card (non-alarming, benefit-focused)
//   2. Education modal with notification previews → triggers hard ask
//
// Built on top of usePushNotifications (existing hook).

import { useState } from 'react'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { usePushSoftAsk } from '@/hooks/usePushSoftAsk'

// ── Notification preview mockup ────────────────────────────────────────────

const NOTIFICATION_PREVIEWS = [
  {
    icon: '🥗',
    title: 'Czas na uzupełnienie kalorii',
    body: 'Masz jeszcze 420 kcal do spożycia — dodaj przekąskę!',
    time: 'teraz',
  },
  {
    icon: '💪',
    title: 'Czas na trening',
    body: 'Plan na dziś: siłowy górna partia. 45 min.',
    time: '2 min temu',
  },
  {
    icon: '😴',
    title: 'Regeneracja — czas odpocząć',
    body: 'HRV spada. Rozważ lżejszy dzień treningowy.',
    time: '1 godz. temu',
  },
]

// ── Education Modal ────────────────────────────────────────────────────────

function PushEducationModal({
  onEnable,
  onDismiss,
}: {
  onEnable: () => void
  onDismiss: () => void
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center pb-safe-bottom animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onDismiss} />

      {/* Sheet */}
      <div
        className="relative w-full max-w-sm mx-4 mb-4 rounded-2xl p-5 animate-slide-up"
        style={{
          background: 'hsl(var(--surface-3))',
          border: '1px solid hsl(var(--border-strong))',
          boxShadow: 'var(--shadow-xl), var(--inset-highlight)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-semibold text-foreground text-base">Powiadomienia NutriCoach</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Co możesz otrzymywać:</p>
          </div>
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Zamknij"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Notification previews */}
        <div className="space-y-2.5 mb-5">
          {NOTIFICATION_PREVIEWS.map((notif, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl p-3"
              style={{
                background: 'hsl(var(--surface-2))',
                border: '1px solid hsl(var(--border))',
              }}
            >
              <span className="text-xl flex-shrink-0 mt-0.5">{notif.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-foreground truncate">{notif.title}</p>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">{notif.time}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{notif.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Note */}
        <p className="text-xs text-muted-foreground text-center mb-4">
          Tylko powiadomienia dotyczące Twoich celów. Możesz wyłączyć w dowolnym momencie.
        </p>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onDismiss}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Nie teraz
          </button>
          <button
            onClick={onEnable}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold bg-primary text-primary-foreground hover:brightness-105 transition-all active:scale-95"
          >
            Włącz powiadomienia
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Soft ask card ──────────────────────────────────────────────────────────

function SoftAskCard({
  onLearnMore,
  onDismiss,
}: {
  onLearnMore: () => void
  onDismiss: () => void
}) {
  return (
    <div
      className="rounded-2xl p-4 animate-fade-in"
      style={{
        background: 'hsl(var(--primary) / 0.07)',
        border: '1px solid hsl(var(--primary) / 0.18)',
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: 'hsl(var(--primary) / 0.15)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight">
            Chcesz śledzić postępy na bieżąco?
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            Włącz powiadomienia, by otrzymywać przypomnienia o posiłkach i treningach.
          </p>
          <div className="flex items-center gap-2 mt-2.5">
            <button
              onClick={onLearnMore}
              className="text-xs font-semibold py-1.5 px-3 rounded-lg bg-primary text-primary-foreground hover:brightness-105 transition-all active:scale-95"
            >
              Włącz
            </button>
            <button
              onClick={onDismiss}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5"
            >
              Nie teraz
            </button>
          </div>
        </div>

        {/* Dismiss X */}
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Zamknij"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Main exported component ────────────────────────────────────────────────

export function PushPermissionCard() {
  const { state, subscribe } = usePushNotifications()
  const { shouldShow, dismiss } = usePushSoftAsk(state)
  const [showModal, setShowModal] = useState(false)

  if (!shouldShow && !showModal) return null

  async function handleEnable() {
    setShowModal(false)
    // Track attempt
    fetch('/api/pwa/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'pwa.push.prompted' }),
    }).catch(() => {})
    // Trigger real browser permission ask
    await subscribe()
    dismiss(true) // After real ask, don't show again
  }

  function handleLearnMore() {
    setShowModal(true)
    fetch('/api/pwa/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'pwa.push.prompted' }),
    }).catch(() => {})
  }

  function handleDismiss() {
    setShowModal(false)
    dismiss()
  }

  return (
    <>
      {shouldShow && !showModal && (
        <SoftAskCard onLearnMore={handleLearnMore} onDismiss={handleDismiss} />
      )}
      {showModal && (
        <PushEducationModal onEnable={handleEnable} onDismiss={handleDismiss} />
      )}
    </>
  )
}
