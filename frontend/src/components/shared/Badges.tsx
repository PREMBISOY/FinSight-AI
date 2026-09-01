import type { AgentClassification, MarketOutlook, Recommendation, RiskLevel, AgentStatus } from '../../types/api'
import clsx from 'clsx'

// ---- Classification badge ----

const classificationConfig: Record<AgentClassification, { label: string; className: string }> = {
  BULLISH:  { label: 'BULLISH',  className: 'bg-bullish/15 text-bullish border border-bullish/30' },
  BEARISH:  { label: 'BEARISH',  className: 'bg-bearish/15 text-bearish border border-bearish/30' },
  NEUTRAL:  { label: 'NEUTRAL',  className: 'bg-slate-500/15 text-slate-300 border border-slate-500/30' },
  UNKNOWN:  { label: 'UNKNOWN',  className: 'bg-neutral/10 text-neutral border border-neutral/20' },
}

export function ClassificationBadge({ value }: { value: AgentClassification }) {
  const cfg = classificationConfig[value]
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-1 rounded text-xs font-mono font-bold tracking-wider uppercase', cfg.className)}>
      {cfg.label}
    </span>
  )
}

// ---- Outlook badge ----

const outlookConfig: Record<MarketOutlook, { label: string; className: string }> = {
  STRONGLY_BULLISH:   { label: 'STRONGLY BULLISH',   className: 'bg-bullish/20 text-bullish border border-bullish/40' },
  MODERATELY_BULLISH: { label: 'MODERATELY BULLISH', className: 'bg-bullish/10 text-green-400 border border-green-400/30' },
  NEUTRAL:            { label: 'NEUTRAL',             className: 'bg-slate-500/15 text-slate-300 border border-slate-500/30' },
  MODERATELY_BEARISH: { label: 'MODERATELY BEARISH', className: 'bg-bearish/10 text-orange-400 border border-orange-400/30' },
  STRONGLY_BEARISH:   { label: 'STRONGLY BEARISH',   className: 'bg-bearish/20 text-bearish border border-bearish/40' },
  INSUFFICIENT_DATA:  { label: 'INSUFFICIENT DATA',  className: 'bg-neutral/10 text-neutral border border-neutral/20' },
}

export function OutlookBadge({ value }: { value: MarketOutlook }) {
  const cfg = outlookConfig[value]
  return (
    <span className={clsx('inline-flex items-center px-3 py-1.5 rounded text-xs font-mono font-bold tracking-wider uppercase', cfg.className)}>
      {cfg.label}
    </span>
  )
}

// ---- Recommendation badge ----

const recommendationConfig: Record<Recommendation, { label: string; className: string }> = {
  CONSIDER_ENTRY:       { label: 'CONSIDER ENTRY',      className: 'bg-bullish/20 text-bullish border border-bullish/40' },
  WATCH:                { label: 'WATCH',                className: 'bg-brand-500/15 text-brand-400 border border-brand-400/30' },
  HOLD:                 { label: 'HOLD',                 className: 'bg-yellow-500/15 text-yellow-400 border border-yellow-400/30' },
  REDUCE_EXPOSURE:      { label: 'REDUCE EXPOSURE',      className: 'bg-orange-500/15 text-orange-400 border border-orange-400/30' },
  AVOID:                { label: 'AVOID',                className: 'bg-bearish/20 text-bearish border border-bearish/40' },
  INSUFFICIENT_EVIDENCE:{ label: 'INSUFFICIENT EVIDENCE', className: 'bg-neutral/10 text-neutral border border-neutral/20' },
}

export function RecommendationBadge({ value }: { value: Recommendation }) {
  const cfg = recommendationConfig[value]
  return (
    <span className={clsx('inline-flex items-center px-3 py-1.5 rounded text-sm font-mono font-bold tracking-wider uppercase', cfg.className)}>
      {cfg.label}
    </span>
  )
}

// ---- Risk level badge ----

const riskConfig: Record<RiskLevel, { className: string }> = {
  LOW:      { className: 'bg-bullish/15 text-bullish border border-bullish/30' },
  MODERATE: { className: 'bg-yellow-500/15 text-yellow-400 border border-yellow-400/30' },
  ELEVATED: { className: 'bg-orange-500/15 text-orange-400 border border-orange-400/30' },
  HIGH:     { className: 'bg-bearish/15 text-bearish border border-bearish/30' },
}

export function RiskBadge({ value }: { value: RiskLevel }) {
  const cfg = riskConfig[value]
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-1 rounded text-xs font-mono font-bold tracking-wider', cfg.className)}>
      {value}
    </span>
  )
}

// ---- Agent status badge ----

const agentStatusConfig: Record<AgentStatus, { label: string; className: string }> = {
  success:   { label: 'SUCCESS',   className: 'bg-bullish/15 text-bullish border border-bullish/30' },
  degraded:  { label: 'DEGRADED',  className: 'bg-yellow-500/15 text-yellow-400 border border-yellow-400/30' },
  unavailable:{ label: 'UNAVAILABLE', className: 'bg-neutral/10 text-neutral border border-neutral/20' },
  error:     { label: 'ERROR',     className: 'bg-bearish/15 text-bearish border border-bearish/30' },
}

export function AgentStatusBadge({ value }: { value: AgentStatus }) {
  const cfg = agentStatusConfig[value]
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold tracking-wider', cfg.className)}>
      {cfg.label}
    </span>
  )
}
