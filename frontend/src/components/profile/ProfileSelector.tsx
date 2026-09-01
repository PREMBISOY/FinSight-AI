import { User, TrendingUp, Clock, Shield } from 'lucide-react'
import type { InvestorProfile, Portfolio, DemoScenario } from '../../types/api'
import { DEMO_USERS, DEMO_SCENARIOS } from '../../hooks/useAnalysis'
import clsx from 'clsx'

interface ProfileSelectorProps {
  selectedUserId: string
  selectedScenario: DemoScenario
  symbol: string
  onUserChange: (id: string) => void
  onScenarioChange: (s: DemoScenario) => void
  onSymbolChange: (s: string) => void
  onAnalyze: () => void
  isRunning: boolean
}

export function ProfileSelector({
  selectedUserId,
  selectedScenario,
  symbol,
  onUserChange,
  onScenarioChange,
  onSymbolChange,
  onAnalyze,
  isRunning,
}: ProfileSelectorProps) {
  return (
    <div className="bg-surface-700 border border-white/5 rounded-xl p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
        <User className="w-4 h-4 text-brand-400" />
        Analysis Controls
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Investor profile */}
        <div>
          <label className="block text-xs text-slate-500 mb-2 uppercase tracking-wider">Investor Profile</label>
          <div className="space-y-2">
            {DEMO_USERS.map(user => (
              <button
                key={user.id}
                onClick={() => onUserChange(user.id)}
                className={clsx(
                  'w-full text-left px-3 py-2.5 rounded-lg border transition-all text-sm',
                  selectedUserId === user.id
                    ? 'bg-brand-600/20 border-brand-500/50 text-white'
                    : 'bg-surface-600 border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-300',
                )}
              >
                <div className="font-medium">{user.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{user.subtitle}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Stock symbol */}
        <div>
          <label className="block text-xs text-slate-500 mb-2 uppercase tracking-wider">Stock Symbol</label>
          <input
            type="text"
            value={symbol}
            onChange={e => onSymbolChange(e.target.value.toUpperCase())}
            placeholder="RELIANCE"
            className="w-full bg-surface-600 border border-white/10 rounded-lg px-3 py-2.5 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-brand-500/50 focus:bg-surface-500 transition-colors"
          />
          <p className="text-xs text-slate-600 mt-2">Default: RELIANCE</p>

          {/* Scenario */}
          <label className="block text-xs text-slate-500 mt-4 mb-2 uppercase tracking-wider">Demo Scenario</label>
          <div className="space-y-2">
            {DEMO_SCENARIOS.map(s => (
              <button
                key={s.value}
                onClick={() => onScenarioChange(s.value)}
                className={clsx(
                  'w-full text-left px-3 py-2 rounded-lg border transition-all text-sm',
                  selectedScenario === s.value
                    ? 'bg-brand-600/20 border-brand-500/50 text-white'
                    : 'bg-surface-600 border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-300',
                )}
              >
                <div className="font-medium text-xs">{s.label}</div>
                <div className="text-xs text-slate-600 mt-0.5">{s.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Analyze button + info */}
        <div className="flex flex-col justify-between">
          <div className="space-y-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-brand-400" />
              <span>3 agents run concurrently</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-brand-400" />
              <span>Deterministic synthesis</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-brand-400" />
              <span>Personalized risk engine</span>
            </div>
            <div className="bg-surface-600 border border-white/5 rounded-lg p-3 text-xs text-slate-500 font-mono">
              DATA → TECHNICAL<br/>
              DATA → FUNDAMENTAL<br/>
              DATA → SENTIMENT<br/>
              ↓<br/>
              SYNTHESIS<br/>
              ↓<br/>
              PERSONALIZATION<br/>
              ↓<br/>
              INTELLIGENCE
            </div>
          </div>

          <button
            onClick={onAnalyze}
            disabled={isRunning || !symbol.trim()}
            className={clsx(
              'w-full mt-4 py-3 px-6 rounded-lg font-semibold text-sm transition-all',
              isRunning || !symbol.trim()
                ? 'bg-surface-500 text-slate-500 cursor-not-allowed'
                : 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/25 hover:shadow-brand-500/30 active:scale-[0.98]',
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
              '⚡ Analyze'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- Profile + Portfolio card ----

interface ProfileCardProps {
  profile: InvestorProfile
  portfolio: Portfolio
  watchlist: string[]
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

export function ProfileCard({ profile, portfolio, watchlist }: ProfileCardProps) {
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
                    className={`h-1.5 rounded-full ${h.symbol === 'RELIANCE' ? 'bg-brand-500' : 'bg-slate-500'}`}
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
