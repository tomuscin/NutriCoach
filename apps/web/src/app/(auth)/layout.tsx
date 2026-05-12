export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-brand-950/10 dark:to-brand-950/30">
      {children}
    </main>
  )
}
