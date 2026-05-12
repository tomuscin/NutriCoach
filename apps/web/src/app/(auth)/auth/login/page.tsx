import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Logowanie',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">NutriCoach</h1>
          <p className="mt-2 text-muted-foreground">
            AI Personal Coach — nutrition, training &amp; recovery
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}

