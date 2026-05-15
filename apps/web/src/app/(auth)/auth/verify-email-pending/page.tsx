import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { VerifyEmailPendingClient } from '@/components/auth/VerifyEmailPendingClient'

export const metadata: Metadata = {
  title: 'Potwierdź email — Leaxaro',
  robots: 'noindex',
}

interface Props {
  searchParams: Promise<{ email?: string }>
}

export default async function VerifyEmailPendingPage({ searchParams }: Props) {
  const params = await searchParams
  const email = params.email ? decodeURIComponent(params.email) : ''

  // Guard: redirect to register if no email param
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect('/auth/register')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-lg font-bold mb-4 shadow-elevation-3">
            N
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Leaxaro</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Aktywacja konta
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border border-border p-8"
          style={{
            background: 'hsl(var(--surface-1))',
            boxShadow: 'var(--shadow-lg), var(--inset-highlight)',
          }}
        >
          <VerifyEmailPendingClient email={email} />
        </div>
      </div>
    </div>
  )
}
