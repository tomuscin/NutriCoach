# Leaxaro — Integrations

## TrainingPeaks

### Purpose
Import training data: workouts, TSS, HR, power, FTP, planned workouts.
Optional integration — app is fully functional without it.

### OAuth 2.0 + PKCE Flow

```
User clicks "Connect TrainingPeaks"
    ↓
GET /api/integrations/trainingpeaks/connect
    ↓
Generate PKCE: codeVerifier + codeChallenge (SHA-256)
Store codeVerifier + state in session
    ↓
Redirect → TrainingPeaks OAuth
    ↓
User authorizes
    ↓
GET /api/integrations/trainingpeaks/callback?code=...&state=...
    ↓
Validate state (CSRF protection)
Exchange code for tokens (with codeVerifier)
    ↓
Store tokens encrypted in TPIntegration
Update status → CONNECTED
    ↓
Trigger first sync (background)
    ↓
Redirect → /integrations?connected=trainingpeaks
```

### Token Management
- Access token: short-lived (expires in minutes–hours)
- Refresh token: long-lived
- Auto-refresh: checked before every API call
- Threshold: refresh if <10 min to expiry
- On refresh failure: status → EXPIRED, notify user

### Sync Architecture

```
Trigger: Cron (every 6h) OR Manual (POST /api/.../sync)
    ↓
Fetch user's TPIntegration record
Check token validity, refresh if needed
    ↓
Determine sync range (lastSyncAt → now, max 30 days)
    ↓
TP API: GET /v1/workouts?from={}&to={}
    ↓
For each workout:
  - Map TPWorkout → Workout (our schema)
  - upsert by externalId (idempotent)
    ↓
Fetch athlete profile (FTP update)
    ↓
Update TPIntegration.lastSyncAt
Write TPSyncLog (success/failed/partial)
```

### Data Mapped from TrainingPeaks

| TP Field | Leaxaro Field |
|----------|-----------------|
| workoutId | Workout.externalId |
| startTime | Workout.date |
| totalTime | Workout.durationMinutes |
| calories | Workout.caloriesBurned |
| tss | Workout.tss |
| intensityFactor | Workout.intensityFactor |
| normalizedPower | Workout.normalizedPower |
| averageHeartRate | Workout.avgHr |
| workoutType | Workout.type (mapped) |
| title | Workout.title |
| athlete.ftp | UserProfile.ftp |

### Retry Logic
- 3 attempts with exponential backoff (5s, 15s, 45s)
- On final failure: status → ERROR, write TPSyncLog with errorMessage
- Rate limiting: respect TP API rate limits (check headers)

---

## Garmin Connect (ETAP 10 — Future)

### Purpose
Import: activities, sleep, HRV, Body Battery, stress, SpO2.

### OAuth 2.0 Flow
Similar to TrainingPeaks. Garmin uses OAuth 1.0a (legacy) or OAuth 2.0 depending on API tier.

### Data Mapped from Garmin

| Garmin Field | Leaxaro Field |
|-------------|-----------------|
| activity.durationInSeconds | Workout.durationMinutes |
| activity.activeKilocalories | Workout.caloriesBurned |
| activity.averageHeartRate | Workout.avgHr |
| sleep.durationInSeconds | SleepMetric.durationHours |
| sleep.deepSleepInSeconds | SleepMetric.deepSleepHours |
| sleep.remSleepInSeconds | SleepMetric.remSleepHours |
| bodyBattery.charged | RecoveryMetric.bodyBattery |
| hrv (from sleep) | RecoveryMetric.hrv |

---

## Excel Import (ETAP 3)

### Purpose
One-time historical data import from user's existing Excel spreadsheet.
File: `redukcjaod 04.05.2026.xlsx`

### Flow
```
Upload Excel file via admin UI / script
    ↓
parseExcelFile() → ExcelDailyRow[]
    ↓
Validate each row (FIELD_VALIDATORS)
    ↓
Map via EXCEL_COLUMN_MAP
    ↓
Upsert DailyLog per date (idempotent)
Upsert BodyMetric per date (weight)
Upsert Workout per date if training data present
    ↓
Report: N imported, N skipped, N errors
```

### Column Map (to verify against actual Excel)
Located in: `apps/web/src/lib/imports/column-map.ts`
Update after opening the Excel file and confirming header names.
