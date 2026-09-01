import { useEffect, useRef } from 'react'

interface ConfidenceRingProps {
  value: number        // 0–1
  size?: number        // px
  strokeWidth?: number
  label?: string
  showPct?: boolean
}

function ringColor(v: number) {
  if (v >= 0.70) return '#00d09c'
  if (v >= 0.45) return '#f59e0b'
  return '#ff5252'
}

export function ConfidenceRing({ value, size = 80, strokeWidth = 8, label, showPct = true }: ConfidenceRingProps) {
  const r       = (size - strokeWidth) / 2
  const circum  = 2 * Math.PI * r
  const offset  = circum * (1 - Math.min(1, Math.max(0, value)))
  const color   = ringColor(value)
  const ringRef = useRef<SVGCircleElement>(null)

  useEffect(() => {
    const el = ringRef.current
    if (!el) return
    el.style.setProperty('--ring-offset', String(offset))
    el.style.strokeDashoffset = String(circum)
    void el.getBoundingClientRect()
    el.style.transition = 'stroke-dashoffset 1s ease-out'
    el.style.strokeDashoffset = String(offset)
  }, [value, offset, circum])

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div style={{ width: size, height: size }} className="relative flex-shrink-0">
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={size / 2} cy={size / 2} r={r}
            className="ring-track"
          />
          <circle
            ref={ringRef}
            cx={size / 2} cy={size / 2} r={r}
            className="ring-fill"
            stroke={color}
            strokeDasharray={circum}
            strokeDashoffset={circum}
            strokeLinecap="round"
          />
        </svg>
        {showPct && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-bold font-mono" style={{ color }}>
              {Math.round(value * 100)}%
            </span>
          </div>
        )}
      </div>
      {label && (
        <span className="text-[10px] text-slate-500 uppercase tracking-wider text-center">{label}</span>
      )}
    </div>
  )
}

interface ConfidenceBarProps {
  value: number
  label?: string
  size?: 'sm' | 'md'
}

export function ConfidenceBar({ value, label, size = 'md' }: ConfidenceBarProps) {
  const color = ringColor(value)
  const h = size === 'sm' ? 'h-1' : 'h-1.5'
  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">{label}</span>
          <span className="font-mono font-semibold" style={{ color }}>
            {Math.round(value * 100)}%
          </span>
        </div>
      )}
      <div className={`score-bar-track ${h}`}>
        <div
          className="score-bar-fill"
          style={{ width: `${value * 100}%`, background: color }}
        />
      </div>
    </div>
  )
}

interface ScoreBarProps {
  value: number   // -1 to +1
  label?: string
}

export function ScoreBar({ value, label }: ScoreBarProps) {
  const clamped = Math.min(1, Math.max(-1, value))
  const isPos   = clamped >= 0
  const pct     = Math.abs(clamped) * 50  // half bar for each direction
  const color   = clamped > 0.05 ? '#00d09c' : clamped < -0.05 ? '#ff5252' : '#94a3b8'

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">{label}</span>
          <span className="font-mono font-semibold" style={{ color }}>
            {clamped > 0 ? '+' : ''}{clamped.toFixed(2)}
          </span>
        </div>
      )}
      <div className="relative h-1.5 rounded-full bg-slate-200 dark:bg-surface-500 overflow-hidden">
        {/* centre line */}
        <div className="absolute top-0 left-1/2 w-px h-full bg-slate-400 dark:bg-surface-300 z-10" />
        <div
          className="absolute top-0 h-full rounded-full transition-all duration-700"
          style={{
            left:  isPos ? '50%' : `${50 - pct}%`,
            width: `${pct}%`,
            background: color,
          }}
        />
      </div>
    </div>
  )
}
