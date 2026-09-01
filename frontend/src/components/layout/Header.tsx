import { TrendingUp, Activity } from 'lucide-react'
import { isMockMode } from '../../services/api'
import { MockModeBanner } from '../shared/DegradedWarning'

export function Header() {
  return (
    <header className="border-b border-white/5 bg-surface-800/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight leading-none">FinSight AI</h1>
            <p className="text-xs text-slate-500 leading-none mt-0.5">Multi-Agent Financial Intelligence</p>
          </div>
        </div>

        {/* Center: pipeline legend */}
        <div className="hidden lg:flex items-center gap-1 text-xs text-slate-500 font-mono">
          <span className="px-2 py-1 bg-surface-600 rounded border border-white/5">DATA</span>
          <span>→</span>
          <span className="px-2 py-1 bg-surface-600 rounded border border-white/5">TECHNICAL</span>
          <span className="px-2 py-1 bg-surface-600 rounded border border-white/5">FUNDAMENTAL</span>
          <span className="px-2 py-1 bg-surface-600 rounded border border-white/5">SENTIMENT</span>
          <span>→</span>
          <span className="px-2 py-1 bg-surface-600 rounded border border-white/5">SYNTHESIS</span>
          <span>→</span>
          <span className="px-2 py-1 bg-brand-600/30 rounded border border-brand-500/30 text-brand-400">INTELLIGENCE</span>
        </div>

        {/* Right: status */}
        <div className="flex items-center gap-3">
          <MockModeBanner visible={isMockMode} />
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Activity className="w-3.5 h-3.5" />
            <span>HackVerse Sprint 1</span>
          </div>
        </div>
      </div>
    </header>
  )
}
