// ============================================================
// FinSight AI — Mock API
// Provides realistic responses for all demo scenarios.
// Switch to real API by setting VITE_USE_MOCK=false in .env
// ============================================================

import type {
  AnalysisResponse,
  AnalyzeRequest,
  UserContext,
  AgentOutput,
  SynthesisResult,
  PersonalizedIntelligence,
  DecisionTraceStep,
  AnalysisMetric,
  MarketData,
  Portfolio,
  InvestorProfile,
} from '../types/api'

// ---- Shared market data fixture ----
const RELIANCE_MARKET_DATA: MarketData = {
  symbol: 'RELIANCE',
  current_price: 2847.35,
  currency: 'INR',
  observed_at: '2026-09-01T07:00:00Z',
  source: 'curated_market_fixture',
  synthetic: true,
  history: [
    { timestamp: '2026-08-22T07:00:00Z', close: 2710.5, volume: 4200000 },
    { timestamp: '2026-08-25T07:00:00Z', close: 2738.2, volume: 5100000 },
    { timestamp: '2026-08-26T07:00:00Z', close: 2755.8, volume: 3800000 },
    { timestamp: '2026-08-27T07:00:00Z', close: 2769.1, volume: 4600000 },
    { timestamp: '2026-08-28T07:00:00Z', close: 2791.4, volume: 5500000 },
    { timestamp: '2026-08-29T07:00:00Z', close: 2802.7, volume: 4900000 },
    { timestamp: '2026-09-01T07:00:00Z', close: 2847.35, volume: 6100000 },
  ],
}

// ---- User profiles ----
const CONSERVATIVE_PROFILE: InvestorProfile = {
  user_id: 'conservative-demo',
  display_name: 'Priya Mehta (Conservative)',
  risk_tolerance: 'conservative',
  investment_horizon: 'long',
  max_position_size: 15,
  created_at: '2026-01-01T00:00:00Z',
}

const AGGRESSIVE_PROFILE: InvestorProfile = {
  user_id: 'aggressive-demo',
  display_name: 'Rahul Sharma (Aggressive)',
  risk_tolerance: 'aggressive',
  investment_horizon: 'short',
  max_position_size: 40,
  created_at: '2026-01-01T00:00:00Z',
}

const CONSERVATIVE_PORTFOLIO: Portfolio = {
  user_id: 'conservative-demo',
  holdings: [
    { symbol: 'RELIANCE', quantity: 150, allocation_percent: 25.0 },
    { symbol: 'TCS', quantity: 80, allocation_percent: 18.0 },
    { symbol: 'INFY', quantity: 200, allocation_percent: 12.0 },
    { symbol: 'HDFC', quantity: 120, allocation_percent: 15.0 },
    { symbol: 'ITC', quantity: 500, allocation_percent: 8.0 },
    { symbol: 'OTHERS', quantity: 0, allocation_percent: 22.0 },
  ],
}

const AGGRESSIVE_PORTFOLIO: Portfolio = {
  user_id: 'aggressive-demo',
  holdings: [
    { symbol: 'RELIANCE', quantity: 40, allocation_percent: 5.0 },
    { symbol: 'ADANI', quantity: 200, allocation_percent: 22.0 },
    { symbol: 'PAYTM', quantity: 500, allocation_percent: 15.0 },
    { symbol: 'NYKAA', quantity: 300, allocation_percent: 18.0 },
    { symbol: 'ZOMATO', quantity: 600, allocation_percent: 20.0 },
    { symbol: 'OTHERS', quantity: 0, allocation_percent: 20.0 },
  ],
}

// ---- Agent outputs per scenario ----

const TECHNICAL_AGENT_BULLISH: AgentOutput = {
  agent: 'technical',
  status: 'success',
  classification: 'BULLISH',
  confidence: 0.82,
  signals: [
    {
      name: 'price_momentum_5d',
      value: 0.041,
      interpretation: 'Five-session price momentum is strongly positive at +4.1%.',
      source: 'curated_market_fixture',
    },
    {
      name: 'rsi_14',
      value: 61.4,
      interpretation: 'RSI at 61 indicates bullish momentum without overbought conditions.',
      source: 'curated_market_fixture',
    },
    {
      name: 'volume_vs_20d_avg',
      value: 1.24,
      interpretation: 'Volume 24% above 20-day average confirms institutional accumulation.',
      source: 'curated_market_fixture',
    },
    {
      name: 'macd_crossover',
      value: true,
      interpretation: 'MACD crossed above signal line 3 sessions ago — bullish crossover confirmed.',
      source: 'curated_market_fixture',
    },
  ],
  reasoning: [
    'Price and volume signals support a bullish classification.',
    'RSI in healthy bullish territory without overbought risk.',
    'MACD crossover provides additional directional confirmation.',
  ],
  evidence: [],
  latency_ms: 12.4,
  limitations: [],
  metadata: { implementation: 'integration_fallback' },
}

