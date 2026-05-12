# Runtime Risk Analysis — NutriCoach (ETAP 6.5+)

Updated: 2026-05-12
Status: Pre-production / ETAP 6.75 hardening

---

## CRITICAL RISKS (must fix before first real users)

### R-01: No sync concurrency guard
**Impact:** Two concurrent syncs (webhook + cron) for same user can cause duplicate workout writes and double adherence/readiness recalculation.
**Mitigation (partial):** `workout_deduplication` unique index prevents duplicates at DB level. But double readiness recalc wastes resources and can emit double invalidation events.
**Fix:** Check SyncLog for RUNNING status before starting new sync. Skip if already running.

### R-02: Token encryption key has no rotation mechanism
**Impact:** If INTEGRATION_ENCRYPTION_KEY is leaked, all stored tokens are compromised. No way to rotate without re-auth all users.
**Fix:** Add key version prefix to encrypted tokens (`v1:iv:tag:cipher`). Support multi-key decryption.

### R-03: Webhook signature verification optional
**Impact:** If TRAININGPEAKS_WEBHOOK_SECRET not set, any actor can send fake webhooks triggering syncs.
**Fix:** Enforce signature validation in production (check NODE_ENV or VERCEL_ENV). Log warning if secret not configured.

### R-04: OpenAI timeout not per-request-type
**Impact:** 30s global timeout. Morning insight (complex) and midday insight (simple) share the same timeout. Slow responses can block cron slot.
**Fix:** Per-operation timeout config (MORNING: 45s, MIDDAY: 20s, EVENING: 30s).

### R-05: No sync locking → maxDuration risk
**Impact:** sync-workouts cron with 50 users @ up to 60s each = 3000s total. maxDuration=60s on Vercel will kill the cron mid-run.
**Fix:** Process max 3 users per cron run, or implement partial-batch with cursor.

---

## HIGH RISKS

### R-06: DB deadlock on concurrent upserts
**Impact:** Multiple syncs writing to `workouts` table simultaneously can cause MySQL deadlocks.
**Mitigation (partial):** Prisma auto-retries on P2034 (deadlock).
**Fix:** Add explicit retry loop for upsert operations.

### R-07: AI malformed JSON — no raw snapshot in logs
**Impact:** If OpenAI returns malformed JSON, it's logged as an error but the raw response is not stored for debugging.
**Fix:** Log raw AI response content on parse failure (with PII scrubbing).

### R-08: Cron overlap not detected
**Impact:** If morning-insights cron takes >1h (unlikely), the next run fires without knowing previous is running.
**Fix:** ETAP 6.75 metrics track cron execution duration and alert on overlap.

### R-09: WebhookEvent.retryCount increments but no auto-retry
**Impact:** Failed webhooks pile up in `failed` status with no recovery path except manual replay.
**Fix:** stale-scan cron should retry failed webhooks up to 3 times.

### R-10: OAuthState not cleaned on user deletion
**Impact:** Deleted users' OAuth states remain in DB until stale-scan cleans them (up to 6h after expiry).
**Severity:** Low (states are expired — harmless). Fix as part of user deletion cascade.

---

## MEDIUM RISKS

### R-11: pino redact may miss nested token fields
**Impact:** A non-standard log object shape could leak token fragments.
**Fix:** Review redact paths. Add `'**.accessToken'`, `'**.refreshToken'` to redact list.

### R-12: TP API has no retry-after header on 429
**Impact:** Rate limit hit → IntegrationError RATE_LIMITED → sync marked failed. No backoff.
**Fix:** Check Retry-After header or use fixed 60s backoff on 429.

### R-13: Insight quality gate (canGenerate=false) has no user notification
**Impact:** User expects morning insight at 6am but gets nothing. No feedback in UI.
**Fix:** Add "Insufficient data" state to coaching feed.

### R-14: Excel import and TP sync can conflict on workout data
**Impact:** User imports workouts manually, then TP syncs same workouts with different field values.
**Dedup:** `source` field on Workout distinguishes MANUAL vs TRAININGPEAKS — no conflict.
**Risk:** User manually edits a synced workout → next sync overwrites it.

### R-15: No rate limiting on webhook endpoint
**Impact:** DoS via repeated POST to /api/webhooks/trainingpeaks.
**Fix:** IP-based rate limit: 100 req/min per IP.

---

## LOW RISKS

### R-16: Vercel cron fired at UTC — user timezone mismatch
Morning insights fire at 6:00 UTC — Polish users (UTC+2) see insights at 8:00 local.
Adjust cron to 4:00 UTC for early risers in CET.

### R-17: no TRAININGPEAKS_REDIRECT_URI validation
OAuth redirect URI is taken from env. If misconfigured, OAuth will fail silently.
Add startup validation of required env vars.

### R-18: stale-scan DOES NOT retry failed syncs
Current stale-scan only cleans. It should optionally trigger retry for integrations stuck in ERROR for <24h.

---

## RUNTIME RESILIENCE SCORE (pre-ETAP 6.75)

| Category | Score | Notes |
|----------|-------|-------|
| OAuth lifecycle | 7/10 | CSRF protection ✓, token encryption ✓, no key rotation |
| Sync reliability | 6/10 | Dedup ✓, no concurrency guard, batch size risk |
| Webhook security | 6/10 | HMAC ✓ but optional, no replay protection yet |
| AI resilience | 7/10 | Zod ✓, retries ✓, no raw snapshot on failure |
| Observability | 7/10 | Sentry + pino ✓, no metrics dashboard |
| Cache correctness | 7/10 | Tag invalidation ✓, no version strategy |
| Queue/cron | 6/10 | Vercel cron ✓, no overlap detection, batch risk |
| Security | 7/10 | Encryption ✓, redaction ✓, webhook sig optional |

**Overall: 6.4/10 — not production-ready for real users**
**Target after ETAP 6.75: 8.5/10**
