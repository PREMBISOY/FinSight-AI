import { useState, useCallback } from 'react'
import type { AnalysisResponse, AnalyzeRequest, DemoScenario } from '../types/api'
import { analyze } from '../services/api'

export type AnalysisState = 'idle' | 'running' | 'done' | 'error'

export interface UseAnalysisReturn {
  state: AnalysisState
  result: AnalysisResponse | null
  error: string | null
  run: (request: AnalyzeRequest) => Promise<void>
  reset: () => void
}

export function useAnalysis(): UseAnalysisReturn {
  const [state, setState] = useState<AnalysisState>('idle')
  const [result, setResult] = useState<AnalysisResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async (request: AnalyzeRequest) => {
    setState('running')
    setResult(null)
    setError(null)
    try {
      const response = await analyze(request)
      setResult(response)
      setState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setState('error')
    }
  }, [])

  const reset = useCallback(() => {
    setState('idle')
    setResult(null)
    setError(null)
  }, [])

  return { state, result, error, run, reset }
}

// Demo user IDs
export const DEMO_USERS = [
  { id: 'conservative-demo', label: 'Conservative Priya', subtitle: 'Conservative · Long Horizon · 25% RELIANCE' },
  { id: 'aggressive-demo', label: 'Aggressive Arjun', subtitle: 'Aggressive · Short Horizon · 5% RELIANCE' },
]

export const DEMO_SCENARIOS: { value: DemoScenario; label: string; description: string }[] = [
  { value: 'normal', label: 'Normal Pipeline', description: 'All 3 agents complete successfully' },
  { value: 'degraded_sentiment', label: 'Degraded Sentiment', description: 'Sentiment feed unavailable' },
  { value: 'conflict', label: 'Conflicting Signals', description: 'Technical BULLISH vs Fundamental BEARISH' },
]
