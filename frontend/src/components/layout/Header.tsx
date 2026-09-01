import { TrendingUp, Activity } from 'lucide-react'
import { isMockMode } from '../../services/api'
import { MockModeBanner } from '../shared/DegradedWarning'

export function Header() {
  return (
    <header className="border-b border-white/10 bg-surface-900/85 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-500/20">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight leading-none">FinSight</h1>
            <p className="text-[11px] text-slate-500 leading-none mt-1">Investment research workspace</p>
          </div>
        </div>

        {/* Center: pipeline legend */}
        <div className="hidden xl:flex items-center gap-2 text-[10px] font-bold tracking-[0.1em] text-slate-500">
          <span>3 AGENTS</span><span className="w-8 h-px bg-slate-700" />
          <span>SYNTHESIS</span><span className="w-8 h-px bg-slate-700" />
          <span className="text-brand-400">PERSONALIZED VIEW</span>
        </div>

        {/* Right: status */}
        <div className="flex items-center gap-3">
          <MockModeBanner visible={isMockMode} />
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400 bg-surface-800 border border-white/5 px-2.5 py-1.5 rounded-full">
            <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-70" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-400" /></span>
            <Activity className="w-3.5 h-3.5 text-brand-400" />
            <span>Research desk online</span>
          </div>
        </div>
      </div>
    </header>
  )
}
