// Settings page — /settings
// Sections: Profile, AI Preferences, Notifications, Privacy, Account

import type { Metadata } from 'next'
import { requireOnboarded } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { SettingsClient } from '@/components/settings/SettingsClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Ustawienia',
}

export default async function SettingsPage() {
  const user = await requireOnboarded()

  const [prefs, profile] = await Promise.all([
    prisma.userPreferences.findUnique({ where: { userId: user.id } }),
    prisma.userProfile.findUnique({ where: { userId: user.id }, select: { mainSport: true, activityLevel: true } }),
  ])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ustawienia</h1>
        <p className="text-sm text-muted-foreground mt-1">Zarządzaj kontem, preferencjami AI i powiadomieniami.</p>
      </div>
      <SettingsClient
        userId={user.id}
        email={user.email ?? ''}
        name={user.name ?? ''}
        prefs={prefs}
        mainSport={profile?.mainSport ?? null}
        activityLevel={profile?.activityLevel ?? null}
      />
    </div>
  )
}
