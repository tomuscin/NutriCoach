# NutriCoach — AI Coach

## Concept

The AI Coach is the core differentiator of NutriCoach.
It operates as a **proactive, data-driven personal coach** — not a generic chatbot.

Key principle: **AI speaks from data, not from generalizations.**
Every message is grounded in the user's actual numbers (calories, TSS, HRV, weight trend, sleep).

---

## Three Daily Touchpoints

### 1. Morning Brief (06:30)
**Trigger**: Scheduled worker, per user timezone
**Data used**: yesterday's log, sleep, recovery, today's planned workout
**Output**: 3 paragraphs
1. Yesterday summary (calorie balance, sleep quality)
2. Today's targets (calories, protein, training plan)
3. One concrete insight or recommendation

### 2. Midday Check-in (12:00)
**Trigger**: Scheduled worker, per user timezone
**Data used**: morning intake (meals logged so far), TSB/form
**Output**: 2 paragraphs
1. Progress vs daily target
2. One practical tip for the afternoon

### 3. Evening Review (21:00)
**Trigger**: Scheduled worker, per user timezone
**Data used**: full day log, workout, HRV trend
**Output**: 3 paragraphs
1. Day summary (balance: calories, protein, training load)
2. One area for improvement
3. Recovery tip / preparation for tomorrow

---

## AI Coach Chat

**Trigger**: User sends a message
**Data used**: UserContext (full profile snapshot)
**Output**: Streamed response (SSE)
**Safety**: checkMessageSafety() before every call

---

## Context Building

The `buildUserContext()` function assembles:

```typescript
UserContext = {
  // Identity & goals
  userId, name, goal, currentWeight, targetWeight, tdee, caloricTarget

  // Today's data
  today: { date, caloriesConsumed, caloriesFromTraining, proteinConsumed }

  // Last workout
  lastWorkout: { date, type, duration, tss }

  // Recovery
  recovery: { sleepHours, sleepQuality, hrv, readiness }

  // 7-day trends
  trends: { weightLast7Days, caloriesLast7Days, tssLast7Days }

  // Integration status
  integrations: { trainingPeaksConnected, garminConnected }
}
```

Context is serialized to a compact string to minimize tokens.

---

## Token Management

| Task | Model | Budget |
|------|-------|--------|
| Morning Brief | GPT-4o | 1200 tokens |
| Midday Check | GPT-4o-mini | 600 tokens |
| Evening Review | GPT-4o | 1000 tokens |
| Chat response | GPT-4o-mini | 800 tokens |
| Meal analysis | GPT-4o-mini | 500 tokens |
| Training analysis | GPT-4o | 700 tokens |

---

## Safety Layer

All user messages pass through `checkMessageSafety()` before LLM call:
1. Prompt injection detection (pattern matching)
2. Off-topic detection (medical diagnoses, clinical topics)
3. Input sanitization and length capping (2000 chars)

AI is configured to decline medical advice and refer to specialists.

---

## Storage

Every AI interaction is stored in `AIInsight`:
- Content preserved (for history view)
- tokensUsed tracked (for cost monitoring)
- promptHash for deduplication (no duplicate briefs)
- One morning/midday/evening per user per day (idempotent)

---

## Architecture (ETAP 7 Implementation Plan)

```
API Route: POST /api/ai/coach
    ↓
sanitizeInput()
checkMessageSafety()
    ↓
buildUserContext(userId, today)
    ↓
serializeContext(context) → compact string
    ↓
selectSystemPrompt(type)
    ↓
openai.chat.completions.create({ stream: true })
    ↓
StreamingTextResponse → Client
    ↓
onComplete → storeAIInsight(userId, content, tokensUsed)
```

---

## Future Enhancements (v2)

- **Alert system**: AI detects anomalies (sudden HRV drop, calorie debt, overreaching) → push notification
- **Weekly report**: PDF summary with charts
- **Goal coaching**: adaptive weekly target adjustment based on progress
- **Meal suggestions**: context-aware meal recommendations for remaining macros
- **Training advice**: readiness-based training load recommendation
