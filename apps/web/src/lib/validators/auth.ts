// Auth validation schemas — Zod
// Password rules, login/register, reset flows

import { z } from 'zod'

// ─── Password rules ───────────────────────────────────────────────────────────
// min 8 chars, uppercase, lowercase, number, special char
const passwordSchema = z
  .string()
  .min(8, 'Hasło musi mieć co najmniej 8 znaków')
  .max(128, 'Hasło nie może przekraczać 128 znaków')
  .refine((p) => /[A-Z]/.test(p), 'Hasło musi zawierać co najmniej jedną wielką literę')
  .refine((p) => /[a-z]/.test(p), 'Hasło musi zawierać co najmniej jedną małą literę')
  .refine((p) => /[0-9]/.test(p), 'Hasło musi zawierać co najmniej jedną cyfrę')
  .refine(
    (p) => /[^A-Za-z0-9]/.test(p),
    'Hasło musi zawierać co najmniej jeden znak specjalny'
  )

const emailSchema = z
  .string()
  .min(1, 'Email jest wymagany')
  .email('Nieprawidłowy format email')
  .max(254, 'Email jest za długi')
  .toLowerCase()

// ─── Login schema ─────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Hasło jest wymagane').max(128),
  rememberMe: z.boolean().optional().default(false),
})

export type LoginInput = z.infer<typeof loginSchema>

// ─── Register schema ──────────────────────────────────────────────────────────
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z
    .string()
    .min(2, 'Imię musi mieć co najmniej 2 znaki')
    .max(50, 'Imię jest za długie')
    .regex(/^[A-Za-zÀ-ÖØ-öø-ÿĄąĆćĘęŁłŃńÓóŚśŹźŻż\s-]+$/, 'Imię zawiera niedozwolone znaki'),
})

export type RegisterInput = z.infer<typeof registerSchema>

// ─── Forgot password schema ───────────────────────────────────────────────────
export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

// ─── Reset password schema ────────────────────────────────────────────────────
export const resetPasswordSchema = z
  .object({
    token: z.string().min(32, 'Nieprawidłowy token'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Hasła nie są identyczne',
    path: ['confirmPassword'],
  })

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

// ─── Password strength utility ────────────────────────────────────────────────
export function getPasswordStrength(password: string): {
  score: number // 0–4
  label: 'very-weak' | 'weak' | 'fair' | 'strong' | 'very-strong'
  feedback: string[]
} {
  const feedback: string[] = []
  let score = 0

  if (password.length >= 8) score++
  else feedback.push('Minimum 8 znaków')

  if (password.length >= 12) score++
  else feedback.push('Zalecane 12+ znaków')

  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  else feedback.push('Dodaj duże i małe litery')

  if (/[0-9]/.test(password)) score++
  else feedback.push('Dodaj cyfrę')

  if (/[^A-Za-z0-9]/.test(password)) score++
  else feedback.push('Dodaj znak specjalny (!@#$...)')

  // Cap at 4
  const capped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4
  const labels: Record<0 | 1 | 2 | 3 | 4, 'very-weak' | 'weak' | 'fair' | 'strong' | 'very-strong'> = {
    0: 'very-weak',
    1: 'weak',
    2: 'fair',
    3: 'strong',
    4: 'very-strong',
  }

  return { score: capped, label: labels[capped], feedback }
}
