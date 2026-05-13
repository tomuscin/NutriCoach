// Protected app layout — requires authentication
import { requireOnboarded } from '@/lib/auth'
import { LogoutButton } from '@/components/auth/LogoutButton'
import { NavLink } from '@/components/ui/NavLink'
import {
  LayoutDashboard, Salad, Dumbbell, Heart, BrainCircuit, BarChart2,
  Link2, User, Bell, Settings, Home, Activity,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOnboarded()

  const navItems = [
    { href: '/dashboard',    label: 'Dashboard',   icon: LayoutDashboard },
    { href: '/nutrition',    label: 'Żywienie',     icon: Salad },
    { href: '/workouts',     label: 'Treningi',     icon: Dumbbell },
    { href: '/recovery',     label: 'Regeneracja',  icon: Heart },
    { href: '/ai-coach',     label: 'AI Coach',     icon: BrainCircuit },
    { href: '/analytics',    label: 'Analityka',    icon: BarChart2 },
    { href: '/integrations', label: 'Integracje',   icon: Link2 },
    { href: '/profile',      label: 'Profil',       icon: User },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen overflow-hidden">

        {/* ── Sidebar ──────────────────────────────────────────── */}
        <aside
          className="hidden md:flex w-64 flex-col border-r border-border"
          style={{ background: 'hsl(var(--surface-1))', boxShadow: 'var(--shadow-sm)' }}
          aria-label="Nawigacja boczna"
        >
          {/* Logo */}
          <div className="flex h-14 items-center gap-2.5 border-b border-border px-5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">N</span>
            <span className="font-semibold text-sm tracking-tight">NutriCoach</span>
          </div>

          {/* Nav items */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
            {navItems.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
            ))}
          </nav>

          {/* Bottom: settings + user */}
          <div className="border-t border-border px-3 py-3 space-y-0.5">
            <NavLink href="/notifications" label="Powiadomienia" icon={Bell} />
            <NavLink href="/settings"      label="Ustawienia"    icon={Settings} />
            <div className="px-3 pt-3 pb-1 border-t border-border mt-2">
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <LogoutButton className="w-full text-left flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" />
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          {/* Mobile header — glass effect */}
          <header className="sticky top-0 z-40 border-b border-border glass md:hidden">
            <div className="h-14 flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground text-[10px] font-bold">N</span>
                <span className="font-semibold text-sm">NutriCoach</span>
              </div>
              <div className="flex items-center gap-1">
                <a href="/notifications" className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <Bell className="h-5 w-5"/>
                </a>
                <a href="/settings" className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <Settings className="h-5 w-5"/>
                </a>
              </div>
            </div>
          </header>

          <div className="container mx-auto px-4 py-6 pb-24 max-w-7xl md:pb-6">
            {children}
          </div>
        </main>
      </div>

      {/* ── Mobile bottom nav ──────────────────────────────────── */}
      <nav
        className="fixed bottom-0 inset-x-0 z-50 border-t border-border glass-strong safe-area-inset-bottom md:hidden"
        aria-label="Nawigacja dolna"
      >
        <div className="h-16 flex items-center justify-around px-2">
          {[
            { href: '/dashboard', label: 'Home',    icon: Home,         exact: true },
            { href: '/nutrition', label: 'Żyw.',     icon: Salad },
            { href: '/workouts',  label: 'Trening',  icon: Activity },
            { href: '/ai-coach',  label: 'AI',       icon: BrainCircuit },
            { href: '/settings',  label: 'Ustaw.',   icon: Settings },
          ].map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              exact={item.exact}
              vertical
            />
          ))}
        </div>
      </nav>
    </div>
  )
}
