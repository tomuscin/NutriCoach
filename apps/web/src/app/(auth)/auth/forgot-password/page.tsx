import type { Metadata } from 'next'
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'

export const metadata: Metadata = {
  title: 'Resetowanie hasła',
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Zapomniałeś hasła?</h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Podaj email — wyślemy link do ustawienia nowego hasła.
          </p>
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  )
}
