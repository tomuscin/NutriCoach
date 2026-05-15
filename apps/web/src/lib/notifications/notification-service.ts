// Notification Service — ETAP 6
// In-app and email notifications. No push/SMS/native bridges.
// Email via Resend. In-app via DB + polling.

import 'server-only'
import { prisma as db } from '@/lib/db'
import { aiLogger } from '@/lib/logger'

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateNotificationInput = {
  userId: string
  type: string
  channel?: 'IN_APP' | 'EMAIL'
  title: string
  body: string
  data?: Record<string, unknown>
  scheduledFor?: Date
}

export type NotificationItem = {
  id: string
  type: string
  title: string
  body: string
  data: Record<string, unknown> | null
  status: string
  sentAt: string | null
  readAt: string | null
  createdAt: string
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Create an in-app notification.
 */
export async function createNotification(
  input: CreateNotificationInput,
): Promise<string> {
  const notification = await db.notification.create({
    data: {
      userId: input.userId,
      type: input.type as never,
      channel: (input.channel ?? 'IN_APP') as never,
      status: 'SENT',
      title: input.title,
      body: input.body,
      data: (input.data ?? undefined) as never,
      scheduledFor: input.scheduledFor ?? null,
      sentAt: new Date(),
    },
  })
  return notification.id
}

/**
 * Get unread in-app notifications for a user.
 */
export async function getUnreadNotifications(
  userId: string,
  limit = 20,
): Promise<NotificationItem[]> {
  const records = await db.notification.findMany({
    where: {
      userId,
      channel: 'IN_APP',
      readAt: null,
      status: { in: ['SENT', 'DELIVERED'] },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      data: true,
      status: true,
      sentAt: true,
      readAt: true,
      createdAt: true,
    },
  })

  return records.map(r => ({
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body,
    data: r.data as Record<string, unknown> | null,
    status: r.status,
    sentAt: r.sentAt?.toISOString() ?? null,
    readAt: r.readAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }))
}

/**
 * Mark notification(s) as read.
 */
export async function markNotificationsRead(
  userId: string,
  notificationIds: string[],
): Promise<number> {
  const result = await db.notification.updateMany({
    where: {
      id: { in: notificationIds },
      userId,  // security: only own notifications
    },
    data: { readAt: new Date(), status: 'READ' },
  })
  return result.count
}

/**
 * Get count of unread notifications.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return db.notification.count({
    where: {
      userId,
      channel: 'IN_APP',
      readAt: null,
      status: { in: ['SENT', 'DELIVERED'] },
    },
  })
}

/**
 * Send email notification via Resend (if configured).
 * Graceful no-op if RESEND_API_KEY is not set.
 */
export async function sendEmailNotification({
  to,
  subject,
  html,
  notificationId,
}: {
  to: string
  subject: string
  html: string
  notificationId: string
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || apiKey === 're_...') {
    aiLogger.debug({ notificationId }, 'email.skip: RESEND_API_KEY not configured')
    return false
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? 'noreply@leaxaro.app',
        to,
        subject,
        html,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      aiLogger.warn({ notificationId, status: res.status, err }, 'email.send.failed')
      await db.notification.update({
        where: { id: notificationId },
        data: { status: 'FAILED', errorMessage: err.slice(0, 200), failedAt: new Date() },
      })
      return false
    }

    await db.notification.update({
      where: { id: notificationId },
      data: { status: 'SENT', sentAt: new Date() },
    })
    return true
  } catch (err) {
    aiLogger.warn({ notificationId, err }, 'email.send.exception')
    return false
  }
}