const FUNDAMENTAL_AGENT_BULLISH: AgentOutput = {
  agent: 'fundamental',
  status: 'success',
  classification: 'BULLISH',
  confidence: 0.76,
  signals: [
    {
      name: 'revenue_growth_yoy',
      value: 0.182,
      interpretation: 'Revenue grew 18.2% year-on-year, above sector median of 11%.',
      source: 'annual_report_2026_synthetic',
    },
    {
      name: 'ebitda_margin',
      value: 0.241,
      interpretation: 'EBITDA margin at 24.1% indicates strong operational efficiency.',
      source: 'annual_report_2026_synthetic',
    },
    {
      name: 'debt_equity_ratio',
      value: 0.38,
      interpretation: 'Conservative leverage provides balance sheet resilience.',
      source: 'annual_report_2026_synthetic',
    },
  ],
  reasoning: [
    'Revenue growth significantly outperforms sector median.',
    'Stable margins and low leverage suggest durable business quality.',
    'RAG retrieval from annual reports confirms consistent earnings narrative.',
  ],
  evidence: [
    {
      source_name: 'Reliance Annual Report 2026',
      source_type: 'annual_report',
      excerpt: 'Revenue from operations increased 18.2% to ₹9.74 lakh crore driven by Jio and Retail expansion.',
      chunk_id: 'rel-ar-2026-p14-chunk-3',
      relevance_score: 0.91,
      synthetic: true,
    },
    {
      source_name: 'Reliance Q4 FY26 Earnings Call Transcript',
      source_type: 'earnings_transcript',
      excerpt: 'Management guided for continued double-digit growth with Jio Financial Services as a key catalyst.',
      chunk_id: 'rel-q4-2026-ec-chunk-7',
      relevance_score: 0.87,
      synthetic: true,
    },
  ],
  latency_ms: 38.7,
  limitations: [],
  metadata: { chunks_retrieved: 12, rag_model: 'integration_fallback' },
}

const SENTIMENT_AGENT_NEUTRAL: AgentOutput = {
  agent: 'sentiment',
  status: 'success',
  classification: 'NEUTRAL',
  confidence: 0.61,
  signals: [
    {
      name: 'news_sentiment_score',
      value: 0.12,
      interpretation: 'Aggregate news sentiment slightly positive but within neutral band.',
      source: 'news_fixture_2026',
    },
    {
      name: 'articles_analyzed',
      value: 8,
      interpretation: '8 news articles analyzed in the past 72 hours.',
      source: 'news_fixture_2026',
    },
  ],
  reasoning: [
    'News sentiment is marginally positive but insufficient for a BULLISH classification.',
    'Coverage is mixed with FII flow concerns offsetting positive earnings news.',
  ],
  evidence: [
    {
      source_name: 'Economic Times',
      source_type: 'news_article',
      excerpt: 'Reliance Industries sees broad-based growth across segments; analysts maintain BUY ratings.',
      synthetic: true,
    },
    {
      source_name: 'Mint',
      source_type: 'news_article',
      excerpt: 'FII selling in large-caps creates near-term headwinds for Reliance despite strong fundamentals.',
      synthetic: true,
    },
  ],
  latency_ms: 24.1,
  limitations: ['Sentiment derived from 8 articles; broader social sentiment not available.'],
  metadata: { articles_analyzed: 8 },
}

const SENTIMENT_AGENT_UNAVAILABLE: AgentOutput = {
  agent: 'sentiment',
  status: 'unavailable',
  classification: 'UNKNOWN',
  confidence: 0,
  signals: [],
  reasoning: [],
  evidence: [],
  latency_ms: 1.2,
  limitations: ['News feed unavailable for this session. Sentiment excluded from synthesis.'],
  metadata: { reason: 'news_feed_timeout' },
}

