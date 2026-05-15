# Webhook Lifecycle — Leaxaro (ETAP 6.5+)

## Inbound Webhook Path

```
TrainingPeaks → POST /api/webhooks/trainingpeaks
  ↓
  1. Read raw body (text)
  2. Extract x-trainingpeaks-signature header
  3. If TRAININGPEAKS_WEBHOOK_SECRET set:
       HMAC-SHA256(rawBody, secret)
       timingSafeEqual(computed, provided)
       If mismatch → 401 Invalid signature
  4. JSON.parse(rawBody)
     If invalid → 400 Invalid JSON
  5. Extract athleteId + eventType from payload
  6. db.WebhookEvent.create({
       provider, eventType, athleteExternalId,
       payload (Json), signature, status: 'pending'
     })
  7. emitEvent('webhook_received', { provider, eventType, athleteId })
  8. Respond 200 { ok: true, id } immediately (< 5s SLA)
  9. Lookup Integration by athleteExternalId (status: ACTIVE)
 10. If found: runTrainingPeaksSync(userId) — non-blocking promise
       .then → WebhookEvent.update { status: 'processed', processedAt }
       .catch → WebhookEvent.update { status: 'failed', errorMessage, retryCount++ }
 11. If not found: WebhookEvent.update { status: 'processed' }
```

## WebhookEvent Model

```
id               cuid
provider         IntegrationProvider
eventType        String  (workout_created | workout_updated | ...)
athleteExternalId String?
payload          Json
signature        String? (audit trail)
status           pending | processed | failed
processedAt      DateTime?
errorMessage     String?
retryCount       Int (default 0)
createdAt        DateTime
```

## Duplicate / Replay Detection (ETAP 6.75)

See [webhook-replay-protection] in `src/lib/runtime/webhook-deduplication.ts`:
- Deduplication window: 24 hours
- Hash: SHA-256(provider + eventType + athleteId + JSON.stringify(payload))
- Lookup in WebhookEvent by payloadHash within window
- Duplicate → 200 { ok: true, duplicate: true } (idempotent)

## Lifecycle States

```
pending   → webhook received, processing in flight
processed → sync triggered successfully OR unknown athlete (no-op)
failed    → sync threw, retryCount incremented
```

## Retry Mechanism

Failed webhooks are currently **not auto-retried** — they are inspectable via:
- SyncLog (correlated by userId/integrationId)
- WebhookEvent table (status=failed, errorMessage)
- Replay via /api/runtime/replay (ETAP 6.75)

## Cleanup

stale-scan cron (0 */6 * * *) cleans:
- Processed WebhookEvents older than 7 days
- (Failed events are retained indefinitely for audit)

## Security Properties

| Property | Implementation |
|----------|---------------|
| Signature validation | HMAC-SHA256 + timing-safe compare |
| Secret optional | If TRAININGPEAKS_WEBHOOK_SECRET not set, validation skipped (dev only) |
| Replay attack | Deduplication hash + 24h window (ETAP 6.75) |
| Audit trail | signature stored on WebhookEvent |
| Payload size | No explicit limit — TODO: add 1MB cap |

## Known Risks

- No replay auto-retry: failed webhooks require manual replay
- athleteExternalId nullable: if TP omits it, webhook silently processes as no-op
- Non-blocking sync means response 200 before sync completes — client can't know sync result
- No webhook registration management API (no /api/webhooks/register)
