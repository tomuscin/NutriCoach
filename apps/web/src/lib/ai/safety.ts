// AI Safety Layer
// Guards against prompt injection, off-topic queries, sensitive requests

const BLOCKED_PATTERNS = [
  /ignore previous instructions/i,
  /ignore all prior/i,
  /you are now/i,
  /pretend you are/i,
  /act as if/i,
  /jailbreak/i,
  /DAN mode/i,
]

const OFF_TOPIC_KEYWORDS = [
  'polityka', 'religia', 'medycyna kliniczna', 'diagnoza', 'lek', 'dawkowanie',
  'samobójstwo', 'depresja kliniczna',
]

export type SafetyCheckResult = {
  safe: boolean
  reason?: string
}

/**
 * Check user message for safety concerns
 * Called before every LLM request
 */
export function checkMessageSafety(message: string): SafetyCheckResult {
  // Prompt injection detection
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(message)) {
      return {
        safe: false,
        reason: 'Wykryto potencjalny atak prompt injection. Wiadomość zablokowana.',
      }
    }
  }

  // Off-topic guard
  const lowerMessage = message.toLowerCase()
  for (const keyword of OFF_TOPIC_KEYWORDS) {
    if (lowerMessage.includes(keyword)) {
      return {
        safe: false,
        reason: `Temat "${keyword}" wykracza poza zakres NutriCoach. Skonsultuj się z odpowiednim specjalistą.`,
      }
    }
  }

  return { safe: true }
}

/**
 * Sanitize user input — trim, limit length
 */
export function sanitizeInput(message: string, maxLength = 2000): string {
  return message.trim().slice(0, maxLength)
}
