import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { DecisionTraceStep } from '../../types/api'

const STAGE_COLORS: Record<string, string> = {
  data_loading:      'bg-slate-500/15   border-slate-500/30   text-slate-700 dark:text-slate-400',
  technical_agent:   'bg-blue-500/15    border-blue-500/30    text-blue-400',
  fundamental_agent: 'bg-amber-500/15   border-amber-500/30   text-amber-400',
  sentiment_agent:   'bg-purple-500/15  border-purple-500/30  text-purple-400',
  synthesis:         'bg-brand-500/15   border-brand-500/30   text-brand-400',
  personalization:   'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
}

const STAGE_DOT: Record<string, string> = {
  data_loading:      'bg-slate-400',
  technical_agent:   'bg-blue-400',
  fundamental_agent: 'bg-amber-400',
  sentiment_agent:   'bg-purple-400',
  synthesis:         'bg-brand-400',
  personalization:   'bg-emerald-400',
}

interface DecisionTraceProps { steps: DecisionTraceStep[] }

export function DecisionTrace({ steps }: DecisionTraceProps) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  return (
    <div className="card p-5 animate-fade-in">
      <h3 className="section-label mb-4">Decision Trace</h3>

      <div className="relative">
        {/* Vertical connector */}
        <div className="absolute left-4 top-4 bottom-4 w-px bg-slate-300 dark:bg-surface-400" />

        <div className="space-y-2 ml-10">
          {steps.map((step, i) => {
            const dotCls  = STAGE_DOT[step.stage]  ?? 'bg-slate-400'
            const tagCls  = STAGE_COLORS[step.stage] ?? 'bg-slate-500/15 border-slate-500/30 text-slate-700 dark:text-slate-400'
            const isOpen  = openIdx === i
            const hasDetails = Object.keys(step.details).length > 0

            return (
              <div key={i} className="relative">
                {/* Node dot */}
                <div className={`absolute -left-[2.25rem] top-3 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-surface-900 ${dotCls}`} />

                <div
                  className={`bg-slate-50 dark:bg-surface-600 border border-slate-200 dark:border-surface-400 rounded-lg overflow-hidden
                    ${hasDetails ? 'cursor-pointer hover:border-slate-300 dark:hover:border-surface-300' : ''} transition-colors`}
                  onClick={() => hasDetails && setOpenIdx(isOpen ? null : i)}
                >
                  {/* Step header */}
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono uppercase ${tagCls}`}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-200">{step.title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{step.summary}</div>
                      </div>
                    </div>
                    {hasDetails && (
                      isOpen
                        ? <ChevronDown  className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        : <ChevronRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    )}
                  </div>

                  {/* Details panel */}
                  {isOpen && hasDetails && (
                    <div className="px-3 pb-3 pt-0 border-t border-slate-200 dark:border-surface-500 animate-fade-in">
                      <pre className="text-[10px] text-slate-500 dark:text-slate-400 font-mono leading-relaxed overflow-auto max-h-48
                                      bg-slate-100 dark:bg-surface-800 rounded p-2 mt-2 whitespace-pre-wrap">
                        {JSON.stringify(step.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
