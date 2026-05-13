'use client'

// NavLink — navigation link with active state detection via usePathname
// Used in app layout sidebar and mobile bottom nav.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface NavLinkProps {
  href: string
  label: string
  icon: LucideIcon
  /** Match exactly (default false — prefix match) */
  exact?: boolean
  className?: string
  /** Render as column (mobile bottom nav) */
  vertical?: boolean
}

export function NavLink({ href, label, icon: Icon, exact = false, className, vertical = false }: NavLinkProps) {
  const pathname = usePathname()
  const isActive = exact
    ? pathname === href
    : pathname !== null && (pathname === href || pathname.startsWith(href + '/'))

  if (vertical) {
    return (
      <Link
        href={href}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'flex flex-col items-center gap-1 min-w-[3.5rem] py-1',
          'transition-colors duration-150',
          isActive
            ? 'text-primary'
            : 'text-muted-foreground hover:text-foreground',
          className,
        )}
      >
        <Icon className="h-5 w-5" />
        <span className="text-[10px] leading-none">{label}</span>
      </Link>
    )
  }

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'nav-link',
        isActive && 'active',
        className,
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      {label}
    </Link>
  )
}
