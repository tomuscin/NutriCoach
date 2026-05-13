'use client'

// usePushSoftAsk — determines whether to show the soft push ask banner.
//
// Strategy: show the banner on the 2nd+ page session, only once per 14 days,
// never if already subscribed/denied, and only for supported platforms.
// A "session" is a browser tab open event — tracked in sessionStorage.

import { useState, useEffect } from 'react'

const SESSION_KEY = 'nc-push-sessions'       // sessionStorage: marks current session
const DISMISSED_KEY = 'nc-push-ask-dismissed' // localStorage: cooldown timestamp
const COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000  // 14 days

export interface PushSoftAskState {
  shouldShow: boolean
  dismiss: (permanent?: boolean) => void
}

export function usePushSoftAsk(pushState: string): PushSoftAskState {
  const [shouldShow, setShouldShow] = useState(false)

  useEffect(() => {
    // If push is already resolved, don't prompt
    if (pushState === 'subscribed' || pushState === 'denied' || pushState === 'unsupported') {
      setShouldShow(false)
      return
    }

    // Check cooldown
    try {
      const dismissed = localStorage.getItem(DISMISSED_KEY)
      if (dismissed) {
        const ts = parseInt(dismissed, 10)
        if (Date.now() - ts < COOLDOWN_MS) return
      }
    } catch {}

    // Track session count
    try {
      const sessions = parseInt(sessionStorage.getItem(SESSION_KEY) ?? '0', 10)
      if (sessions === 0) {
        sessionStorage.setItem(SESSION_KEY, '1')
        return // First session — don't show
      }
      // 2nd+ session — show banner
      setShouldShow(true)
    } catch {
      // sessionStorage unavailable — skip
    }
  }, [pushState])

  function dismiss(permanent = false) {
    setShouldShow(false)
    try {
      if (permanent) {
        localStorage.setItem(DISMISSED_KEY, (Date.now() + COOLDOWN_MS * 26).toString()) // 1 year
      } else {
        localStorage.setItem(DISMISSED_KEY, Date.now().toString())
      }
    } catch {}
  }

  return { shouldShow, dismiss }
}
