'use client'

// RegisterForm — ETAP 7 production auth UX
// Features: confirm password, password strength meter, terms consent, inline validation, mobile-optimized

import { useTransition, useState, useCallback } from 'react'
import { registerAction } from '@/lib/actions/auth'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Check, X, Loader2, CheckCircle2 } from 'lucide-react'

type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong'

function getPasswordStrength(password: string): { level: StrengthLevel; score: number; checks: Record<string, boolean> } {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  }
  const score = Object.values(checks).filter(Boolean).length
  const level: StrengthLevel = score <= 2 ? 'weak' : score === 3 ? 'fair' : score === 4 ? 'good' : 'strong'
  return { level, score, checks }
}

const strengthConfig = {
  weak: { label: 'Słabe', color: 'bg-red-500', textColor: 'text-red-500' },
  fair: { label: 'Przeciętne', color: 'bg-amber-500', textColor: 'text-amber-500' },
  good: { label: 'Dobre', color: 'bg-blue-500', textColor: 'text-blue-500' },
  strong: { label: 'Silne', color: 'bg-green-500', textColor: 'text-green-500' },
}

const checkLabels: Record<string, string> = {
  length: 'Min. 8 znaków',
  uppercase: 'Wielka litera',
  lowercase: 'Mała litera',
  number: 'Cyfra',
  special: 'Znak specjalny',
}

