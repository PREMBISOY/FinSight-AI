import { User, TrendingUp, Clock, Shield, ArrowRight, Sparkles } from 'lucide-react'
import type { InvestorProfile, Portfolio, DemoScenario } from '../../types/api'
import { DEMO_USERS, DEMO_SCENARIOS } from '../../hooks/useAnalysis'
import clsx from 'clsx'

interface ProfileSelectorProps {
  selectedUserId: string
  selectedScenario: DemoScenario
  symbol: string
  query: string
  onUserChange: (id: string) => void
  onScenarioChange: (s: DemoScenario) => void
  onSymbolChange: (s: string) => void
  onQueryChange: (query: string) => void
  onAnalyze: () => void
  isRunning: boolean
}

export function ProfileSelector({
  selectedUserId,
  selectedScenario,
  symbol,
  query,
  onUserChange,
  onScenarioChange,
  onSymbolChange,
  onQueryChange,
  onAnalyze,
  isRunning,
}: ProfileSelectorProps) {
  return (
    <section className="card overflow-hidden">
      <div className="px-6 py-5 border-b border-[#eeeeee] flex flex-wrap gap-3 items-center justify-between">
        <div>
          <div className="eyebrow mb-1.5">Investment research</div>
          <h2 className="panel-heading flex items-center gap-2"><User className="w-4 h-4 text-brand-500" /> Analyze a stock for a real investor</h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Shield className="w-3.5 h-3.5 text-brand-500" /> Evidence-first recommendation
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.15fr_0.9fr] gap-6 p-6">
        {/* Investor profile */}
        <div>
          <label className="section-label block mb-2.5">Investor Profile</label>
          <div className="space-y-2">
            {DEMO_USERS.map(user => (
              <button
                key={user.id}
                onClick={() => onUserChange(user.id)}
                className={clsx(
                  'w-full text-left px-3.5 py-3 rounded-lg border transition-all text-sm',
                  selectedUserId === user.id
                    ? 'bg-brand-50 border-brand-500 text-slate-800 shadow-[inset_3px_0_0_#387ed1]'
                    : 'bg-white border-[#e7e7e7] text-slate-500 hover:border-brand-400 hover:text-slate-700',
                )}
              >
                <div className="font-semibold">{user.label}</div>
                <div className="text-xs text-slate-500 mt-1">{user.subtitle}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Stock symbol */}
        <div>
          <label className="section-label block mb-2.5">Stock Symbol</label>
          <input
            type="text"
            value={symbol}
            onChange={e => onSymbolChange(e.target.value.toUpperCase())}
            placeholder="RELIANCE"
            className="w-full bg-white border border-[#d7d7d7] rounded px-3.5 py-3 text-sm font-mono font-semibold tracking-wider text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 transition-colors"
          />
          <p className="text-xs text-slate-500 mt-2">Live Yahoo Finance inputs · NSE symbols use the .NS exchange suffix automatically</p>

          <label className="block text-xs text-slate-500 mt-4 mb-2 uppercase tracking-wider">Research Question</label>
          <textarea
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            maxLength={1000}
            rows={3}
            className="w-full resize-none bg-surface-600 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500/50 focus:bg-surface-500 transition-colors"
          />

          {/* Scenario */}
          <label className="section-label block mt-5 mb-2.5">Pipeline Scenario</label>
          <div className="grid gap-2">
            {DEMO_SCENARIOS.map(s => (
              <button
                key={s.value}
                onClick={() => onScenarioChange(s.value)}
                className={clsx(
                  'w-full text-left px-3 py-2.5 rounded-lg border transition-all text-sm',
                  selectedScenario === s.value
                    ? 'bg-brand-50 border-brand-500 text-slate-800'
                    : 'bg-white border-[#e7e7e7] text-slate-500 hover:border-brand-400 hover:text-slate-700',
                )}
              >
                <div className="font-medium text-xs">{s.label}</div>
                <div className="text-xs text-slate-600 mt-0.5">{s.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Analyze button + info */}
        <div className="flex flex-col justify-between rounded bg-[#fafafa] border border-[#eeeeee] p-5">
          <div>
            <div className="section-label mb-4">Execution plan</div>
            <div className="space-y-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-brand-500" />
              <span>3 agents run concurrently</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-brand-500" />
              <span>Deterministic synthesis</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-brand-500" />
              <span>Personalized risk engine</span>
            </div>
            <div className="mt-5 border-t border-[#e7e7e7] pt-4 grid grid-cols-2 gap-y-3 text-[10px] font-medium tracking-wider text-slate-500">
              <span>01 · DATA</span><span className="text-right">02 · AGENTS</span>
              <span>03 · SYNTHESIS</span><span className="text-right text-brand-500">04 · ADVICE</span>
            </div>
          </div>

          <button
            onClick={onAnalyze}
            disabled={isRunning || !symbol.trim() || !query.trim()}
            className={clsx(
              'w-full mt-6 py-3 px-6 rounded font-medium text-sm transition-all flex items-center justify-center gap-2',
              isRunning || !symbol.trim() || !query.trim()
                ? 'bg-surface-500 text-slate-500 cursor-not-allowed'
                : 'bg-brand-500 hover:bg-brand-600 text-white active:scale-[0.98]',
            )}
          >
            {isRunning ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing…
              </span>
            ) : (
              <><Sparkles className="w-4 h-4" /> Run analysis <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
      </div>
    </section>
  )
}

// ---- Profile + Portfolio card ----

interface ProfileCardProps {
  profile: InvestorProfile
  portfolio: Portfolio
  watchlist: string[]
  analyzedSymbol: string
}

const horizonLabel: Record<string, string> = {
  short: 'Short Term',
  medium: 'Medium Term',
  long: 'Long Term',
}

const toleranceColor: Record<string, string> = {
  conservative: 'text-bullish',
  moderate: 'text-yellow-400',
  aggressive: 'text-bearish',
}

export function ProfileCard({ profile, portfolio, watchlist, analyzedSymbol }: ProfileCardProps) {
  return (
    <div className="bg-surface-700 border border-white/5 rounded-xl p-4 space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-brand-600/20 border border-brand-500/30 flex items-center justify-center">
          <User className="w-5 h-5 text-brand-400" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">{profile.display_name}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs font-semibold capitalize ${toleranceColor[profile.risk_tolerance]}`}>
              {profile.risk_tolerance}
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-xs text-slate-500">{horizonLabel[profile.investment_horizon]}</span>
            <span className="text-slate-600">·</span>
            <span className="text-xs text-slate-500">Max {profile.max_position_size}%</span>
          </div>
        </div>
      </div>

      {/* Portfolio */}
      <div>
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Portfolio Holdings</div>
        <div className="space-y-1">
          {portfolio.holdings.slice(0, 5).map(h => (
            <div key={h.symbol} className="flex items-center justify-between text-xs">
              <span className="font-mono text-slate-300">{h.symbol}</span>
              <div className="flex items-center gap-3">
                <div className="w-16 bg-surface-500 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${h.symbol.toUpperCase() === analyzedSymbol.toUpperCase() ? 'bg-brand-500' : 'bg-slate-500'}`}
                    style={{ width: `${Math.min(h.allocation_percent, 100)}%` }}
                  />
                </div>
                <span className="text-slate-400 w-10 text-right">{h.allocation_percent.toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Watchlist */}
      {watchlist.length > 0 && (
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Watchlist</div>
          <div className="flex flex-wrap gap-1.5">
            {watchlist.map(sym => (
              <span key={sym} className="px-2 py-0.5 bg-surface-500 border border-white/5 rounded text-xs font-mono text-slate-400">
                {sym}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
