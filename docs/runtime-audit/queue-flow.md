# Queue & Cron Flow — Leaxaro (ETAP 6.5+)

## Architecture: Vercel Cron Jobs

Leaxaro uses **Vercel Cron Jobs** (not BullMQ/Redis) for all background work.
Rationale: shared-hosting MySQL, no Redis available, serverless deployment.

All cron handlers are in `/api/cron/` and secured by `CRON_SECRET` header.

## Cron Schedule

| Route | Schedule | maxDuration | Purpose |
|-------|----------|-------------|---------|
| /api/cron/daily-scores | 0 4 * * * | 30s | Recalculate CTL/ATL/TSB, daily scores |
| /api/cron/morning-insights | 0 6 * * * | 60s | Generate morning AI insights |
| /api/cron/midday-insights | 0 11 * * * | 60s | Generate midday AI insights |
| /api/cron/evening-insights | 0 19 * * * | 60s | Generate evening AI insights |
| /api/cron/sync-tokens | */30 * * * * | 30s | Refresh expiring TP tokens |
| /api/cron/sync-workouts | 0 * * * * | 60s | Hourly TP workout sync |
| /api/cron/stale-scan | 0 */6 * * * | 30s | Cleanup expired states, stuck integrations |

## Cron Handler Pattern

```typescript
// Authorization: must be Vercel (or CRON_SECRET header)
if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
  return 401
}
// Sentry span wrapping
// Pino structured logging
// Return 200 { ok, processed, durationMs }
```

## sync-workouts flow

```
GET /api/cron/sync-workouts
  1. getUsersDueForSync() → userId[]
     WHERE provider=TP AND status=ACTIVE AND nextSyncAt <= now
     TAKE 50
  2. For each userId: runTrainingPeaksSync(userId)
     - Sequential (no parallelism — shared-hosting DB)
     - Each sync: 15-60s depending on workout count
  3. Return { processed: N, failed: N }
```

## sync-tokens flow

```
GET /api/cron/sync-tokens
  1. refreshExpiredTokens()
     WHERE provider=TP AND status=ACTIVE AND tokenExpiresAt <= now+15min
     TAKE 100
  2. For each: refreshAccessToken(refreshToken)
     - Rotate & re-encrypt
     - Update Integration
  3. Return { refreshed: N, failed: N }
```

## stale-scan flow

```
GET /api/cron/stale-scan
  1. Clean expired OAuthStates (expiresAt < now)
  2. Find integrations stuck in ERROR >24h → Sentry warning
  3. Clean processed WebhookEvents older than 7 days
  4. Return { cleaned }
```

## daily-scores flow

```
GET /api/cron/daily-scores
  1. Get all active users (with integrations or nutrition logs today)
  2. For each: calculatePerformanceManagement (CTL/ATL/TSB)
  3. computeAndPersistAdherence + computeAndPersistReadiness
  4. upsert DailyScore record
```

## Cron Overlap Risk

Vercel Cron fires at wall clock — no distributed locking. If a cron run takes
longer than its interval (e.g. sync-workouts > 1h), the next run may overlap.

**Mitigations (ETAP 6.75):**
- `nextSyncAt` field on Integration prevents double-syncing same user
- SyncLog status=RUNNING check (see runtime-risk-analysis.md)
- stale-scan detects ERROR state integrations stuck >24h

## DLQ Architecture (ETAP 6.75 target)

Since no Redis/BullMQ, DLQ is simulated with DB:
- SyncLog status=FAILED → "sync-dlq"
- WebhookEvent status=failed → "webhook-dlq"
- AIInsight with null content → "ai-dlq"
- Replay via ReplayEngine (runtime/replay-engine.ts)

## Known Risks

- maxDuration=60s on sync-workouts: if a user has 90 days of workouts (300+ records), a single sync could approach this limit
- No per-user cron isolation: one slow user blocks others in the batch (sequential)
- Vercel free tier: cron fires at UTC regardless of user timezone
- No cron failure alerting beyond Sentry (no PagerDuty / on-call)
