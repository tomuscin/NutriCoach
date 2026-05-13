'use client'

// OnboardingWizard — 7-step ETAP 7 production onboarding
// Steps: Welcome → Goals → Profile data → TrainingPeaks → Notifications → AI prefs → Success

import { useState, useTransition } from 'react'
import { useSession } from 'next-auth/react'
import { completeOnboardingAction, updateOnboardingStepAction } from '@/lib/actions/onboarding'
import {
  CheckCircle2, Zap, Target, User, Link2, Bell, BrainCircuit, Trophy,
  ChevronRight, ChevronLeft, Loader2
} from 'lucide-react'

const STEPS = [
  { id: 'welcome', title: 'Witaj', icon: Trophy },
  { id: 'goals', title: 'Twój cel', icon: Target },
  { id: 'profile', title: 'Twój profil', icon: User },
  { id: 'training', title: 'TrainingPeaks', icon: Link2 },
  { id: 'notifications', title: 'Powiadomienia', icon: Bell },
  { id: 'ai', title: 'Coach AI', icon: BrainCircuit },
  { id: 'success', title: 'Gotowe!', icon: CheckCircle2 },
] as const

interface Props { userId: string; initialStep?: number }

export function OnboardingWizard({ userId: _userId, initialStep = 0 }: Props) {
  const [step, setStep] = useState(Math.min(Math.max(initialStep, 0), STEPS.length - 2))
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<Record<string, string>>({})
  const { update } = useSession()

  function setField(key: string, value: string) {
    setData(prev => ({ ...prev, [key]: value }))
  }

  function goNext() {
    const nextStep = step + 1
    setStep(nextStep)
    updateOnboardingStepAction(nextStep).catch(() => {})
  }

  function goBack() { setStep(s => Math.max(s - 1, 0)) }

  function handleFinish() {
    setError(null)
    const fd = new FormData()
    for (const [k, v] of Object.entries(data)) fd.append(k, v)
    startTransition(async () => {
      const result = await completeOnboardingAction(fd)
      if (!result) return
      if (!result.ok) {
        setError(result.error)
        return
      }
      // Update JWT so middleware sees onboardingCompleted=true before navigation.
      // Then hard-navigate — window.location.href forces a full page load which
      // re-reads the updated JWT cookie. router.push() navigates before the cookie
      // is written, causing middleware to redirect back to /onboarding.
      await update({ onboardingCompleted: true })
      window.location.href = '/dashboard'
    })
  }

  const progress = ((step + 1) / STEPS.length) * 100
  const isLast = step === STEPS.length - 1
  const isFirst = step === 0
  const isSuccess = step === STEPS.length - 1

  return (
    <div className="space-y-6">
      {/* Progress */}
      {!isSuccess && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Krok {step + 1} z {STEPS.length}</span>
            <span>{STEPS[step]!.title}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }}/>
          </div>
          {/* Step dots */}
          <div className="flex gap-2 justify-center pt-1">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              return (
                <div key={s.id} className={`flex items-center justify-center rounded-full transition-all ${
                  i < step ? 'h-6 w-6 bg-primary text-primary-foreground' :
                  i === step ? 'h-7 w-7 bg-primary text-primary-foreground ring-2 ring-primary/30' :
                  'h-6 w-6 bg-muted text-muted-foreground'
                }`}>
                  {i < step ? <CheckCircle2 className="h-3.5 w-3.5"/> : <Icon className="h-3 w-3"/>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Step content */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm min-h-[280px]">
        {step === 0 && <WelcomeStep />}
        {step === 1 && <GoalsStep data={data} setField={setField} />}
        {step === 2 && <ProfileStep data={data} setField={setField} />}
        {step === 3 && <TrainingPeaksStep />}
        {step === 4 && <NotificationsStep data={data} setField={setField} />}
        {step === 5 && <AIPrefsStep data={data} setField={setField} />}
        {step === 6 && <SuccessStep />}
      </div>

      {error && (
        <div role="alert" className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        {!isFirst && !isSuccess && (
          <button type="button" onClick={goBack} disabled={isPending}
            className="flex items-center gap-1.5 rounded-xl border border-border px-5 py-3 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-colors">
            <ChevronLeft className="h-4 w-4"/>Wróć
          </button>
        )}
        {isSuccess ? (
          <button type="button" onClick={handleFinish} disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all">
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin"/>Zapisywanie…</> : <><Zap className="h-4 w-4"/>Przejdź do aplikacji</>}
          </button>
        ) : (
          <button type="button" onClick={goNext}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all">
            Dalej<ChevronRight className="h-4 w-4"/>
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Step 1: Welcome ─────────────────────────────────────────────────────────

function WelcomeStep() {
  return (
    <div className="flex flex-col items-center gap-5 py-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <Zap className="h-10 w-10 text-primary"/>
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Witaj w NutriCoach!</h2>
        <p className="text-muted-foreground leading-relaxed max-w-sm">
          Personalizowany coaching żywieniowy oparty na Twoich danych treningowych i AI.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3 w-full mt-2">
        {[['Spersonalizowany plan', Target], ['Analiza danych', BrainCircuit], ['Progres w czasie', Trophy]].map(([label, Icon]) => (
          <div key={label as string} className="flex flex-col items-center gap-2 rounded-xl bg-muted/50 p-3">
            {(() => { const I = Icon as React.ElementType; return <I className="h-5 w-5 text-primary"/> })()}
            <span className="text-xs text-muted-foreground text-center leading-snug">{label as string}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Step 2: Goals ────────────────────────────────────────────────────────────

const goalOptions = [
  { value: 'performance', label: 'Poprawa wyników', desc: 'Szybciej, dalej, mocniej' },
  { value: 'weight_loss', label: 'Redukcja masy ciała', desc: 'Zdrowe chudnięcie' },
  { value: 'endurance', label: 'Wytrzymałość', desc: 'Długie dystanse' },
  { value: 'recovery', label: 'Regeneracja', desc: 'Lepsza jakość snu i odnowy' },
  { value: 'general_health', label: 'Ogólne zdrowie', desc: 'Zbilansowana dieta' },
]

function GoalsStep({ data, setField }: { data: Record<string, string>; setField: (k: string, v: string) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Jaki jest Twój główny cel?</h2>
        <p className="text-sm text-muted-foreground">AI Coach dostosuje rekomendacje do Twojego priorytetu.</p>
      </div>
      <div className="space-y-2">
        {goalOptions.map(o => (
          <button key={o.value} type="button" onClick={() => setField('primaryGoal', o.value)}
            className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${data.primaryGoal === o.value ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'}`}>
            <div className={`h-4 w-4 rounded-full border-2 flex-shrink-0 transition-colors ${data.primaryGoal === o.value ? 'border-primary bg-primary' : 'border-muted-foreground'}`}/>
            <div>
              <p className="text-sm font-medium">{o.label}</p>
              <p className="text-xs text-muted-foreground">{o.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Step 3: Profile data ─────────────────────────────────────────────────────

function ProfileStep({ data, setField }: { data: Record<string, string>; setField: (k: string, v: string) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Twoje dane fizyczne</h2>
        <p className="text-sm text-muted-foreground">Potrzebujemy ich do obliczenia Twojego zapotrzebowania kalorycznego.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Płeć</label>
          <select value={data.sex ?? ''} onChange={e => setField('sex', e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
            <option value="">Wybierz</option>
            <option value="MALE">Mężczyzna</option>
            <option value="FEMALE">Kobieta</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Data urodzenia</label>
          <input type="date" value={data.birthDate ?? ''} onChange={e => setField('birthDate', e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"/>
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Wzrost (cm)</label>
          <input type="number" min="140" max="220" value={data.heightCm ?? ''} onChange={e => setField('heightCm', e.target.value)}
            placeholder="178"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"/>
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Waga (kg)</label>
          <input type="number" min="40" max="200" step="0.1" value={data.currentWeightKg ?? ''} onChange={e => setField('currentWeightKg', e.target.value)}
            placeholder="78.5"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"/>
        </div>
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium">Poziom aktywności</label>
        {[
          { v: 'SEDENTARY', l: 'Siedzący', d: 'Mało ruchu' },
          { v: 'LIGHT', l: 'Lekka aktywność', d: '1-3 treningi/tydzień' },
          { v: 'MODERATE', l: 'Umiarkowana', d: '3-5 treningów/tydzień' },
          { v: 'VERY_ACTIVE', l: 'Wysoka', d: '6+ treningów/tydzień' },
        ].map(o => (
          <button key={o.v} type="button" onClick={() => setField('activityLevel', o.v)}
            className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${data.activityLevel === o.v ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'}`}>
            <div className={`h-4 w-4 rounded-full border-2 flex-shrink-0 ${data.activityLevel === o.v ? 'border-primary bg-primary' : 'border-muted-foreground'}`}/>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{o.l}</span>
              <span className="text-xs text-muted-foreground">— {o.d}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Step 4: TrainingPeaks ────────────────────────────────────────────────────

function TrainingPeaksStep() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Połącz TrainingPeaks</h2>
        <p className="text-sm text-muted-foreground">NutriCoach synchronizuje dane treningowe z TrainingPeaks, aby dostosować rekomendacje kaloryczne do każdego dnia.</p>
      </div>
      <div className="rounded-xl bg-muted/50 border border-border p-4 space-y-3">
        {[
          'Automatyczna synchronizacja treningów',
          'Kalorie dostosowane do obciążenia dnia',
          'Inteligentne wyczucie czasu dla posiłków i przekąsek',
        ].map(f => (
          <div key={f} className="flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0"/>
            <span className="text-sm">{f}</span>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-center space-y-1">
        <p className="text-sm font-medium text-foreground">Integracja dostępna po konfiguracji</p>
        <p className="text-xs text-muted-foreground">Połącz TrainingPeaks w <strong>Ustawienia → Integracje</strong> po zakończeniu konfiguracji profilu.</p>
      </div>
    </div>
  )
}

// ─── Step 5: Notifications ────────────────────────────────────────────────────

function NotificationsStep({ data, setField }: { data: Record<string, string>; setField: (k: string, v: string) => void }) {
  const emailEnabled = data.emailNotifications !== 'false'
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Powiadomienia</h2>
        <p className="text-sm text-muted-foreground">Wybierz, jak chcesz być informowany/a przez AI Coacha.</p>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-border p-4">
          <div>
            <p className="text-sm font-medium">Codzienny brief</p>
            <p className="text-xs text-muted-foreground">Plan żywieniowy na dziś, rano</p>
          </div>
          <Toggle enabled={emailEnabled} onChange={v => setField('emailNotifications', v ? 'true' : 'false')}/>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border p-4">
          <div>
            <p className="text-sm font-medium">Powiadomienia push</p>
            <p className="text-xs text-muted-foreground">Przypomnienia i alerty w przeglądarce</p>
          </div>
          <Toggle
            enabled={data.pushNotifications === 'true'}
            onChange={v => setField('pushNotifications', v ? 'true' : 'false')}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center">Możesz zmienić te ustawienia w każdej chwili w sekcji Ustawienia.</p>
    </div>
  )
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={enabled} onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${enabled ? 'bg-primary' : 'bg-muted'}`}>
      <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-sm transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`}/>
    </button>
  )
}

// ─── Step 6: AI Preferences ───────────────────────────────────────────────────

const toneOptions = [
  { v: 'supportive', l: 'Wspierający', d: 'Motywacja i pozytywne nastawienie' },
  { v: 'balanced', l: 'Wyważony', d: 'Fakty + wsparcie emocjonalne' },
  { v: 'direct', l: 'Bezpośredni', d: 'Konkretne liczby i fakty' },
]

function AIPrefsStep({ data, setField }: { data: Record<string, string>; setField: (k: string, v: string) => void }) {
  const tone = data.aiCoachingTone ?? 'balanced'
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Styl komunikacji AI Coacha</h2>
        <p className="text-sm text-muted-foreground">Jak chcesz, żeby AI Coach się do Ciebie zwracał?</p>
      </div>
      <div className="space-y-2">
        {toneOptions.map(o => (
          <button key={o.v} type="button" onClick={() => setField('aiCoachingTone', o.v)}
            className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${tone === o.v ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'}`}>
            <div className={`h-4 w-4 rounded-full border-2 flex-shrink-0 ${tone === o.v ? 'border-primary bg-primary' : 'border-muted-foreground'}`}/>
            <div>
              <p className="text-sm font-medium">{o.l}</p>
              <p className="text-xs text-muted-foreground">{o.d}</p>
            </div>
          </button>
        ))}
      </div>
      <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
        <div className="flex items-start gap-3">
          <BrainCircuit className="h-5 w-5 text-primary mt-0.5 flex-shrink-0"/>
          <div>
            <p className="text-sm font-medium">AI Coach jest gotowy</p>
            <p className="text-xs text-muted-foreground mt-0.5">Po zakończeniu konfiguracji Twój Coach wygeneruje pierwszą analizę na podstawie Twoich danych.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Step 7: Success ──────────────────────────────────────────────────────────

function SuccessStep() {
  return (
    <div className="flex flex-col items-center gap-5 py-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/15">
        <CheckCircle2 className="h-10 w-10 text-green-500"/>
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Konfiguracja gotowa!</h2>
        <p className="text-muted-foreground leading-relaxed max-w-sm">
          Twój profil jest gotowy. AI Coach przygotuje pierwszą analizę zaraz po uruchomieniu aplikacji.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 w-full text-left">
        {['Spersonalizowane rekomendacje kaloryczne', 'Codzienne briefy dopasowane do treningu', 'Inteligentna analiza obciążenia'].map(f => (
          <div key={f} className="flex items-center gap-2.5 rounded-xl bg-muted/50 px-4 py-3">
            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0"/>
            <span className="text-sm">{f}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
