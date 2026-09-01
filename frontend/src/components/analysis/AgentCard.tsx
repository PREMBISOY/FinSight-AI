import { useState } from 'react'
import type { AgentOutput } from '../../types/api'
import { ClassificationBadge, AgentStatusBadge } from '../shared/Badges'
import { ConfidenceBar } from '../shared/ConfidenceBar'
import { ChevronDown, ChevronRight, Cpu, BookOpen, MessageSquare, ExternalLink, AlertCircle } from 'lucide-react'
import clsx from 'clsx'

const agentIcons = {
  technical: Cpu,
  fundamental: BookOpen,
  sentiment: MessageSquare,
}

const agentColors = {
  technical:   { border: 'border-brand-500/30',   glow: 'shadow-brand-500/10',   label: 'TECHNICAL',   dot: 'bg-brand-500', icon: 'bg-brand-500/10' },
  fundamental: { border: 'border-purple-500/30',  glow: 'shadow-purple-500/10',  label: 'FUNDAMENTAL', dot: 'bg-purple-500', icon: 'bg-purple-500/10' },
  sentiment:   { border: 'border-cyan-500/30',    glow: 'shadow-cyan-500/10',    label: 'SENTIMENT',   dot: 'bg-cyan-500', icon: 'bg-cyan-500/10' },
}

// ---- Agent status row (compact, shown during/after analysis) ----

interface AgentStatusRowProps {
  agents: AgentOutput[]
  isRunning: boolean
}

export function AgentStatusRow({ agents, isRunning }: AgentStatusRowProps) {
  const agentOrder: AgentOutput['agent'][] = ['technical', 'fundamental', 'sentiment']

  return (
    <div className="grid grid-cols-3 gap-3">
      {agentOrder.map(agentType => {
        const agent = agents.find(a => a.agent === agentType)
        const colors = agentColors[agentType]
        const Icon = agentIcons[agentType]
        const running = isRunning && !agent

        return (
          <div
            key={agentType}
            className={clsx(
              'bg-surface-700 border rounded-xl p-4 transition-all',
              running ? 'border-white/10 animate-pulse-slow' : colors.border,
              agent ? `shadow-lg ${colors.glow}` : '',
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={clsx('w-2 h-2 rounded-full', running ? 'bg-yellow-400 animate-pulse' : agent ? colors.dot : 'bg-slate-600')} />
                <Icon className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">{colors.label}</span>
              </div>
              {agent && <AgentStatusBadge value={agent.status} />}
              {running && <span className="text-xs text-yellow-400 font-mono animate-pulse">RUNNING</span>}
              {!agent && !running && <span className="text-xs text-slate-600 font-mono">IDLE</span>}
            </div>

            {agent ? (
              <div className="space-y-2">
                <ClassificationBadge value={agent.classification} />
                <ConfidenceBar value={agent.confidence} label="Confidence" size="sm" />
                <div className="text-xs text-slate-600 font-mono">{agent.latency_ms.toFixed(1)}ms</div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="h-6 bg-surface-500 rounded animate-pulse" />
                <div className="h-2 bg-surface-500 rounded animate-pulse" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---- Full agent card (expandable) ----

interface AgentCardProps {
  agent: AgentOutput
  defaultExpanded?: boolean
}

export function AgentCard({ agent, defaultExpanded = false }: AgentCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [evidenceOpen, setEvidenceOpen] = useState(false)
  const colors = agentColors[agent.agent]
  const Icon = agentIcons[agent.agent]

  const isUnavailable = agent.status === 'unavailable' || agent.status === 'error'

  return (
    <div className={clsx('bg-surface-700 border rounded-xl overflow-hidden animate-slide-up', colors.border)}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-surface-600/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', colors.icon)}>
            <Icon className="w-4 h-4 text-slate-300" />
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold text-white font-mono uppercase tracking-wide">{colors.label}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <AgentStatusBadge value={agent.status} />
              <span className="text-xs text-slate-600">{agent.latency_ms.toFixed(1)}ms</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {!isUnavailable && (
            <div className="text-right">
              <ClassificationBadge value={agent.classification} />
              <div className="text-xs text-slate-500 mt-1">{(agent.confidence * 100).toFixed(0)}% confidence</div>
            </div>
          )}
          {expanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4 animate-fade-in">
          {isUnavailable ? (
            <div className="flex items-start gap-3 p-3 bg-surface-600 rounded-lg">
              <AlertCircle className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-slate-400">Agent output is {agent.status.toUpperCase()}.</p>
                {agent.limitations.map((l, i) => (
                  <p key={i} className="text-xs text-slate-500 mt-1">{l}</p>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Confidence */}
              <div>
                <ConfidenceBar value={agent.confidence} label="Confidence" size="md" />
              </div>

              {/* Signals */}
              {agent.signals.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Signals</h4>
                  <div className="space-y-2">
                    {agent.signals.map((sig, i) => (
                      <div key={i} className="bg-surface-600 rounded-lg p-3 border border-white/5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono text-slate-300">{sig.name}</span>
                          <span className="text-xs font-mono font-bold text-white">
                            {typeof sig.value === 'boolean' ? (sig.value ? '✓' : '✗') : String(sig.value)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{sig.interpretation}</p>
                        <p className="text-xs text-slate-600 mt-0.5 font-mono">src: {sig.source}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reasoning */}
              {agent.reasoning.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Reasoning</h4>
                  <ul className="space-y-1">
                    {agent.reasoning.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                        <span className="text-brand-400 mt-0.5 flex-shrink-0">›</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Evidence */}
              {agent.evidence.length > 0 && (
                <div>
                  <button
                    onClick={() => setEvidenceOpen(!evidenceOpen)}
                    className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-300 transition-colors"
                  >
                    {evidenceOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    Evidence ({agent.evidence.length})
                  </button>
                  {evidenceOpen && (
                    <div className="mt-2 space-y-2 animate-fade-in">
                      {agent.evidence.map((ev, i) => (
                        <div key={i} className="bg-surface-600 rounded-lg p-3 border border-white/5">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-slate-300">{ev.source_name}</span>
                            <div className="flex items-center gap-2">
                              {ev.synthetic && (
                                <span className="text-xs px-1.5 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-600 font-mono">SYNTHETIC</span>
                              )}
                              {ev.relevance_score != null && (
                                <span className="text-xs text-slate-600 font-mono">rel: {(ev.relevance_score * 100).toFixed(0)}%</span>
                              )}
                              {ev.url && <ExternalLink className="w-3 h-3 text-slate-600" />}
                            </div>
                          </div>
                          <p className="text-xs text-slate-400 italic">"{ev.excerpt}"</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-slate-600">{ev.source_type}</span>
                            {ev.chunk_id && <span className="text-xs font-mono text-slate-600">{ev.chunk_id}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Limitations */}
              {agent.limitations.length > 0 && (
                <div className="border-t border-white/5 pt-3">
                  <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Limitations</h4>
                  {agent.limitations.map((l, i) => (
                    <p key={i} className="text-xs text-slate-500 flex items-start gap-1">
                      <span className="text-slate-600 flex-shrink-0">!</span> {l}
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
