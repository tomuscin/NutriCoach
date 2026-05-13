// Email service — production-grade transactional email via Resend SDK.
// All emails sent server-side only. Mobile-first HTML, dark-mode safe.

import 'server-only'
import { Resend } from 'resend'
import { logger } from '@/lib/logger'
import * as Sentry from '@sentry/nextjs'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? 'NutriCoach <noreply@nutricoach.app>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3100'
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'NutriCoach'

// ─── Design tokens (inline, mobile-safe, dark-mode-safe) ─────────────────────
const T = {
  bg: '#f4f6f8',
  card: '#ffffff',
  border: '#e5e7eb',
  primary: '#0e7490',
  primaryHover: '#0c6780',
  primaryText: '#ffffff',
  h1: '#111827',
  body: '#374151',
  muted: '#6b7280',
  subtle: '#9ca3af',
  faint: '#d1d5db',
  accent: '#f0f9ff',
  accentBorder: '#bae6fd',
  danger: '#dc2626',
  success: '#16a34a',
  fontStack: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
}

// ─── Base layout wrapper ──────────────────────────────────────────────────────
function emailLayout(preheader: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="pl" dir="ltr" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${APP_NAME}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    body { margin:0; padding:0; background:${T.bg}; font-family:${T.fontStack}; -webkit-text-size-adjust:100%; }
    table { border-collapse:collapse; mso-table-lspace:0; mso-table-rspace:0; }
    img { border:0; height:auto; display:block; max-width:100%; }
    a { color:${T.primary}; }
    .btn { display:inline-block; background:${T.primary}; color:${T.primaryText}!important; font-weight:600; font-size:15px; padding:13px 28px; border-radius:8px; text-decoration:none; }
    .btn:hover { background:${T.primaryHover}; }
    @media only screen and (max-width:600px) {
      .card { padding:28px 20px!important; }
      .btn { width:100%!important; text-align:center!important; box-sizing:border-box!important; }
    }
    @media (prefers-color-scheme: dark) {
      body, .email-bg { background:#0f172a!important; }
      .card { background:#1e293b!important; border-color:#334155!important; }
      h1, .h1 { color:#f8fafc!important; }
      .body-text { color:#cbd5e1!important; }
      .muted-text { color:#94a3b8!important; }
      .accent-block { background:#0c4a6e!important; border-color:#0369a1!important; }
      .accent-block p { color:#e0f2fe!important; }
    }
  </style>
</head>
<body class="email-bg" style="margin:0;padding:0;background:${T.bg}">
  <!-- Preheader (hidden, shows in inbox preview) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${T.bg}">
    ${preheader}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:32px 16px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
          <!-- Logo row -->
          <tr>
            <td align="center" style="padding-bottom:24px">
              <div style="display:inline-flex;align-items:center;gap:8px">
                <div style="width:36px;height:36px;background:${T.primary};border-radius:10px;display:inline-block;text-align:center;line-height:36px;font-size:18px;font-weight:700;color:#fff">N</div>
                <span style="font-size:18px;font-weight:700;color:${T.h1};letter-spacing:-0.3px">${APP_NAME}</span>
              </div>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td class="card" style="background:${T.card};border:1px solid ${T.border};border-radius:16px;padding:40px" align="left">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px 0 8px">
              <p style="font-size:12px;color:${T.subtle};margin:0;line-height:1.6">
                Wysłane przez ${APP_NAME} &middot; Nie odpowiadaj na tę wiadomość
              </p>
              <p style="font-size:11px;color:${T.faint};margin:8px 0 0">
                &copy; ${new Date().getFullYear()} NutriCoach. Wszelkie prawa zastrzeżone.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── CTA button helper ────────────────────────────────────────────────────────
function ctaButton(href: string, text: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
    <tr>
      <td>
        <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:48px;v-text-anchor:middle;width:200px;" arcsize="17%" fillcolor="${T.primary}"><w:anchorlock/><center style="color:${T.primaryText};font-family:${T.fontStack};font-size:15px;font-weight:700;">${text}</center></v:roundrect><![endif]-->
        <!--[if !mso]><!--><a class="btn" href="${href}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:${T.primary};color:${T.primaryText}!important;font-weight:700;font-size:15px;padding:13px 28px;border-radius:8px;text-decoration:none;min-height:44px;line-height:22px">${text}</a><!--<![endif]-->
      </td>
    </tr>
  </table>`
}

// ─── Generic send helper ──────────────────────────────────────────────────────

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  opts?: { tags?: Array<{ name: string; value: string }> }
): Promise<{ ok: boolean; id?: string }> {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject,
      html,
      tags: opts?.tags,
    })
    if (error) {
      logger.error({ to, subject, error }, 'email.send.failed')
      Sentry.captureMessage(`email.send.failed: ${subject}`, {
        level: 'error',
        extra: { to: to.replace(/(?<=.).(?=.*@)/g, '*'), subject, error },
      })
      return { ok: false }
    }
    logger.info({ to, subject, id: data?.id }, 'email.sent')
    return { ok: true, id: data?.id }
  } catch (err) {
    logger.error({ to, subject, err }, 'email.send.error')
    Sentry.captureException(err, { extra: { context: 'email.send', subject } })
    return { ok: false }
  }
}

// ─── Email verification ───────────────────────────────────────────────────────

export async function sendVerificationEmail(to: string, name: string, token: string) {
  const url = `${APP_URL}/auth/verify-email?token=${token}`
  const displayName = name?.trim() || 'trenujący'

  const body = `
    <h1 class="h1" style="font-size:22px;font-weight:700;color:${T.h1};margin:0 0 12px;letter-spacing:-0.3px">Potwierdź swój adres email</h1>
    <p class="body-text" style="color:${T.body};margin:0 0 28px;line-height:1.65;font-size:15px">
      Cześć <strong>${displayName}</strong>,<br><br>
      Dziękujemy za rejestrację w ${APP_NAME}. Kliknij poniższy przycisk, aby zweryfikować swój adres email i aktywować konto.
    </p>
    ${ctaButton(url, 'Potwierdź adres email')}
    <div class="accent-block" style="background:${T.accent};border-left:3px solid ${T.accentBorder};border-radius:0 6px 6px 0;padding:14px 16px;margin-bottom:24px">
      <p class="muted-text" style="color:${T.muted};font-size:13px;margin:0;line-height:1.55">
        🔒 Link jest ważny przez <strong>24 godziny</strong>. Jeśli nie zakładałeś/aś konta w ${APP_NAME}, możesz bezpiecznie zignorować tę wiadomość.
      </p>
    </div>
    <p style="color:${T.subtle};font-size:12px;margin:0;word-break:break-all;line-height:1.5">
      Nie działa przycisk? Skopiuj link:<br>
      <a href="${url}" style="color:${T.primary};font-size:11px">${url}</a>
    </p>`

  return sendEmail(
    to,
    `Potwierdź swój email w ${APP_NAME}`,
    emailLayout(`Zweryfikuj swój adres email, aby aktywować konto ${APP_NAME}.`, body),
    { tags: [{ name: 'type', value: 'verification' }] }
  )
}

// ─── Password reset ────────────────────────────────────────────────────────────

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const url = `${APP_URL}/auth/reset-password?token=${token}`
  const displayName = name?.trim() || 'użytkowniku'

  const body = `
    <h1 class="h1" style="font-size:22px;font-weight:700;color:${T.h1};margin:0 0 12px;letter-spacing:-0.3px">Zmień swoje hasło</h1>
    <p class="body-text" style="color:${T.body};margin:0 0 28px;line-height:1.65;font-size:15px">
      Cześć <strong>${displayName}</strong>,<br><br>
      Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta w ${APP_NAME}. Kliknij poniższy przycisk, aby ustawić nowe hasło.
    </p>
    ${ctaButton(url, 'Ustaw nowe hasło')}
    <div class="accent-block" style="background:#fef2f2;border-left:3px solid #fca5a5;border-radius:0 6px 6px 0;padding:14px 16px;margin-bottom:24px">
      <p class="muted-text" style="color:#7f1d1d;font-size:13px;margin:0;line-height:1.55">
        ⏱ Link jest ważny przez <strong>1 godzinę</strong>. Jeśli nie prosiłeś/aś o reset hasła, Twoje konto jest bezpieczne — możesz zignorować tę wiadomość.
      </p>
    </div>
    <p style="color:${T.subtle};font-size:12px;margin:0;word-break:break-all;line-height:1.5">
      Nie działa przycisk? Skopiuj link:<br>
      <a href="${url}" style="color:${T.primary};font-size:11px">${url}</a>
    </p>`

  return sendEmail(
    to,
    `Resetowanie hasła — ${APP_NAME}`,
    emailLayout(`Ktoś poprosił o reset hasła do Twojego konta ${APP_NAME}. Masz 1 godzinę.`, body),
    { tags: [{ name: 'type', value: 'password-reset' }] }
  )
}

// ─── Welcome email (post-onboarding) ─────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string) {
  const url = `${APP_URL}/dashboard`
  const displayName = name?.trim() || 'sportowcze'

  const body = `
    <h1 class="h1" style="font-size:22px;font-weight:700;color:${T.h1};margin:0 0 12px;letter-spacing:-0.3px">Witaj w ${APP_NAME}! 🎉</h1>
    <p class="body-text" style="color:${T.body};margin:0 0 20px;line-height:1.65;font-size:15px">
      Cześć <strong>${displayName}</strong>,<br><br>
      Twój AI coaching system jest gotowy. Codziennie rano znajdziesz tu spersonalizowany brief — analizę regeneracji, rekomendacje żywieniowe i plan na dziś, dopasowane do Twoich treningów i danych.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px">
      <tr>
        <td style="padding:4px 0"><span style="color:${T.primary}">✓</span> <span class="body-text" style="color:${T.body};font-size:14px">Codzienny poranny brief</span></td>
      </tr>
      <tr>
        <td style="padding:4px 0"><span style="color:${T.primary}">✓</span> <span class="body-text" style="color:${T.body};font-size:14px">Analiza HRV i regeneracji</span></td>
      </tr>
      <tr>
        <td style="padding:4px 0"><span style="color:${T.primary}">✓</span> <span class="body-text" style="color:${T.body};font-size:14px">Rekomendacje żywieniowe</span></td>
      </tr>
      <tr>
        <td style="padding:4px 0"><span style="color:${T.primary}">✓</span> <span class="body-text" style="color:${T.body};font-size:14px">Analiza obciążenia treningowego</span></td>
      </tr>
    </table>
    ${ctaButton(url, 'Otwórz swój dashboard')}
    <p class="muted-text" style="color:${T.muted};font-size:13px;margin:0;line-height:1.55">
      Połącz TrainingPeaks w Ustawieniach, aby AI Coach miał dostęp do Twoich danych treningowych i generował jeszcze trafniejsze rekomendacje.
    </p>`

  return sendEmail(
    to,
    `Witaj w ${APP_NAME}, ${displayName}!`,
    emailLayout(`Twój AI personal coaching system jest gotowy. Sprawdź co czeka na Ciebie dzisiaj.`, body),
    { tags: [{ name: 'type', value: 'welcome' }] }
  )
}

// ─── Insight notification ─────────────────────────────────────────────────────

export async function sendInsightEmail(to: string, name: string, insightType: string, preview: string) {
  const url = `${APP_URL}/dashboard`
  const displayName = name?.trim() || ''
  const typeLabel =
    insightType === 'MORNING_BRIEF' ? 'Poranny brief' :
    insightType === 'EVENING_REVIEW' ? 'Wieczorne podsumowanie' :
    'Insight AI'

  const body = `
    <p class="muted-text" style="color:${T.muted};font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 10px;font-weight:600">${typeLabel}</p>
    <h1 class="h1" style="font-size:22px;font-weight:700;color:${T.h1};margin:0 0 20px;letter-spacing:-0.3px">Cześć ${displayName}!</h1>
    <div class="accent-block" style="background:${T.accent};border-left:3px solid ${T.accentBorder};border-radius:0 6px 6px 0;padding:16px;margin-bottom:24px">
      <p class="body-text" style="color:${T.body};margin:0;line-height:1.65;font-size:15px">${preview.slice(0, 280)}&hellip;</p>
    </div>
    ${ctaButton(url, 'Czytaj pełny raport')}
    <p class="muted-text" style="color:${T.muted};font-size:13px;margin:0;line-height:1.55">
      Twój AI Coach aktualizuje dane każdego dnia na podstawie Twoich treningów i aktywności.
    </p>`

  return sendEmail(
    to,
    `${typeLabel} — ${APP_NAME}`,
    emailLayout(`${typeLabel}: nowy insight od Twojego AI Coach czeka na Ciebie.`, body),
    { tags: [{ name: 'type', value: 'insight' }] }
  )
}
