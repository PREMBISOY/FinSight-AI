import type { PersonalizedIntelligence, InvestorProfile } from '../../types/api'
import { RecommendationBadge, RiskBadge } from '../shared/Badges'
import { ConfidenceBar } from '../shared/ConfidenceBar'
import { User, PieChart, Shield, Info } from 'lucide-react'

interface IntelligenceCardProps {
  intelligence: PersonalizedIntelligence
  profile: InvestorProfile
}

export function IntelligenceCard({ intelligence, profile }: IntelligenceCardProps) {
  const exposureMax = profile.max_position_size
  const exposurePct = (intelligence.portfolio_exposure_percent / exposureMax) * 100

  return (
    <div className="bg-surface-700 border border-white/5 rounded-xl p-5 space-y-5 animate-slide-up">
      {/* Header */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Personalized Intelligence</h3>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <RecommendationBadge value={intelligence.recommendation} />
            <p className="text-xs text-slate-400 max-w-xs">
              {intelligence.reasons[0] ?? 'See the evidence and profile-specific reasoning below.'}
            </p>
          </div>
          <RiskBadge value={intelligence.risk_level} />
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface-600 rounded-lg p-3 border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <PieChart className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs text-slate-500">Portfolio Exposure</span>
          </div>
          <div className="text-2xl font-mono font-bold text-white">
            {intelligence.portfolio_exposure_percent.toFixed(1)}%
          </div>
          <div className="mt-2 text-xs text-slate-600">max allowed: {exposureMax}%</div>
          <div className="mt-1 w-full bg-surface-500 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${exposurePct > 100 ? 'bg-bearish' : exposurePct > 75 ? 'bg-warning' : 'bg-bullish'}`}
              style={{ width: `${Math.min(exposurePct, 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-surface-600 rounded-lg p-3 border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs text-slate-500">Risk Score</span>
          </div>
          <div className="text-2xl font-mono font-bold text-white">
            {(intelligence.risk_score * 100).toFixed(0)}
            <span className="text-sm text-slate-500">/100</span>
          </div>
          <div className="mt-2">
            <ConfidenceBar value={intelligence.risk_score} size="sm" />
          </div>
        </div>
      </div>

      {/* Investor context */}
      <div className="flex items-center gap-3 p-3 bg-surface-600 rounded-lg border border-white/5">
        <User className="w-4 h-4 text-slate-500 flex-shrink-0" />
        <div className="text-xs text-slate-400">
          <span className="font-semibold text-slate-300">{profile.display_name}</span>
          {' · '}
          <span className="capitalize">{profile.risk_tolerance}</span>
          {' · '}
          <span className="capitalize">{profile.investment_horizon} horizon</span>
          {' · '}
          max {profile.max_position_size}% position
        </div>
      </div>

      {/* Reasons */}
      <div>
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Reasoning</h4>
        <ul className="space-y-2">
          {intelligence.reasons.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
              <span className="text-brand-400 flex-shrink-0 mt-0.5">›</span>
              {r}
            </li>
          ))}
        </ul>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-3 bg-surface-600 border border-white/5 rounded-lg">
        <Info className="w-3.5 h-3.5 text-slate-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600 italic">{intelligence.disclaimer}</p>
      </div>
    </div>
  )
}
