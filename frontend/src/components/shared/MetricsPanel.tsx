import type { AnalysisMetric } from '../../types/api'
import { Timer } from 'lucide-react'

interface MetricsPanelProps { metrics: AnalysisMetric[] }

function MetricTile({ metric }: { metric: AnalysisMetric }) {
  const isLatency = metric.unit === 'ms'
  const isRatio   = metric.unit === 'ratio' || metric.unit === '%' || metric.unit === 'score'
  const formatted = isLatency
    ? `${metric.value.toFixed(1)} ms`
    : isRatio
      ? `${(metric.value * 100).toFixed(1)}%`
      : metric.value.toFixed(2)

  const label = metric.name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())

  const color = isLatency
    ? metric.value < 50 ? '#00d09c' : metric.value < 200 ? '#f59e0b' : '#ff5252'
    : '#3b82f6'

  return (
    <div className="bg-slate-50 dark:bg-surface-600 border border-slate-200 dark:border-surface-400 rounded-lg px-3 py-2.5 space-y-1">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider leading-snug">{label}</div>
      <div className="font-mono font-bold text-sm" style={{ color }}>{formatted}</div>
      {!metric.measured && (
        <div className="text-[10px] text-amber-500">estimated</div>
      )}
    </div>
  )
}

export function MetricsPanel({ metrics }: MetricsPanelProps) {
  const latencyMetrics = metrics.filter(m => m.unit === 'ms')
  const otherMetrics   = metrics.filter(m => m.unit !== 'ms')

  return (
    <div className="card p-4 space-y-3 animate-fade-in">
      <div className="flex items-center gap-2">
        <Timer className="w-3.5 h-3.5 text-brand-400" />
        <h3 className="section-label">Performance Metrics</h3>
      </div>

      {latencyMetrics.length > 0 && (
        <div>
          <div className="text-[10px] text-slate-600 mb-2 uppercase tracking-wider">Latency</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {latencyMetrics.map(m => <MetricTile key={m.name} metric={m} />)}
          </div>
        </div>
      )}

      {otherMetrics.length > 0 && (
        <div>
          <div className="text-[10px] text-slate-600 mb-2 uppercase tracking-wider">Quality</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {otherMetrics.map(m => <MetricTile key={m.name} metric={m} />)}
          </div>
        </div>
      )}
    </div>
  )
}
