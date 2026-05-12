'use client'

// LogoutButton — triggers server-side signOut via server action

import { logoutAction } from '@/lib/actions/auth'
import { useTransition } from 'react'

interface LogoutButtonProps {
  className?: string
  children?: React.ReactNode
}

export function LogoutButton({ className, children }: LogoutButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handleLogout() {
    startTransition(async () => {
      await logoutAction()
    })
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      className={className}
    >
      {isPending ? 'Wylogowywanie...' : (children ?? 'Wyloguj się')}
    </button>
  )
}
