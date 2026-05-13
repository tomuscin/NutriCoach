// ⚠️  DEV-ONLY ENDPOINT — NEVER ENABLE IN PRODUCTION
// Tests Resend email delivery pipeline without touching the database.
// No user created · No token stored · No analytics written · No DB access.
//
// Usage: POST /api/dev/test-email
// Body:  { "to": "uscinski.tomek@gmail.com" }   (optional — falls back to env)

import { type NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// ─── Hard gate: production is completely blocked ──────────────────────────────
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development'

const RESEND_API_KEY  = process.env.RESEND_API_KEY ?? ''
const EMAIL_FROM_RAW  = process.env.EMAIL_FROM ?? ''
const APP_URL         = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3100'
const APP_NAME        = process.env.NEXT_PUBLIC_APP_NAME ?? 'NutriCoach'

// Display-name wrapper — Resend accepts plain address or "Name <addr>" form
const EMAIL_FROM = EMAIL_FROM_RAW.includes('<')
  ? EMAIL_FROM_RAW
  : `${APP_NAME} Dev <${EMAIL_FROM_RAW}>`

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // ── Production block ──────────────────────────────────────────────────────
  if (!IS_DEVELOPMENT) {
    return NextResponse.json(
      { ok: false, error: 'This endpoint is disabled in production.' },
      { status: 404 },
    )
  }

  // ── Config validation ────────────────────────────────────────────────────
  if (!RESEND_API_KEY) {
    return NextResponse.json(
      { ok: false, error: 'RESEND_API_KEY is not set in .env.local' },
      { status: 500 },
    )
  }

  if (!EMAIL_FROM_RAW) {
    return NextResponse.json(
      { ok: false, error: 'EMAIL_FROM is not set in .env.local' },
      { status: 500 },
    )
  }

  // ── Parse recipient ───────────────────────────────────────────────────────
  let to = 'uscinski.tomek@gmail.com' // safe fallback — no DB access ever
  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    if (typeof body.to === 'string' && body.to.includes('@')) {
      to = body.to.trim().toLowerCase()
    }
  } catch {
    // no body — use default
  }

  // ── Build email ──────────────────────────────────────────────────────────
  const now        = new Date()
  const timestamp  = now.toISOString()
  const startMs    = Date.now()

  const senderDomain = EMAIL_FROM_RAW.split('@')[1] ?? 'unknown'
  const subject      = `${APP_NAME} — test wysyłki email`

  const html = buildTestEmailHtml({ timestamp, senderDomain, appUrl: APP_URL, appName: APP_NAME })
  const text = buildTestEmailText({ timestamp, senderDomain, appUrl: APP_URL, appName: APP_NAME })

  // ── Send via Resend ──────────────────────────────────────────────────────
  logger.info({ to, from: EMAIL_FROM, subject, senderDomain }, 'email.test.start')

  const resend = new Resend(RESEND_API_KEY)

  let resendData: { id?: string } | null = null
  let resendError: { name: string; message: string; statusCode?: number } | null = null

  try {
    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
      text,
      headers: {
        'X-NutriCoach-Environment': 'development',
        'X-NutriCoach-Test':        'true',
      },
    })

    resendData  = result.data  as { id?: string } | null
    resendError = result.error as { name: string; message: string; statusCode?: number } | null
  } catch (err) {
    const elapsed = Date.now() - startMs
    logger.error({ err, to, elapsed }, 'email.test.exception')
    return NextResponse.json(
      {
        ok:      false,
        error:   err instanceof Error ? err.message : String(err),
        elapsed,
        to,
        from:    EMAIL_FROM,
        config:  { senderDomain, appUrl: APP_URL, resendKeyPrefix: RESEND_API_KEY.slice(0, 8) + '...' },
      },
      { status: 500 },
    )
  }

  const elapsed = Date.now() - startMs

  if (resendError) {
    logger.error(
      { resendError, to, elapsed, from: EMAIL_FROM },
      'email.test.failed',
    )
    return NextResponse.json(
      {
        ok:           false,
        error:        resendError.message,
        resendStatus: resendError.statusCode,
        elapsed,
        to,
        from:         EMAIL_FROM,
        config:       { senderDomain, appUrl: APP_URL },
      },
      { status: 500 },
    )
  }

  // ── Success ──────────────────────────────────────────────────────────────
  const messageId = resendData?.id ?? null

  logger.info(
    {
      messageId,
      to,
      from:   EMAIL_FROM,
      elapsed,
      event:  'email.test.sent',     // runtime journal event
    },
    'email.test.success',
  )

  return NextResponse.json({
    ok:           true,
    messageId,
    to,
    from:         EMAIL_FROM,
    subject,
    elapsed,
    timestamp,
    config: {
      senderDomain,
      appUrl:          APP_URL,
      appName:         APP_NAME,
      resendKeyPrefix: RESEND_API_KEY.slice(0, 8) + '...',
      nodeEnv:         process.env.NODE_ENV,
    },
    metrics: {
      'email.sent':     1,
      'email.failed':   0,
      'email.duration': elapsed,
    },
  })
}

