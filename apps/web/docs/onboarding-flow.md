# Onboarding Flow — Leaxaro ETAP 7

## Overview

7-step onboarding wizard shown to new users after registration. Progress is tracked via `User.onboardingStep` (0–8).

## State Machine

| Step | Value | Screen |
|------|-------|--------|
| 0 | Not started | - |
| 1 | Welcome | WelcomeStep |
| 2 | Goals | GoalsStep |
| 3 | Profile | ProfileStep |
| 4 | TrainingPeaks | TrainingPeaksStep |
| 5 | Notifications | NotificationsStep |
| 6 | AI Preferences | AIPrefsStep |
| 7 | Success | SuccessStep |
| 8 | **Complete** | — redirects to /dashboard |

## Redirect Logic

```
User logs in → requireOnboarded()
  → if onboardingStep < 8 → redirect to /onboarding
  → else → proceed to protected route

/onboarding page → OnboardingWizard component
  → shows step based on user.onboardingStep (from session/DB)
  → each goNext() calls updateOnboardingStepAction(nextStep)
  → final submit calls completeOnboardingAction(formData)
      → prisma.user.update({ onboardingStep: 8 })
      → creates/updates UserPreferences with wizard data
      → trackEvent({ event: 'onboarding.completed' })
      → sendWelcomeEmail(email, name)  ← fire-and-forget
      → redirect to /dashboard
```

## Step Data Collected

| Step | Fields |
|------|--------|
| Goals | primaryGoal: performance \| weight_loss \| endurance \| recovery \| general_health |
| Profile | sex, birthDate, heightCm, currentWeightKg, activityLevel |
| TrainingPeaks | integration CTA (navigates to /settings/integrations) |
| Notifications | emailNotifications (bool), pushNotifications (bool) |
| AI Prefs | aiCoachingTone: gentle \| balanced \| direct |

## Analytics Events

- `onboarding.step_completed` — on each step advance (with `{ step, stepName }` properties)
- `onboarding.completed` — on final submit

## updateOnboardingStepAction

```ts
// Server action, authenticated
async function updateOnboardingStepAction(step: number): Promise<void>
```

Safe: only allows increments — won't let step go backwards unless step === 0 (reset).

## Database

`User.onboardingStep: Int @default(0)` — persisted to MySQL.
