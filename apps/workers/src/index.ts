// NutriCoach Workers — Background Jobs Registry
// 
// JOBS PLANNED:
// ─────────────────────────────────────────────────────────────────────
// 1. AI_MORNING_BRIEF     — runs at 06:30 per user timezone (ETAP 7)
//    - builds UserContext from yesterday's data
//    - generates morning briefing via OpenAI
//    - stores AIInsight to DB
//    - triggers push notification
//
// 2. AI_MIDDAY_CHECK      — runs at 12:00 per user timezone (ETAP 7)
//    - quick check of morning intake vs target
//    - short AI insight
//
// 3. AI_EVENING_REVIEW    — runs at 21:00 per user timezone (ETAP 7)
//    - full day summary
//    - stores daily metrics snapshot
//
// 4. TP_SYNC              — runs every 6h for connected users (ETAP 9)
//    - fetches new workouts from TrainingPeaks
//    - upserts Workout records
//    - updates training load metrics (TSS, ATL, CTL)
//    - logs to TPSyncLog
//
// 5. GARMIN_SYNC          — runs every 6h for connected users (ETAP 10)
//    - fetches activities, sleep, HRV
//    - upserts RecoveryMetric + SleepMetric
//
// 6. NOTIFICATION_DIGEST  — runs daily at 18:00 (ETAP 8)
//    - sends daily summary email if user opted in
//
// IMPLEMENTATION OPTIONS (choose in ETAP 5):
// - Vercel Cron Jobs (simplest, serverless)
// - Render background workers (for heavier compute)
// - BullMQ + Redis (most flexible, requires Redis)

console.log('NutriCoach Workers — job registry initialized')
console.log('Workers implementation: ETAP 5–9')

export const JOB_REGISTRY = {
  AI_MORNING_BRIEF: 'ai:morning-brief',
  AI_MIDDAY_CHECK: 'ai:midday-check',
  AI_EVENING_REVIEW: 'ai:evening-review',
  TP_SYNC: 'integration:tp-sync',
  GARMIN_SYNC: 'integration:garmin-sync',
  NOTIFICATION_DIGEST: 'notification:daily-digest',
} as const

export type JobName = (typeof JOB_REGISTRY)[keyof typeof JOB_REGISTRY]
