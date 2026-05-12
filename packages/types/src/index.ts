// @nutricoach/types — Shared TypeScript definitions v2
// Single source of truth for all domain types across apps and packages
// Mirrors the Prisma schema — kept in sync manually (ETAP 2)

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS — mirror Prisma schema enums
// ═══════════════════════════════════════════════════════════════════════════════

export type Gender = 'MALE' | 'FEMALE'
export type UserRole = 'USER' | 'ADMIN' | 'TESTER'
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DELETED'
export type UnitSystem = 'METRIC' | 'IMPERIAL'

export type GoalType = 'REDUCTION' | 'MAINTENANCE' | 'GAIN' | 'PERFORMANCE'
export type GoalPriority = 'PERFORMANCE' | 'BALANCED' | 'AGGRESSIVE_CUT'
export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELLED' | 'ARCHIVED'

export type ActivityLevel =
  | 'SEDENTARY'
  | 'LIGHT'
  | 'MODERATE'
  | 'VERY_ACTIVE'
  | 'EXTRA_ACTIVE'

export type SportType =
  | 'CYCLING' | 'RUNNING' | 'SWIMMING' | 'TRIATHLON' | 'DUATHLON'
  | 'STRENGTH' | 'MTB' | 'GRAVEL' | 'ROWING' | 'SKIING' | 'HIKING'
  | 'YOGA' | 'CROSSFIT' | 'WALK' | 'ELLIPTICAL' | 'PILATES' | 'OTHER'

export type MealType =
  | 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'
  | 'PRE_WORKOUT' | 'POST_WORKOUT' | 'SUPPLEMENT'

export type MealSource = 'MANUAL' | 'AI_EXTRACTED' | 'OCR' | 'PHOTO_ANALYSIS' | 'EXCEL_IMPORT'

export type MetricSource =
  | 'MANUAL' | 'GARMIN' | 'TRAININGPEAKS' | 'SMART_SCALE' | 'EXCEL_IMPORT' | 'CALCULATED'

export type RecoveryStatus = 'PEAK' | 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW'
export type WorkoutSource = 'MANUAL' | 'TRAININGPEAKS' | 'GARMIN' | 'EXCEL_IMPORT'

export type InsightType =
  | 'MORNING_BRIEF' | 'MIDDAY_CHECK' | 'EVENING_REVIEW'
  | 'GOAL_UPDATE' | 'RECOVERY_ALERT' | 'NUTRITION_ALERT'
  | 'PERFORMANCE_UPDATE' | 'WEEKLY_SUMMARY' | 'MILESTONE'

export type InsightDeliveryMoment = 'MORNING' | 'MIDDAY' | 'EVENING' | 'ON_DEMAND' | 'TRIGGERED'
export type InsightFeedback = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'

export type IntegrationProvider = 'TRAININGPEAKS' | 'GARMIN' | 'MANUAL'
export type IntegrationStatus = 'ACTIVE' | 'EXPIRED' | 'DISCONNECTED' | 'ERROR' | 'PENDING' | 'REVOKED'

export type SyncType = 'WORKOUTS' | 'BODY_METRICS' | 'SLEEP' | 'RECOVERY' | 'ATHLETE_PROFILE' | 'FULL'
export type SyncStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED' | 'SKIPPED' | 'CANCELLED'

export type NotificationType =
  | 'MORNING_BRIEF' | 'MIDDAY_CHECK' | 'EVENING_REVIEW'
  | 'GOAL_MILESTONE' | 'NUTRITION_REMINDER' | 'SYNC_COMPLETE'
  | 'SYNC_ERROR' | 'WEEKLY_REPORT' | 'SYSTEM'

export type NotificationChannel = 'EMAIL' | 'PUSH' | 'IN_APP'
export type NotificationStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'
export type ImportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'PARTIAL_SUCCESS' | 'FAILED'

