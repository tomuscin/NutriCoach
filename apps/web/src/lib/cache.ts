// Cache tags — centralized constants for Next.js revalidateTag
// Usage in Server Actions after data mutations:
//   import { revalidateTag } from 'next/cache'
//   revalidateTag(CACHE_TAGS.DASHBOARD)

export const CACHE_TAGS = {
  DASHBOARD: 'dashboard',
  NUTRITION: 'nutrition',
  BODY_METRICS: 'body-metrics',
  TRAINING: 'training',
  RECOVERY: 'recovery',
  AI_INSIGHTS: 'ai-insights',
  GOALS: 'goals',
  PROFILE: 'profile',
} as const

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS]

// Tags that should be invalidated when new data is imported
export const IMPORT_INVALIDATES: CacheTag[] = [
  CACHE_TAGS.DASHBOARD,
  CACHE_TAGS.NUTRITION,
  CACHE_TAGS.BODY_METRICS,
  CACHE_TAGS.TRAINING,
  CACHE_TAGS.RECOVERY,
]

// Revalidation TTL for dashboard data (seconds)
export const DASHBOARD_REVALIDATE_SECONDS = 300 // 5 minutes
