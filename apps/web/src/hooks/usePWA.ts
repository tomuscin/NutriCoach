'use client'

// usePWA — central hook for PWA capabilities
// Handles: platform detection, install prompt, SW update detection, standalone mode.
// Zero dependencies beyond React + browser APIs.

import { useState, useEffect, useCallback, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type Platform =
  | 'ios-safari'       // iPhone/iPad in Safari — custom Add to Home Screen walkthrough
  | 'android-chrome'   // Android Chrome — native beforeinstallprompt
  | 'desktop-chromium' // Desktop Chrome/Edge — native beforeinstallprompt
  | 'unsupported'      // Firefox, Samsung browser, etc.
  | 'unknown'

export type InstallState =
  | 'idle'             // Haven't prompted yet
  | 'ready'            // Prompt deferred and ready to show
  | 'shown'            // Prompt shown, waiting for user
  | 'accepted'         // User accepted install
  | 'dismissed'        // User dismissed
  | 'installed'        // Already installed (standalone mode)
  | 'unsupported'      // Platform doesn't support install

export interface PWAState {
  // Platform
  platform: Platform
  isStandalone: boolean
  isOnline: boolean

  // Install
  installState: InstallState
  canInstall: boolean
  triggerInstall: () => Promise<void>
  dismissInstall: (permanent?: boolean) => void

  // SW update
  updateAvailable: boolean
  applyUpdate: () => void
  swVersion: string | null

  // Push
  pushPermission: NotificationPermission | 'unknown'
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INSTALL_DISMISSED_KEY = 'nc-pwa-install-dismissed'
const INSTALL_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

// ─── Platform detection ───────────────────────────────────────────────────────

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'unknown'

  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as Record<string, unknown>).MSStream
  const isAndroid = /Android/.test(ua)
  const isChrome = /Chrome/.test(ua) && !/Edg/.test(ua) === false || /Chrome/.test(ua)
  const isEdge = /Edg\//.test(ua)
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua)
  const isFirefox = /Firefox/.test(ua)

  if (isIOS && isSafari) return 'ios-safari'
  if (isIOS) return 'unsupported' // iOS Chrome/Firefox can't install PWAs
  if (isAndroid && (isChrome || isEdge)) return 'android-chrome'
  if (!isAndroid && (isChrome || isEdge)) return 'desktop-chromium'
  if (isFirefox) return 'unsupported'

  return 'unknown'
}

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.startsWith('android-app://')
  )
}

