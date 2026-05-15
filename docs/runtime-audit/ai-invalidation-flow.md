# AI Invalidation Flow — Leaxaro (ETAP 6.5+)

## Trigger Chain

```
Workout synced
  → readiness recalculated
  → delta > 10 points vs pre-sync score?
    YES → archive GENERATED/DELIVERED insights
    NO  → insights remain valid
```

## checkAndInvalidateStaleInsights (stale-insight-detector.ts)

```
1. getPreSyncReadiness(userId)
   → db.DailyReadiness.findFirst({ orderBy: { date: desc } })
   → previousScore (or null if none)

2. runTrainingPeaksSync completes

3. getPostSyncReadiness(userId)
   → same query after readiness recalculation

4. If |postScore - preScore| > STALENESS_THRESHOLD (10):
   db.AIInsight.updateMany({
     where: {
       userId,
       status: { in: ['GENERATED', 'DELIVERED'] },
       date: { gte: today }
     },
     data: {
       status: 'ARCHIVED',
       archivedAt: now()
     }
   })

5. emitEvent('insight_invalidated', { userId, delta, count })
```

## AI Generation Flow (insight-engine.ts)

```
generateMorningInsight(userId, requestId, date)
  1. buildAIContext(userId, date)
     → nutrition logs, workout data, recovery metrics, goals, profile
  2. computeQuality(context)
     → AIConfidenceBreakdown { score, breakdown, canGenerate }
  3. If !canGenerate → return { ok: false, error: 'insufficient_data', fallback: true }
  4. serializeContext(context) → string (token-efficient JSON)
  5. buildPrompt(type, context, qualityReport)
  6. callAI(system, user, { model, maxTokens, operation })
     → { content, usage, model, latencyMs }
  7. extractJSON(content)
     → strips markdown fences, finds {…}
  8. Parse via Zod schema (parseMorningInsight)
     → null if malformed
  9. If null → Sentry warning + return fallback
 10. validateMorningOutput(parsed)
     → safety checks (calorie range, contradictions)
 11. persistInsight(userId, type, validated, quality, requestId)
 12. Return { ok: true, insight, persisted, latencyMs, quality }
```

## Schema Versioning (ETAP 6.75)

All AI outputs are Zod-validated against versioned schemas:
- `MorningInsightSchema` v1 (as of ETAP 5)
- `MiddayInsightSchema` v1
- `EveningInsightSchema` v1

Schema version stored on AIInsight.promptVersion field.
Old schema versions auto-archived on schema bump.

## Regeneration Triggers

| Trigger | Mechanism |
|---------|-----------|
| Stale insight (readiness delta) | stale-insight-detector.ts archival |
| Manual | /api/ai/insights route (on-demand) |
| Morning cron | /api/cron/morning-insights (6:00 UTC) |
| Midday cron | /api/cron/midday-insights (11:00 UTC) |
| Evening cron | /api/cron/evening-insights (19:00 UTC) |

## Fallback Behavior

If AI generation fails (all retries exhausted, malformed output, low quality):
- Return `{ ok: false, error, fallback: true }`
- No insight persisted
- Dashboard shows cached last-valid insight or generic fallback text
- Sentry captures exception with `operation` + `model` tags

## Known Risks

- Invalidation threshold (10 points) may be too aggressive — minor syncs could archive valid insights
- No insight regeneration trigger after invalidation (cron will regenerate at next scheduled time)
- Context compression (context-compression.ts) may lose relevant signals if token budget is tight
- AI output with `confidence < 0.4` currently shown to user with warning — could be suppressed entirely
