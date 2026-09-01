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
  const [query, setQuery] = useState('What do the latest financial evidence and outlook imply?')
  const [scenario, setScenario] = useState<DemoScenario>('normal')
  const { state, result, error, run, reset } = useAnalysis()

  const handleUserChange = (nextUserId: string) => {
    setUserId(nextUserId)
    reset()
  }

  const handleScenarioChange = (nextScenario: DemoScenario) => {
    setScenario(nextScenario)
    reset()
  }

  const handleSymbolChange = (nextSymbol: string) => {
    setSymbol(nextSymbol)
    reset()
  }

  const handleQueryChange = (nextQuery: string) => {
    setQuery(nextQuery)
    reset()
  }

  const handleAnalyze = () => {
    run({ user_id: userId, symbol, query, scenario })
  }

  const isRunning = state === 'running'

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-6 py-8 sm:py-10 space-y-7">

      {/* ---- Controls ---- */}
      <ProfileSelector
        selectedUserId={userId}
        selectedScenario={scenario}
        symbol={symbol}
        query={query}
        onUserChange={handleUserChange}
        onScenarioChange={handleScenarioChange}
        onSymbolChange={handleSymbolChange}
        onQueryChange={handleQueryChange}
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
                analyzedSymbol={result.symbol}
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
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1.9fr] gap-10 pt-8 animate-fade-in">
          <section className="p-4 sm:p-8 flex flex-col justify-center min-h-[280px]">
            <div className="relative">
              <div className="eyebrow mb-4">Thoughtful investing</div>
              <h2 className="text-3xl sm:text-4xl font-normal tracking-tight text-slate-800 max-w-sm">Clarity for your next investment decision.</h2>
              <p className="text-base leading-7 text-slate-500 mt-5 max-w-md">Three independent views. A transparent synthesis. Advice shaped around the investor, not just the ticker.</p>
            </div>
            <div className="relative flex items-center gap-2 text-sm text-brand-500 mt-8"><span>Start a research run</span><ArrowUpRight className="w-4 h-4" /></div>
          </section>
          <section className="card p-6 sm:p-7">
            <div className="flex items-center justify-between mb-5"><div><div className="eyebrow mb-1">What is checked</div><h2 className="panel-heading">Independent signals, one decision</h2></div><span className="text-xs text-slate-500 font-mono">01 — 04</span></div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="rounded border border-[#e9e9e9] bg-white p-4"><SearchCheck className="w-5 h-5 text-brand-500 mb-5" /><div className="text-sm font-medium text-slate-800">Technical</div><p className="text-xs text-slate-500 leading-5 mt-1">Price action, momentum and volume.</p></div>
              <div className="rounded border border-[#e9e9e9] bg-white p-4"><FileSearch className="w-5 h-5 text-brand-500 mb-5" /><div className="text-sm font-medium text-slate-800">Fundamental</div><p className="text-xs text-slate-500 leading-5 mt-1">Earnings context and source documents.</p></div>
              <div className="rounded border border-[#e9e9e9] bg-white p-4"><Radio className="w-5 h-5 text-brand-500 mb-5" /><div className="text-sm font-medium text-slate-800">Sentiment</div><p className="text-xs text-slate-500 leading-5 mt-1">News pulse and market mood.</p></div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500"><span><span className="text-slate-300">Synthesis</span> resolves disagreement</span><span><span className="text-slate-300">Personalization</span> comes last</span></div>
          </section>
        </div>
      )}
    </div>
  )
}
