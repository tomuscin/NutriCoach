'use client'

// PWAProvider — wraps the app with PWA context.
// Handles: SW registration with update detection, install prompt lifecycle,
// online/offline status, update-ready toast, reconnect detection.
//
// Place inside ThemeProvider in root layout.

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { usePWA, type PWAState } from '@/hooks/usePWA'

// ─── Context ──────────────────────────────────────────────────────────────────

const PWAContext = createContext<PWAState | null>(null)

export function usePWAContext(): PWAState {
  const ctx = useContext(PWAContext)
  if (!ctx) throw new Error('usePWAContext must be used inside PWAProvider')
  return ctx
}

// ─── Update toast ─────────────────────────────────────────────────────────────

function UpdateToast({ onUpdate, onDismiss }: { onUpdate: () => void; onDismiss: () => void }) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+4.5rem)] left-1/2 -translate-x-1/2 z-[9999] animate-slide-up"
      style={{ width: 'calc(100vw - 2rem)', maxWidth: '22rem' }}
    >
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3 shadow-elevation-5"
        style={{
          background: 'hsl(var(--surface-3))',
          border: '1px solid hsl(var(--border-strong))',
          boxShadow: 'var(--shadow-xl), var(--inset-highlight)',
        }}
      >
        {/* Icon */}
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/15">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight">Nowa wersja gotowa</p>
          <p className="text-xs text-muted-foreground mt-0.5">Odśwież, aby zastosować aktualizację.</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={onUpdate}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:brightness-105 transition-all"
          >
            Odśwież
          </button>
          <button
            onClick={onDismiss}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Zamknij"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Offline banner ───────────────────────────────────────────────────────────

function OfflineBanner() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-[env(safe-area-inset-top,0px)] inset-x-0 z-[9998]"
    >
      <div
        className="flex items-center justify-center gap-2 py-2 text-xs font-medium"
        style={{ background: 'hsl(var(--warning) / 0.9)', color: 'hsl(var(--warning-foreground))' }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
        Tryb offline — niektóre funkcje mogą być niedostępne
      </div>
    </div>
  )
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const pwa = usePWA()
  const [showUpdateToast, setShowUpdateToast] = useState(false)
  const [showOfflineBanner, setShowOfflineBanner] = useState(false)
  const prevOnline = useRef(true)

  // Register service worker on mount (replaces the inline script in layout.tsx)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {})
      })
    }
  }, [])

  // Show update toast when update is available
  useEffect(() => {
    if (pwa.updateAvailable) {
      setShowUpdateToast(true)
    }
  }, [pwa.updateAvailable])

  // Show offline banner with slight delay to avoid flicker on short disconnects
  useEffect(() => {
    if (!pwa.isOnline) {
      const timer = setTimeout(() => setShowOfflineBanner(true), 1500)
      return () => clearTimeout(timer)
    } else {
      setShowOfflineBanner(false)
      // If was offline, briefly show reconnected message
      if (!prevOnline.current) {
        // Reconnect handled by the component in an effect
      }
      prevOnline.current = true
    }
    prevOnline.current = pwa.isOnline
  }, [pwa.isOnline])

  const handleUpdate = useCallback(() => {
    pwa.applyUpdate()
    setShowUpdateToast(false)
  }, [pwa])

  return (
    <PWAContext.Provider value={pwa}>
      {children}

      {/* Offline banner */}
      {showOfflineBanner && <OfflineBanner />}

      {/* SW update toast */}
      {showUpdateToast && (
        <UpdateToast
          onUpdate={handleUpdate}
          onDismiss={() => setShowUpdateToast(false)}
        />
      )}
    </PWAContext.Provider>
  )
}
