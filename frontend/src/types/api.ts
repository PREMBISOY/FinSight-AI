// ============================================================
// FinSight AI — TypeScript types mirroring backend Pydantic schemas
// Source of truth: docs/API_CONTRACT.md + backend/app/schemas/
// DO NOT invent types — keep in sync with the backend contracts.
// ============================================================

// ---- Enums ----

export type AgentType = 'technical' | 'fundamental' | 'sentiment'

export type AgentStatus = 'success' | 'degraded' | 'unavailable' | 'error'

export type AgentClassification = 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'UNKNOWN'

export type RiskTolerance = 'conservative' | 'moderate' | 'aggressive'

export type InvestmentHorizon = 'short' | 'medium' | 'long'

export type MarketOutlook =
  | 'STRONGLY_BULLISH'
  | 'MODERATELY_BULLISH'
  | 'NEUTRAL'
  | 'MODERATELY_BEARISH'
  | 'STRONGLY_BEARISH'
  | 'INSUFFICIENT_DATA'

export type Recommendation =
  | 'CONSIDER_ENTRY'
  | 'WATCH'
  | 'HOLD'
  | 'REDUCE_EXPOSURE'
  | 'AVOID'
  | 'INSUFFICIENT_EVIDENCE'

export type RiskLevel = 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH'

export type DemoScenario = 'normal' | 'degraded_sentiment' | 'conflict'

// ---- Agent schemas ----

export interface Signal {
  name: string
  value: string | number | boolean
  interpretation: string
  source: string
}

export interface Evidence {
  source_name: string
  source_type: string
  excerpt: string
  url?: string | null
  page?: number | null
  chunk_id?: string | null
  relevance_score?: number | null
  synthetic: boolean
}

export interface AgentOutput {
  agent: AgentType
  status: AgentStatus
  classification: AgentClassification
  confidence: number // 0–1
  signals: Signal[]
  reasoning: string[]
  evidence: Evidence[]
  latency_ms: number
  limitations: string[]
  metadata: Record<string, unknown>
}

// ---- Market data schemas ----

export interface PricePoint {
  timestamp: string // ISO datetime
  close: number
  volume: number
}

export interface MarketData {
  symbol: string
  current_price: number
  currency: string
  observed_at: string // ISO datetime
  source: string
  synthetic: boolean
  history: PricePoint[]
}

// ---- User schemas ----

export interface InvestorProfile {
  user_id: string
  display_name: string
  risk_tolerance: RiskTolerance
  investment_horizon: InvestmentHorizon
  max_position_size: number
  created_at: string
}

export interface Holding {
  symbol: string
  quantity: number
  allocation_percent: number
}

export interface Portfolio {
  user_id: string
  holdings: Holding[]
}

export interface UserContext {
  profile: InvestorProfile
  portfolio: Portfolio
  watchlist: string[]
}

// ---- Synthesis schemas ----

export interface AgentContribution {
  agent: string
  base_weight: number
  classification_score: number // -1 to 1
  confidence: number
  weighted_score: number
  included: boolean
}

export interface SynthesisResult {
  outlook: MarketOutlook
  market_score: number // -1 to 1
  confidence: number
  agreement_score: number
  data_completeness: number
  conflict_detected: boolean
  contributions: AgentContribution[]
  reasoning: string[]
  limitations: string[]
}

// ---- Personalization schemas ----

export interface PersonalizedIntelligence {
  recommendation: Recommendation
  risk_level: RiskLevel
  risk_score: number
  portfolio_exposure_percent: number
  reasons: string[]
  disclaimer: string
}

// ---- Metrics & Trace ----

export interface AnalysisMetric {
  name: string
  value: number
  unit: string
  measured: boolean
}

export interface DecisionTraceStep {
  stage: string
  title: string
  summary: string
  details: Record<string, unknown>
}

// ---- Main analysis response ----

export interface AnalysisResponse {
  analysis_id: string
  created_at: string
  symbol: string
  market_data: MarketData
  investor_profile: InvestorProfile
  portfolio: Portfolio
  watchlist: string[]
  agent_results: AgentOutput[]
  synthesis: SynthesisResult
  intelligence: PersonalizedIntelligence
  decision_trace: DecisionTraceStep[]
  metrics: AnalysisMetric[]
  warnings: string[]
}

// ---- Request ----

export interface AnalyzeRequest {
  user_id: string
  symbol: string
  query?: string
  scenario: DemoScenario
}
