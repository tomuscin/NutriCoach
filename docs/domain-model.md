# NutriCoach — Domain Model

## Core Entities

### User
Central entity. All data belongs to a User.
- Auth via NextAuth (email/password, JWT sessions)
- One UserProfile (1:1)
- Many DailyLogs, Workouts, BodyMetrics, etc.

### UserProfile
Extended user data beyond auth.
- Physical: height, weight, sex, birthDate
- Training: FTP, LTHR
- Computed: BMR, TDEE, caloricTarget, proteinTarget
- Preferences: timezone, activityLevel

### Goal
Active reduction/maintenance/gain goal.
- One active goal at a time
- History of past goals preserved
- Defines weeklyWeightChangeKg → caloricTarget

---

## Nutrition Domain

### DailyLog (daily)
One per user per day. Core nutrition record.
- Target calories and macros (from UserProfile + Goal)
- Consumed totals (denormalized — updated when Meals change)
- Water intake
- Relations: Many Meals

### Meal
Individual eating event within a DailyLog.
- MealType: breakfast, lunch, dinner, snack, pre_workout, post_workout
- Macros: calories, protein, carbs, fat, fiber

---

## Training Domain

### Workout
Single training session.
- WorkoutType: cycling, running, swimming, strength, yoga, crossfit, triathlon, other
- Duration, distance, calories, RPE
- Training load: TSS, IF, NP, HR
- Source: manual | trainingpeaks | garmin
- externalId for deduplication

### Training Load (computed, not stored)
- ATL (7-day EWA of TSS) — Fatigue
- CTL (42-day EWA of TSS) — Fitness
- TSB = CTL - ATL — Form
- Calculated on-the-fly from Workout.tss history

---

## Body Metrics Domain

### BodyMetric (daily)
Morning weigh-in and body composition.
- weight, bodyFatPercent, muscleMassKg
- waistCm, hipCm (for waist-to-hip ratio)
- Updates UserProfile.currentWeight on save

---

## Recovery Domain

### SleepMetric (daily)
One per user per day.
- durationHours, quality (0–100)
- deepSleepHours, remSleepHours
- Source: manual | garmin

### RecoveryMetric (daily)
Morning recovery status.
- HRV (ms RMSSD — gold standard recovery marker)
- restingHr
- readinessScore (0–100 composite from RecoveryEngine)
- bodyBattery (Garmin)

---

## AI Domain

### AIInsight
Stored output of AI Coach interactions.
- Types: morning_brief, midday_check, evening_review, chat, alert
- Content preserved for history and analysis
- tokensUsed tracked for cost monitoring

---

## Integration Domain

### TPIntegration (1:1 per user)
TrainingPeaks OAuth state.
- status: connected | disconnected | error | expired
- Encrypted tokens (access + refresh)
- Sync configuration: interval, auto-sync, fromDate

### TPSyncLog (1:many per TPIntegration)
Full audit trail of every sync operation.
- workoutsSynced, workoutsFailed
- errorMessage for debugging
- dateRangeStart/End of synced period

---

## Key Business Rules

1. **Caloric target** = TDEE + daily delta from Goal.weeklyWeightChangeKg
2. **Minimum calories**: never below 1200 kcal (safety guard)
3. **Protein priority**: macro split always hits protein target first
4. **TSS deduplication**: Workout.externalId unique per source, upsert on sync
5. **Daily readiness**: calculated from HRV vs 30-day baseline + sleep + form
6. **AI briefs**: one morning/midday/evening per user per day (idempotent)
7. **Token refresh**: triggered automatically when <10 min to expiry
8. **Sync retry**: max 3 attempts with 5s delay before marking as failed

---

## Entity Relationships

```
User
├── UserProfile (1:1)
├── Goal (1:many)
├── DailyLog (1:many by date)
│   └── Meal (1:many)
├── BodyMetric (1:many by date)
├── Workout (1:many by date)
├── SleepMetric (1:1 by date)
├── RecoveryMetric (1:1 by date)
├── AIInsight (1:many)
├── Notification (1:many)
└── TPIntegration (1:1)
    └── TPSyncLog (1:many)
```