const FUNDAMENTAL_AGENT_BEARISH: AgentOutput = {
  agent: 'fundamental',
  status: 'success',
  classification: 'BEARISH',
  confidence: 0.71,
  signals: [
    {
      name: 'free_cash_flow_trend',
      value: -0.14,
      interpretation: 'Free cash flow declined 14% due to elevated capex in new ventures.',
      source: 'annual_report_2026_synthetic',
    },
    {
      name: 'pe_ratio_vs_sector',
      value: 1.42,
      interpretation: 'Trading at 42% premium to sector peers — valuation stretched.',
      source: 'analyst_report_synthetic',
    },
  ],
  reasoning: [
    'Elevated capex compresses near-term free cash flow.',
    'Stretched valuation relative to peers limits upside.',
    'Debt increase from new ventures adds balance sheet risk.',
  ],
  evidence: [
    {
      source_name: 'Reliance Annual Report 2026',
      source_type: 'annual_report',
      excerpt: 'Capital expenditure increased to ₹1.51 lakh crore, with ₹65,000 crore allocated to green energy.',
      chunk_id: 'rel-ar-2026-p22-chunk-1',
      relevance_score: 0.89,
      synthetic: true,
    },
  ],
  latency_ms: 41.3,
  limitations: [],
  metadata: { chunks_retrieved: 9, rag_model: 'integration_fallback' },
}

// ---- Synthesis results ----

const SYNTHESIS_NORMAL: SynthesisResult = {
  outlook: 'MODERATELY_BULLISH',
  market_score: 0.52,
  confidence: 0.74,
  agreement_score: 0.78,
  data_completeness: 1.0,
  conflict_detected: false,
  contributions: [
    { agent: 'technical', base_weight: 0.40, classification_score: 1, confidence: 0.82, weighted_score: 0.328, included: true },
    { agent: 'fundamental', base_weight: 0.40, classification_score: 1, confidence: 0.76, weighted_score: 0.304, included: true },
    { agent: 'sentiment', base_weight: 0.20, classification_score: 0, confidence: 0.61, weighted_score: 0.0, included: true },
  ],
  reasoning: [
    'Technical and fundamental agents both classify BULLISH with high confidence.',
    'Sentiment is NEUTRAL and contributes no directional score.',
    'Weighted market score of 0.52 maps to MODERATELY_BULLISH outlook.',
    'Agreement between the two bullish agents is strong.',
  ],
  limitations: ['Sentiment contribution is zero due to NEUTRAL classification; directional confidence reduced.'],
}

const SYNTHESIS_DEGRADED: SynthesisResult = {
  outlook: 'MODERATELY_BULLISH',
  market_score: 0.49,
  confidence: 0.63,
  agreement_score: 0.82,
  data_completeness: 0.80,
  conflict_detected: false,
  contributions: [
    { agent: 'technical', base_weight: 0.40, classification_score: 1, confidence: 0.82, weighted_score: 0.328, included: true },
    { agent: 'fundamental', base_weight: 0.40, classification_score: 1, confidence: 0.76, weighted_score: 0.304, included: true },
    { agent: 'sentiment', base_weight: 0.20, classification_score: 0, confidence: 0, weighted_score: 0.0, included: false },
  ],
  reasoning: [
    'Technical and fundamental agents agree on BULLISH outlook.',
    'Sentiment agent is unavailable — excluded from scoring.',
    'Data completeness reduced to 80% due to missing sentiment data.',
  ],
  limitations: [
    'Sentiment feed unavailable; synthesis based on 2 of 3 agents.',
    'Confidence reduced due to incomplete data coverage.',
  ],
}

const SYNTHESIS_CONFLICT: SynthesisResult = {
  outlook: 'NEUTRAL',
  market_score: 0.044,
  confidence: 0.42,
  agreement_score: 0.21,
  data_completeness: 1.0,
  conflict_detected: true,
  contributions: [
    { agent: 'technical', base_weight: 0.40, classification_score: 1, confidence: 0.82, weighted_score: 0.328, included: true },
    { agent: 'fundamental', base_weight: 0.40, classification_score: -1, confidence: 0.71, weighted_score: -0.284, included: true },
    { agent: 'sentiment', base_weight: 0.20, classification_score: 0, confidence: 0.61, weighted_score: 0.0, included: true },
  ],
  reasoning: [
    'Technical agent is BULLISH; fundamental agent is BEARISH — direct conflict.',
    'Conflict penalty applied; confidence reduced significantly.',
    'Net market score near zero — outlook resolves to NEUTRAL.',
    'Investors should investigate the cause of technical/fundamental divergence.',
  ],
  limitations: [
    'Conflicting signals between technical and fundamental agents detected.',
    'Confidence is reduced when agents disagree strongly.',
    'Recommendation carries high uncertainty — treat with caution.',
  ],
}

