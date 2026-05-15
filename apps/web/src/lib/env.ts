// Leaxaro — Environment Validator
// Validates required env vars at startup. Fails fast with actionable errors.
// Import at the top of instrumentation.ts (Next.js entry point).

type EnvSpec = {
  key: string
  required: boolean
  description: string
  validate?: (value: string) => boolean
  hint?: string
}

const ENV_SPEC: EnvSpec[] = [
  // ─── Database ────────────────────────────────────────────────────────────
  {
    key: 'DATABASE_URL',
    required: true,
    description: 'MySQL connection string',
    validate: (v) => v.startsWith('mysql://') || v.startsWith('mysql2://'),
    hint: 'Must start with mysql:// — format: mysql://USER:PASS@HOST:3306/DB?ssl=true',
  },
  // ─── Auth ─────────────────────────────────────────────────────────────────
  {
    key: 'NEXTAUTH_SECRET',
    required: true,
    description: 'NextAuth signing secret (min 32 chars)',
    validate: (v) =>
      v.length >= 32 &&
      v !== 'GENERATE_WITH_openssl_rand_base64_32' &&
      v !== 'your_secret_here_min_32_chars',
    hint: 'Generate with: openssl rand -base64 32',
  },
  {
    key: 'NEXTAUTH_URL',
    required: true,
    description: 'App base URL for NextAuth',
    validate: (v) => v.startsWith('http://') || v.startsWith('https://'),
    hint: 'Example: http://localhost:3100 (dev) or https://leaxaro.app (prod)',
  },
  // ─── OpenAI (required from ETAP 4+) ─────────────────────────────────────
  {
    key: 'OPENAI_API_KEY',
    required: false,
    description: 'OpenAI API key for AI Coach features',
    validate: (v) => v.startsWith('sk-'),
    hint: 'Required for AI Coach features (ETAP 4+)',
  },
  // ─── App URL ─────────────────────────────────────────────────────────────
  {
    key: 'NEXT_PUBLIC_APP_URL',
    required: false,
    description: 'Public app URL',
  },
]

export type EnvValidationResult = {
  valid: boolean
  errors: string[]
  warnings: string[]
  summary: Record<string, 'ok' | 'missing' | 'invalid' | 'warning'>
}

export function validateEnv(): EnvValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const summary: Record<string, 'ok' | 'missing' | 'invalid' | 'warning'> = {}

  for (const spec of ENV_SPEC) {
    const value = process.env[spec.key]

    if (!value || value.trim() === '') {
      if (spec.required) {
        errors.push(`Missing required env var: ${spec.key} — ${spec.description}${spec.hint ? `\n  Hint: ${spec.hint}` : ''}`)
        summary[spec.key] = 'missing'
      } else {
        warnings.push(`Optional env var not set: ${spec.key} — ${spec.description}`)
        summary[spec.key] = 'warning'
      }
      continue
    }

    if (spec.validate && !spec.validate(value)) {
      if (spec.required) {
        errors.push(`Invalid value for ${spec.key}: ${spec.description}${spec.hint ? `\n  Hint: ${spec.hint}` : ''}`)
        summary[spec.key] = 'invalid'
      } else {
        warnings.push(`Possibly invalid value for optional ${spec.key}`)
        summary[spec.key] = 'warning'
      }
      continue
    }

    summary[spec.key] = 'ok'
  }

  return { valid: errors.length === 0, errors, warnings, summary }
}

/**
 * Call this at process startup.
 * In production: throws on invalid config (fail-fast).
 * In development: logs warnings but continues.
 */
export function assertEnv(): void {
  const result = validateEnv()
  const isDev = process.env.NODE_ENV !== 'production'

  if (result.warnings.length > 0 && isDev) {
    console.warn('[Leaxaro] ENV warnings:')
    result.warnings.forEach((w) => console.warn(`  ⚠  ${w}`))
  }

  if (!result.valid) {
    const message = [
      '[Leaxaro] FATAL: Invalid environment configuration.',
      ...result.errors.map((e) => `  ✗ ${e}`),
      '',
      'Fix the issues above in apps/web/.env.local',
      'Template: .env.example at project root',
    ].join('\n')

    if (isDev) {
      // In dev: warn loudly but don't crash (allows partial work)
      console.error(message)
    } else {
      // In production: crash immediately
      throw new Error(message)
    }
  }
}
