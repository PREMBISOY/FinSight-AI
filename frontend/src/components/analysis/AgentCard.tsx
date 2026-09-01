import { useState } from 'react'
import { BarChart2, FileSearch, Radio, ChevronDown, ChevronRight, AlertCircle, Loader2 } from 'lucide-react'
import type { AgentOutput, AgentType } from '../../types/api'
import { ClassificationBadge, AgentStatusBadge } from '../shared/Badges'
import { ConfidenceRing, ConfidenceBar } from '../shared/ConfidenceBar'

// ── Per-agent styling ────────────────────────────────────────────────────────
const AGENT_CONFIG = {
  technical:   { label: 'Technical',   Icon: BarChart2,   border: 'border-l-blue-500',   iconBg: 'bg-blue-500/10',   iconColor: 'text-blue-400',   glow: 'card-glow-blue',   ring: '#3b82f6' },
  fundamental: { label: 'Fundamental', Icon: FileSearch,  border: 'border-l-amber-500',  iconBg: 'bg-amber-500/10',  iconColor: 'text-amber-400',  glow: '',                 ring: '#f59e0b' },
  sentiment:   { label: 'Sentiment',   Icon: Radio,       border: 'border-l-purple-500',  iconBg: 'bg-purple-500/10', iconColor: 'text-purple-400', glow: '',                 ring: '#a78bfa' },
} as const

// ── Signal chip (color-coded by value direction) ──────────────────────────────
function SignalChip({ name, value, interpretation }: { name: string; value: string | number | boolean; interpretation: string }) {
  const num   = typeof value === 'boolean' ? (value ? 1 : -1) : Number(value)
  const cls   = isNaN(num) ? 'signal-chip-neu' : num > 0.005 ? 'signal-chip-bull' : num < -0.005 ? 'signal-chip-bear' : 'signal-chip-neu'
  const arrow = isNaN(num) ? '—' : num > 0.005 ? '▲' : num < -0.005 ? '▼' : '●'
  const arrowColor = isNaN(num) ? 'text-slate-500' : num > 0.005 ? 'text-emerald-600 dark:text-emerald-400' : num < -0.005 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'

  const display = typeof value === 'boolean'
    ? (value ? 'TRUE' : 'FALSE')
    : typeof value === 'number'
      ? (Math.abs(value) < 10 ? value.toFixed(4) : value.toLocaleString('en-IN'))
      : String(value)

  return (
    <div className={cls} title={interpretation}>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={`flex-shrink-0 text-xs ${arrowColor}`}>{arrow}</span>
        <span className="text-slate-700 dark:text-slate-300 truncate">{name}</span>
      </div>
      <span className="font-bold text-slate-900 dark:text-white flex-shrink-0 ml-2">{display}</span>
    </div>
  )
}

// ── Pipeline status row ───────────────────────────────────────────────────────
interface AgentStatusRowProps {
  agents: AgentOutput[]
  isRunning: boolean
}

