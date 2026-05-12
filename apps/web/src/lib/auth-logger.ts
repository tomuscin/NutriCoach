// Auth observability — structured auth logging
// All auth events are logged here (no PII in prod logs)

type AuthEvent =
  | 'login.success'
  | 'login.failed'
  | 'login.rate_limited'
  | 'register.success'
  | 'register.failed'
  | 'register.duplicate_email'
  | 'logout'
  | 'session.created'
  | 'session.expired'
  | 'session.invalid'
  | 'password_reset.requested'
  | 'password_reset.completed'
  | 'password_reset.invalid_token'
  | 'email_verify.sent'
  | 'email_verify.completed'
  | 'email_verify.invalid_token'
  | 'security.suspicious_login'
  | 'security.brute_force_detected'

interface AuthLogPayload {
  event: AuthEvent
  userId?: string
  email?: string // masked in prod
  ip?: string
  userAgent?: string
  correlationId?: string
  meta?: Record<string, unknown>
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '***@***'
  const masked = local.length > 2 ? `${local[0]}***${local[local.length - 1]}` : '***'
  return `${masked}@${domain}`
}

export function logAuthEvent(payload: AuthLogPayload): void {
  const isProd = process.env.NODE_ENV === 'production'

  const entry = {
    ts: new Date().toISOString(),
    event: payload.event,
    userId: payload.userId,
    email: isProd && payload.email ? maskEmail(payload.email) : payload.email,
    ip: payload.ip,
    correlationId: payload.correlationId,
    meta: payload.meta,
    // userAgent logged only in dev (too verbose for prod)
    ...(isProd ? {} : { userAgent: payload.userAgent }),
  }

  // Structured output — ready for log aggregators (Sentry, Datadog, etc.)
  const prefix = payload.event.startsWith('security.') ? '[AUTH:SECURITY]' : '[AUTH]'

  if (
    payload.event.includes('failed') ||
    payload.event.includes('invalid') ||
    payload.event.includes('suspicious') ||
    payload.event.includes('brute_force')
  ) {
    console.warn(prefix, JSON.stringify(entry))
  } else {
    console.log(prefix, JSON.stringify(entry))
  }

  // TODO ETAP 8: forward to Sentry breadcrumbs / custom transport
  // Sentry.addBreadcrumb({ category: 'auth', message: payload.event, data: entry })
}

// ─── Correlation ID generator ─────────────────────────────────────────────────
export function generateCorrelationId(): string {
  return `auth_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}
