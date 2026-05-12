# Notification Architecture — NutriCoach ETAP 7

## Overview

NutriCoach has a two-channel notification system:
1. **In-app notifications** — stored in DB, shown in Notification Center (`/notifications`)
2. **Push notifications** — browser Web Push API via VAPID, delivered via service worker

## In-App Notifications

### Database Schema

```prisma
model Notification {
  id        String             @id @default(cuid())
  userId    String
  type      NotificationType
  title     String
  body      String?
  data      Json?
  channel   NotificationChannel
  status    NotificationStatus @default(UNREAD)
  readAt    DateTime?
  createdAt DateTime           @default(now())
  user      User               @relation(fields: [userId], references: [id])
}

enum NotificationType {
  MORNING_BRIEF
  INSIGHT_READY
  SYNC_COMPLETE
  SYNC_FAILED
  MILESTONE_REACHED
  STREAK_AT_RISK
  RECOVERY_ALERT
  SYSTEM
  WELCOME
}

enum NotificationChannel {
  IN_APP
  EMAIL
  PUSH
}

enum NotificationStatus {
  UNREAD
  READ
  ARCHIVED
}
```

### Notification Center UI

- Route: `/notifications`
- Component: `NotificationsClient.tsx`
- Shows: last 50 notifications (IN_APP + EMAIL)
- Groups by date: Dzisiaj / Wczoraj / DD Month YYYY
- Mark as read: `PATCH /api/notifications/{id}/read`
- Mark all as read: `PATCH /api/notifications/read-all`

### Creating Notifications (server-side)

```ts
await prisma.notification.create({
  data: {
    userId,
    type: 'MORNING_BRIEF',
    title: 'Twój poranny brief jest gotowy',
    body: 'Masz dziś trening siłowy. Oto Twoje zalecenia...',
    channel: 'IN_APP',
    data: { briefId: '...' },
  }
})
```

## Push Notifications

### VAPID Setup

Keys are stored in `.env.local`:
- `VAPID_PUBLIC_KEY` — server-side key (private)
- `VAPID_PRIVATE_KEY` — server-side signing key
- `VAPID_SUBJECT` — `mailto:` contact for push services
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — exposed to browser for subscription

### Subscription Lifecycle

```
User visits Settings → Notifications tab
  → usePushNotifications() hook checks Notification.permission
  → if 'default': show "Enable push" button
  → onClick: Notification.requestPermission()
  → if granted: pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC_KEY })
  → POST /api/push/subscribe { subscription: sub.toJSON() }
      → prisma.pushSubscription.upsert({ endpoint })
      → prisma.userPreferences.update({ pushNotifications: true })
  
User disables:
  → DELETE /api/push/unsubscribe { endpoint }
      → prisma.pushSubscription.updateMany({ isActive: false, revokedAt: now })
      → await subscription.unsubscribe()
```

### Database Schema

```prisma
model PushSubscription {
  id          String    @id @default(cuid())
  userId      String
  endpoint    String    @db.Text
  p256dh      String
  auth        String
  deviceLabel String?
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  lastUsedAt  DateTime?
  revokedAt   DateTime?
  user        User      @relation(fields: [userId], references: [id])
}
```

### Service Worker Push Handler

`public/sw.js` handles `push` events:
- Parses JSON payload `{ title, body, tag, data, actions, requireInteraction }`
- Shows `self.registration.showNotification(title, options)`
- `notificationclick` → focuses existing window or opens `data.url` (defaults to `/dashboard`)
- `pushsubscriptionchange` → re-subscribes automatically on key rotation

### Sending Push (TODO — web-push package needed)

```ts
// Future: src/lib/push/send-push.ts
import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

async function sendPushToUser(userId: string, payload: PushPayload) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId, isActive: true }
  })
  for (const sub of subscriptions) {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    ).catch(async (err) => {
      if (err.statusCode === 410) {
        // Subscription expired
        await prisma.pushSubscription.update({
          where: { id: sub.id },
          data: { isActive: false, revokedAt: new Date() }
        })
      }
    })
  }
}
```

Note: `web-push` npm package is not yet installed. Install with:
```
cd apps/web && npm install web-push && npm install -D @types/web-push
```
