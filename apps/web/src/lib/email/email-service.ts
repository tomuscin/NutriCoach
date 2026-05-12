// Email service — ETAP 7
// Transactional email via Resend SDK.
// All emails are sent server-side only.

import 'server-only'
import { Resend } from 'resend'
import { logger } from '@/lib/logger'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? 'NutriCoach <noreply@nutricoach.app>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3100'
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'NutriCoach'

// ─── Generic send helper ──────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; id?: string }> {
  try {
    const { data, error } = await resend.emails.send({ from: FROM, to, subject, html })
    if (error) {
      logger.error({ to, subject, error }, 'email.send.failed')
      return { ok: false }
    }
    logger.info({ to, subject, id: data?.id }, 'email.sent')
    return { ok: true, id: data?.id }
  } catch (err) {
    logger.error({ to, subject, err }, 'email.send.error')
    return { ok: false }
  }
}

// ─── Email verification ───────────────────────────────────────────────────────

export async function sendVerificationEmail(to: string, name: string, token: string) {
  const url = `${APP_URL}/auth/verify-email?token=${token}`
  const html = `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:40px 20px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;border:1px solid #e5e7eb">
    <div style="margin-bottom:24px">
      <span style="font-size:22px;font-weight:700;color:#0e7490">${APP_NAME}</span>
    </div>
    <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px">Potwierdź swój adres email</h1>
    <p style="color:#6b7280;margin:0 0 24px;line-height:1.6">Cześć ${name ?? 'trenujący'}! Kliknij poniższy przycisk, aby zweryfikować swój adres email i aktywować konto ${APP_NAME}.</p>
    <a href="${url}" style="display:inline-block;background:#0e7490;color:#fff;font-weight:600;font-size:15px;padding:12px 28px;border-radius:8px;text-decoration:none;margin-bottom:24px">Potwierdź email</a>
    <p style="color:#9ca3af;font-size:13px;line-height:1.5;margin:0 0 8px">Link jest ważny przez 24 godziny. Jeśli nie rejestrowano się w ${APP_NAME}, zignoruj tę wiadomość.</p>
    <p style="color:#d1d5db;font-size:12px;margin:16px 0 0">Lub skopiuj ten link: <a href="${url}" style="color:#0e7490;word-break:break-all">${url}</a></p>
  </div>
</body>
</html>`
  return sendEmail(to, `Potwierdź email — ${APP_NAME}`, html)
}

// ─── Password reset ────────────────────────────────────────────────────────────

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const url = `${APP_URL}/auth/reset-password?token=${token}`
  const html = `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:40px 20px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;border:1px solid #e5e7eb">
    <div style="margin-bottom:24px">
      <span style="font-size:22px;font-weight:700;color:#0e7490">${APP_NAME}</span>
    </div>
    <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px">Zmień swoje hasło</h1>
    <p style="color:#6b7280;margin:0 0 24px;line-height:1.6">Cześć ${name ?? ''}! Otrzymaliśmy prośbę o zresetowanie hasła do konta ${APP_NAME}. Kliknij poniższy przycisk, aby ustawić nowe hasło.</p>
    <a href="${url}" style="display:inline-block;background:#0e7490;color:#fff;font-weight:600;font-size:15px;padding:12px 28px;border-radius:8px;text-decoration:none;margin-bottom:24px">Resetuj hasło</a>
    <p style="color:#9ca3af;font-size:13px;line-height:1.5;margin:0 0 8px">Link jest ważny przez 1 godzinę. Jeśli nie prosiłeś/aś o reset hasła, zignoruj tę wiadomość — Twoje konto jest bezpieczne.</p>
    <p style="color:#d1d5db;font-size:12px;margin:16px 0 0">Lub skopiuj: <a href="${url}" style="color:#0e7490;word-break:break-all">${url}</a></p>
  </div>
</body>
</html>`
  return sendEmail(to, `Resetuj hasło — ${APP_NAME}`, html)
}

// ─── Welcome email (post-onboarding) ─────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string) {
  const url = `${APP_URL}/dashboard`
  const html = `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:40px 20px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;border:1px solid #e5e7eb">
    <div style="margin-bottom:24px">
      <span style="font-size:22px;font-weight:700;color:#0e7490">${APP_NAME}</span>
    </div>
    <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px">Witaj w ${APP_NAME}, ${name ?? 'sportowcze'}! 🎉</h1>
    <p style="color:#6b7280;margin:0 0 16px;line-height:1.6">Twój AI coaching system jest gotowy. Codziennie rano znajdziesz tu spersonalizowany brief, analizę regeneracji i rekomendacje żywieniowe dopasowane do Twoich treningów.</p>
    <p style="color:#6b7280;margin:0 0 24px;line-height:1.6">Połącz TrainingPeaks, aby Twój AI Coach miał dostęp do Twoich danych treningowych i mógł generować jeszcze bardziej trafne rekomendacje.</p>
    <a href="${url}" style="display:inline-block;background:#0e7490;color:#fff;font-weight:600;font-size:15px;padding:12px 28px;border-radius:8px;text-decoration:none;margin-bottom:24px">Otwórz dashboard</a>
    <p style="color:#9ca3af;font-size:12px;margin:0">Pozdrawiamy — Zespół ${APP_NAME}</p>
  </div>
</body>
</html>`
  return sendEmail(to, `Witaj w ${APP_NAME}!`, html)
}

// ─── Insight notification ─────────────────────────────────────────────────────

export async function sendInsightEmail(to: string, name: string, insightType: string, preview: string) {
  const url = `${APP_URL}/dashboard`
  const typeLabel = insightType === 'MORNING_BRIEF' ? 'Poranny brief' : insightType === 'EVENING_REVIEW' ? 'Wieczorne podsumowanie' : 'Insight AI'
  const html = `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:40px 20px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;border:1px solid #e5e7eb">
    <div style="margin-bottom:16px">
      <span style="font-size:22px;font-weight:700;color:#0e7490">${APP_NAME}</span>
    </div>
    <p style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px">${typeLabel}</p>
    <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 16px">Cześć ${name ?? ''}!</h1>
    <div style="background:#f0f9ff;border-left:3px solid #0e7490;border-radius:4px;padding:16px;margin-bottom:24px">
      <p style="color:#374151;margin:0;line-height:1.6;font-size:15px">${preview.slice(0, 280)}…</p>
    </div>
    <a href="${url}" style="display:inline-block;background:#0e7490;color:#fff;font-weight:600;font-size:15px;padding:12px 28px;border-radius:8px;text-decoration:none">Czytaj więcej</a>
  </div>
</body>
</html>`
  return sendEmail(to, `${typeLabel} — ${APP_NAME}`, html)
}
