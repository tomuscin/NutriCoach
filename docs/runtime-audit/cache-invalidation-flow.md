# Cache Invalidation Flow — Leaxaro (ETAP 6.5+)

## Cache Layer

Leaxaro uses **Next.js built-in cache** (fetch cache + React cache) with tag-based invalidation.
No Redis, no in-memory LRU — all Next.js Data Cache.

## Cache Tags

```typescript
// src/lib/cache.ts
CACHE_TAGS = {
  DASHBOARD: 'dashboard',       // revalidate: 300s
  NUTRITION: 'nutrition',
  BODY_METRICS: 'body-metrics',
  TRAINING: 'training',
  RECOVERY: 'recovery',
  AI_INSIGHTS: 'ai-insights',
  GOALS: 'goals',
  PROFILE: 'profile',
}
```

## Invalidation Triggers

| Action | Tags Invalidated |
|--------|-----------------|
| Excel import | DASHBOARD, NUTRITION, BODY_METRICS, TRAINING, RECOVERY |
| Workout synced | DASHBOARD, TRAINING, RECOVERY |
| Readiness recalculated | DASHBOARD, RECOVERY |
| AI insight generated | AI_INSIGHTS, DASHBOARD |
| Profile update | PROFILE, DASHBOARD |
| Goal update | GOALS, DASHBOARD |

## Invalidation Mechanism

```typescript
// Server Action or API route after mutation:
import { revalidateTag } from 'next/cache'
revalidateTag(CACHE_TAGS.DASHBOARD)
revalidateTag(CACHE_TAGS.TRAINING)
```

## Per-User Cache Isolation

Next.js Data Cache is process-local and keyed by fetch URL.
User isolation is achieved by including `userId` in the fetch URL/key.

```typescript
// Server Component — uses unstable_cache with userId
const data = await unstable_cache(
  () => getDashboardData(userId),
  [`dashboard:${userId}`],
  { tags: [CACHE_TAGS.DASHBOARD], revalidate: DASHBOARD_REVALIDATE_SECONDS }
)()
```

## Post-Sync Cache Invalidation

After `runTrainingPeaksSync`:
1. TRAINING tag invalidated → next Dashboard load refetches workout data
2. RECOVERY tag invalidated → recovery metrics refreshed
3. DASHBOARD tag invalidated → full dashboard refetch

## Cache Hardening (ETAP 6.75)

### Version-aware cache keys
```
`dashboard:${userId}:v${CACHE_VERSION}`
```
Bumping CACHE_VERSION in env invalidates all user caches without DB change.

### Stale-while-revalidate
Dashboard: `revalidate: 300` (5 min) — stale data served while revalidation runs.
AI Insights: `revalidate: 600` (10 min) — insights don't change mid-session.

### Forced invalidation endpoint
POST /api/cache/invalidate (admin only) — calls revalidateTag for specified tags.

### Corruption detection
If dashboard data fails Zod parse → fallback to DB direct fetch, log `cache.corruption`.

## Known Risks

- Vercel serverless: Data Cache is per-instance — multiple instances may serve stale data until each revalidates
- No global cache bust without `CACHE_VERSION` env var change (requires redeployment)
- AI insights cached for 10min — user may see invalidated insight for up to 10min after sync
- No cache metrics (hit rate, miss rate) — added in ETAP 6.75 metrics.ts
