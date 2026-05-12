// TrainingPeaks API types — raw API response shapes

export interface TPAthleteProfile {
  Id: number
  AthleteId: number
  DisplayName: string
  FirstName?: string
  LastName?: string
  BikeThresholdPower?: number   // FTP in watts
  VO2Max?: number
  Lthr?: number                  // Lactate Threshold HR
  Weight?: number                // kg
  AthleteType?: number
}

export interface TPWorkout {
  WorkoutId: number
  AthleteId: number
  WorkoutDay: string            // ISO date "2026-05-12"
  StartTime?: string            // ISO datetime
  CompletedWorkoutTime?: number // seconds
  TotalTime?: number            // seconds (planned)
  Calories?: number
  Tss?: number
  If?: number                   // Intensity Factor 0-1+
  NormalizedPower?: number
  AveragePower?: number
  AverageHeartRate?: number
  MaximumHeartRate?: number
  Distance?: number             // meters
  ElevationGain?: number        // meters
  CadenceAverage?: number
  Title?: string
  Description?: string
  WorkoutType?: string          // "Bike", "Run", "Swim", etc.
  Completed?: boolean
  IsPlanned?: boolean
  PlannedDuration?: number      // seconds
  PlannedTss?: number
  Perceived?: number            // RPE 1-10
  FtpUsed?: number             // FTP at time of workout
  Indoor?: boolean
}

export interface TPTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number            // seconds
  token_type: string
  scope?: string
}

export interface TPWorkoutWebhookPayload {
  athlete_id: number
  workout_id: number
  event: 'workout_created' | 'workout_updated' | 'workout_deleted'
  timestamp: string
}

// Sport type mapping: TP string → NutriCoach SportType enum
export const TP_SPORT_MAP: Record<string, string> = {
  Bike: 'CYCLING',
  Run: 'RUNNING',
  Swim: 'SWIMMING',
  Walk: 'WALKING',
  Strength: 'STRENGTH_TRAINING',
  Yoga: 'YOGA',
  XCSkiing: 'SKIING',
  Rowing: 'ROWING',
  MTBike: 'CYCLING',
  Road: 'CYCLING',
  Triathlon: 'TRIATHLON',
  Other: 'OTHER',
}
