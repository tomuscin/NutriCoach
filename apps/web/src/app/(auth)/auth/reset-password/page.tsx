// Reset password page — consumes ?token=… from password-reset email

import type { Metadata } from 'next'
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'

export const metadata: Metadata = {
  title: 'Ustaw nowe hasło',
}

interface Props {
  searchParams: Promise<{ token?: string }>
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const params = await searchParams
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Ustaw nowe hasło</h1>
          <p className="text-sm text-muted-foreground">
            Wprowadź nowe hasło dla swojego konta.
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <ResetPasswordForm token={params.token} />
        </div>
      </div>
    </div>
  )
}
