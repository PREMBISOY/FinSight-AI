import { useState } from 'react'
import type { DecisionTraceStep } from '../../types/api'
import { ChevronDown, ChevronRight, GitBranch } from 'lucide-react'
import clsx from 'clsx'

interface DecisionTraceProps {
  steps: DecisionTraceStep[]
}

const stageColors: Record<string, string> = {
  '1_data_ingestion': 'border-slate-500/40 bg-slate-500/5',
  '2_agent_execution': 'border-brand-500/40 bg-brand-500/5',
  '3_synthesis':       'border-purple-500/40 bg-purple-500/5',
  '4_personalization': 'border-cyan-500/40 bg-cyan-500/5',
  '5_output':          'border-bullish/40 bg-bullish/5',
}

const stageNumberColor: Record<string, string> = {
  '1_data_ingestion': 'bg-slate-600 text-slate-300',
  '2_agent_execution': 'bg-brand-600/40 text-brand-400',
  '3_synthesis':       'bg-purple-600/40 text-purple-400',
  '4_personalization': 'bg-cyan-600/40 text-cyan-400',
  '5_output':          'bg-bullish/20 text-bullish',
}

export function DecisionTrace({ steps }: DecisionTraceProps) {
  const [open, setOpen] = useState(false)
  const [expandedStep, setExpandedStep] = useState<string | null>(null)

  return (
    <div className="bg-surface-700 border border-white/5 rounded-xl overflow-hidden animate-fade-in">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-surface-600/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <GitBranch className="w-4 h-4 text-brand-400" />
          <div className="text-left">
            <div className="text-sm font-semibold text-white">Decision Trace</div>
            <div className="text-xs text-slate-500 mt-0.5">{steps.length} pipeline stages · fully auditable</div>
          </div>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-4 animate-fade-in">
          {steps.map((step, i) => (
            <div
              key={step.stage}
              className={clsx(
                'border rounded-lg overflow-hidden',
                stageColors[step.stage] ?? 'border-white/5 bg-surface-600',
              )}
            >
              <button
                onClick={() => setExpandedStep(expandedStep === step.stage ? null : step.stage)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/2 transition-colors"
              >
                <span className={clsx(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold flex-shrink-0',
                  stageNumberColor[step.stage] ?? 'bg-slate-600 text-slate-300',
                )}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white">{step.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5 truncate">{step.summary}</div>
                </div>
                {expandedStep === step.stage
                  ? <ChevronDown className="w-3 h-3 text-slate-500 flex-shrink-0" />
                  : <ChevronRight className="w-3 h-3 text-slate-500 flex-shrink-0" />
                }
              </button>

              {expandedStep === step.stage && (
                <div className="px-3 pb-3 border-t border-white/5 animate-fade-in">
                  <pre className="mt-2 text-xs text-slate-400 bg-surface-900 rounded-lg p-3 overflow-auto max-h-60 font-mono leading-relaxed">
                    {JSON.stringify(step.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
