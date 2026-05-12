// usePushNotifications — React hook to manage browser push subscription lifecycle
// Handles: permission request, subscribe, unsubscribe, persisting to backend

'use client'

import { useState, useEffect, useCallback } from 'react'

type PushState = 'loading' | 'unsupported' | 'denied' | 'granted' | 'subscribed' | 'error'

interface UsePushNotificationsReturn {
  state: PushState
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
  error: string | null
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [state, setState] = useState<PushState>('loading')
  const [error, setError] = useState<string | null>(null)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    async function init() {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        setState('unsupported')
        return
      }

      try {
        const reg = await navigator.serviceWorker.ready
        setRegistration(reg)

        const permission = Notification.permission
        if (permission === 'denied') {
          setState('denied')
          return
        }

        const existing = await reg.pushManager.getSubscription()
        setState(existing ? 'subscribed' : permission === 'granted' ? 'granted' : 'loading')
      } catch {
        setState('unsupported')
      }
    }
    init()
  }, [])

  const subscribe = useCallback(async () => {
    if (!registration) return
    setError(null)

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState('denied')
        return
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) throw new Error('VAPID key not configured')

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      })

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      })

      if (!res.ok) throw new Error('Failed to save subscription')
      setState('subscribed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się włączyć powiadomień')
      setState('error')
    }
  }, [registration])

  const unsubscribe = useCallback(async () => {
    if (!registration) return
    setError(null)

    try {
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await fetch('/api/push/unsubscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        await subscription.unsubscribe()
      }
      setState('granted')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas wyłączania powiadomień')
    }
  }, [registration])

  return { state, subscribe, unsubscribe, error }
}
