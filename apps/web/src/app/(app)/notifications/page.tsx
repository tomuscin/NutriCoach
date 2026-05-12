// Notifications page — /notifications
// Shows all in-app notifications grouped by date, with mark-as-read

import type { Metadata } from 'next'
import { requireOnboarded } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NotificationsClient } from '@/components/notifications/NotificationsClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Powiadomienia',
}

export default async function NotificationsPage() {
  const user = await requireOnboarded()

  const notifications = await prisma.notification.findMany({
    where: {
      userId: user.id,
      channel: { in: ['IN_APP', 'EMAIL'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      type: true,
      status: true,
      title: true,
      body: true,
      data: true,
      readAt: true,
      createdAt: true,
    },
  })

  const unreadCount = notifications.filter(n => !n.readAt).length

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Powiadomienia</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">{unreadCount} nieprzeczytane</p>
          )}
        </div>
      </div>
      <NotificationsClient initialNotifications={notifications} />
    </div>
  )
}