// ---- Personalized intelligence ----

function makeIntelligence(
  userId: string,
  outlook: string,
  synthesis: SynthesisResult,
): PersonalizedIntelligence {
  const isConservative = userId === 'conservative-demo'
  const exposure = isConservative ? 25.0 : 5.0
  const conflicted = synthesis.conflict_detected

  if (conflicted) {
    return {
      recommendation: 'WATCH',
      risk_level: 'ELEVATED',
      risk_score: 0.68,
      portfolio_exposure_percent: exposure,
      reasons: [
        'Conflicting agent signals make a clear recommendation impossible.',
        'Watch the stock until technical and fundamental signals align.',
        'No position change recommended under high uncertainty.',
      ],
      disclaimer: 'Prototype investment intelligence, not financial advice.',
    }
  }

  if (isConservative) {
    return {
      recommendation: 'HOLD',
      risk_level: 'ELEVATED',
      risk_score: 0.72,
      portfolio_exposure_percent: 25.0,
      reasons: [
        'Market outlook is MODERATELY_BULLISH, but existing exposure at 25% exceeds the 15% maximum position size.',
        'Adding more RELIANCE would concentrate portfolio beyond risk tolerance.',
        'Conservative horizon: hold existing position; do not add.',
      ],
      disclaimer: 'Prototype investment intelligence, not financial advice.',
    }
  } else {
    return {
      recommendation: 'CONSIDER_ENTRY',
      risk_level: 'MODERATE',
      risk_score: 0.41,
      portfolio_exposure_percent: 5.0,
      reasons: [
        'Market outlook is MODERATELY_BULLISH with strong technical and fundamental confirmation.',
        'Current exposure of 5% is well below the 40% maximum position size.',
        'Aggressive profile and short horizon support acting on bullish signals.',
      ],
      disclaimer: 'Prototype investment intelligence, not financial advice.',
    }
  }
}

// ---- Decision traces ----

function makeDecisionTrace(
  agents: AgentOutput[],
  synthesis: SynthesisResult,
  intelligence: PersonalizedIntelligence,
): DecisionTraceStep[] {
  return [
    {
      stage: '1_data_ingestion',
      title: 'Data Ingestion',
      summary: 'Market data, document corpus, and news feed loaded from curated fixtures.',
      details: {
        market_data_source: 'curated_market_fixture',
        document_chunks: 12,
        news_articles: 8,
        synthetic: true,
      },
    },
    {
      stage: '2_agent_execution',
      title: 'Agent Execution (Concurrent)',
      summary: `Three specialist agents executed concurrently via asyncio.gather. Latencies: Technical ${agents.find(a => a.agent === 'technical')?.latency_ms}ms, Fundamental ${agents.find(a => a.agent === 'fundamental')?.latency_ms}ms, Sentiment ${agents.find(a => a.agent === 'sentiment')?.latency_ms}ms.`,
      details: {
        agents: agents.map(a => ({
          agent: a.agent,
          status: a.status,
          classification: a.classification,
          confidence: a.confidence,
          latency_ms: a.latency_ms,
        })),
      },
    },
    {
      stage: '3_synthesis',
      title: 'Deterministic Synthesis',
      summary: `Market score ${synthesis.market_score.toFixed(3)} → ${synthesis.outlook}. Conflict: ${synthesis.conflict_detected}. Completeness: ${(synthesis.data_completeness * 100).toFixed(0)}%.`,
      details: {
        weights: { technical: 0.40, fundamental: 0.40, sentiment: 0.20 },
        market_score: synthesis.market_score,
        confidence: synthesis.confidence,
        agreement_score: synthesis.agreement_score,
        data_completeness: synthesis.data_completeness,
        conflict_detected: synthesis.conflict_detected,
        contributions: synthesis.contributions,
      },
    },
    {
      stage: '4_personalization',
      title: 'Personalization & Risk',
      summary: `Portfolio exposure ${intelligence.portfolio_exposure_percent}%. Risk level: ${intelligence.risk_level}. Recommendation: ${intelligence.recommendation}.`,
      details: {
        risk_tolerance: intelligence.risk_level,
        risk_score: intelligence.risk_score,
        portfolio_exposure_percent: intelligence.portfolio_exposure_percent,
        recommendation: intelligence.recommendation,
        reasons: intelligence.reasons,
      },
    },
    {
      stage: '5_output',
      title: 'Final Intelligence Output',
      summary: `Final recommendation: ${intelligence.recommendation}. All evidence preserved; no fabrication.`,
      details: {
        final_recommendation: intelligence.recommendation,
        warnings_count: synthesis.conflict_detected ? 1 : 0,
        evidence_sources: agents.flatMap(a => a.evidence).length,
      },
    },
  ]
}

