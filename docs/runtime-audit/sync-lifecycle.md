# Sync Lifecycle — NutriCoach (ETAP 6.5+)

## Sync Triggers

| Trigger | Path | Schedule |
|---------|------|----------|
| OAuth callback (initial) | callback/route.ts → runTrainingPeaksSync() | On connect |
| Manual | POST /api/integrations/trainingpeaks/sync | User-initiated |
| Cron hourly | /api/cron/sync-workouts | 0 * * * * |
| Webhook-triggered | /api/webhooks/trainingpeaks → runTrainingPeaksSync() | On event |

## Full Sync Cycle (runTrainingPeaksSync)

```
1. Load Integration from DB
   - If DISCONNECTED/REVOKED → return { success: false }

2. Create SyncLog { status: RUNNING }

3. Decrypt tokens (safeDecryptToken)

4. Token refresh check:
   - expiresAt - now < 15min → refreshTokens()
   - On failure → status: EXPIRED/REVOKED → throw

5. Athlete profile sync (if lastSyncAt = null OR age > 24h):
   - GET /v1/athletes/me
   - Update UserProfile (FTP, LTHR, weight, maxHR)
   - Store athleteExternalId on Integration

6. Determine sync window:
   - First sync: last 90 days
   - Incremental: lastSyncAt - 1 day (overlap)

7. Fetch workouts (GET /v1/athletes/{id}/workouts):
   - Date range: since → now
   - Returns TPWorkout[]

8. Normalize: normalizeTPWorkout() per workout
   - Maps TP fields to NutriCoach schema
   - Sport type mapping via TP_SPORT_MAP

9. Persist workouts:
   - upsert by externalId + source (workout_deduplication index)
   - Count created / updated

10. Training load recompute: recomputeTrainingLoad() [stub — delegates to daily-scores cron]

11. Adherence recalculation: computeAndPersistAdherence(userId)

12. Readiness recalculation: computeAndPersistReadiness(userId)

13. Stale insight invalidation: checkAndInvalidateStaleInsights()
    - If readiness delta > 10pts → archive GENERATED/DELIVERED insights

14. Update Integration:
    { lastSyncAt: now, nextSyncAt: now + 1h, status: ACTIVE, errorMessage: null }

15. Update SyncLog { status: SUCCESS, workoutsCreated, workoutsUpdated }

16. emitEvent('workout_synced', { userId, count })

17. Return { success: true, workoutsCreated, workoutsUpdated }
```

## Error Handling

```
Any throw inside try block:
  - SyncLog.update { status: FAILED, errorMessage, failedAt }
  - Integration.update { status: ERROR, errorMessage, errorCount++ }
  - Sentry.captureException
  - emitEvent('sync_failed', { userId, error })
  - Return { success: false, message }

Retryable errors (IntegrationError.retryable = true):
  - HTTP 5xx from TP API
  - Rate limit (429) — should retry after delay

Non-retryable:
  - TOKEN_EXPIRED / TOKEN_REVOKED — requires user re-auth
```

## getUsersDueForSync()

```
SELECT integrations WHERE:
  - provider = TRAININGPEAKS
  - status = ACTIVE
  - nextSyncAt <= now (or null)
TAKE 50 per run — bounded batch size
```

## Deduplication

Workouts deduplicated on: `(userId, externalId, source)` — Prisma unique index `workout_deduplication`.
Safe to run sync multiple times — idempotent.

## Known Risks

- No per-user sync locking: concurrent webhook + cron could run simultaneously for same user
- Sync window overlap (1 day) is conservative but generates redundant DB writes on incremental upserts
- Profile sync only triggers every 24h — FTP changes between syncs won't reflect immediately
- Training load recompute is deferred (stub) — PMC not recalculated on sync, only on daily-scores cron
