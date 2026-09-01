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
import { Zap, BarChart2, Brain, AlertTriangle } from 'lucide-react'

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
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">

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
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-600/10 border border-brand-500/20 flex items-center justify-center">
            <Brain className="w-8 h-8 text-brand-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Ready to Analyze</h2>
            <p className="text-sm text-slate-500 mt-1 max-w-md">
              Select an investor profile, choose a scenario, and click Analyze to watch the multi-agent pipeline execute.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 max-w-md text-xs text-slate-600">
            <div className="bg-surface-700 border border-white/5 rounded-lg p-3">
              <div className="text-brand-400 font-semibold mb-1">TECHNICAL</div>
              Price · Volume · Momentum
            </div>
            <div className="bg-surface-700 border border-white/5 rounded-lg p-3">
              <div className="text-purple-400 font-semibold mb-1">FUNDAMENTAL</div>
              Earnings · RAG · Documents
            </div>
            <div className="bg-surface-700 border border-white/5 rounded-lg p-3">
              <div className="text-cyan-400 font-semibold mb-1">SENTIMENT</div>
              News · Market Mood
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