// ---- Metrics ----

function makeMetrics(agents: AgentOutput[], synthesis: SynthesisResult): AnalysisMetric[] {
  return [
    { name: 'data_completeness', value: synthesis.data_completeness, unit: 'ratio', measured: true },
    { name: 'synthesis_confidence', value: synthesis.confidence, unit: 'ratio', measured: true },
    { name: 'agreement_score', value: synthesis.agreement_score, unit: 'ratio', measured: true },
    { name: 'market_score', value: synthesis.market_score, unit: 'score', measured: true },
    { name: 'technical_latency', value: agents.find(a => a.agent === 'technical')?.latency_ms ?? 0, unit: 'ms', measured: true },
    { name: 'fundamental_latency', value: agents.find(a => a.agent === 'fundamental')?.latency_ms ?? 0, unit: 'ms', measured: true },
    { name: 'sentiment_latency', value: agents.find(a => a.agent === 'sentiment')?.latency_ms ?? 0, unit: 'ms', measured: true },
    { name: 'total_evidence_pieces', value: agents.flatMap(a => a.evidence).length, unit: 'count', measured: true },
  ]
}

// ---- User contexts ----

const USER_CONTEXTS: Record<string, UserContext> = {
  'conservative-demo': {
    profile: CONSERVATIVE_PROFILE,
    portfolio: CONSERVATIVE_PORTFOLIO,
    watchlist: ['TCS', 'HDFC', 'INFY', 'WIPRO'],
  },
  'aggressive-demo': {
    profile: AGGRESSIVE_PROFILE,
    portfolio: AGGRESSIVE_PORTFOLIO,
    watchlist: ['RELIANCE', 'ADANIENT', 'PAYTM', 'NYKAA', 'ZOMATO', 'DELHIVERY'],
  },
}

// ---- Mock API functions ----

const MOCK_DELAY_MS = 1800 // simulate realistic API latency

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function mockGetUserContext(userId: string): Promise<UserContext> {
  await delay(300)
  const ctx = USER_CONTEXTS[userId]
  if (!ctx) throw new Error(`User not found: ${userId}`)
  return ctx
}

export async function mockAnalyze(request: AnalyzeRequest): Promise<AnalysisResponse> {
  await delay(MOCK_DELAY_MS)

  const userId = request.user_id
  const userCtx = USER_CONTEXTS[userId] ?? USER_CONTEXTS['conservative-demo']
  const scenario = request.scenario

  let agents: AgentOutput[]
  let synthesis: SynthesisResult
  let warnings: string[] = []

  if (scenario === 'degraded_sentiment') {
    agents = [TECHNICAL_AGENT_BULLISH, FUNDAMENTAL_AGENT_BULLISH, SENTIMENT_AGENT_UNAVAILABLE]
    synthesis = SYNTHESIS_DEGRADED
    warnings = ['Sentiment data unavailable for this session. Synthesis confidence reduced.']
  } else if (scenario === 'conflict') {
    agents = [TECHNICAL_AGENT_BULLISH, FUNDAMENTAL_AGENT_BEARISH, SENTIMENT_AGENT_NEUTRAL]
    synthesis = SYNTHESIS_CONFLICT
    warnings = ['Conflicting signals detected between technical (BULLISH) and fundamental (BEARISH) agents. Confidence significantly reduced.']
  } else {
    agents = [TECHNICAL_AGENT_BULLISH, FUNDAMENTAL_AGENT_BULLISH, SENTIMENT_AGENT_NEUTRAL]
    synthesis = SYNTHESIS_NORMAL
    warnings = []
  }

  const intelligence = makeIntelligence(userId, synthesis.outlook, synthesis)
  const decisionTrace = makeDecisionTrace(agents, synthesis, intelligence)
  const metrics = makeMetrics(agents, synthesis)

  return {
    analysis_id: `mock-${scenario}-${userId}-${Date.now()}`,
    created_at: new Date().toISOString(),
    symbol: request.symbol.toUpperCase(),
    market_data: RELIANCE_MARKET_DATA,
    investor_profile: userCtx.profile,
    portfolio: userCtx.portfolio,
    watchlist: userCtx.watchlist,
    agent_results: agents,
    synthesis,
    intelligence,
    decision_trace: decisionTrace,
    metrics,
    warnings,
  }
}
