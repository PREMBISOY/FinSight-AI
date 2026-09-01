import { useEffect, useState } from 'react'
import { BriefcaseBusiness, ChevronRight, LoaderCircle, PieChart, ShieldCheck, Star } from 'lucide-react'
import clsx from 'clsx'
import { DEMO_USERS } from '../hooks/useAnalysis'
import { getUserContext } from '../services/api'
import type { UserContext } from '../types/api'

interface PortfolioPageProps {
  onOpenResearch: () => void
}

export function PortfolioPage({ onOpenResearch }: PortfolioPageProps) {
  const [userId, setUserId] = useState(DEMO_USERS[0].id)
  const [context, setContext] = useState<UserContext | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let current = true
    setLoading(true)
    setError(null)
    getUserContext(userId)
      .then(value => { if (current) setContext(value) })
      .catch(reason => { if (current) setError(reason instanceof Error ? reason.message : 'Unable to load this portfolio.') })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [userId])

  const totalTracked = context?.portfolio.holdings.reduce((sum, holding) => sum + holding.allocation_percent, 0) ?? 0

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-6 py-10 space-y-8 animate-fade-in">
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <div>
          <div className="eyebrow mb-3">Portfolio view</div>
          <h1 className="text-3xl font-normal tracking-tight text-slate-800">Investor context before action.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Review concentration, risk boundaries, and watchlist context before opening a research run.</p>
        </div>
        <button type="button" onClick={onOpenResearch} className="inline-flex items-center justify-center gap-2 rounded bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600">
          Analyze a stock <ChevronRight className="w-4 h-4" />
        </button>
      </section>

      <section className="card p-5">
        <div className="section-label mb-3">Choose investor</div>
        <div className="flex flex-col sm:flex-row gap-3">
          {DEMO_USERS.map(user => (
            <button key={user.id} type="button" onClick={() => setUserId(user.id)} className={clsx(
              'flex-1 rounded border px-4 py-3 text-left transition-colors',
              userId === user.id ? 'border-brand-500 bg-brand-50' : 'border-[#e7e7e7] hover:border-brand-400',
            )}>
              <div className="text-sm font-medium text-slate-800">{user.label}</div>
              <div className="mt-1 text-xs text-slate-500">{user.subtitle}</div>
            </button>
          ))}
        </div>
      </section>

      {loading && <div className="card flex items-center gap-3 p-8 text-sm text-slate-500"><LoaderCircle className="w-5 h-5 animate-spin text-brand-500" /> Loading investor context…</div>}
      {error && <div className="rounded border border-bearish/30 bg-bearish/5 p-5 text-sm text-bearish">{error}</div>}

      {context && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-fade-in">
          <section className="card p-6 lg:col-span-2">
            <div className="flex items-start justify-between gap-4 border-b border-[#eeeeee] pb-5">
              <div className="flex gap-3"><div className="rounded bg-brand-50 p-2.5"><BriefcaseBusiness className="w-5 h-5 text-brand-500" /></div><div><div className="text-lg font-medium text-slate-800">{context.profile.display_name}</div><p className="mt-1 text-sm capitalize text-slate-500">{context.profile.risk_tolerance} risk · {context.profile.investment_horizon}-term horizon</p></div></div>
              <div className="text-right"><div className="section-label">Maximum position</div><div className="mt-1 text-2xl font-medium text-slate-800">{context.profile.max_position_size}%</div></div>
            </div>
            <div className="mt-6 flex items-center justify-between"><div><div className="section-label">Portfolio allocation</div><p className="mt-1 text-sm text-slate-500">{context.portfolio.holdings.length} tracked holdings</p></div><span className="text-sm text-slate-500">{totalTracked.toFixed(1)}% allocated</span></div>
            <div className="mt-4 space-y-4">
              {context.portfolio.holdings.map(holding => (
                <div key={holding.symbol}><div className="flex justify-between text-sm"><span className="font-medium text-slate-800">{holding.symbol}</span><span className="text-slate-500">{holding.quantity} shares · {holding.allocation_percent.toFixed(1)}%</span></div><div className="mt-2 h-2 rounded-full bg-surface-400"><div className={clsx('h-2 rounded-full', holding.allocation_percent > context.profile.max_position_size ? 'bg-bearish' : 'bg-brand-500')} style={{ width: `${Math.min(holding.allocation_percent, 100)}%` }} /></div></div>
              ))}
            </div>
          </section>
          <aside className="space-y-5">
            <section className="card p-5"><div className="flex items-center gap-2 text-sm font-medium text-slate-800"><ShieldCheck className="w-4 h-4 text-brand-500" /> Guardrail</div><p className="mt-3 text-sm leading-6 text-slate-500">Recommendations consider the investor’s maximum {context.profile.max_position_size}% single-position limit after market synthesis.</p></section>
            <section className="card p-5"><div className="flex items-center gap-2 text-sm font-medium text-slate-800"><Star className="w-4 h-4 text-brand-500" /> Watchlist</div><div className="mt-4 flex flex-wrap gap-2">{context.watchlist.map(symbol => <button key={symbol} type="button" onClick={onOpenResearch} className="rounded border border-[#e7e7e7] px-2.5 py-1 text-xs font-mono text-brand-600 hover:border-brand-400">{symbol}</button>)}</div></section>
            <section className="card p-5"><div className="flex items-center gap-2 text-sm font-medium text-slate-800"><PieChart className="w-4 h-4 text-brand-500" /> Why it matters</div><p className="mt-3 text-sm leading-6 text-slate-500">Portfolio context is applied after synthesis, keeping market evidence and investor suitability separate.</p></section>
          </aside>
        </div>
      )}
    </div>
  )
}
