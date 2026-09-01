import { useState } from 'react'
import type { DemoScenario } from '../types/api'
import { useAnalysis } from '../hooks/useAnalysis'
import { ProfileSelector, ProfileCard } from '../components/profile/ProfileSelector'
import { AgentStatusRow, AgentCard } from '../components/analysis/AgentCard'
import { MarketCard } from '../components/market/MarketCard'
import { SynthesisCard } from '../components/synthesis/SynthesisCard'
import { IntelligenceCard } from '../components/intelligence/IntelligenceCard'
import { DecisionTrace } from '../components/trace/DecisionTrace'
import { MetricsPanel } from '../components/shared/MetricsPanel'
import { DegradedWarning } from '../components/shared/DegradedWarning'
import { Zap, BarChart2, Brain, AlertTriangle, ArrowUpRight, SearchCheck, FileSearch, Radio } from 'lucide-react'

export function Dashboard() {
  const [userId, setUserId] = useState('conservative-demo')
  const [symbol, setSymbol] = useState('RELIANCE')
  const [scenario, setScenario] = useState<DemoScenario>('normal')
  const { state, result, error, run } = useAnalysis()

  const handleAnalyze = () => {
    run({ user_id: userId, symbol, scenario })
  }

  const isRunning = state === 'running'

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

      {/* ---- Controls ---- */}
      <ProfileSelector
        selectedUserId={userId}
        selectedScenario={scenario}
        symbol={symbol}
        onUserChange={setUserId}
        onScenarioChange={setScenario}
        onSymbolChange={setSymbol}
        onAnalyze={handleAnalyze}
        isRunning={isRunning}
      />

      {/* ---- Error state ---- */}
      {state === 'error' && error && (
        <div className="flex items-start gap-3 px-4 py-3 bg-bearish/10 border border-bearish/30 rounded-lg animate-fade-in">
          <AlertTriangle className="w-4 h-4 text-bearish flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-sm font-semibold text-bearish">Analysis failed</span>
            <p className="text-xs text-slate-400 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* ---- Running skeleton / Agent status ---- */}
      {(isRunning || result) && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 text-brand-400" />
            Agent Pipeline {isRunning ? '— Executing…' : '— Complete'}
          </div>
          <AgentStatusRow
            agents={result?.agent_results ?? []}
            isRunning={isRunning}
          />
        </div>
      )}

      {/* ---- Full results ---- */}
      {result && (
        <div className="space-y-6 animate-fade-in">

          {/* Warnings banner */}
          {(result.warnings.length > 0 || result.synthesis.conflict_detected) && (
            <DegradedWarning
              warnings={result.warnings}
              conflictDetected={result.synthesis.conflict_detected}
            />
          )}

          {/* Row 1: Market + Profile */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <MarketCard data={result.market_data} />
            </div>
            <div>
              <ProfileCard
                profile={result.investor_profile}
                portfolio={result.portfolio}
                watchlist={result.watchlist}
              />
            </div>
          </div>

          {/* Row 2: Agent detail cards */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              <BarChart2 className="w-3.5 h-3.5 text-brand-400" />
              Agent Analysis Details
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {result.agent_results.map(agent => (
                <AgentCard key={agent.agent} agent={agent} defaultExpanded={true} />
              ))}
            </div>
          </div>

          {/* Row 3: Synthesis + Intelligence */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              <Brain className="w-3.5 h-3.5 text-brand-400" />
              Synthesis & Personalized Intelligence
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
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Performance Metrics</div>
            <MetricsPanel metrics={result.metrics} />
          </div>

          {/* Row 5: Decision trace */}
          <DecisionTrace steps={result.decision_trace} />

          {/* Footer */}
          <div className="text-center text-xs text-slate-700 py-4 border-t border-white/5">
            FinSight AI · HackVerse Sprint 1 · PS-01 Multi-Agent Financial Intelligence
            · Analysis ID: <span className="font-mono">{result.analysis_id}</span>
          </div>
        </div>
      )}

      {/* ---- Idle state ---- */}
      {state === 'idle' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1.9fr] gap-4 animate-fade-in">
          <section className="card p-6 sm:p-8 flex flex-col justify-between min-h-[280px] relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full border border-brand-400/15" />
            <div className="relative">
              <div className="eyebrow mb-3">Ready when you are</div>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white max-w-sm">A complete view, before you make a move.</h2>
              <p className="text-sm leading-6 text-slate-400 mt-4 max-w-md">Choose a profile and scenario above. FinSight will preserve evidence, reconcile the signals, and tailor the recommendation to the investor.</p>
            </div>
            <div className="relative flex items-center gap-2 text-xs text-brand-400 mt-7"><span>Start a research run</span><ArrowUpRight className="w-4 h-4" /></div>
          </section>
          <section className="card p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5"><div><div className="eyebrow mb-1">What is checked</div><h2 className="panel-heading">Independent signals, one decision</h2></div><span className="text-xs text-slate-500 font-mono">01 — 04</span></div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-white/5 bg-surface-800/45 p-4"><SearchCheck className="w-5 h-5 text-brand-400 mb-5" /><div className="text-xs font-semibold text-white">Technical</div><p className="text-xs text-slate-500 leading-5 mt-1">Price action, momentum and volume.</p></div>
              <div className="rounded-lg border border-white/5 bg-surface-800/45 p-4"><FileSearch className="w-5 h-5 text-purple-400 mb-5" /><div className="text-xs font-semibold text-white">Fundamental</div><p className="text-xs text-slate-500 leading-5 mt-1">Earnings context and source documents.</p></div>
              <div className="rounded-lg border border-white/5 bg-surface-800/45 p-4"><Radio className="w-5 h-5 text-cyan-400 mb-5" /><div className="text-xs font-semibold text-white">Sentiment</div><p className="text-xs text-slate-500 leading-5 mt-1">News pulse and market mood.</p></div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500"><span><span className="text-slate-300">Synthesis</span> resolves disagreement</span><span><span className="text-slate-300">Personalization</span> comes last</span></div>
          </section>
        </div>
      )}
    </div>
  )
}
