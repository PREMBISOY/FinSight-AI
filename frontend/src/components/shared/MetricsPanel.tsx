import type { AnalysisMetric } from '../../types/api'

interface MetricsPanelProps {
  metrics: AnalysisMetric[]
}

function formatValue(metric: AnalysisMetric): string {
  if (metric.unit === 'ratio') return `${(metric.value * 100).toFixed(1)}%`
  if (metric.unit === 'ms') return `${metric.value.toFixed(1)}ms`
  if (metric.unit === 'score') {
    const v = metric.value
    return `${v > 0 ? '+' : ''}${v.toFixed(3)}`
  }
  if (metric.unit === 'count') return `${Math.round(metric.value)}`
  return metric.value.toFixed(3)
}

function getMetricColor(metric: AnalysisMetric): string {
  if (metric.unit === 'ratio') {
    if (metric.value >= 0.75) return 'text-bullish'
    if (metric.value >= 0.50) return 'text-yellow-400'
    return 'text-bearish'
  }
  if (metric.unit === 'score') {
    if (metric.value > 0.1) return 'text-bullish'
    if (metric.value < -0.1) return 'text-bearish'
    return 'text-slate-300'
  }
  return 'text-slate-200'
}

const METRIC_LABELS: Record<string, string> = {
  data_completeness: 'Data Completeness',
  synthesis_confidence: 'Synthesis Confidence',
  agreement_score: 'Agent Agreement',
  market_score: 'Market Score',
  technical_latency: 'Technical Latency',
  fundamental_latency: 'Fundamental Latency',
  sentiment_latency: 'Sentiment Latency',
  total_evidence_pieces: 'Evidence Pieces',
}

export function MetricsPanel({ metrics }: MetricsPanelProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {metrics.map(metric => (
        <div key={metric.name} className="bg-surface-600 border border-white/5 rounded-lg p-3">
          <div className="text-xs text-slate-500 mb-1 truncate">
            {METRIC_LABELS[metric.name] ?? metric.name.replace(/_/g, ' ')}
          </div>
          <div className={`text-lg font-mono font-bold ${getMetricColor(metric)}`}>
            {formatValue(metric)}
          </div>
          {metric.measured && (
            <div className="text-xs text-slate-600 mt-0.5">measured</div>
          )}
        </div>
      ))}
    </div>
  )
}