// ─── GET — config probe (no email sent) ──────────────────────────────────────
export async function GET() {
  if (!IS_DEVELOPMENT) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const senderDomain = EMAIL_FROM_RAW.split('@')[1] ?? 'unknown'
  const configOk     = !!(RESEND_API_KEY && EMAIL_FROM_RAW)

  return NextResponse.json({
    endpoint:    '/api/dev/test-email',
    environment: process.env.NODE_ENV,
    configOk,
    config: {
      hasResendKey:    !!RESEND_API_KEY,
      resendKeyPrefix: RESEND_API_KEY ? RESEND_API_KEY.slice(0, 8) + '...' : null,
      emailFrom:       EMAIL_FROM,
      senderDomain,
      appUrl:          APP_URL,
      appName:         APP_NAME,
    },
    usage: 'POST /api/dev/test-email  body: { "to": "you@example.com" }',
  })
}

// ─── Email templates ──────────────────────────────────────────────────────────

interface TemplateParams {
  timestamp:    string
  senderDomain: string
  appUrl:       string
  appName:      string
}

function buildTestEmailHtml(p: TemplateParams): string {
  return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${p.appName} — test wysyłki email</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;margin:0;padding:32px 16px">
  <!--[if mso]><table width="100%"><tr><td><![endif]-->

  <div style="max-width:540px;margin:0 auto">

    <!-- Header -->
    <div style="background:#0e7490;border-radius:12px 12px 0 0;padding:28px 32px">
      <span style="font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px">${p.appName}</span>
      <span style="display:block;font-size:12px;color:#a5f3fc;margin-top:4px;letter-spacing:0.08em;text-transform:uppercase">Infrastructure Test</span>
    </div>

    <!-- Body -->
    <div style="background:#ffffff;padding:32px;border:1px solid #e5e7eb;border-top:none">

      <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 12px">
        Test infrastruktury email
      </h1>

      <p style="color:#374151;line-height:1.7;margin:0 0 24px;font-size:15px">
        To jest test infrastruktury email <strong>${p.appName}</strong>.<br>
        Ten email potwierdza, że pipeline Resend działa poprawnie od nadawcy do odbiorcy.
      </p>

      <!-- Status badge -->
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:24px">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:18px">✅</span>
          <span style="font-weight:600;color:#16a34a;font-size:15px">Delivery status: OK</span>
        </div>
      </div>

      <!-- Metadata table -->
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px">
        <tbody>
          ${metaRow('Timestamp',      p.timestamp)}
          ${metaRow('Environment',    'development')}
          ${metaRow('Runtime',        'Node.js / Next.js 15 App Router')}
          ${metaRow('Sender domain',  p.senderDomain)}
          ${metaRow('Provider',       'Resend (resend.com)')}
          ${metaRow('App URL',        p.appUrl)}
        </tbody>
      </table>

      <p style="font-size:12px;color:#9ca3af;margin:0;line-height:1.5">
        Ten email został wygenerowany automatycznie przez endpoint <code style="background:#f3f4f6;padding:1px 5px;border-radius:3px">/api/dev/test-email</code>.<br>
        Endpoint działa wyłącznie w środowisku <strong>development</strong> i jest niedostępny w produkcji.
      </p>

    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:16px 32px;text-align:center">
      <p style="font-size:12px;color:#9ca3af;margin:0">
        ${p.appName} · Dev infrastructure test · <a href="${p.appUrl}" style="color:#0e7490;text-decoration:none">${p.appUrl}</a>
      </p>
    </div>

  </div>

  <!--[if mso]></td></tr></table><![endif]-->
</body>
</html>`
}

function metaRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 12px;background:#f9fafb;color:#6b7280;font-weight:500;border-radius:4px 0 0 4px;width:38%;white-space:nowrap">${label}</td>
    <td style="padding:8px 12px;color:#111827;border-left:2px solid #e5e7eb">${value}</td>
  </tr>`
}

function buildTestEmailText(p: TemplateParams): string {
  return [
    `${p.appName} — Test infrastruktury email`,
    '==========================================',
    '',
    'To jest test infrastruktury email NutriCoach.',
    'Ten email potwierdza, że pipeline Resend działa poprawnie.',
    '',
    `Timestamp:       ${p.timestamp}`,
    `Environment:     development`,
    `Runtime:         Node.js / Next.js 15 App Router`,
    `Sender domain:   ${p.senderDomain}`,
    `Provider:        Resend (resend.com)`,
    `Delivery status: OK`,
    '',
    `App URL: ${p.appUrl}`,
    '',
    '---',
    'Endpoint: /api/dev/test-email',
    'Status: DEV-ONLY (disabled in production)',
  ].join('\n')
}
