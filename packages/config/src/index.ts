// @nutricoach/config — Shared configuration constants

export const APP_CONFIG = {
  name: 'NutriCoach',
  version: '0.1.0',
  description: 'AI Personal Coach for nutrition, training and recovery',
} as const

// Nutrition defaults
export const NUTRITION_DEFAULTS = {
  MIN_CALORIES: 1200,
  MAX_CALORIES: 5000,
  DEFAULT_WEEKLY_LOSS_KG: 0.5,
  PROTEIN_KCAL_PER_G: 4,
  CARBS_KCAL_PER_G: 4,
  FAT_KCAL_PER_G: 9,
  KCAL_PER_KG_BODY_FAT: 7700,
} as const

// Training defaults
export const TRAINING_DEFAULTS = {
  DEFAULT_FTP: 200,           // watts — updated after onboarding
  DEFAULT_LTHR: 160,          // bpm
  ATL_TIME_CONSTANT: 7,       // days
  CTL_TIME_CONSTANT: 42,      // days
  TSS_PER_HOUR_Z2: 50,
} as const

// Recovery defaults
export const RECOVERY_DEFAULTS = {
  OPTIMAL_SLEEP_HOURS: 8,
  MIN_SLEEP_HOURS: 6,
  HRV_BASELINE_DAYS: 30,
} as const

// AI defaults
export const AI_DEFAULTS = {
  MORNING_BRIEF_HOUR: 6,
  MIDDAY_CHECK_HOUR: 12,
  EVENING_REVIEW_HOUR: 21,
  DEFAULT_TIMEZONE: 'Europe/Warsaw',
  MAX_CONTEXT_TOKENS: 4000,
} as const

// Sync intervals
export const SYNC_CONFIG = {
  TP_SYNC_INTERVAL_HOURS: 6,
  GARMIN_SYNC_INTERVAL_HOURS: 6,
  TOKEN_REFRESH_THRESHOLD_MINUTES: 10,
  SYNC_RETRY_ATTEMPTS: 3,
  SYNC_RETRY_DELAY_MS: 5000,
} as const

// Redis / BullMQ
export const REDIS_CONFIG = {
  DEFAULT_PORT: 6379,
  MAX_RETRIES_PER_REQUEST: null,  // Required by BullMQ
  CONNECT_TIMEOUT_MS: 10_000,
  IDLE_TIMEOUT_MS: 30_000,
} as const

// Queue job delays — AI brief scheduling (UTC offsets for Europe/Warsaw)
// These are hour-of-day values in the user's configured timezone
export const QUEUE_SCHEDULE = {
  MORNING_BRIEF_HOUR: 6,          // 06:30
  MORNING_BRIEF_MINUTE: 30,
  MIDDAY_CHECK_HOUR: 12,          // 12:00
  MIDDAY_CHECK_MINUTE: 0,
  EVENING_REVIEW_HOUR: 21,        // 21:00
  EVENING_REVIEW_MINUTE: 0,
  MAX_DELAY_MS: 86_400_000,       // 24h cap on scheduled delays
} as const

// Pagination limits
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  CURSOR_PAGE_SIZE: 50,
} as const

// Excel import limits
export const IMPORT_LIMITS = {
  MAX_FILE_SIZE_MB: 10,
  MAX_ROWS: 3650,               // ~10 years of daily data
  BATCH_SIZE: 50,
  SUPPORTED_EXTENSIONS: ['.xlsx', '.xls'] as const,
} as const
