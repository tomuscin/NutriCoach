import type { Metadata } from 'next'
import { requireAuth } from '@/lib/auth'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Konfiguracja profilu',
}

export default async function OnboardingPage() {
  // Auth guard — middleware handles redirect, this is extra safety
  const user = await requireAuth()

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Header */}
        <div className="mb-10 text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Cześć, {user.name ?? 'trenujący'}!
          </h1>
          <p className="text-muted-foreground">
            Skonfigurujmy Twój profil — zajmie to 2 minuty.
          </p>
        </div>

        <OnboardingWizard userId={user.id} />
      </div>
    </div>
  )
}
