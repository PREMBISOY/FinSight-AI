import { AlertTriangle, ExternalLink, Search, Sparkles } from 'lucide-react'
import type { AIInsight } from '../../types/api'

interface GeminiInsightCardProps {
  insight: AIInsight
  question: string
}

export function GeminiInsightCard({ insight, question }: GeminiInsightCardProps) {
  if (insight.status !== 'success') {
    return (
      <div className="card p-5 border-amber-500/25 flex items-start gap-3 animate-fade-in">
        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="section-label text-amber-500">AI explanation temporarily unavailable</h3>
          <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">{question}</p>
          <p className="text-xs text-slate-500 mt-1">{insight.limitation}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
            The deterministic analysis and personalized recommendation below are still available.
          </p>
        </div>
      </div>
    )
  }

  const hasDetails = insight.profile_specific_guidance.length > 0 || insight.key_risks.length > 0

  return (
    <section className="card p-5 space-y-4 border-brand-500/25 animate-slide-up">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-500 dark:text-brand-400" />
          <h2 className="section-label">Answer to your research question</h2>
        </div>
        <span className="text-[10px] font-mono text-slate-500">
          {insight.model} · {insight.latency_ms.toFixed(0)}ms
        </span>
      </div>

      <div className="rounded-lg bg-slate-50 dark:bg-surface-600 border border-slate-200 dark:border-surface-500 px-4 py-3">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Question</div>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{question}</p>
      </div>

      <p className="text-sm text-slate-700 dark:text-slate-300 leading-6 whitespace-pre-wrap">{insight.summary}</p>

      {hasDetails && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insight.profile_specific_guidance.length > 0 && (
            <div>
              <h3 className="section-label mb-2">Profile considerations</h3>
              <ul className="space-y-2">
                {insight.profile_specific_guidance.map((item, index) => (
                  <li key={index} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
                    <span className="text-brand-500">›</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {insight.key_risks.length > 0 && (
            <div>
              <h3 className="section-label mb-2">Key risks</h3>
              <ul className="space-y-2">
                {insight.key_risks.map((item, index) => (
                  <li key={index} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
                    <span className="text-amber-500">›</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {insight.citations.length > 0 && (
        <div className="pt-3 border-t border-slate-200 dark:border-surface-500">
          <div className="flex items-center gap-2 section-label mb-2">
            <Search className="w-3.5 h-3.5" />
            Google Search grounding sources
          </div>
          <div className="flex flex-wrap gap-2">
            {insight.citations.map(citation => (
              <a
                key={citation.url}
                href={citation.url}
                target="_blank"
                rel="noreferrer"
                className="tag tag-blue normal-case max-w-full"
              >
                <span className="truncate">{citation.title}</span><ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}

      {insight.limitation && <p className="text-[10px] text-slate-500">{insight.limitation}</p>}
    </section>
  )
}
