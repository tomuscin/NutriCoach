import type { Metadata } from 'next'
import { RegisterForm } from '@/components/auth/RegisterForm'

export const metadata: Metadata = {
  title: 'Rejestracja',
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Utwórz konto</h1>
          <p className="mt-2 text-muted-foreground">
            Zacznij monitorować dietę, treningi i regenerację
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  )
}

