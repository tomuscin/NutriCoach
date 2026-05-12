// OpenAI client singleton for NutriCoach
// Model selection based on task complexity

import OpenAI from 'openai'

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not defined. Check your .env.local file.')
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
})

// Model constants
export const AI_MODELS = {
  /** Full GPT-4o — for complex reasoning, daily summaries, detailed analysis */
  PREMIUM: process.env.OPENAI_MODEL ?? 'gpt-4o',
  /** GPT-4o-mini — for quick insights, simple classifications, token-efficient tasks */
  FAST: process.env.OPENAI_MODEL_FAST ?? 'gpt-4o-mini',
} as const

// Token budgets per task type
export const TOKEN_BUDGETS = {
  MORNING_BRIEF: 1200,
  MIDDAY_CHECK: 600,
  EVENING_REVIEW: 1000,
  QUICK_INSIGHT: 400,
  CHAT_RESPONSE: 800,
  MEAL_ANALYSIS: 500,
  TRAINING_ANALYSIS: 700,
} as const
