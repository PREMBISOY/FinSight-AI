import { User, Loader2, Search, Zap, ShieldCheck, TrendingUp } from 'lucide-react'
import type { InvestorProfile, Portfolio, DemoScenario } from '../../types/api'
import type { PublicAccount } from '../../types/auth'

const SCENARIOS: { value: DemoScenario; label: string; color: string }[] = [
  { value: 'normal',            label: 'Normal',           color: 'text-emerald-700 dark:text-emerald-400' },
  { value: 'degraded_sentiment',label: 'Degraded Sentiment',color: 'text-amber-700 dark:text-amber-400'  },
  { value: 'conflict',          label: 'Conflict',         color: 'text-red-700 dark:text-red-400'     },
]

// ── Profile selector ─────────────────────────────────────────────────────────
interface ProfileSelectorProps {
  account: PublicAccount
  selectedScenario: DemoScenario
  symbol: string
  query: string
  onScenarioChange: (s: DemoScenario) => void
  onSymbolChange: (s: string) => void
  onQueryChange: (query: string) => void
  onAnalyze: () => void
  isRunning: boolean
}

export function ProfileSelector({
  account, selectedScenario, symbol, query,
  onScenarioChange, onSymbolChange, onQueryChange,
  onAnalyze, isRunning,
}: ProfileSelectorProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (symbol.trim() && query.trim()) onAnalyze()
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 sm:p-5 space-y-4">

      {/* Row 1: User selector + Symbol + Analyze */}
      <div className="flex flex-wrap items-end gap-3">

        {/* Signed-in profile */}
        <div className="space-y-1 min-w-[220px]">
          <label className="section-label">Active investor profile</label>
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-brand-500/25 bg-brand-500/8">
            {account.demoUserId === 'conservative-demo'
              ? <ShieldCheck className="w-4 h-4 text-emerald-500" />
              : <TrendingUp className="w-4 h-4 text-purple-500" />}
            <div className="leading-tight">
              <div className="text-xs font-semibold">{account.name}</div>
              <div className="text-[10px] text-slate-500 capitalize">{account.demoUserId.replace('-demo', '')} strategy</div>
            </div>
          </div>
        </div>

        {/* Symbol input */}
        <div className="space-y-1 flex-1 min-w-[120px]">
          <label className="section-label">Symbol</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={symbol}
              onChange={e => onSymbolChange(e.target.value.toUpperCase())}
              placeholder="RELIANCE, NIFTY 50, SENSEX"
              className="finsight-input pl-8 pr-3 py-2 font-mono"
            />
          </div>
        </div>

        {/* Analyze button */}
        <button
          type="submit"
          disabled={isRunning || !symbol.trim() || !query.trim()}
          className="btn-primary flex-shrink-0"
        >
          {isRunning
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</>
            : <><Zap className="w-4 h-4" /> Analyze</>
          }
        </button>
      </div>

      {/* Row 2: Research question */}
      <div className="space-y-1">
        <label className="section-label" htmlFor="research-question">Research Question</label>
        <textarea
          id="research-question"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          maxLength={1000}
          rows={2}
          className="finsight-input px-3 py-2 resize-y"
          placeholder="What do the latest financial evidence and outlook imply?"
        />
      </div>

      {/* Row 3: Scenario toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="section-label">Scenario:</span>
        {SCENARIOS.map(s => (
          <button
            key={s.value}
            type="button"
            onClick={() => onScenarioChange(s.value)}
            className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border transition-all
              ${selectedScenario === s.value
                ? `${s.color} border-current bg-current/10`
                : 'text-slate-600 border-slate-300 hover:text-slate-900 dark:border-surface-400 dark:hover:text-slate-300'
              }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </form>
  )
}

// ── Profile / Portfolio card ──────────────────────────────────────────────────
interface ProfileCardProps {
  profile: InvestorProfile
  displayName?: string
  portfolio: Portfolio
  watchlist: string[]
  analyzedSymbol: string
}

export function ProfileCard({ profile, displayName, portfolio, watchlist, analyzedSymbol }: ProfileCardProps) {
  const exposure = portfolio.holdings.find(h => h.symbol.toUpperCase() === analyzedSymbol.toUpperCase())

  return (
    <div className="card p-4 space-y-4 h-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-brand-500/15 flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-brand-500 dark:text-brand-400" />
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{displayName ?? profile.display_name}</div>
          <div className="text-[10px] text-slate-500 capitalize">{profile.risk_tolerance} · {profile.investment_horizon} horizon</div>
        </div>
      </div>

      {/* Holdings */}
      <div>
        <h4 className="section-label mb-2">Portfolio Holdings</h4>
        <div className="space-y-1.5">
          {portfolio.holdings.map(h => (
            <div key={h.symbol} className={`flex items-center justify-between text-xs px-2 py-1.5 rounded
              ${h.symbol.toUpperCase() === analyzedSymbol.toUpperCase()
                ? 'bg-brand-500/10 border border-brand-500/20'
                : 'bg-slate-100 dark:bg-surface-600'
              }`}
            >
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{h.symbol}</span>
              <span className="text-slate-500 dark:text-slate-400">{h.allocation_percent.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Watchlist */}
      {watchlist.length > 0 && (
        <div>
          <h4 className="section-label mb-2">Watchlist</h4>
          <div className="flex flex-wrap gap-1.5">
            {watchlist.map(sym => (
              <span key={sym} className="tag tag-blue">{sym}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
