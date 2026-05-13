'use client'

// AppNav — client-side navigation for the app layout.
// Sidebar (desktop) + bottom nav (mobile).
// Icons imported directly here — avoids passing function refs from Server Component.

import { NavLink } from '@/components/ui/NavLink'
import {
  LayoutDashboard, Salad, Dumbbell, Heart, BrainCircuit, BarChart2,
  Link2, User, Bell, Settings, Home, Activity,
} from 'lucide-react'

// ─── Sidebar nav ──────────────────────────────────────────────────────────────

export function AppSidebarNav({ email }: { email: string }) {
  return (
    <>
      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
        <NavLink href="/dashboard"    label="Dashboard"   icon={LayoutDashboard} />
        <NavLink href="/nutrition"    label="Żywienie"     icon={Salad} />
        <NavLink href="/workouts"     label="Treningi"     icon={Dumbbell} />
        <NavLink href="/recovery"     label="Regeneracja"  icon={Heart} />
        <NavLink href="/ai-coach"     label="AI Coach"     icon={BrainCircuit} />
        <NavLink href="/analytics"    label="Analityka"    icon={BarChart2} />
        <NavLink href="/integrations" label="Integracje"   icon={Link2} />
        <NavLink href="/profile"      label="Profil"       icon={User} />
      </nav>

      {/* Bottom: settings + user */}
      <div className="border-t border-border px-3 py-3 space-y-0.5">
        <NavLink href="/notifications" label="Powiadomienia" icon={Bell} />
        <NavLink href="/settings"      label="Ustawienia"    icon={Settings} />
        <div className="px-3 pt-3 pb-1 border-t border-border mt-2">
          <p className="text-xs text-muted-foreground truncate">{email}</p>
        </div>
      </div>
    </>
  )
}

// ─── Mobile bottom nav ─────────────────────────────────────────────────────────

export function AppBottomNav() {
  return (
    <div className="h-16 flex items-center justify-around px-2">
      <NavLink href="/dashboard" label="Home"     icon={Home}         exact vertical />
      <NavLink href="/nutrition" label="Żyw."      icon={Salad}                vertical />
      <NavLink href="/workouts"  label="Trening"   icon={Activity}             vertical />
      <NavLink href="/ai-coach"  label="AI"         icon={BrainCircuit}         vertical />
      <NavLink href="/settings"  label="Ustaw."    icon={Settings}             vertical />
    </div>
  )
}
