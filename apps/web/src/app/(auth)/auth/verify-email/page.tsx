import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Weryfikacja email',
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 p-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Sprawdź swoją skrzynkę</h1>
        <p className="text-muted-foreground text-sm">
          Wysłaliśmy link weryfikacyjny na Twój adres email.
          Kliknij w link, aby aktywować konto.
        </p>
        <p className="text-xs text-muted-foreground">
          Nie widzisz emaila? Sprawdź folder Spam lub{' '}
          <a href="/auth/login" className="text-brand-500 hover:text-brand-400 underline underline-offset-2">
            zaloguj się ponownie
          </a>
          .
        </p>
        {/* TODO ETAP 5: Resend verification email button */}
      </div>
    </div>
  )
}
