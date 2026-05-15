import type { Metadata } from 'next'
import { VerifySuccessClient } from '@/components/auth/VerifySuccessClient'

export const metadata: Metadata = {
  title: 'Email potwierdzony — Leaxaro',
  robots: 'noindex',
}

export default function VerifySuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-lg font-bold mb-4 shadow-elevation-3">
            N
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Leaxaro</h1>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border border-border p-8"
          style={{
            background: 'hsl(var(--surface-1))',
            boxShadow: 'var(--shadow-lg), var(--inset-highlight)',
          }}
        >
          <VerifySuccessClient />
        </div>
      </div>
    </div>
  )
}
