# Retention Events — NutriCoach Analytics

## Overview

All product analytics use a single `trackEvent()` function writing to the `AnalyticsEvent` table. Events are fire-and-forget — never block user flows.

## trackEvent API

```ts
import { trackEvent } from '@/lib/analytics/events'

// Never await — fire and forget
trackEvent({
  userId: session.user.id,    // optional for anonymous events
  sessionId: undefined,       // optional
  event: 'dashboard.viewed',  // ProductEvent type
  properties: { source: 'mobile' },  // optional JSON
  page: '/dashboard',         // optional
  ip: '1.2.3.4',              // optional, from request headers
  userAgent: 'Mozilla/...',   // optional
})
```

## ProductEvent Types

### Registration & Auth
| Event | Trigger |
|-------|---------|
| `registration.completed` | User registers successfully |
| `email.verified` | User clicks verification email link |
| `login.success` | Successful login |
| `login.failed` | Failed login attempt |
| `password.reset_requested` | Forgot password submitted |
| `password.reset_completed` | New password set |

### Onboarding
| Event | Trigger |
|-------|---------|
| `onboarding.step_completed` | Each wizard step advanced |
| `onboarding.completed` | All 7 steps finished |

### TrainingPeaks Integration
| Event | Trigger |
|-------|---------|
| `tp.connect_started` | User clicks "Connect TP" |
| `tp.connect_completed` | OAuth callback success |
| `tp.sync_triggered` | Manual sync button |
| `tp.sync_completed` | Sync job finished |
| `tp.disconnect` | User disconnects TP |

### AI Insights
| Event | Trigger |
|-------|---------|
| `insight.viewed` | User opens an insight card |
| `insight.feedback_positive` | Thumbs up |
| `insight.feedback_negative` | Thumbs down |
| `morning_brief.generated` | Daily brief created |
| `morning_brief.opened` | Brief notification opened |

### Retention
| Event | Trigger |
|-------|---------|
| `dashboard.viewed` | Dashboard page load |
| `session.started` | New authenticated session |
| `push_notification.subscribed` | Browser push subscription saved |
| `push_notification.unsubscribed` | Push subscription revoked |

### Settings
| Event | Trigger |
|-------|---------|
| `settings.preferences_updated` | PATCH /api/settings/preferences |
| `settings.notifications_toggled` | Push/email toggle |

## Funnel Queries

```ts
import { getOnboardingFunnel, getRetentionEvents } from '@/lib/analytics/events'

// Onboarding conversion funnel — last 30 days
const funnel = await getOnboardingFunnel(30)
// Returns: { 'registration.completed': 142, 'onboarding.completed': 89, ... }

// Retention overview — last 7 days
const retention = await getRetentionEvents(7)
// Returns: { 'dashboard.viewed': 487, 'morning_brief.opened': 203, ... }
```

## Database Schema

```prisma
model AnalyticsEvent {
  id         String    @id @default(cuid())
  userId     String?
  sessionId  String?
  event      String
  properties Json?
  page       String?
  userAgent  String?
  ip         String?
  createdAt  DateTime  @default(now())

  @@index([event, createdAt])
  @@index([userId, event])
  @@index([createdAt])
  @@map("analytics_events")
}
```

## Privacy

- `userId` is nullable — anonymous events (pre-login) have no userId
- `ip` is stored for fraud detection only — consider hashing in production
- `analyticsEnabled` in `UserPreferences` — if false, skip all events for that user (TODO: enforce in trackEvent)
