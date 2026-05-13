'use client'

// NextAuthProvider — wraps the app with next-auth SessionProvider.
// Required for useSession() to work in Client Components (e.g. OnboardingWizard).
// Must be a Client Component because SessionProvider uses React context.

import { SessionProvider } from 'next-auth/react'

export function NextAuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
