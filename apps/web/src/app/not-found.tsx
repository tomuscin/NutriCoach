import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 p-8 text-center">
        <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
        <h2 className="text-2xl font-semibold tracking-tight">Strona nie znaleziona</h2>
        <p className="text-muted-foreground text-sm">
          Strona, której szukasz, nie istnieje lub została przeniesiona.
        </p>
        <Link
          href="/"
          className="inline-flex items-center rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-105 transition-all hover:-translate-y-0.5 shadow-elevation-2"
        >
          Wróć do strony głównej
        </Link>
      </div>
    </div>
  )
}
