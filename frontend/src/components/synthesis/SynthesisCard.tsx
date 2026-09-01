import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { AlertCircle, CheckCircle } from 'lucide-react'
import type { SynthesisResult } from '../../types/api'
import { OutlookBadge } from '../shared/Badges'
import { ConfidenceBar, ScoreBar } from '../shared/ConfidenceBar'

interface SynthesisCardProps { synthesis: SynthesisResult }

function RadialGauge({ score }: { score: number }) {
  // score: -1 to +1 → arc from 210° to 330° (240° sweep)
  const sweep   = 240
  const start   = 210
  const r       = 42
  const cx      = 60
  const cy      = 60
  const size    = 120
  const sw      = 10

  const toRad   = (d: number) => (d * Math.PI) / 180
  const arc     = (deg: number, radius: number) => ({
    x: cx + radius * Math.cos(toRad(deg)),
    y: cy + radius * Math.sin(toRad(deg)),
  })

  const trackStart = arc(start, r)
  const trackEnd   = arc(start + sweep, r)
  const trackPath  = `M ${trackStart.x} ${trackStart.y} A ${r} ${r} 0 1 1 ${trackEnd.x} ${trackEnd.y}`

  const normalised = (Math.min(1, Math.max(-1, score)) + 1) / 2  // 0→1
  const fillSweep  = normalised * sweep
  const fillEnd    = arc(start + fillSweep, r)
  const largeArc   = fillSweep > 180 ? 1 : 0
  const fillPath   = `M ${trackStart.x} ${trackStart.y} A ${r} ${r} 0 ${largeArc} 1 ${fillEnd.x} ${fillEnd.y}`
  const color      = score > 0.1 ? '#00d09c' : score < -0.1 ? '#ff5252' : '#94a3b8'

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size * 0.75} viewBox={`0 0 ${size} ${size * 0.9}`}>
        <path d={trackPath} fill="none" stroke="var(--border)" strokeWidth={sw} strokeLinecap="round" />
        <path d={fillPath}  fill="none" stroke={color}   strokeWidth={sw} strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
        <text x={cx} y={cy + 4} textAnchor="middle" fill={color}
              fontSize="14" fontWeight="700" fontFamily="JetBrains Mono, monospace">
          {score > 0 ? '+' : ''}{score.toFixed(2)}
        </text>
        <text x={cx} y={cy + 20} textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="Inter, sans-serif">
          MARKET SCORE
        </text>
      </svg>
    </div>
  )
}

function ContribBar({ agent, weightedScore, confidence, weight, included }: {
  agent: string; weightedScore: number; confidence: number; weight: number; included: boolean
}) {
  const color  = weightedScore > 0.01 ? '#00d09c' : weightedScore < -0.01 ? '#ff5252' : '#94a3b8'
  const widthPct = Math.abs(weightedScore) * 100  // max 1 → 100%

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-mono text-slate-600 dark:text-slate-400 uppercase w-24">{agent}</span>
        <span className="text-slate-600">w={weight.toFixed(2)} × {(confidence * 100).toFixed(0)}%</span>
        <span className={`font-mono font-bold ml-2 ${!included ? 'opacity-30' : ''}`} style={{ color }}>
          {weightedScore > 0 ? '+' : ''}{weightedScore.toFixed(3)}
        </span>
      </div>
      <div className="h-1 rounded-full bg-slate-200 dark:bg-surface-500 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
             style={{ width: `${Math.min(100, widthPct * 100)}%`, background: color, opacity: included ? 1 : 0.2 }}
        />
      </div>
    </div>
  )
}

export function SynthesisCard({ synthesis }: SynthesisCardProps) {
  return (
    <div className="card p-5 space-y-5 animate-slide-up">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="section-label mb-2">Market Synthesis</h3>
          <OutlookBadge value={synthesis.outlook} />
        </div>
        {synthesis.conflict_detected ? (
          <div className="flex items-center gap-1.5 text-xs font-mono text-red-400 animate-score-pulse bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
            <AlertCircle className="w-3.5 h-3.5" />
            CONFLICT
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
            <CheckCircle className="w-3.5 h-3.5" />
            CONSISTENT
          </div>
        )}
      </div>

      {/* ── Radial gauge + confidence ring ── */}
      <div className="flex items-center justify-around py-2">
        <RadialGauge score={synthesis.market_score} />
        <div className="space-y-3">
          <ConfidenceBar value={synthesis.confidence}        label="Confidence"       size="sm" />
          <ConfidenceBar value={synthesis.agreement_score}   label="Agreement"        size="sm" />
          <ConfidenceBar value={synthesis.data_completeness} label="Data Completeness" size="sm" />
        </div>
      </div>

      {/* ── Agent contribution bars ── */}
      <div>
        <h4 className="section-label mb-3">Agent Contributions</h4>
        <div className="space-y-2.5">
          {synthesis.contributions.map(c => (
            <ContribBar
              key={c.agent}
              agent={c.agent}
              weightedScore={c.weighted_score}
              confidence={c.confidence}
              weight={c.base_weight}
              included={c.included}
            />
          ))}
        </div>
      </div>

      {/* ── Reasoning ── */}
      {synthesis.reasoning.length > 0 && (
        <div>
          <h4 className="section-label mb-2">Reasoning</h4>
          <ul className="space-y-1.5">
            {synthesis.reasoning.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <span className="text-brand-400 flex-shrink-0 mt-0.5">›</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Limitations ── */}
      {synthesis.limitations.length > 0 && (
        <div className="border-t border-surface-500 pt-3">
          <h4 className="section-label mb-1.5">Limitations</h4>
          {synthesis.limitations.map((l, i) => (
            <p key={i} className="text-xs text-slate-500 flex items-start gap-1.5 mb-1">
              <span className="text-amber-500 flex-shrink-0">!</span> {l}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
