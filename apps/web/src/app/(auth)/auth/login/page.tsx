import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Logowanie',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-lg font-bold mb-4 shadow-elevation-3">
            N
          </div>
          <h1 className="text-2xl font-bold tracking-tight">NutriCoach</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            AI Personal Coach — nutrition, training &amp; recovery
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
          <LoginForm />
        </div>
      </div>
    </div>
  )
}

