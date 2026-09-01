import { ShieldCheck, Clock, TrendingUp, AlertTriangle } from 'lucide-react'
import type { PersonalizedIntelligence, InvestorProfile } from '../../types/api'
import { RecommendationBadge, getRecGlow } from '../shared/Badges'

interface IntelligenceCardProps {
  intelligence: PersonalizedIntelligence
  profile: InvestorProfile
}

const RISK_CONFIG = {
  LOW:      { label: 'Low',      color: '#00d09c', segments: 1 },
  MODERATE: { label: 'Moderate', color: '#f59e0b', segments: 2 },
  ELEVATED: { label: 'Elevated', color: '#f97316', segments: 3 },
  HIGH:     { label: 'High',     color: '#ff5252', segments: 4 },
} as const

function RiskMeter({ level, score }: { level: string; score: number }) {
  const cfg = RISK_CONFIG[level as keyof typeof RISK_CONFIG] ?? RISK_CONFIG.MODERATE
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">Risk Level</span>
        <span className="font-semibold font-mono" style={{ color: cfg.color }}>{cfg.label}</span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(seg => (
          <div
            key={seg}
            className="flex-1 h-1.5 rounded-sm transition-all duration-500"
            style={{
              background: seg <= cfg.segments ? cfg.color : '#1a2535',
              opacity: seg <= cfg.segments ? 1 : 0.3,
            }}
          />
        ))}
      </div>
      <div className="text-[10px] text-slate-600 font-mono text-right">score: {(score * 100).toFixed(0)}/100</div>
    </div>
  )
}

function ExposureDonut({ exposure, maxSize }: { exposure: number; maxSize: number }) {
  const r       = 28
  const circum  = 2 * Math.PI * r
  const fillPct = Math.min(1, exposure / 100)
  const maxPct  = Math.min(1, maxSize / 100)
  const offset  = circum * (1 - fillPct)
  const maxOff  = circum * (1 - maxPct)
  const overMax = exposure > maxSize
  const color   = overMax ? '#ff5252' : exposure > maxSize * 0.7 ? '#f59e0b' : '#3b82f6'

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: 72, height: 72 }}>
        <svg width={72} height={72} style={{ transform: 'rotate(-90deg)' }}>
          {/* max-position marker */}
          <circle cx={36} cy={36} r={r} fill="none" stroke="#253349" strokeWidth={7} strokeDasharray={`2 ${circum - 2}`} strokeDashoffset={maxOff} />
          {/* fill */}
          <circle cx={36} cy={36} r={r} fill="none" stroke={color} strokeWidth={7} strokeDasharray={circum} strokeDashoffset={offset} strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.8s ease-out' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold font-mono" style={{ color }}>{exposure.toFixed(1)}%</span>
        </div>
      </div>
      <span className="text-[10px] text-slate-500 uppercase tracking-wider">Exposure</span>
    </div>
  )
}

export function IntelligenceCard({ intelligence, profile }: IntelligenceCardProps) {
  const glow = getRecGlow(intelligence.recommendation)

  return (
    <div className={`card p-5 space-y-5 animate-slide-up ${glow}`}>

      {/* ── Header ── */}
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-brand-400" />
        <h3 className="section-label">Personalized Intelligence</h3>
      </div>

      {/* ── Recommendation ── */}
      <div className="flex flex-col items-center py-3 gap-3">
        <RecommendationBadge value={intelligence.recommendation} />
        <p className="text-xs text-slate-500 text-center px-2">
          Tailored for <strong className="text-slate-300">{profile.display_name}</strong> ·{' '}
          {profile.risk_tolerance} risk · {profile.investment_horizon} horizon
        </p>
      </div>

      {/* ── Exposure + Risk ── */}
      <div className="flex items-center gap-5">
        <ExposureDonut
          exposure={intelligence.portfolio_exposure_percent}
          maxSize={profile.max_position_size}
        />
        <div className="flex-1 space-y-3">
          <RiskMeter level={intelligence.risk_level} score={intelligence.risk_score} />
          <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
            <TrendingUp className="w-3 h-3" />
            Max position: {profile.max_position_size}%
          </div>
          {intelligence.portfolio_exposure_percent > profile.max_position_size && (
            <div className="flex items-center gap-1.5 text-[10px] text-amber-500">
              <AlertTriangle className="w-3 h-3" />
              Over max position size
            </div>
          )}
        </div>
      </div>

      {/* ── Reasons ── */}
      {intelligence.reasons.length > 0 && (
        <div>
          <h4 className="section-label mb-2">Rationale</h4>
          <ul className="space-y-1.5">
            {intelligence.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-400 leading-relaxed">
                <span className="text-brand-400 flex-shrink-0 mt-0.5">›</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Disclaimer ── */}
      <div className="flex items-start gap-2 pt-2 border-t border-surface-500">
        <Clock className="w-3 h-3 text-slate-600 flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-slate-600 leading-relaxed">{intelligence.disclaimer}</p>
      </div>
    </div>
  )
}
