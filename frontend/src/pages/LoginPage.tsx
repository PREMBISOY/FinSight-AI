import { useState } from 'react'
import {
  Activity, ArrowRight, BarChart3, Eye, EyeOff, LockKeyhole,
  Moon, ShieldCheck, Sparkles, Sun, TrendingUp, UserRound,
} from 'lucide-react'
import type { DemoUserId } from '../types/auth'

interface LoginPageProps {
  onCreateAccount: (input: { name: string; password: string; demoUserId: DemoUserId }) => Promise<void>
  onSignIn: (name: string, password: string) => Promise<void>
  isDark: boolean
  onToggleTheme: () => void
}

const PROFILES: { id: DemoUserId; title: string; eyebrow: string; description: string; icon: typeof ShieldCheck; accent: string }[] = [
  {
    id: 'conservative-demo',
    title: 'Conservative',
    eyebrow: 'Lower risk · Long horizon',
    description: 'Prioritizes capital protection, measured exposure, and durable signals.',
    icon: ShieldCheck,
    accent: 'emerald',
  },
  {
    id: 'aggressive-demo',
    title: 'Aggressive',
    eyebrow: 'Higher risk · Short horizon',
    description: 'Prioritizes growth opportunities, momentum, and higher risk capacity.',
    icon: TrendingUp,
    accent: 'purple',
  },
]

