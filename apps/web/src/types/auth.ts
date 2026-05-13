// Auth types & DTOs for NutriCoach
// Typed JWT, session, and auth context

import type { UserRole, UserStatus } from '@prisma/client'

// ─── Session user shape (embedded in JWT + session.user) ─────────────────────
export interface SessionUser {
  id: string
  email: string
  name: string | null
  role: UserRole
  status: UserStatus
  onboardingCompleted: boolean
  image?: string | null
}

// ─── JWT token payload ────────────────────────────────────────────────────────
export interface AuthJWT {
  sub: string
  email: string
  name: string | null
  role: UserRole
  status: UserStatus
  onboardingCompleted: boolean
  image?: string | null
  iat?: number
  exp?: number
  jti?: string
}

// ─── Auth context (returned by auth() calls) ──────────────────────────────────
export interface AuthContext {
  user: SessionUser
  expires: string
}

// ─── Login DTO ────────────────────────────────────────────────────────────────
export interface LoginDTO {
  email: string
  password: string
  rememberMe?: boolean
}

// ─── Register DTO ─────────────────────────────────────────────────────────────
export interface RegisterDTO {
  email: string
  password: string
  name: string
}

// ─── Auth result (used in server actions) ────────────────────────────────────
export type AuthResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; field?: string; code?: string }

// ─── Password reset DTO ───────────────────────────────────────────────────────
export interface ForgotPasswordDTO {
  email: string
}

export interface ResetPasswordDTO {
  token: string
  password: string
}

// ─── Onboarding state ─────────────────────────────────────────────────────────
export type OnboardingStep =
  | 'profile'
  | 'goals'
  | 'activity'
  | 'sport'
  | 'complete'

export interface OnboardingState {
  step: OnboardingStep
  completed: boolean
}
