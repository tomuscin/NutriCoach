// Strava API types — raw API response shapes

export interface StravaTokenResponse {
  token_type: 'Bearer'
  expires_at: number    // epoch seconds
  expires_in: number    // seconds
  refresh_token: string
  access_token: string
  athlete?: StravaAthleteSummary
  scope?: string
}

export interface StravaAthleteSummary {
  id: number
  firstname?: string
  lastname?: string
  sex?: 'M' | 'F'
  weight?: number        // kg
  measurement_preference?: 'feet' | 'meters'
  ftp?: number           // FTP in watts
}

// SummaryActivity from GET /athlete/activities
export interface StravaSummaryActivity {
  id: number
  name: string
  sport_type: string     // Run, Ride, MountainBikeRide, Swim, Walk, Hike, etc.
  type: string           // deprecated but still present
  distance: number       // meters
  moving_time: number    // seconds
  elapsed_time: number   // seconds
  total_elevation_gain: number  // meters
  start_date: string     // ISO 8601 UTC
  start_date_local: string
  timezone: string
  average_speed: number  // m/s
  max_speed: number      // m/s
  has_heartrate: boolean
  average_heartrate?: number
  max_heartrate?: number
  average_watts?: number
  weighted_average_watts?: number
  kilojoules?: number
  device_watts?: boolean
  trainer: boolean
  commute: boolean
  manual: boolean
  private: boolean
  suffer_score?: number
}

// DetailedActivity from GET /activities/{id} — includes calories
export interface StravaDetailedActivity extends StravaSummaryActivity {
  calories?: number
  description?: string
  average_cadence?: number
  average_temp?: number
}

// Webhook event payload from Strava push
export interface StravaWebhookEvent {
  object_type: 'activity' | 'athlete'
  object_id: number          // activity ID or athlete ID
  aspect_type: 'create' | 'update' | 'delete'
  owner_id: number           // athlete ID
  subscription_id: number
  event_time: number         // epoch seconds
  updates?: Record<string, string>
}

// Sport type mapping: Strava sport_type → Leaxaro SportType enum
export const STRAVA_SPORT_MAP: Record<string, string> = {
  Run: 'RUNNING',
  TrailRun: 'RUNNING',
  VirtualRun: 'RUNNING',
  Ride: 'CYCLING',
  MountainBikeRide: 'CYCLING',
  GravelRide: 'CYCLING',
  VirtualRide: 'CYCLING',
  EBikeRide: 'CYCLING',
  EMountainBikeRide: 'CYCLING',
  Swim: 'SWIMMING',
  Walk: 'WALKING',
  Hike: 'HIKING',
  Rowing: 'ROWING',
  Kayaking: 'ROWING',
  AlpineSki: 'SKIING',
  NordicSki: 'SKIING',
  BackcountrySki: 'SKIING',
  Snowboard: 'OTHER',
  WeightTraining: 'STRENGTH_TRAINING',
  Workout: 'WORKOUT',
  Crossfit: 'STRENGTH_TRAINING',
  HighIntensityIntervalTraining: 'WORKOUT',
  Yoga: 'YOGA',
  Pilates: 'YOGA',
  Surf: 'OTHER',
  StandUpPaddling: 'ROWING',
  Soccer: 'OTHER',
  Badminton: 'OTHER',
  Basketball: 'OTHER',
  StairStepper: 'WORKOUT',
  Elliptical: 'WORKOUT',
  Triathlon: 'TRIATHLON',
  RockClimbing: 'OTHER',
}
