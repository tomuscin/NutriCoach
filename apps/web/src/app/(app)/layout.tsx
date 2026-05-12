// Protected app layout — requires authentication
import { requireOnboarded } from '@/lib/auth'
import { LogoutButton } from '@/components/auth/LogoutButton'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Session guard — redirects to /auth/login or /onboarding if needed
  const user = await requireOnboarded()

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
          <nav className="flex-1 p-4 space-y-1 text-sm">
            {[
              { href: '/dashboard', label: 'Dashboard' },
              { href: '/nutrition', label: 'Żywienie' },
              { href: '/workouts', label: 'Treningi' },
              { href: '/recovery', label: 'Regeneracja' },
              { href: '/ai-coach', label: 'AI Coach' },
              { href: '/analytics', label: 'Analityka' },
              { href: '/integrations', label: 'Integracje' },
              { href: '/profile', label: 'Profil' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="border-t border-border p-4 space-y-1">
            <p className="text-xs text-muted-foreground px-3 truncate">{user.email}</p>
            <LogoutButton className="w-full text-left flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm md:hidden">
            <div className="h-14 flex items-center justify-between px-4">
              <span className="font-semibold text-sm">NutriCoach</span>
              <LogoutButton className="text-xs text-muted-foreground hover:text-foreground" />
            </div>
          </header>

          <div className="container mx-auto px-4 py-6 max-w-7xl">{children}</div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background md:hidden"
        aria-label="Nawigacja dolna"
      >
        <div className="h-16 flex items-center justify-around px-4">
          {[
            { href: '/dashboard', label: 'Home' },
            { href: '/nutrition', label: 'Żyw.' },
            { href: '/workouts', label: 'Treningi' },
            { href: '/recovery', label: 'Regen.' },
            { href: '/ai-coach', label: 'AI' },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>
    </div>
  )
}