export function RegisterForm() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showStrength, setShowStrength] = useState(false)
  const router = useRouter()

  const [values, setValues] = useState({ name: '', email: '', password: '', confirmPassword: '', acceptTerms: false })

  const setField = useCallback((field: keyof typeof values, value: string | boolean) => {
    setValues(prev => ({ ...prev, [field]: value }))
    setFieldErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }, [])

  const strength = values.password.length > 0 ? getPasswordStrength(values.password) : null
  const confirmMatch = values.confirmPassword.length > 0 && values.password === values.confirmPassword

  function validate(): boolean {
    const errs: Record<string, string> = {}
    const trimmedName = values.name.trim()
    if (!trimmedName || trimmedName.length < 2) errs.name = 'Imię musi mieć co najmniej 2 znaki'
    else if (trimmedName.length > 50) errs.name = 'Imię jest za długie (max 50 znaków)'
    if (!values.email.trim()) errs.email = 'Email jest wymagany'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errs.email = 'Nieprawidłowy format email'
    else if (values.email.length > 254) errs.email = 'Email jest za długi'
    if (!values.password) errs.password = 'Hasło jest wymagane'
    else if (!strength || strength.score < 5) {
      const missing = strength ? Object.entries(strength.checks).filter(([, ok]) => !ok).map(([k]) => checkLabels[k]).join(', ') : ''
      errs.password = missing ? `Uzupełnij: ${missing}` : 'Hasło nie spełnia wymagań bezpieczeństwa'
    }
    if (!values.confirmPassword) errs.confirmPassword = 'Potwierdzenie hasła jest wymagane'
    else if (values.password !== values.confirmPassword) errs.confirmPassword = 'Hasła muszą być identyczne'
    if (!values.acceptTerms) errs.acceptTerms = 'Musisz zaakceptować Regulamin i Politykę prywatności'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (isPending || success) return // double-submit guard
    setError(null)
    if (!validate()) return
    const fd = new FormData()
    fd.append('name', values.name.trim())
    fd.append('email', values.email.toLowerCase().trim())
    fd.append('password', values.password)
    fd.append('confirmPassword', values.confirmPassword)
    fd.append('acceptTerms', 'true')
    startTransition(async () => {
      const result = await registerAction(fd)
      if (result.ok) {
        setSuccess(true)
        setTimeout(() => router.push('/auth/login?registered=1'), 1800)
      } else {
        setError(result.error)
        if (result.field) setFieldErrors(prev => ({ ...prev, [result.field!]: result.error }))
      }
    })
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center animate-in fade-in slide-in-from-bottom-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15">
          <CheckCircle2 className="h-8 w-8 text-green-500" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Konto zostało utworzone!</h2>
          <p className="text-sm text-muted-foreground">Sprawdź skrzynkę email, aby potwierdzić adres.</p>
          <p className="text-xs text-muted-foreground mt-2">Za chwilę zostaniesz przekierowany/a do logowania…</p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Name */}
      <div className="space-y-1.5">
        <label htmlFor="reg-name" className="block text-sm font-medium">Imię <span className="text-destructive">*</span></label>
        <input id="reg-name" name="name" type="text" autoComplete="given-name" required disabled={isPending}
          value={values.name} onChange={e => setField('name', e.target.value)} placeholder="Tomasz"
          className={`w-full rounded-xl border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 transition-colors ${fieldErrors.name ? 'border-destructive' : 'border-border'}`}
        />
        {fieldErrors.name && <p className="text-xs text-destructive flex items-center gap-1"><X className="h-3 w-3"/>{fieldErrors.name}</p>}
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <label htmlFor="reg-email" className="block text-sm font-medium">Email <span className="text-destructive">*</span></label>
        <input id="reg-email" name="email" type="email" autoComplete="email" required disabled={isPending}
          value={values.email} onChange={e => setField('email', e.target.value)} placeholder="twoj@email.pl"
          className={`w-full rounded-xl border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 transition-colors ${fieldErrors.email ? 'border-destructive' : 'border-border'}`}
        />
        {fieldErrors.email && <p className="text-xs text-destructive flex items-center gap-1"><X className="h-3 w-3"/>{fieldErrors.email}</p>}
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label htmlFor="reg-password" className="block text-sm font-medium">Hasło <span className="text-destructive">*</span></label>
        <div className="relative">
          <input id="reg-password" name="password" type={showPassword ? 'text' : 'password'}
            autoComplete="new-password" required disabled={isPending}
            value={values.password}
            onChange={e => { setField('password', e.target.value); setShowStrength(true) }}
            placeholder="Min. 8 znaków"
            className={`w-full rounded-xl border bg-background px-4 py-3 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 transition-colors ${fieldErrors.password ? 'border-destructive' : 'border-border'}`}
          />
          <button type="button" onClick={() => setShowPassword(p => !p)} tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}>
            {showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
          </button>
        </div>
        {showStrength && strength && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <div className="flex flex-1 gap-1">
                {[0,1,2,3].map(i => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < strength.score - 1 ? strengthConfig[strength.level].color : 'bg-border'}`}/>
                ))}
              </div>
              <span className={`text-xs font-medium ${strengthConfig[strength.level].textColor}`}>{strengthConfig[strength.level].label}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              {Object.entries(strength.checks).map(([key, ok]) => (
                <span key={key} className={`flex items-center gap-1 text-xs ${ok ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                  {ok ? <Check className="h-3 w-3"/> : <X className="h-3 w-3"/>}{checkLabels[key]}
                </span>
              ))}
            </div>
          </div>
        )}
        {fieldErrors.password && <p className="text-xs text-destructive flex items-center gap-1"><X className="h-3 w-3"/>{fieldErrors.password}</p>}
      </div>

      {/* Confirm password */}
      <div className="space-y-1.5">
        <label htmlFor="reg-confirm" className="block text-sm font-medium">Powtórz hasło <span className="text-destructive">*</span></label>
        <div className="relative">
          <input id="reg-confirm" name="confirmPassword" type={showConfirm ? 'text' : 'password'}
            autoComplete="new-password" required disabled={isPending}
            value={values.confirmPassword}
            onChange={e => setField('confirmPassword', e.target.value)}
            placeholder="Powtórz hasło"
            className={`w-full rounded-xl border bg-background px-4 py-3 pr-16 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 transition-colors ${fieldErrors.confirmPassword ? 'border-destructive' : values.confirmPassword && confirmMatch ? 'border-green-500' : 'border-border'}`}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {values.confirmPassword && (confirmMatch ? <Check className="h-4 w-4 text-green-500"/> : <X className="h-4 w-4 text-destructive"/>)}
            <button type="button" onClick={() => setShowConfirm(p => !p)} tabIndex={-1}
              className="text-muted-foreground hover:text-foreground transition-colors">
              {showConfirm ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
            </button>
          </div>
        </div>
        {fieldErrors.confirmPassword && <p className="text-xs text-destructive flex items-center gap-1"><X className="h-3 w-3"/>{fieldErrors.confirmPassword}</p>}
      </div>

      {/* Terms */}
      <div className="space-y-1">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <div
            onClick={() => setField('acceptTerms', !values.acceptTerms)}
            className={`mt-0.5 flex h-[18px] w-[18px] flex-shrink-0 cursor-pointer items-center justify-center rounded border-2 transition-colors ${values.acceptTerms ? 'border-primary bg-primary' : fieldErrors.acceptTerms ? 'border-destructive' : 'border-border'}`}
          >
            {values.acceptTerms && <Check className="h-3 w-3 text-white"/>}
          </div>
          <span className="text-sm text-muted-foreground leading-snug">
            Akceptuję{' '}
            <a href="/terms" className="text-primary hover:underline font-medium" target="_blank" rel="noopener">Regulamin</a>
            {', '}
            <a href="/privacy" className="text-primary hover:underline font-medium" target="_blank" rel="noopener">Politykę prywatności</a>
            {' '}i{' '}
            <a href="/health-disclaimer" className="text-primary hover:underline font-medium" target="_blank" rel="noopener">zastrzeżenia zdrowotne</a>
          </span>
        </label>
        {fieldErrors.acceptTerms && <p className="text-xs text-destructive flex items-center gap-1 ml-7"><X className="h-3 w-3"/>{fieldErrors.acceptTerms}</p>}
      </div>

      {error && (
        <div role="alert" className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive flex items-start gap-2">
          <X className="h-4 w-4 mt-0.5 flex-shrink-0"/>
          {error}
        </div>
      )}

      <button type="submit" disabled={isPending || !values.acceptTerms}
        className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
        {isPending ? <><Loader2 className="h-4 w-4 animate-spin"/>Tworzenie konta…</> : 'Utwórz konto bezpłatnie'}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        Masz już konto?{' '}
        <a href="/auth/login" className="text-primary hover:text-primary/80 font-medium">Zaloguj się</a>
      </p>
    </form>
  )
}
