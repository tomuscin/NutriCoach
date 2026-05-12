'use client'

// SettingsClient — tabbed settings UI
// Tabs: AI Coach | Powiadomienia | Prywatność | Konto

import { useState, useTransition } from 'react'
import { BrainCircuit, Bell, ShieldCheck, User, Check, Loader2 } from 'lucide-react'
import type { UserPreferences } from '@prisma/client'

interface Props {
  userId: string
  email: string
  name: string
  prefs: UserPreferences | null
  mainSport: string | null
  activityLevel: string | null
}

const tabs = [
  { id: 'ai', label: 'AI Coach', icon: BrainCircuit },
  { id: 'notifications', label: 'Powiadomienia', icon: Bell },
  { id: 'privacy', label: 'Prywatność', icon: ShieldCheck },
  { id: 'account', label: 'Konto', icon: User },
] as const

type Tab = typeof tabs[number]['id']

export function SettingsClient({ userId, email, name, prefs }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('ai')
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Local state mirrors prefs
  const [aiTone, setAiTone] = useState(prefs?.aiCoachingTone ?? 'balanced')
  const [aiVerbosity, setAiVerbosity] = useState(prefs?.aiVerbosity ?? 'normal')
  const [unitSystem, setUnitSystem] = useState(prefs?.unitSystem ?? 'metric')
  const [emailNotif, setEmailNotif] = useState(prefs?.emailNotifications ?? true)
  const [pushNotif, setPushNotif] = useState(prefs?.pushNotifications ?? false)
  const [insightSchedule, setInsightSchedule] = useState(prefs?.insightSchedule ?? 'auto')
  const [analyticsEnabled, setAnalyticsEnabled] = useState(prefs?.analyticsEnabled ?? true)
  const [crashReporting, setCrashReporting] = useState(prefs?.crashReporting ?? true)

  async function savePrefs() {
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch('/api/settings/preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            aiCoachingTone: aiTone,
            aiVerbosity,
            unitSystem,
            emailNotifications: emailNotif,
            pushNotifications: pushNotif,
            insightSchedule,
            analyticsEnabled,
            crashReporting,
          }),
        })
        if (!res.ok) throw new Error('save failed')
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      } catch {
        setError('Nie udało się zapisać ustawień. Spróbuj ponownie.')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl bg-muted p-1 overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 flex-shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <Icon className="h-4 w-4"/>{tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="rounded-2xl border bg-card p-5 space-y-5">
        {activeTab === 'ai' && (
          <AITab aiTone={aiTone} setAiTone={setAiTone} aiVerbosity={aiVerbosity} setAiVerbosity={setAiVerbosity} unitSystem={unitSystem} setUnitSystem={setUnitSystem}/>
        )}
        {activeTab === 'notifications' && (
          <NotificationsTab emailNotif={emailNotif} setEmailNotif={setEmailNotif} pushNotif={pushNotif} setPushNotif={setPushNotif} insightSchedule={insightSchedule} setInsightSchedule={setInsightSchedule}/>
        )}
        {activeTab === 'privacy' && (
          <PrivacyTab analyticsEnabled={analyticsEnabled} setAnalyticsEnabled={setAnalyticsEnabled} crashReporting={crashReporting} setCrashReporting={setCrashReporting}/>
        )}
        {activeTab === 'account' && (
          <AccountTab email={email} name={name} userId={userId}/>
        )}
      </div>

      {/* Save / error */}
      {activeTab !== 'account' && (
        <div className="flex items-center gap-3">
          <button type="button" onClick={savePrefs} disabled={isPending}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all">
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin"/>Zapisywanie…</> : saved ? <><Check className="h-4 w-4"/>Zapisano</> : 'Zapisz zmiany'}
          </button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}
    </div>
  )
}

// ─── AI Tab ───────────────────────────────────────────────────────────────────

function AITab({ aiTone, setAiTone, aiVerbosity, setAiVerbosity, unitSystem, setUnitSystem }: {
  aiTone: string; setAiTone: (v: string) => void
  aiVerbosity: string; setAiVerbosity: (v: string) => void
  unitSystem: string; setUnitSystem: (v: string) => void
}) {
  return (
    <div className="space-y-5">
      <SectionHeading>Coach AI</SectionHeading>
      <FieldGroup label="Styl komunikacji" hint="Jak AI Coach formułuje swoje rekomendacje">
        {[
          { v: 'supportive', l: 'Wspierający', d: 'Motywacja i pozytywne nastawienie' },
          { v: 'balanced', l: 'Wyważony', d: 'Fakty + wsparcie emocjonalne' },
          { v: 'direct', l: 'Bezpośredni', d: 'Konkretne liczby i fakty' },
        ].map(o => (
          <RadioOption key={o.v} selected={aiTone === o.v} onClick={() => setAiTone(o.v)} label={o.l} desc={o.d}/>
        ))}
      </FieldGroup>
      <FieldGroup label="Szczegółowość analiz">
        <div className="flex gap-2">
          {[{v:'brief',l:'Krótko'},{v:'normal',l:'Normalnie'},{v:'detailed',l:'Szczegółowo'}].map(o => (
            <button key={o.v} type="button" onClick={() => setAiVerbosity(o.v)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${aiVerbosity === o.v ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'}`}>
              {o.l}
            </button>
          ))}
        </div>
      </FieldGroup>
      <FieldGroup label="Jednostki">
        <div className="flex gap-2">
          {[{v:'metric',l:'Metryczny (kg, km)'},{v:'imperial',l:'Imperialny (lbs, mi)'}].map(o => (
            <button key={o.v} type="button" onClick={() => setUnitSystem(o.v)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${unitSystem === o.v ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'}`}>
              {o.l}
            </button>
          ))}
        </div>
      </FieldGroup>
    </div>
  )
}

// ─── Notifications Tab ────────────────────────────────────────────────────────

function NotificationsTab({ emailNotif, setEmailNotif, pushNotif, setPushNotif, insightSchedule, setInsightSchedule }: {
  emailNotif: boolean; setEmailNotif: (v: boolean) => void
  pushNotif: boolean; setPushNotif: (v: boolean) => void
  insightSchedule: string; setInsightSchedule: (v: string) => void
}) {
  return (
    <div className="space-y-5">
      <SectionHeading>Powiadomienia</SectionHeading>
      <div className="space-y-3">
        <ToggleRow label="Powiadomienia email" desc="Codzienne briefy i AI insights na email" enabled={emailNotif} onChange={setEmailNotif}/>
        <ToggleRow label="Powiadomienia push" desc="Alerty w przeglądarce" enabled={pushNotif} onChange={setPushNotif}/>
      </div>
      <FieldGroup label="Harmonogram briefów">
        {[
          {v:'auto',l:'Automatyczny',d:'AI decyduje na podstawie treningu'},
          {v:'morning',l:'Rano (7:00)',d:'Zawsze rano przed treningiem'},
          {v:'evening',l:'Wieczorem (20:00)',d:'Podsumowanie na koniec dnia'},
        ].map(o => (
          <RadioOption key={o.v} selected={insightSchedule === o.v} onClick={() => setInsightSchedule(o.v)} label={o.l} desc={o.d}/>
        ))}
      </FieldGroup>
    </div>
  )
}

// ─── Privacy Tab ──────────────────────────────────────────────────────────────

function PrivacyTab({ analyticsEnabled, setAnalyticsEnabled, crashReporting, setCrashReporting }: {
  analyticsEnabled: boolean; setAnalyticsEnabled: (v: boolean) => void
  crashReporting: boolean; setCrashReporting: (v: boolean) => void
}) {
  return (
    <div className="space-y-5">
      <SectionHeading>Prywatność i dane</SectionHeading>
      <div className="space-y-3">
        <ToggleRow label="Analityka produktowa" desc="Anonimowe dane o użytkowaniu pomagają ulepszać aplikację" enabled={analyticsEnabled} onChange={setAnalyticsEnabled}/>
        <ToggleRow label="Raporty błędów" desc="Automatyczne wysyłanie anonimowych raportów awarii" enabled={crashReporting} onChange={setCrashReporting}/>
      </div>
      <div className="space-y-2 pt-2">
        <p className="text-sm font-medium">Dokumenty prawne</p>
        <div className="flex flex-col gap-1.5">
          {[['Regulamin','/terms'],['Polityka prywatności','/privacy'],['Zastrzeżenia zdrowotne','/health-disclaimer']].map(([l,h]) => (
            <a key={h} href={h} target="_blank" rel="noopener" className="text-sm text-primary hover:underline">{l} ↗</a>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Account Tab ──────────────────────────────────────────────────────────────

function AccountTab({ email, name, userId: _userId }: { email: string; name: string; userId: string }) {
  return (
    <div className="space-y-5">
      <SectionHeading>Konto</SectionHeading>
      <div className="space-y-3">
        <div className="rounded-xl bg-muted/50 px-4 py-3 space-y-1">
          <p className="text-xs text-muted-foreground">Imię</p>
          <p className="text-sm font-medium">{name || '—'}</p>
        </div>
        <div className="rounded-xl bg-muted/50 px-4 py-3 space-y-1">
          <p className="text-xs text-muted-foreground">Email</p>
          <p className="text-sm font-medium">{email}</p>
        </div>
      </div>
      <div className="space-y-2">
        <a href="/auth/forgot-password" className="block text-sm text-primary hover:underline">Zmień hasło</a>
      </div>
      <div className="pt-2 border-t border-border space-y-2">
        <p className="text-sm font-medium text-destructive">Strefa niebezpieczna</p>
        <p className="text-xs text-muted-foreground">Usunięcie konta jest nieodwracalne. Wszystkie dane zostaną trwale usunięte.</p>
        <a href="/settings/delete-account" className="inline-flex items-center rounded-xl border border-destructive/30 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors">
          Usuń konto
        </a>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold">{children}</h2>
}

function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function RadioOption({ selected, onClick, label, desc }: { selected: boolean; onClick: () => void; label: string; desc?: string }) {
  return (
    <button type="button" onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-xl border px-4 py-2.5 text-left transition-colors ${selected ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'}`}>
      <div className={`h-4 w-4 rounded-full border-2 flex-shrink-0 ${selected ? 'border-primary bg-primary' : 'border-muted-foreground'}`}/>
      <div>
        <p className="text-sm font-medium">{label}</p>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
    </button>
  )
}

function ToggleRow({ label, desc, enabled, onChange }: { label: string; desc?: string; enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border p-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
      <button type="button" role="switch" aria-checked={enabled} onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${enabled ? 'bg-primary' : 'bg-muted'}`}>
        <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`}/>
      </button>
    </div>
  )
}
