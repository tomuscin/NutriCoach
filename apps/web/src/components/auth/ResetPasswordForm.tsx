'use client'

// ResetPasswordForm — consumes token from URL, sets new password
// Shows: invalid-token guard | form | success redirect

import { useTransition, useState } from 'react'
import { resetPasswordAction } from '@/lib/actions/auth'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Check, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong'

function getStrength(p: string) {
  const checks = { length: p.length >= 8, uppercase: /[A-Z]/.test(p), lowercase: /[a-z]/.test(p), number: /[0-9]/.test(p), special: /[^A-Za-z0-9]/.test(p) }
  const score = Object.values(checks).filter(Boolean).length
  const level: StrengthLevel = score <= 2 ? 'weak' : score === 3 ? 'fair' : score === 4 ? 'good' : 'strong'
  return { level, score, checks }
}

const sc = {
  weak: { color: 'bg-red-500' }, fair: { color: 'bg-amber-500' },
  good: { color: 'bg-blue-500' }, strong: { color: 'bg-green-500' },
}

interface Props {
  token?: string
}

export function ResetPasswordForm({ token }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [showConf, setShowConf] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const router = useRouter()

  const strength = password.length > 0 ? getStrength(password) : null
  const confirmMatch = confirm.length > 0 && password === confirm

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
          <AlertCircle className="h-6 w-6 text-amber-500" />
        </div>
        <div>
          <p className="font-medium">Nieprawidłowy link</p>
          <p className="text-sm text-muted-foreground mt-1">Ten link resetowania hasła jest nieprawidłowy lub wygasł.</p>
        </div>
        <a href="/auth/forgot-password" className="text-sm text-primary hover:underline font-medium">
          Poproś o nowy link
        </a>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/15">
          <CheckCircle2 className="h-6 w-6 text-green-500" />
        </div>
        <div>
          <p className="font-semibold">Hasło zostało zmienione!</p>
          <p className="text-sm text-muted-foreground mt-1">Możesz teraz zalogować się nowym hasłem.</p>
        </div>
        <a href="/auth/login" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
          Przejdź do logowania
        </a>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const errs: Record<string, string> = {}
    if (!password) errs.password = 'Hasło jest wymagane'
    else if (!strength || strength.score < 5) errs.password = 'Hasło nie spełnia wymagań bezpieczeństwa'
    if (!confirm) errs.confirmPassword = 'Potwierdzenie jest wymagane'
    else if (password !== confirm) errs.confirmPassword = 'Hasła muszą być identyczne'
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return

    const fd = new FormData()
    fd.append('token', token!)
    fd.append('password', password)
    fd.append('confirmPassword', confirm)

    startTransition(async () => {
      const result = await resetPasswordAction(fd)
      if (result.ok) {
        setSuccess(true)
        setTimeout(() => router.push('/auth/login?reset=1'), 2000)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Password */}
      <div className="space-y-1.5">
        <label htmlFor="rp-password" className="block text-sm font-medium">Nowe hasło <span className="text-destructive">*</span></label>
        <div className="relative">
          <input id="rp-password" name="password" type={showPwd ? 'text' : 'password'}
            autoComplete="new-password" required disabled={isPending}
            value={password} onChange={e => { setPassword(e.target.value); setFieldErrors(prev => { const n = {...prev}; delete n.password; return n }) }}
            placeholder="Min. 8 znaków"
            className={`w-full rounded-xl border bg-background px-4 py-3 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 transition-colors ${fieldErrors.password ? 'border-destructive' : 'border-border'}`}
          />
          <button type="button" onClick={() => setShowPwd(p => !p)} tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {showPwd ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
          </button>
        </div>
        {strength && (
          <div className="flex gap-1 mt-1">
            {[0,1,2,3].map(i => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < strength.score - 1 ? sc[strength.level].color : 'bg-border'}`}/>
            ))}
          </div>
        )}
        {fieldErrors.password && <p className="text-xs text-destructive flex items-center gap-1"><X className="h-3 w-3"/>{fieldErrors.password}</p>}
      </div>

      {/* Confirm */}
      <div className="space-y-1.5">
        <label htmlFor="rp-confirm" className="block text-sm font-medium">Powtórz hasło <span className="text-destructive">*</span></label>
        <div className="relative">
          <input id="rp-confirm" name="confirmPassword" type={showConf ? 'text' : 'password'}
            autoComplete="new-password" required disabled={isPending}
            value={confirm} onChange={e => { setConfirm(e.target.value); setFieldErrors(prev => { const n = {...prev}; delete n.confirmPassword; return n }) }}
            placeholder="Powtórz nowe hasło"
            className={`w-full rounded-xl border bg-background px-4 py-3 pr-16 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 transition-colors ${fieldErrors.confirmPassword ? 'border-destructive' : confirm && confirmMatch ? 'border-green-500' : 'border-border'}`}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {confirm && (confirmMatch ? <Check className="h-4 w-4 text-green-500"/> : <X className="h-4 w-4 text-destructive"/>)}
            <button type="button" onClick={() => setShowConf(p => !p)} tabIndex={-1}
              className="text-muted-foreground hover:text-foreground">
              {showConf ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
            </button>
          </div>
        </div>
        {fieldErrors.confirmPassword && <p className="text-xs text-destructive flex items-center gap-1"><X className="h-3 w-3"/>{fieldErrors.confirmPassword}</p>}
      </div>

      {error && (
        <div role="alert" className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive flex gap-2">
          <X className="h-4 w-4 mt-0.5 flex-shrink-0"/>{error}
        </div>
      )}

      <button type="submit" disabled={isPending}
        className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
        {isPending ? <><Loader2 className="h-4 w-4 animate-spin"/>Zapisywanie…</> : 'Ustaw nowe hasło'}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        <a href="/auth/login" className="text-primary hover:underline font-medium">Wróć do logowania</a>
      </p>
    </form>
  )
}
