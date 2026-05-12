// AI Coach — Context Builder
// Assembles user context from DB into a structured prompt context
// Used by all AI Coach interactions

export type UserContext = {
  userId: string
  name: string
  goal: string
  currentWeight: number
  targetWeight: number
  tdee: number
  caloricTarget: number
  today: {
    date: string
    caloriesConsumed: number
    caloriesFromTraining: number
    proteinConsumed: number
    waterMl?: number
  }
  lastWorkout?: {
    date: string
    type: string
    duration: number
    tss?: number
  }
  recovery?: {
    sleepHours: number
    sleepQuality: number
    hrv?: number
    readiness?: number
  }
  trends: {
    weightLast7Days: number[]
    caloriesLast7Days: number[]
    tssLast7Days: number[]
  }
  integrations: {
    trainingPeaksConnected: boolean
    garminConnected: boolean
  }
}

/**
 * Build full user context from database for a given user and date
 * TODO: ETAP 7 — implement DB queries
 */
export async function buildUserContext(
  _userId: string,
  _date: Date
): Promise<UserContext> {
  throw new Error('Context builder not yet implemented — ETAP 7')
}

/**
 * Serialize context to token-efficient string for LLM
 */
export function serializeContext(_context: UserContext): string {
  throw new Error('Context serializer not yet implemented — ETAP 7')
}
