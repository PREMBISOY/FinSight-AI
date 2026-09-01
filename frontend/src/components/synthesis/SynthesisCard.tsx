import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { SynthesisResult } from '../../types/api'
import { OutlookBadge } from '../shared/Badges'
import { ConfidenceBar, ScoreBar } from '../shared/ConfidenceBar'
import { AlertCircle, CheckCircle } from 'lucide-react'

interface SynthesisCardProps {
  synthesis: SynthesisResult
}

export function SynthesisCard({ synthesis }: SynthesisCardProps) {
  const chartData = synthesis.contributions.map(c => ({
    agent: c.agent.toUpperCase(),
    score: c.included ? parseFloat((c.weighted_score * 100).toFixed(1)) : 0,
    fill: c.weighted_score > 0.01 ? '#22c55e' : c.weighted_score < -0.01 ? '#ef4444' : '#475569',
  }))

  return (
    <div className="bg-surface-700 border border-white/5 rounded-xl p-5 space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Market Synthesis</h3>
          <OutlookBadge value={synthesis.outlook} />
        </div>
        <div className="flex items-center gap-2">
          {synthesis.conflict_detected ? (
            <div className="flex items-center gap-1.5 text-bearish text-xs font-mono">
              <AlertCircle className="w-4 h-4" />
              CONFLICT
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-bullish text-xs font-mono">
              <CheckCircle className="w-4 h-4" />
              CONSISTENT
            </div>
          )}
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <ScoreBar value={synthesis.market_score} label="Market Score" />
        </div>
        <div>
          <ConfidenceBar value={synthesis.confidence} label="Confidence" size="sm" />
        </div>
        <div>
          <ConfidenceBar value={synthesis.agreement_score} label="Agent Agreement" size="sm" />
        </div>
        <div>
          <ConfidenceBar value={synthesis.data_completeness} label="Data Completeness" size="sm" />
        </div>
      </div>

      {/* Contribution chart */}
      <div>
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Agent Contributions (Weighted Score)</h4>
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="agent" tick={{ fill: '#777777', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#777777', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#ffffff', border: '1px solid #e7e7e7', borderRadius: '4px', fontSize: '11px' }}
                formatter={(v: number) => [`${v > 0 ? '+' : ''}${v.toFixed(1)}`, 'Weighted Score']}
              />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Contribution table */}
        <div className="mt-3 space-y-1">
          {synthesis.contributions.map(c => (
            <div key={c.agent} className="flex items-center gap-2 text-xs">
              <span className="font-mono text-slate-500 uppercase w-20">{c.agent}</span>
              <span className="text-slate-600">w={c.base_weight.toFixed(2)}</span>
              <span className="text-slate-600">×</span>
              <span className={c.classification_score > 0 ? 'text-bullish' : c.classification_score < 0 ? 'text-bearish' : 'text-slate-400'}>
                {c.classification_score > 0 ? '+' : ''}{c.classification_score}
              </span>
              <span className="text-slate-600">×</span>
              <span className="text-slate-400">{(c.confidence * 100).toFixed(0)}%</span>
              <span className="text-slate-600">=</span>
              <span className={`font-mono font-semibold ${c.weighted_score > 0.01 ? 'text-bullish' : c.weighted_score < -0.01 ? 'text-bearish' : 'text-slate-400'}`}>
                {c.weighted_score > 0 ? '+' : ''}{c.weighted_score.toFixed(3)}
              </span>
              {!c.included && <span className="text-xs text-slate-600">(excluded)</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Reasoning */}
      {synthesis.reasoning.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Reasoning</h4>
          <ul className="space-y-1">
            {synthesis.reasoning.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                <span className="text-brand-400 flex-shrink-0 mt-0.5">›</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Limitations */}
      {synthesis.limitations.length > 0 && (
        <div className="border-t border-white/5 pt-3">
          <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Limitations</h4>
          {synthesis.limitations.map((l, i) => (
            <p key={i} className="text-xs text-slate-500 flex items-start gap-1">
              <span className="text-slate-600 flex-shrink-0">!</span> {l}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