export function LoginPage({ onCreateAccount, onSignIn, isDark, onToggleTheme }: LoginPageProps) {
  const [mode, setMode] = useState<'create' | 'signin'>('create')
  const [name, setName] = useState('')
  const [profile, setProfile] = useState<DemoUserId>('conservative-demo')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (mode === 'create' && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      if (mode === 'create') await onCreateAccount({ name, password, demoUserId: profile })
      else await onSignIn(name, password)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to continue.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_0.95fr]" style={{ backgroundColor: 'var(--bg-page)' }}>
      <button type="button" onClick={onToggleTheme} className="fixed top-4 right-4 z-20 w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-105" style={{ backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border)' }} title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
        {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-600" />}
      </button>
      <section className="hidden lg:flex relative overflow-hidden p-12 xl:p-16 flex-col justify-between border-r" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
        <div className="absolute inset-0 opacity-70 pointer-events-none login-grid" />
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2563eb, #6366f1)' }}>
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold tracking-tight">FinSight <span className="text-brand-500 dark:text-brand-400">AI</span></div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Research, personalized</div>
          </div>
        </div>

        <div className="relative max-w-xl">
          <div className="inline-flex items-center gap-2 tag-blue mb-6"><Sparkles className="w-3 h-3" /> Your own research workspace</div>
          <h1 className="text-5xl xl:text-6xl font-bold tracking-tight leading-[1.08] mb-6">
            Intelligence shaped<br />around <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">your profile.</span>
          </h1>
          <p className="text-base leading-relaxed max-w-lg" style={{ color: 'var(--text-secondary)' }}>
            Create a private local account, choose your investing style, and enter an explainable multi-agent financial workspace.
          </p>
          <div className="grid grid-cols-3 gap-3 mt-10">
            {[
              [BarChart3, 'Technical', 'Market signals'],
              [Sparkles, 'Fundamental', 'Evidence-backed'],
              [Activity, 'Sentiment', 'News pulse'],
            ].map(([Icon, title, caption]) => {
              const IconComponent = Icon as typeof Activity
              return <div key={title as string} className="card p-4">
                <IconComponent className="w-4 h-4 text-brand-500 dark:text-brand-400 mb-3" />
                <div className="text-xs font-semibold">{title as string}</div>
                <div className="text-[10px] text-slate-500 mt-1">{caption as string}</div>
              </div>
            })}
          </div>
        </div>

        <div className="relative text-[11px] text-slate-500">Explainable decisions · Visible evidence · Frontend-only demo access</div>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-lg animate-slide-up">
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2563eb, #6366f1)' }}>
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold">FinSight <span className="text-brand-500">AI</span></span>
          </div>

          <div className="mb-7">
            <span className="eyebrow">Secure your workspace</span>
            <h2 className="text-3xl font-bold tracking-tight mt-2">{mode === 'create' ? 'Create your profile' : 'Welcome back'}</h2>
            <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
              {mode === 'create' ? 'Tell us who you are and choose the demo strategy that fits you.' : 'Use your name and password to continue.'}
            </p>
          </div>

          <div className="grid grid-cols-2 p-1 rounded-xl mb-6" style={{ backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
            {(['create', 'signin'] as const).map(value => (
              <button key={value} type="button" onClick={() => { setMode(value); setError(null) }}
                className={`py-2 rounded-lg text-xs font-semibold transition-all ${mode === value ? 'bg-white dark:bg-surface-500 shadow-sm text-brand-600 dark:text-brand-300' : 'text-slate-500'}`}>
                {value === 'create' ? 'Create account' : 'Sign in'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block space-y-1.5">
              <span className="section-label">Your name</span>
              <div className="relative"><UserRound className="auth-input-icon" /><input autoFocus className="finsight-input auth-input" value={name} onChange={e => setName(e.target.value)} placeholder="Aayush Sharma" autoComplete="name" /></div>
            </label>

            {mode === 'create' && <>
              <fieldset>
                <legend className="section-label mb-2.5">Choose your demo profile</legend>
                <div className="grid sm:grid-cols-2 gap-3">
                  {PROFILES.map(option => {
                    const Icon = option.icon
                    const selected = profile === option.id
                    return <button key={option.id} type="button" onClick={() => setProfile(option.id)}
                      className={`text-left p-4 rounded-xl border transition-all ${selected ? 'border-brand-500 bg-brand-500/8 ring-2 ring-brand-500/10' : 'hover:border-slate-400'}`}
                      style={!selected ? { borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' } : undefined}>
                      <div className="flex items-center justify-between mb-3"><div className={`w-8 h-8 rounded-lg flex items-center justify-center ${option.accent === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-purple-500/10 text-purple-500'}`}><Icon className="w-4 h-4" /></div><span className={`w-3.5 h-3.5 rounded-full border-2 ${selected ? 'border-brand-500 bg-brand-500 shadow-[inset_0_0_0_3px_white]' : 'border-slate-400'}`} /></div>
                      <div className="text-sm font-semibold">{option.title}</div>
                      <div className="text-[10px] font-medium text-slate-500 mt-0.5">{option.eyebrow}</div>
                      <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">{option.description}</p>
                    </button>
                  })}
                </div>
              </fieldset>
            </>}

            <label className="block space-y-1.5">
              <span className="section-label">Password</span>
              <div className="relative"><LockKeyhole className="auth-input-icon" /><input className="finsight-input auth-input pr-11" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimum 6 characters" autoComplete={mode === 'create' ? 'new-password' : 'current-password'} /><button type="button" onClick={() => setShowPassword(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-brand-500" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
            </label>

            {mode === 'create' && <label className="block space-y-1.5">
              <span className="section-label">Confirm password</span>
              <div className="relative"><LockKeyhole className="auth-input-icon" /><input className="finsight-input auth-input" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat your password" autoComplete="new-password" /></div>
            </label>}

            {error && <div className="px-3 py-2.5 rounded-lg border border-red-500/25 bg-red-500/8 text-xs text-red-500" role="alert">{error}</div>}

            <button type="submit" disabled={submitting} className="btn-primary w-full justify-center py-3">
              {submitting ? 'Please wait…' : mode === 'create' ? 'Create profile & continue' : 'Sign in'}
              {!submitting && <ArrowRight className="w-4 h-4" />}
            </button>

            <p className="text-[10px] text-center leading-relaxed text-slate-500">
              Demo access is stored only in this browser. Your selected strategy connects to the existing FinSight backend demo profile; no backend account or database record is created.
            </p>
          </form>
        </div>
      </section>
    </div>
  )
}
