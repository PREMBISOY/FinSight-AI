import { useState } from 'react'
import type { DemoScenario } from '../types/api'
import type { PublicAccount } from '../types/auth'
import { useAnalysis } from '../hooks/useAnalysis'
import { ProfileSelector, ProfileCard } from '../components/profile/ProfileSelector'
import { AgentStatusRow, AgentCard } from '../components/analysis/AgentCard'
import { MarketCard } from '../components/market/MarketCard'
import { SynthesisCard } from '../components/synthesis/SynthesisCard'
import { IntelligenceCard } from '../components/intelligence/IntelligenceCard'
import { GeminiInsightCard } from '../components/intelligence/GeminiInsightCard'
import { DecisionTrace } from '../components/trace/DecisionTrace'
import { MetricsPanel } from '../components/shared/MetricsPanel'
import { DegradedWarning } from '../components/shared/DegradedWarning'
import {
  AlertTriangle, BarChart2, Brain, Zap,
  TrendingUp, ShieldCheck, Activity, ArrowRight,
} from 'lucide-react'

// ── Idle hero ────────────────────────────────────────────────────────────────
function IdleHero() {
  return (
    <div className="animate-fade-in">
      {/* Hero copy */}
      <div className="text-center pt-10 pb-8 px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold mb-6">
          <Activity className="w-3 h-3" />
          HackVerse: Into the Web · PS-01
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight mb-4">
          <span className="bg-gradient-to-r from-brand-400 to-purple-400 bg-clip-text text-transparent">
            Explainable Financial<br />
            Intelligence
          </span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-base max-w-lg mx-auto leading-relaxed">
          Three independent AI agents — technical, fundamental, and sentiment —
          synthesized into a single personalized recommendation with full decision trace.
        </p>
      </div>

      {/* Feature cards */}
      <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto px-4 pb-10">
        {[
          {
            icon: BarChart2,
            color: 'text-blue-500 dark:text-blue-400',
            bg:   'bg-blue-500/10 border-blue-500/20',
            title: 'Technical Analysis',
            desc:  'Price momentum, RSI-14, MACD, SMA cross, volume anomaly, and volatility signals with confidence-weighted voting.',
          },
          {
            icon: Brain,
            color: 'text-amber-500 dark:text-amber-400',
            bg:   'bg-amber-500/10 border-amber-500/20',
            title: 'Fundamental RAG',
            desc:  'Earnings context and financial documents retrieved via semantic search with evidence attribution and relevance scores.',
          },
          {
            icon: Activity,
            color: 'text-purple-500 dark:text-purple-400',
            bg:   'bg-purple-500/10 border-purple-500/20',
            title: 'Sentiment Analysis',
            desc:  'Live news pulse, market mood scoring, and multi-source sentiment aggregation with recency weighting.',
          },
        ].map(({ icon: Icon, color, bg, title, desc }) => (
          <div key={title} className={`card p-5 border ${bg} animate-float`} style={{ animationDelay: `${Math.random() * 0.5}s` }}>
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-4`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1.5">{title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* Pipeline diagram */}
      <div className="max-w-2xl mx-auto px-4 pb-12">
        <div className="card p-5">
          <h4 className="section-label mb-5 text-center">Pipeline</h4>
          <div className="flex items-center justify-between gap-2 overflow-x-auto">
            {[
              { label: 'Market Data', icon: TrendingUp,   color: 'text-blue-400',   bg: 'bg-blue-500/10'   },
              { label: 'Agents',      icon: Zap,           color: 'text-amber-400',  bg: 'bg-amber-500/10'  },
              { label: 'Synthesis',   icon: Brain,          color: 'text-purple-400', bg: 'bg-purple-500/10' },
              { label: 'Intelligence',icon: ShieldCheck,   color: 'text-emerald-400',bg: 'bg-emerald-500/10'},
            ].map(({ label, icon: Icon, color, bg }, idx, arr) => (
              <div key={label} className="flex items-center gap-2 flex-shrink-0">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
                </div>
                {idx < arr.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-surface-400 flex-shrink-0 mb-3" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
interface DashboardProps {
  account: PublicAccount
}

export function Dashboard({ account }: DashboardProps) {
  const userId = account.demoUserId
  const [symbol,   setSymbol]   = useState('RELIANCE')
  const [query, setQuery] = useState('What do the latest financial evidence and outlook imply?')
  const [scenario, setScenario] = useState<DemoScenario>('normal')
  const { state, result, error, run, reset } = useAnalysis()

  const handleScenarioChange = (s: DemoScenario)     => { setScenario(s);      reset() }
  const handleSymbolChange   = (s: string)           => { setSymbol(s);        reset() }
  const handleQueryChange    = (value: string)       => { setQuery(value);      reset() }
  const handleAnalyze        = ()                    => run({ user_id: userId, symbol, query, scenario })

  const isRunning = state === 'running'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

      {/* Controls */}
      <ProfileSelector
        account={account}
        selectedScenario={scenario}
        symbol={symbol}
        query={query}
        onScenarioChange={handleScenarioChange}
        onSymbolChange={handleSymbolChange}
        onQueryChange={handleQueryChange}
        onAnalyze={handleAnalyze}
        isRunning={isRunning}
      />

      {/* Error */}
      {state === 'error' && error && (
        <div className="flex items-start gap-3 px-4 py-3 bg-red-500/8 border border-red-500/25 rounded-xl animate-fade-in">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-sm font-semibold text-red-400">Analysis failed</span>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Pipeline row — visible while running or after complete */}
      {(isRunning || result) && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 section-label">
            <Zap className="w-3.5 h-3.5 text-brand-400" />
            Agent Pipeline {isRunning ? '— Executing…' : '— Complete'}
          </div>
          <AgentStatusRow
            agents={result?.agent_results ?? []}
            isRunning={isRunning}
          />
        </div>
      )}

      {/* ── Full results layout ── */}
      {result && (
        <div className="space-y-6 animate-fade-in">

          {/* Warnings */}
          {(result.warnings.length > 0 || result.synthesis.conflict_detected) && (
            <DegradedWarning
              warnings={result.warnings}
              conflictDetected={result.synthesis.conflict_detected}
            />
          )}

          {/* Direct Gemini answer tied to the submitted question */}
          <GeminiInsightCard insight={result.ai_insight} question={result.query} />

          {/* Row 1: Market chart + Profile (2/3 + 1/3) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <MarketCard data={result.market_data} />
            </div>
            <ProfileCard
              profile={result.investor_profile}
              displayName={account.name}
              portfolio={result.portfolio}
              watchlist={result.watchlist}
              analyzedSymbol={result.symbol}
            />
          </div>

          {/* Row 2: Three agent cards side-by-side */}
          <div>
            <div className="flex items-center gap-2 section-label mb-3">
              <BarChart2 className="w-3.5 h-3.5 text-brand-400" />
              Agent Analysis Details
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {result.agent_results.map(agent => (
                <AgentCard key={agent.agent} agent={agent} defaultExpanded />
              ))}
            </div>
          </div>

          {/* Row 3: Synthesis + Intelligence (equal halves) */}
          <div>
            <div className="flex items-center gap-2 section-label mb-3">
              <Brain className="w-3.5 h-3.5 text-brand-400" />
              Synthesis &amp; Personalized Intelligence
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SynthesisCard synthesis={result.synthesis} />
              <IntelligenceCard
                intelligence={result.intelligence}
                profile={result.investor_profile}
              />
            </div>
          </div>

          {/* Row 4: Metrics */}
          <MetricsPanel metrics={result.metrics} />

          {/* Row 5: Decision trace */}
          <DecisionTrace steps={result.decision_trace} />

          {/* Footer */}
          <div className="text-center text-xs text-slate-700 py-4 border-t border-surface-500">
            FinSight AI · HackVerse Sprint 1 · PS-01 Multi-Agent Financial Intelligence
            · <span className="font-mono">{result.analysis_id}</span>
          </div>
        </div>
      )}

      {/* Idle hero */}
      {state === 'idle' && <IdleHero />}
    </div>
  )
}
