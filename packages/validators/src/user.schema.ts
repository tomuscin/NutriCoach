// User-related Zod schemas — profile, onboarding, settings

import { z } from 'zod'

export const GenderSchema = z.enum(['MALE', 'FEMALE'])

export const ActivityLevelSchema = z.enum([
  'SEDENTARY',
  'LIGHT',
  'MODERATE',
  'VERY_ACTIVE',
  'EXTRA_ACTIVE',
])

export const SportTypeSchema = z.enum([
  'CYCLING', 'RUNNING', 'SWIMMING', 'TRIATHLON', 'DUATHLON',
  'STRENGTH', 'MTB', 'GRAVEL', 'ROWING', 'SKIING', 'HIKING',
  'YOGA', 'CROSSFIT', 'WALK', 'ELLIPTICAL', 'PILATES', 'OTHER',
])

export const UnitSystemSchema = z.enum(['METRIC', 'IMPERIAL'])

/** Onboarding wizard — step 1: identity */
export const OnboardingStep1Schema = z.object({
  sex: GenderSchema,
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
  heightCm: z.number().min(100).max(250),
})

/** Onboarding — step 2: current state */
export const OnboardingStep2Schema = z.object({
  currentWeightKg: z.number().min(30).max(300),
  targetWeightKg: z.number().min(30).max(300).optional(),
})

/** Onboarding — step 3: sport & activity */
export const OnboardingStep3Schema = z.object({
  mainSport: SportTypeSchema.default('CYCLING'),
  activityLevel: ActivityLevelSchema.default('MODERATE'),
  ftp: z.number().min(50).max(600).optional(),
  timezone: z.string().default('Europe/Warsaw'),
  unitSystem: UnitSystemSchema.default('METRIC'),
})

/** Full onboarding payload */
export const OnboardingSchema = OnboardingStep1Schema
  .merge(OnboardingStep2Schema)
  .merge(OnboardingStep3Schema)

export type OnboardingInput = z.infer<typeof OnboardingSchema>

/** Profile update — partial, all fields optional */
export const UpdateProfileSchema = z.object({
  heightCm: z.number().min(100).max(250).optional(),
  currentWeightKg: z.number().min(30).max(300).optional(),
  targetWeightKg: z.number().min(30).max(300).optional().nullable(),
  activityLevel: ActivityLevelSchema.optional(),
  mainSport: SportTypeSchema.optional(),
  ftp: z.number().min(50).max(600).optional().nullable(),
  lthr: z.number().min(60).max(220).optional().nullable(),
  timezone: z.string().optional(),
  unitSystem: UnitSystemSchema.optional(),
  preferredReductionMode: z.enum(['moderate', 'aggressive', 'very_aggressive']).optional(),
})

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>

/** Registration */
export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .max(128)
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain a number'),
  name: z.string().min(1).max(100).optional(),
})

export type RegisterInput = z.infer<typeof RegisterSchema>

/** Login */
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export type LoginInput = z.infer<typeof LoginSchema>

/** Password reset request */
export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
})

/** Password reset confirm */
export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
})

export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>
