import type { Metadata } from 'next'
import { RegisterForm } from '@/components/auth/RegisterForm'

export const metadata: Metadata = {
  title: 'Rejestracja',
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-lg font-bold mb-4 shadow-elevation-3">
            N
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Utwórz konto</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Zacznij monitorować dietę, treningi i regenerację
          </p>
        </div>

        <div
          className="rounded-2xl border border-border p-8"
          style={{
            background: 'hsl(var(--surface-1))',
            boxShadow: 'var(--shadow-lg), var(--inset-highlight)',
          }}
        >
          <RegisterForm />
        </div>
      </div>
    </div>
  )
}

