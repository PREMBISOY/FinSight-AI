// ============================================================
// FinSight AI — API Service
// Toggle real vs mock via VITE_USE_MOCK env var.
// ============================================================

import type { AnalysisResponse, AnalyzeRequest, UserContext } from '../types/api'
import { mockAnalyze, mockGetUserContext } from './mockApi'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

// ---- Real API calls ----

async function realGetUserContext(userId: string): Promise<UserContext> {
  const res = await fetch(`${API_BASE}/api/users/${userId}`)
  if (res.status === 404) throw new Error(`User not found: ${userId}`)
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

async function realAnalyze(request: AnalyzeRequest): Promise<AnalysisResponse> {
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  if (res.status === 404) throw new Error('User or symbol not found')
  if (res.status === 422) throw new Error('Invalid request — check inputs')
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

async function realCheckHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`)
    const data = await res.json()
    return data.status === 'ok'
  } catch {
    return false
  }
}

// ---- Exported service (switched by env) ----

export const getUserContext = USE_MOCK ? mockGetUserContext : realGetUserContext
export const analyze = USE_MOCK ? mockAnalyze : realAnalyze
export const checkHealth = USE_MOCK ? async () => true : realCheckHealth

export const isMockMode = USE_MOCK
