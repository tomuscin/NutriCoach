'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const nav = [
  {
    label: 'Roadmap',
    href: '/roadmap',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 4h12M2 8h8M2 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'Execution Logs',
    href: '/logs',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 6h6M5 9h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'Decisions',
    href: '/decisions',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 2L14 14H2L8 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M8 7v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="12" r="0.5" fill="currentColor" />
      </svg>
    ),
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 flex-shrink-0 border-r border-bg-border flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-bg-border">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-accent flex items-center justify-center flex-shrink-0">
            <span className="text-white text-2xs font-semibold leading-none">P</span>
          </div>
          <div>
            <p className="text-text-primary text-sm font-medium leading-tight">PMOS</p>
            <p className="text-text-tertiary text-2xs leading-tight">Leaxaro</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors
                ${active
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                }
              `}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-bg-border">
        <p className="text-text-tertiary text-2xs">Project Memory OS</p>
        <p className="text-text-tertiary text-2xs">v0.1.0</p>
      </div>
    </aside>
  )
}
