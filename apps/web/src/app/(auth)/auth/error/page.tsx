import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Błąd logowania',
}

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 p-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-destructive">Błąd logowania</h1>
        <p className="text-muted-foreground text-sm">
          Wystąpił problem z uwierzytelnieniem. Spróbuj ponownie.
        </p>
        <a
          href="/auth/login"
          className="inline-block rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 transition-colors"
        >
          Wróć do logowania
        </a>
      </div>
    </div>
  )
}