function isDismissedRecently(): boolean {
  try {
    const stored = localStorage.getItem(INSTALL_DISMISSED_KEY)
    if (!stored) return false
    const ts = parseInt(stored, 10)
    return Date.now() - ts < INSTALL_COOLDOWN_MS
  } catch {
    return false
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePWA(): PWAState {
  const [platform, setPlatform] = useState<Platform>('unknown')
  const [isStandalone, setIsStandalone] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [installState, setInstallState] = useState<InstallState>('idle')
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [swVersion, setSwVersion] = useState<string | null>(null)
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unknown'>('unknown')

  // Deferred install prompt (Android/Desktop Chrome)
  const deferredPrompt = useRef<Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> } | null>(null)
  // SW registration reference
  const swRegistration = useRef<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    // ── Platform detection ──────────────────────────────────────────────────
    const plt = detectPlatform()
    setPlatform(plt)

    const standalone = isStandaloneMode()
    setIsStandalone(standalone)

    if (standalone) {
      setInstallState('installed')
    } else if (plt === 'unsupported') {
      setInstallState('unsupported')
    } else if (isDismissedRecently()) {
      setInstallState('dismissed')
    }

    // ── Online/offline ──────────────────────────────────────────────────────
    setIsOnline(navigator.onLine)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // ── beforeinstallprompt (Android + Desktop Chrome) ──────────────────────
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault()
      deferredPrompt.current = e as typeof deferredPrompt.current
      if (!isDismissedRecently() && !standalone) {
        setInstallState('ready')
      }
    }
    window.addEventListener('beforeinstallprompt', handleInstallPrompt)

    // ── App installed event ─────────────────────────────────────────────────
    window.addEventListener('appinstalled', () => {
      deferredPrompt.current = null
      setInstallState('installed')
      setIsStandalone(true)
      // Track install
      trackPWAEvent('pwa.install.accepted').catch(() => {})
    })

    // ── iOS: mark as ready after a short delay (no prompt API) ─────────────
    if (plt === 'ios-safari' && !standalone && !isDismissedRecently()) {
      const timer = setTimeout(() => setInstallState('ready'), 2000)
      return () => clearTimeout(timer)
    }

    // ── Push permission ─────────────────────────────────────────────────────
    if ('Notification' in window) {
      setPushPermission(Notification.permission)
    }

    // ── Service Worker update detection ─────────────────────────────────────
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        swRegistration.current = reg

        // Check for waiting SW (update ready)
        if (reg.waiting) {
          setUpdateAvailable(true)
        }

        // Listen for new SW installing
        reg.addEventListener('updatefound', () => {
          const newSW = reg.installing
          if (!newSW) return
          newSW.addEventListener('statechange', () => {
            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true)
            }
          })
        })

        // Query SW version
        const channel = new MessageChannel()
        channel.port1.onmessage = (e) => {
          if (e.data?.type === 'SW_VERSION') {
            setSwVersion(e.data.version)
          }
        }
        reg.active?.postMessage({ type: 'GET_VERSION' }, [channel.port2])
      }).catch(() => {})

      // Listen for SW_ACTIVATED broadcast
      navigator.serviceWorker.addEventListener('message', (e) => {
        if (e.data?.type === 'SW_ACTIVATED') {
          setUpdateAvailable(false)
          setSwVersion(e.data.version ?? null)
          window.location.reload()
        }
      })
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
    }
  }, [])

  // ── triggerInstall ──────────────────────────────────────────────────────────
  const triggerInstall = useCallback(async () => {
    setInstallState('shown')

    if (deferredPrompt.current) {
      // Android / Desktop Chrome — native prompt
      await deferredPrompt.current.prompt()
      const { outcome } = await deferredPrompt.current.userChoice
      deferredPrompt.current = null

      if (outcome === 'accepted') {
        setInstallState('accepted')
        trackPWAEvent('pwa.install.accepted').catch(() => {})
      } else {
        setInstallState('dismissed')
        try { localStorage.setItem(INSTALL_DISMISSED_KEY, Date.now().toString()) } catch {}
        trackPWAEvent('pwa.install.dismissed').catch(() => {})
      }
    }
    // iOS — caller should show custom walkthrough modal; no browser API
  }, [])

  // ── dismissInstall ──────────────────────────────────────────────────────────
  const dismissInstall = useCallback((permanent = false) => {
    setInstallState('dismissed')
    try {
      if (permanent) {
        localStorage.setItem(INSTALL_DISMISSED_KEY, (Date.now() + INSTALL_COOLDOWN_MS * 52).toString()) // 1 year
      } else {
        localStorage.setItem(INSTALL_DISMISSED_KEY, Date.now().toString()) // 7-day cooldown
      }
    } catch {}
    trackPWAEvent('pwa.install.dismissed').catch(() => {})
  }, [])

  // ── applyUpdate ─────────────────────────────────────────────────────────────
  const applyUpdate = useCallback(() => {
    const reg = swRegistration.current
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
  }, [])

  const canInstall = installState === 'ready' && !isStandalone

  return {
    platform,
    isStandalone,
    isOnline,
    installState,
    canInstall,
    triggerInstall,
    dismissInstall,
    updateAvailable,
    applyUpdate,
    swVersion,
    pushPermission,
  }
}

// ─── Analytics helper (fire-and-forget, never throws) ─────────────────────────

async function trackPWAEvent(event: string): Promise<void> {
  try {
    await fetch('/api/pwa/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, timestamp: Date.now() }),
    })
  } catch {}
}
