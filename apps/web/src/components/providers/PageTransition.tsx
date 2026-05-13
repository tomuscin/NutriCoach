'use client'

// PageTransition — app-router-compatible page animation.
// Uses pathname as the key to trigger AnimatePresence unmount → mount cycle.
// Slide right on forward navigation, fade on back (cannot reliably detect direction
// without history tracking — we use a simple cross-fade + slight slide for all nav).
//
// Respects: prefers-reduced-motion (disables animation), hydration safety.

import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'

// ── History stack for direction detection ──────────────────────────────────

function useNavDirection() {
  const pathname = usePathname()
  const history = useRef<string[]>([])
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')

  useEffect(() => {
    const prev = history.current.at(-2)
    const curr = history.current.at(-1)

    if (curr !== pathname) {
      if (prev != null && prev === pathname) {
        // Going back to a previously seen route
        setDirection('back')
        history.current.pop()
      } else {
        setDirection('forward')
        if (pathname) history.current.push(pathname)
      }
    }

    if (history.current.length === 0 && pathname) {
      history.current.push(pathname)
    }
  }, [pathname])

  return direction
}

// ── Motion variants ────────────────────────────────────────────────────────

const VARIANTS = {
  forward: {
    initial:  { opacity: 0, x: 12 },
    animate:  { opacity: 1, x: 0  },
    exit:     { opacity: 0, x: -8 },
  },
  back: {
    initial:  { opacity: 0, x: -12 },
    animate:  { opacity: 1, x: 0   },
    exit:     { opacity: 0, x: 8   },
  },
}

const TRANSITION = {
  duration: 0.2,
  ease: [0.32, 0.72, 0, 1] as const, // iOS-like cubic-bezier
}

// ── Component ──────────────────────────────────────────────────────────────

interface PageTransitionProps {
  children: React.ReactNode
  className?: string
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const pathname = usePathname()
  const direction = useNavDirection()
  const [prefersReduced, setPrefersReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReduced(mq.matches)
    const listener = (e: MediaQueryListEvent) => setPrefersReduced(e.matches)
    mq.addEventListener('change', listener)
    return () => mq.removeEventListener('change', listener)
  }, [])

  const variants = VARIANTS[direction]

  if (prefersReduced) {
    // No animation for accessibility — just render
    return <div className={className}>{children}</div>
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        className={className}
        initial={variants.initial}
        animate={variants.animate}
        exit={variants.exit}
        transition={TRANSITION}
        style={{ willChange: 'opacity, transform' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
