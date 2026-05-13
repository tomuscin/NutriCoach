// Protected app layout — requires authentication
import { requireOnboarded } from '@/lib/auth'
import { LogoutButton } from '@/components/auth/LogoutButton'
import { PageTransition } from '@/components/providers/PageTransition'
import { InstallPrompt } from '@/components/pwa/InstallPrompt'
import { PWADiagnostics } from '@/components/pwa/PWADiagnostics'
import { AppSidebarNav, AppBottomNav } from '@/components/layout/AppNav'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOnboarded()

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

          <AppSidebarNav email={user.email ?? ''} />

          <div className="border-t border-border px-3 py-3">
            <LogoutButton className="w-full text-left flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" />
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto scroll-contain-y">
          {/* Mobile header — glass effect */}
          <header className="sticky top-0 z-40 border-b border-border glass md:hidden">
            <div className="h-14 flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground text-[10px] font-bold">N</span>
                <span className="font-semibold text-sm">NutriCoach</span>
              </div>
              <div className="flex items-center gap-1">
                <a href="/notifications" className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" aria-label="Powiadomienia">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                </a>
                <a href="/settings" className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" aria-label="Ustawienia">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </a>
              </div>
            </div>
          </header>

          <div className="container mx-auto px-4 py-6 pb-24 max-w-7xl md:pb-6">
            <PageTransition>
              {children}
            </PageTransition>
          </div>
        </main>
      </div>

      {/* ── Mobile bottom nav ──────────────────────────────────── */}
      <nav
        className="fixed bottom-0 inset-x-0 z-50 border-t border-border glass-strong safe-area-inset-bottom md:hidden select-none-nav"
        aria-label="Nawigacja dolna"
      >
        <AppBottomNav />
      </nav>

      {/* ── PWA: floating install banner (above bottom nav, client-only) ─ */}
      <InstallPrompt />

      {/* ── PWA: dev-only diagnostics panel ─────────────────────── */}
      {process.env.NODE_ENV === 'development' && <PWADiagnostics />}
    </div>
  )
}
