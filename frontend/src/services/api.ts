// ============================================================
// FinSight AI — API Service
// Toggle real vs mock via VITE_USE_MOCK env var.
// ============================================================

import type { AnalysisResponse, AnalyzeRequest, UserContext } from '../types/api'
import { mockAnalyze, mockGetUserContext } from './mockApi'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

async function apiError(res: Response, fallback: string): Promise<Error> {
  try {
    const payload = await res.json() as { detail?: string | Array<{ msg?: string }> }
    if (typeof payload.detail === 'string') return new Error(payload.detail)
    if (Array.isArray(payload.detail)) {
      const messages = payload.detail.map(item => item.msg).filter(Boolean)
      if (messages.length > 0) return new Error(messages.join('; '))
    }
  } catch {
    // The fallback includes the HTTP status when the body is not JSON.
  }
  return new Error(fallback)
}

// ---- Real API calls ----

async function realGetUserContext(userId: string): Promise<UserContext> {
  const res = await fetch(`${API_BASE}/api/users/${userId}`)
  if (!res.ok) throw await apiError(res, `API error ${res.status}`)
  return res.json()
}

async function realAnalyze(request: AnalyzeRequest): Promise<AnalysisResponse> {
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  if (!res.ok) throw await apiError(res, `Analysis request failed (${res.status})`)
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
