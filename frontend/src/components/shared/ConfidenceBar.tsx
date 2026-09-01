import clsx from 'clsx'

interface ConfidenceBarProps {
  value: number // 0–1
  label?: string
  size?: 'sm' | 'md' | 'lg'
}

function getConfidenceColor(v: number): string {
  if (v >= 0.75) return 'bg-bullish'
  if (v >= 0.50) return 'bg-yellow-400'
  if (v >= 0.25) return 'bg-orange-400'
  return 'bg-bearish'
}

export function ConfidenceBar({ value, label, size = 'md' }: ConfidenceBarProps) {
  const pct = Math.round(value * 100)
  const color = getConfidenceColor(value)
  const heights = { sm: 'h-1', md: 'h-2', lg: 'h-3' }

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-slate-400">{label}</span>
          <span className="text-xs font-mono font-semibold text-slate-200">{pct}%</span>
        </div>
      )}
      <div className={clsx('w-full bg-surface-400 rounded-full overflow-hidden', heights[size])}>
        <div
          className={clsx('h-full rounded-full transition-all duration-700', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {!label && (
        <div className="mt-1 text-right">
          <span className="text-xs font-mono text-slate-400">{pct}%</span>
        </div>
      )}
    </div>
  )
}

// ---- Score bar (for market score -1 to +1) ----

interface ScoreBarProps {
  value: number // -1 to 1
  label?: string
}

export function ScoreBar({ value, label }: ScoreBarProps) {
  const pct = ((value + 1) / 2) * 100 // normalize to 0–100
  const color = value > 0.1 ? 'bg-bullish' : value < -0.1 ? 'bg-bearish' : 'bg-neutral'

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-slate-400">{label}</span>
          <span className={clsx('text-xs font-mono font-semibold', value > 0.1 ? 'text-bullish' : value < -0.1 ? 'text-bearish' : 'text-slate-300')}>
            {value > 0 ? '+' : ''}{value.toFixed(3)}
          </span>
        </div>
      )}
      <div className="relative w-full h-2 bg-surface-400 rounded-full overflow-hidden">
        {/* Center marker */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-500 z-10" />
        <div
          className={clsx('absolute h-full rounded-full transition-all duration-700', color)}
          style={{
            left: value >= 0 ? '50%' : `${pct}%`,
            width: `${Math.abs(value) * 50}%`,
          }}
        />
      </div>
    </div>
  )
}
