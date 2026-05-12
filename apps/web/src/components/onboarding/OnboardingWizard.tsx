'use client'

// OnboardingWizard — functional 4-step onboarding
// Sends data to completeOnboardingAction on final step

import { useState, useTransition } from 'react'
import { completeOnboardingAction } from '@/lib/actions/onboarding'

const STEPS = [
  { id: 'profile', title: 'Twój profil', step: 1 },
  { id: 'goals', title: 'Twój cel', step: 2 },
  { id: 'activity', title: 'Aktywność', step: 3 },
  { id: 'sport', title: 'Sport', step: 4 },
]

interface OnboardingWizardProps {
  userId: string
}

export function OnboardingWizard({ userId: _userId }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Accumulated form data across steps
  const [formData, setFormData] = useState<Record<string, string>>({})

  function handleStepData(data: Record<string, string>) {
    setFormData((prev) => ({ ...prev, ...data }))
  }

  function nextStep() {
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  function prevStep() {
    setCurrentStep((s) => Math.max(s - 1, 0))
  }

  function handleSubmit() {
    setError(null)
    const fd = new FormData()
    for (const [k, v] of Object.entries(formData)) fd.append(k, v)

    startTransition(async () => {
      const result = await completeOnboardingAction(fd)
      if (result && !result.ok) {
        setError(result.error)
      }
      // On success → server action redirects to /dashboard
    })
  }

  const step = STEPS[currentStep]!
  const isLast = currentStep === STEPS.length - 1
  const progress = ((currentStep + 1) / STEPS.length) * 100

  return (
    <div className="space-y-8">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Krok {currentStep + 1} z {STEPS.length}</span>
          <span>{step.title}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        {currentStep === 0 && (
          <ProfileStep data={formData} onChange={handleStepData} />
        )}
        {currentStep === 1 && (
          <GoalsStep data={formData} onChange={handleStepData} />
        )}
        {currentStep === 2 && (
          <ActivityStep data={formData} onChange={handleStepData} />
        )}
        {currentStep === 3 && (
          <SportStep data={formData} onChange={handleStepData} />
        )}
      </div>

      {/* Error */}
      {error && (
        <div role="alert" className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        {currentStep > 0 && (
          <button
            type="button"
            onClick={prevStep}
            disabled={isPending}
            className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            Wróć
          </button>
        )}
        {isLast ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="flex-1 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Zapisywanie...' : 'Zakończ konfigurację'}
          </button>
        ) : (
          <button
            type="button"
            onClick={nextStep}
            className="flex-1 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
          >
            Dalej
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Step components ──────────────────────────────────────────────────────────

interface StepProps {
  data: Record<string, string>
  onChange: (d: Record<string, string>) => void
}

function ProfileStep({ data, onChange }: StepProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Podstawowe informacje</h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="sex" className="block text-sm font-medium">Płeć</label>
          <select
            id="sex"
            value={data.sex ?? ''}
            onChange={(e) => onChange({ sex: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Wybierz</option>
            <option value="MALE">Mężczyzna</option>
            <option value="FEMALE">Kobieta</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="birthDate" className="block text-sm font-medium">Data urodzenia</label>
          <input
            id="birthDate"
            type="date"
            value={data.birthDate ?? ''}
            onChange={(e) => onChange({ birthDate: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="heightCm" className="block text-sm font-medium">Wzrost (cm)</label>
          <input
            id="heightCm"
            type="number"
            min="140" max="220"
            value={data.heightCm ?? ''}
            onChange={(e) => onChange({ heightCm: e.target.value })}
            placeholder="178"
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="currentWeightKg" className="block text-sm font-medium">Waga (kg)</label>
          <input
            id="currentWeightKg"
            type="number"
            min="40" max="200" step="0.1"
            value={data.currentWeightKg ?? ''}
            onChange={(e) => onChange({ currentWeightKg: e.target.value })}
            placeholder="78.5"
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>
    </div>
  )
}

function GoalsStep({ data, onChange }: StepProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Twój cel</h2>

      <div className="space-y-1.5">
        <label htmlFor="targetWeightKg" className="block text-sm font-medium">Docelowa waga (kg)</label>
        <input
          id="targetWeightKg"
          type="number"
          min="40" max="200" step="0.1"
          value={data.targetWeightKg ?? ''}
          onChange={(e) => onChange({ targetWeightKg: e.target.value })}
          placeholder="73.0"
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <p className="text-xs text-muted-foreground">Pozostaw puste jeśli nie masz celu wagowego</p>
      </div>
    </div>
  )
}

function ActivityStep({ data, onChange }: StepProps) {
  const levels = [
    { value: 'SEDENTARY', label: 'Siedzący tryb życia', desc: 'Mało lub brak ruchu' },
    { value: 'LIGHT', label: 'Lekka aktywność', desc: '1-3 treningi/tydzień' },
    { value: 'MODERATE', label: 'Umiarkowana aktywność', desc: '3-5 treningów/tydzień' },
    { value: 'VERY_ACTIVE', label: 'Wysoka aktywność', desc: '6-7 treningów/tydzień' },
    { value: 'EXTRA_ACTIVE', label: 'Bardzo wysoka aktywność', desc: 'Treningi 2x/dzień' },
  ]

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Poziom aktywności</h2>
      <div className="space-y-2">
        {levels.map((level) => (
          <button
            key={level.value}
            type="button"
            onClick={() => onChange({ activityLevel: level.value })}
            className={`w-full flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
              data.activityLevel === level.value
                ? 'border-brand-500 bg-brand-500/10'
                : 'border-border hover:bg-muted'
            }`}
          >
            <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex-shrink-0 ${
              data.activityLevel === level.value
                ? 'border-brand-500 bg-brand-500'
                : 'border-muted-foreground'
            }`} />
            <div>
              <p className="text-sm font-medium">{level.label}</p>
              <p className="text-xs text-muted-foreground">{level.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function SportStep({ data, onChange }: StepProps) {
  const sports = [
    { value: 'CYCLING', label: 'Kolarstwo szosowe' },
    { value: 'MTB', label: 'MTB / Gravel' },
    { value: 'RUNNING', label: 'Bieganie' },
    { value: 'SWIMMING', label: 'Pływanie' },
    { value: 'TRIATHLON', label: 'Triathlon' },
    { value: 'STRENGTH', label: 'Siłownia' },
    { value: 'ROWING', label: 'Wioślarstwo' },
    { value: 'OTHER', label: 'Inne' },
  ]

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Główna dyscyplina</h2>
      <div className="grid grid-cols-2 gap-2">
        {sports.map((sport) => (
          <button
            key={sport.value}
            type="button"
            onClick={() => onChange({ mainSport: sport.value })}
            className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
              data.mainSport === sport.value
                ? 'border-brand-500 bg-brand-500/10 text-brand-600'
                : 'border-border hover:bg-muted text-foreground'
            }`}
          >
            {sport.label}
          </button>
        ))}
      </div>
    </div>
  )
}
