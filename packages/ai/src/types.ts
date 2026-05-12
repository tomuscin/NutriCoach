import type { InsightType } from '@nutricoach/types'

export type { InsightType }

export type AICoachRequest = {
  userId: string
  type: InsightType
  userMessage?: string      // for chat type
  date?: string            // ISO date for daily briefs
}

export type AICoachResponse = {
  content: string
  type: InsightType
  tokensUsed: number
  model: string
  generatedAt: string
}
