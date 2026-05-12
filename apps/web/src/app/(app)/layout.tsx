// Protected app layout — requires authentication
import { requireOnboarded } from '@/lib/auth'
import { LogoutButton } from '@/components/auth/LogoutButton'
import {
  LayoutDashboard, Salad, Dumbbell, Heart, BrainCircuit, BarChart2,
  Link2, User, Bell, Settings, Home, Activity,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Session guard — redirects to /auth/login or /onboarding if needed
  const user = await requireOnboarded()

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/nutrition', label: 'Żywienie', icon: Salad },
    { href: '/workouts', label: 'Treningi', icon: Dumbbell },
    { href: '/recovery', label: 'Regeneracja', icon: Heart },
    { href: '/ai-coach', label: 'AI Coach', icon: BrainCircuit },
    { href: '/analytics', label: 'Analityka', icon: BarChart2 },
    { href: '/integrations', label: 'Integracje', icon: Link2 },
    { href: '/profile', label: 'Profil', icon: User },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside
          className="hidden md:flex w-64 flex-col border-r border-border bg-card"
          aria-label="Nawigacja boczna"
        >
          <div className="flex h-14 items-center border-b border-border px-4">
            <span className="font-semibold text-sm">NutriCoach</span>
          </div>
          <nav className="flex-1 p-4 space-y-0.5 text-sm overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {item.label}
                </a>
              )
            })}
          </nav>
          <div className="border-t border-border p-3 space-y-0.5">
            <a href="/notifications" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <Bell className="h-4 w-4" />Powiadomienia
            </a>
            <a href="/settings" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <Settings className="h-4 w-4" />Ustawienia
            </a>
            <p className="text-xs text-muted-foreground px-3 pt-1 truncate">{user.email}</p>
            <LogoutButton className="w-full text-left flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm md:hidden">
            <div className="h-14 flex items-center justify-between px-4">
              <span className="font-semibold text-sm">NutriCoach</span>
              <div className="flex items-center gap-2">
                <a href="/notifications" className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <Bell className="h-5 w-5"/>
                </a>
                <a href="/settings" className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <Settings className="h-5 w-5"/>
                </a>
              </div>
            </div>
          </header>

          <div className="container mx-auto px-4 py-6 pb-24 max-w-7xl md:pb-6">{children}</div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background md:hidden safe-area-inset-bottom"
        aria-label="Nawigacja dolna"
      >
        <div className="h-16 flex items-center justify-around px-2">
          {[
            { href: '/dashboard', label: 'Home', icon: Home },
            { href: '/nutrition', label: 'Żyw.', icon: Salad },
            { href: '/workouts', label: 'Trening', icon: Activity },
            { href: '/ai-coach', label: 'AI', icon: BrainCircuit },
            { href: '/settings', label: 'Ustaw.', icon: Settings },
          ].map((item) => {
            const Icon = item.icon
            return (
              <a
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1 min-w-[3.5rem] py-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] leading-none">{item.label}</span>
              </a>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
