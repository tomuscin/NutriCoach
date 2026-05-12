const BLOCKED_PATTERNS = [
  /ignore previous instructions/i,
  /ignore all prior/i,
  /you are now/i,
  /pretend you are/i,
  /jailbreak/i,
]

export type SafetyCheckResult = {
  safe: boolean
  reason?: string
}

export function checkMessageSafety(message: string): SafetyCheckResult {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(message)) {
      return { safe: false, reason: 'Wiadomość zablokowana ze względów bezpieczeństwa.' }
    }
  }
  return { safe: true }
}

export function sanitizeInput(message: string, maxLength = 2000): string {
  return message.trim().slice(0, maxLength)
}
