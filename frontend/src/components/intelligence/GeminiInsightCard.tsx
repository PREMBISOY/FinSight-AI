import { AlertTriangle, ExternalLink, Search, Sparkles } from 'lucide-react'
import type { AIInsight } from '../../types/api'

interface GeminiInsightCardProps {
  insight: AIInsight
}

export function GeminiInsightCard({ insight }: GeminiInsightCardProps) {
  if (insight.status !== 'success') {
    return (
      <div className="bg-surface-700 border border-warning/20 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
        <div>
          <div className="text-xs font-semibold text-slate-300">Gemini insight {insight.status}</div>
          <p className="text-xs text-slate-500 mt-1">{insight.limitation}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface-700 border border-brand-500/20 rounded-xl p-5 space-y-4 animate-slide-up">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-400" />
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Gemini Research Insight</h3>
        </div>
        <div className="text-[10px] font-mono text-slate-500">
          {insight.model} · {insight.latency_ms.toFixed(0)}ms
        </div>
      </div>

      <p className="text-sm text-slate-300 leading-relaxed">{insight.summary}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Profile considerations</h4>
          <ul className="space-y-2">
            {insight.profile_specific_guidance.map((item, index) => (
              <li key={index} className="text-xs text-slate-400 flex items-start gap-2">
                <span className="text-brand-400">›</span>{item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Key risks</h4>
          <ul className="space-y-2">
            {insight.key_risks.map((item, index) => (
              <li key={index} className="text-xs text-slate-400 flex items-start gap-2">
                <span className="text-warning">›</span>{item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {insight.citations.length > 0 && (
        <div className="pt-3 border-t border-white/5">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
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
                className="inline-flex items-center gap-1 px-2 py-1 bg-surface-600 border border-white/5 rounded text-xs text-brand-400 hover:border-brand-500/30"
              >
                {citation.title}<ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
