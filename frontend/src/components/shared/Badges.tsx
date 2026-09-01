import type { AgentClassification, AgentStatus, MarketOutlook, Recommendation } from '../../types/api'

// ── Classification ───────────────────────────────────────────────────────────
const CLASSIFICATION_CONFIG: Record<AgentClassification, { label: string; cls: string }> = {
  BULLISH:  { label: '▲ BULLISH',  cls: 'tag-green'  },
  BEARISH:  { label: '▼ BEARISH',  cls: 'tag-red'    },
  NEUTRAL:  { label: '● NEUTRAL',  cls: 'tag-slate'  },
  UNKNOWN:  { label: '? UNKNOWN',  cls: 'tag-slate'  },
}

export function ClassificationBadge({ value }: { value: AgentClassification }) {
  const { label, cls } = CLASSIFICATION_CONFIG[value] ?? CLASSIFICATION_CONFIG.UNKNOWN
  return <span className={cls}>{label}</span>
}

// ── Agent Status ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<AgentStatus, { label: string; cls: string; dot: string }> = {
  success:    { label: 'SUCCESS',    cls: 'tag-green',  dot: 'bg-emerald-400' },
  degraded:   { label: 'DEGRADED',   cls: 'tag-amber',  dot: 'bg-amber-400'  },
  unavailable:{ label: 'UNAVAILABLE',cls: 'tag-slate',  dot: 'bg-slate-500'  },
  error:      { label: 'ERROR',      cls: 'tag-red',    dot: 'bg-red-400'    },
}

export function AgentStatusBadge({ value }: { value: AgentStatus }) {
  const cfg = STATUS_CONFIG[value] ?? STATUS_CONFIG.error
  return (
    <span className={cfg.cls}>
      <span className={`w-1.5 h-1.5 rounded-full inline-block mr-1 ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

// ── Market Outlook ────────────────────────────────────────────────────────────
const OUTLOOK_CONFIG: Record<MarketOutlook, { label: string; cls: string }> = {
  STRONGLY_BULLISH:    { label: '▲▲ STRONGLY BULLISH',    cls: 'tag-green'  },
  MODERATELY_BULLISH:  { label: '▲ MODERATELY BULLISH',   cls: 'tag-green'  },
  NEUTRAL:             { label: '● NEUTRAL',               cls: 'tag-slate'  },
  MODERATELY_BEARISH:  { label: '▼ MODERATELY BEARISH',   cls: 'tag-red'    },
  STRONGLY_BEARISH:    { label: '▼▼ STRONGLY BEARISH',    cls: 'tag-red'    },
  INSUFFICIENT_DATA:   { label: '⚠ INSUFFICIENT DATA',    cls: 'tag-amber'  },
}

export function OutlookBadge({ value }: { value: MarketOutlook }) {
  const { label, cls } = OUTLOOK_CONFIG[value] ?? OUTLOOK_CONFIG.INSUFFICIENT_DATA
  return <span className={`${cls} text-xs`}>{label}</span>
}

// ── Recommendation ────────────────────────────────────────────────────────────
const REC_CONFIG: Record<Recommendation, { label: string; icon: string; cls: string; glow: string }> = {
  CONSIDER_ENTRY:       { label: 'Consider Entry',       icon: '▲', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30', glow: 'card-glow-green' },
  WATCH:                { label: 'Watch',                icon: '◎', cls: 'bg-blue-500/15    text-blue-700 dark:text-blue-400 border border-blue-500/30',    glow: 'card-glow-blue'  },
  HOLD:                 { label: 'Hold',                 icon: '≡', cls: 'bg-slate-500/15   text-slate-700 dark:text-slate-300 border border-slate-500/30',   glow: '' },
  REDUCE_EXPOSURE:      { label: 'Reduce Exposure',      icon: '▽', cls: 'bg-amber-500/15   text-amber-700 dark:text-amber-400 border border-amber-500/30',   glow: '' },
  AVOID:                { label: 'Avoid',                icon: '✕', cls: 'bg-red-500/15     text-red-700 dark:text-red-400 border border-red-500/30',     glow: 'card-glow-red'   },
  INSUFFICIENT_EVIDENCE:{ label: 'Insufficient Evidence',icon: '?', cls: 'bg-slate-500/15   text-slate-700 dark:text-slate-400 border border-slate-500/30',   glow: '' },
}

export function RecommendationBadge({ value }: { value: Recommendation }) {
  const cfg = REC_CONFIG[value] ?? REC_CONFIG.INSUFFICIENT_EVIDENCE
  return (
    <span className={`rec-badge ${cfg.cls}`}>
      <span className="text-lg leading-none">{cfg.icon}</span>
      {cfg.label}
    </span>
  )
}
export function getRecGlow(value: Recommendation) {
  return REC_CONFIG[value]?.glow ?? ''
}