export function AgentStatusRow({ agents, isRunning }: AgentStatusRowProps) {
  const agentKeys: AgentType[] = ['technical', 'fundamental', 'sentiment']

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        {agentKeys.map((key, idx) => {
          const cfg   = AGENT_CONFIG[key]
          const agent = agents.find(a => a.agent === key)
          const done  = !!agent
          const { Icon } = cfg

          return (
            <div key={key} className="flex items-center flex-1">
              {/* Node */}
              <div className="pipeline-node flex-shrink-0">
                <div
                  className={`pipeline-dot
                    ${done
                      ? `border-transparent ${cfg.iconBg}`
                      : isRunning
                        ? 'border-slate-300 bg-slate-100 dark:border-surface-400 dark:bg-surface-600'
                        : 'border-slate-300 bg-slate-50 dark:border-surface-400 dark:bg-surface-700'
                    }
                  `}
                >
                  {isRunning && !done
                    ? <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                    : <Icon className={`w-4 h-4 ${done ? cfg.iconColor : 'text-slate-600'}`} />
                  }
                </div>
                <span className={`text-[10px] uppercase tracking-wider ${done ? cfg.iconColor : 'text-slate-600'}`}>
                  {cfg.label}
                </span>
                {done && (
                  <div className="flex flex-col items-center gap-0.5">
                    <ClassificationBadge value={agent.classification} />
                    <span className="text-[10px] text-slate-500 font-mono">{(agent.confidence * 100).toFixed(0)}%</span>
                  </div>
                )}
              </div>

              {/* Connector line (not after last) */}
              {idx < agentKeys.length - 1 && (
                <div className="flex-1 h-px mx-2 bg-slate-300 dark:bg-surface-400 relative">
                  {done && (
                    <div className="absolute inset-y-0 left-0 bg-brand-500/40 animate-slide-right" style={{ width: '100%', height: '1px' }} />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Full agent detail card ────────────────────────────────────────────────────
interface AgentCardProps {
  agent: AgentOutput
  defaultExpanded?: boolean
}

export function AgentCard({ agent, defaultExpanded = true }: AgentCardProps) {
  const [expanded,     setExpanded]     = useState(defaultExpanded)
  const [evidenceOpen, setEvidenceOpen] = useState(false)
  const cfg = AGENT_CONFIG[agent.agent as keyof typeof AGENT_CONFIG] ?? AGENT_CONFIG.technical
  const { Icon } = cfg
  const isUnavail = agent.status === 'unavailable' || agent.status === 'error'

  return (
    <div className={`card border-l-4 ${cfg.border} overflow-hidden animate-slide-up`}>

      {/* ── Header (clickable) ── */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-surface-600/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.iconBg}`}>
            <Icon className={`w-4 h-4 ${cfg.iconColor}`} />
          </div>
          <div className="text-left">
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{cfg.label}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <AgentStatusBadge value={agent.status} />
              <span className="text-[10px] text-slate-600 font-mono">{agent.latency_ms.toFixed(1)}ms</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isUnavail && (
            <ConfidenceRing value={agent.confidence} size={52} strokeWidth={6} showPct />
          )}
          {expanded
            ? <ChevronDown  className="w-4 h-4 text-slate-500" />
            : <ChevronRight className="w-4 h-4 text-slate-500" />
          }
        </div>
      </button>

      {/* ── Classification bar ── */}
      {!isUnavail && (
        <div className="px-4 pb-2 flex items-center gap-3">
          <ClassificationBadge value={agent.classification} />
          <div className="flex-1">
            <ConfidenceBar value={agent.confidence} size="sm" />
          </div>
        </div>
      )}

      {/* ── Expanded body ── */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-surface-500 pt-4 animate-fade-in">

          {isUnavail ? (
            <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-surface-600 rounded-lg border border-slate-200 dark:border-surface-400">
              <AlertCircle className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-slate-700 dark:text-slate-400">Agent is <strong>{agent.status.toUpperCase()}</strong></p>
                {agent.limitations.map((l, i) => (
                  <p key={i} className="text-xs text-slate-500 mt-1">{l}</p>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Signals */}
              {agent.signals.length > 0 && (
                <div>
                  <h4 className="section-label mb-2">Signals</h4>
                  <div className="space-y-1.5">
                    {agent.signals.map((sig, i) => (
                      <SignalChip
                        key={i}
                        name={sig.name}
                        value={sig.value}
                        interpretation={sig.interpretation}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Reasoning */}
              {agent.reasoning.length > 0 && (
                <div>
                  <h4 className="section-label mb-2">Reasoning</h4>
                  <ul className="space-y-1.5">
                    {agent.reasoning.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        <span className="text-brand-400 flex-shrink-0 mt-0.5">›</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Evidence (collapsible) */}
              {agent.evidence.length > 0 && (
                <div>
                  <button
                    onClick={() => setEvidenceOpen(!evidenceOpen)}
                    className="flex items-center gap-1.5 section-label hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                  >
                    {evidenceOpen
                      ? <ChevronDown  className="w-3 h-3" />
                      : <ChevronRight className="w-3 h-3" />
                    }
                    Evidence ({agent.evidence.length})
                  </button>
                  {evidenceOpen && (
                    <div className="mt-2 space-y-2 animate-fade-in">
                      {agent.evidence.map((ev, i) => (
                        <div key={i} className="bg-slate-50 dark:bg-surface-600 rounded-lg p-3 border border-slate-200 dark:border-surface-400">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-300">{ev.source_name}</span>
                            <div className="flex items-center gap-2">
                              {ev.synthetic && <span className="tag tag-amber">SYNTHETIC</span>}
                              {ev.relevance_score != null && (
                                <span className="text-[10px] text-slate-500 font-mono">rel: {(ev.relevance_score * 100).toFixed(0)}%</span>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 italic leading-relaxed">"{ev.excerpt}"</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[10px] text-slate-600">{ev.source_type}</span>
                            {ev.chunk_id && <span className="text-[10px] font-mono text-slate-600">{ev.chunk_id}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Limitations */}
              {agent.limitations.length > 0 && (
                <div className="border-t border-surface-500 pt-3">
                  <h4 className="section-label mb-1.5">Limitations</h4>
                  {agent.limitations.map((l, i) => (
                    <p key={i} className="text-xs text-slate-500 flex items-start gap-1.5 mb-1">
                      <span className="text-amber-500 flex-shrink-0">!</span>
                      {l}
                    </p>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