// ═══════════════════════════════════════════════════════════════════════════════
// USER & PROFILE
// ═══════════════════════════════════════════════════════════════════════════════

export type User = {
  id: string
  email: string
  emailVerified: string | null
  name: string | null
  image: string | null
  role: UserRole
  status: UserStatus
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export type UserProfile = {
  id: string
  userId: string
  sex: Gender
  birthDate: string           // ISO date YYYY-MM-DD
  heightCm: number
  currentWeightKg: number
  targetWeightKg: number | null
  activityLevel: ActivityLevel
  mainSport: SportType
  unitSystem: UnitSystem
  timezone: string
  ftp: number | null          // watts
  ftpPerKg: number | null
  lthr: number | null
  vo2max: number | null
  restingHR: number | null
  bmr: number | null
  tdee: number | null
  caloricTarget: number | null
  proteinTargetG: number | null
  carbsTargetG: number | null
  fatTargetG: number | null
  preferredReductionMode: 'moderate' | 'aggressive' | 'very_aggressive'
  hrvBaseline: number | null
  onboardingCompletedAt: string | null
  createdAt: string
  updatedAt: string
}

/** Derived metabolic state — computed by nutrition-engine. */
export type MetabolicProfile = {
  bmr: number
  tdee: number
  caloricTarget: number
  proteinTargetG: number
  carbsTargetG: number
  fatTargetG: number
  weeklyWeightChangeKg: number
  estimatedWeeksToGoal: number | null
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOALS
// ═══════════════════════════════════════════════════════════════════════════════

export type Goal = {
  id: string
  userId: string
  type: GoalType
  priority: GoalPriority
  status: GoalStatus
  startWeightKg: number
  targetWeightKg: number
  startFTP: number | null
  targetFTP: number | null
  targetFTPperKg: number | null
  weeklyWeightChangeKg: number
  targetCaloricDeficit: number | null
  startDate: string
  targetDate: string | null
  achievedAt: string | null
  archivedAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type GoalHistory = {
  id: string
  goalId: string
  userId: string
  previousStatus: GoalStatus
  newStatus: GoalStatus
  reason: string | null
  triggeredBy: string | null
  snapshot: Goal
  changedAt: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// NUTRITION
// ═══════════════════════════════════════════════════════════════════════════════

export type Macros = {
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  fiberG?: number
  sodiumMg?: number
  sugarG?: number
}

export type Meal = {
  id: string
  dailyLogId: string
  userId: string
  mealType: MealType
  source: MealSource
  name: string | null
  time: string | null         // HH:MM
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  fiberG: number | null
  sodiumMg: number | null
  sugarG: number | null
  importSessionId: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export type DailyLog = {
  id: string
  userId: string
  date: string                // ISO date YYYY-MM-DD
  targetCalories: number
  targetProteinG: number
  targetCarbsG: number | null
  targetFatG: number | null
  consumedCalories: number
  consumedProteinG: number
  consumedCarbsG: number
  consumedFatG: number
  consumedFiberG: number | null
  consumedSodiumMg: number | null
  consumedSugarG: number | null
  tdeeSnapshot: number | null
  calorieBalance: number | null
  deficit: number | null
  waterMl: number | null
  completedAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  meals?: Meal[]
}

/** Derived daily nutrition summary — computed from DailyLog. */
export type DailyNutritionSummary = {
  date: string
  targetCalories: number
  consumedCalories: number
  deficit: number             // positive = deficit, negative = surplus
  macroProgress: {
    protein: { consumed: number; target: number; percent: number }
    carbs: { consumed: number; target: number; percent: number }
    fat: { consumed: number; target: number; percent: number }
  }
  calorieProgress: number     // 0-100%
  isComplete: boolean
}

// ═══════════════════════════════════════════════════════════════════════════════
// BODY METRICS
// ═══════════════════════════════════════════════════════════════════════════════

export type BodyMetric = {
  id: string
  userId: string
  date: string
  recordedAt: string
  source: MetricSource
  externalId: string | null
  weightKg: number | null
  bodyFatPercent: number | null
  muscleMassKg: number | null
  bmi: number | null
  waistCm: number | null
  hipCm: number | null
  hydrationPercent: number | null
  notes: string | null
  createdAt: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLEEP & RECOVERY
// ═══════════════════════════════════════════════════════════════════════════════

export type SleepMetric = {
  id: string
  userId: string
  date: string
  source: MetricSource
  externalId: string | null
  sleepStart: string
  sleepEnd: string
  totalSleepMinutes: number | null
  deepSleepMinutes: number | null
  remSleepMinutes: number | null
  lightSleepMinutes: number | null
  awakeMinutes: number | null
  sleepScore: number | null
  restfulness: number | null
  sleepEfficiency: number | null
  notes: string | null
  createdAt: string
}

export type RecoveryMetric = {
  id: string
  userId: string
  date: string
  recordedAt: string
  source: MetricSource
  externalId: string | null
  hrv: number | null
  restingHR: number | null
  readinessScore: number | null
  fatigueScore: number | null
  stressScore: number | null
  recoveryScore: number | null
  status: RecoveryStatus | null
  notes: string | null
  createdAt: string
}

/** Composite readiness score — computed by recovery-engine. */
export type ReadinessScore = {
  score: number               // 0-100
  status: RecoveryStatus
  components: {
    hrv: number | null        // 0-100 contribution
    sleep: number | null      // 0-100 contribution
    restingHR: number | null  // 0-100 contribution
    form: number | null       // 0-100 contribution (TSB-based)
  }
  recommendation: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRAINING
// ═══════════════════════════════════════════════════════════════════════════════

export type Workout = {
  id: string
  userId: string
  date: string
  source: WorkoutSource
  externalId: string | null
  externalWorkoutType: string | null
  startedAt: string | null
  finishedAt: string | null
  durationMinutes: number
  title: string | null
  description: string | null
  sportType: SportType
  distanceKm: number | null
  elevationGainM: number | null
  indoor: boolean
  avgHR: number | null
  maxHR: number | null
  avgPowerW: number | null
  normalizedPowerW: number | null
  maxPowerW: number | null
  avgCadence: number | null
  caloriesBurned: number | null
  tss: number | null
  intensityFactor: number | null
  ftpSnapshot: number | null
  rpe: number | null
  perceivedExertion: number | null
  isPlanned: boolean
  plannedDurationMin: number | null
  plannedTSS: number | null
  weatherCondition: string | null
  temperatureC: number | null
  notes: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export type TrainingLoad = {
  id: string
  userId: string
  date: string
  ctl: number  // Chronic Training Load — fitness
  atl: number  // Acute Training Load — fatigue
  tsb: number  // Training Stress Balance — form = CTL - ATL
  dailyTSS: number
  computedAt: string
  createdAt: string
}

/** Performance Management Chart data for a date range. */
export type PMCData = {
  date: string
  ctl: number
  atl: number
  tsb: number
  dailyTSS: number
  formStatus: FormStatus
}

export type FormStatus = 'peak' | 'fresh' | 'optimal' | 'tired' | 'overreached' | 'recovery'

/** FTP training zones (Coggan 7-zone model). */
export type FTPZone = {
  zone: 1 | 2 | 3 | 4 | 5 | 6 | 7
  name: string
  minWatts: number
  maxWatts: number | null
  minPercent: number
  maxPercent: number | null
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI INSIGHTS
// ═══════════════════════════════════════════════════════════════════════════════

export type AIInsight = {
  id: string
  userId: string
  dailyLogId: string | null
  insightType: InsightType
  deliveryMoment: InsightDeliveryMoment
  promptVersion: string
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  contextSnapshot: Record<string, unknown>
  content: string
  recommendation: string | null
  confidenceScore: number | null
  acknowledgedAt: string | null
  feedback: InsightFeedback | null
  feedbackNote: string | null
  createdAt: string
}

/** Full context assembled before calling the AI — built by context-builder. */
export type UserContext = {
  user: {
    name: string | null
    sex: Gender
    ageYears: number
    timezone: string
  }
  profile: {
    currentWeightKg: number
    targetWeightKg: number | null
    ftp: number | null
    ftpPerKg: number | null
    activityLevel: ActivityLevel
    mainSport: SportType
  }
  goal: Goal | null
  metabolic: {
    bmr: number | null
    tdee: number | null
    caloricTarget: number | null
    proteinTargetG: number | null
  }
  today: {
    date: string
    nutrition: {
      consumedCalories: number
      targetCalories: number
      consumedProteinG: number
      targetProteinG: number
      deficit: number | null
      waterMl: number | null
    } | null
    workout: Workout | null
  }
  recent: {
    avgCalories7d: number
    avgSleepMinutes7d: number
    totalTSS7d: number
    bodyWeight7d: Array<{ date: string; weightKg: number }>
  }
  recovery: {
    latest: RecoveryMetric | null
    readiness: ReadinessScore | null
    form: TrainingLoad | null  // latest PMC snapshot
  }
  integrations: {
    trainingPeaks: 'ACTIVE' | 'DISCONNECTED' | null
    garmin: 'ACTIVE' | 'DISCONNECTED' | null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export type Integration = {
  id: string
  userId: string
  provider: IntegrationProvider
  status: IntegrationStatus
  scope: string | null
  athleteExternalId: string | null
  syncFrequencyMinutes: number
  lastSyncAt: string | null
  nextSyncAt: string | null
  permissions: Record<string, boolean> | null
  errorMessage: string | null
  errorCount: number
  lastErrorAt: string | null
  createdAt: string
  updatedAt: string
}

export type SyncLog = {
  id: string
  integrationId: string
  userId: string
  syncType: SyncType
  status: SyncStatus
  recordsProcessed: number
  recordsCreated: number
  recordsUpdated: number
  recordsSkipped: number
  recordsFailed: number
  startedAt: string
  finishedAt: string | null
  errors: Array<{ record?: string; message: string }> | null
  retryCount: number
  createdAt: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXCEL IMPORT
// ═══════════════════════════════════════════════════════════════════════════════

export type ExcelImportSession = {
  id: string
  userId: string
  status: ImportStatus
  fileName: string
  fileHash: string
  columnMapping: Record<string, string>
  rowsTotal: number
  rowsParsed: number
  rowsImported: number
  rowsSkipped: number
  rowsFailed: number
  importedDateRangeStart: string | null
  importedDateRangeEnd: string | null
  startedAt: string
  finishedAt: string | null
  errorMessage: string | null
  createdAt: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// API CONTRACTS
// ═══════════════════════════════════════════════════════════════════════════════

export type ApiResponse<T> = {
  success: true
  data: T
  timestamp: string
}

export type ApiError = {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
  timestamp: string
}

export type ApiResult<T> = ApiResponse<T> | ApiError

export type PaginatedResponse<T> = ApiResponse<{
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}>

// ═══════════════════════════════════════════════════════════════════════════════
// TREND / ANALYTICS TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type WeightTrend = {
  current: number
  sevenDayAvg: number
  thirtyDayAvg: number
  weeklyChange: number       // kg/week (negative = losing)
  projectedGoalDate: string | null
  isOnTrack: boolean
}

export type NutritionTrend = {
  avgCalories7d: number
  avgProtein7d: number
  avgDeficit7d: number
  complianceRate7d: number   // % of days within 10% of target
  streakDays: number
}

export type TrainingTrend = {
  totalTSS7d: number
  totalTSS28d: number
  avgTSS7d: number
  dominantSport: SportType | null
  workoutsThisWeek: number
}
