import { TrendingUp, Menu } from 'lucide-react'
import { isMockMode } from '../../services/api'
import { MockModeBanner } from '../shared/DegradedWarning'

export function Header() {
  return (
    <header className="border-b border-[#eeeeee] bg-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-brand-500 rounded-sm flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-medium text-slate-800 tracking-tight leading-none">FinSight</h1>
          </div>
        </div>

        {/* Center: pipeline legend */}
        <nav className="hidden md:flex items-center gap-8 text-sm text-slate-500">
          <span className="text-brand-500">Research</span>
          <span>Portfolio view</span>
          <span>How it works</span>
        </nav>

        {/* Right: status */}
        <div className="flex items-center gap-3">
          <MockModeBanner visible={isMockMode} />
          <div className="hidden sm:block text-xs text-slate-500">Market intelligence</div>
          <Menu className="w-5 h-5 text-slate-600" />
        </div>
      </div>
    </header>
  )
}
