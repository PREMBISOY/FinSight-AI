import { useState } from 'react'
import { TrendingUp, Menu, X } from 'lucide-react'
import { isMockMode } from '../../services/api'
import { MockModeBanner } from '../shared/DegradedWarning'

export type AppView = 'research' | 'portfolio' | 'guide'

interface HeaderProps {
  activeView: AppView
  onNavigate: (view: AppView) => void
}

const navigationItems: Array<{ label: string; view: AppView }> = [
  { label: 'Research', view: 'research' },
  { label: 'Portfolio view', view: 'portfolio' },
  { label: 'How it works', view: 'guide' },
]

export function Header({ activeView, onNavigate }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const selectView = (view: AppView) => {
    setMobileOpen(false)
    onNavigate(view)
  }

  return (
    <header className="relative border-b border-[#eeeeee] bg-white sticky top-0 z-50">
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
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-1">
          {navigationItems.map(item => (
            <button
              key={item.view}
              type="button"
              onClick={() => selectView(item.view)}
              className={`px-4 py-2 text-sm border-b-2 transition-colors ${
                activeView === item.view
                  ? 'border-brand-500 text-brand-500'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200'
              }`}
              aria-current={activeView === item.view ? 'page' : undefined}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right: status */}
        <div className="flex items-center gap-3">
          <MockModeBanner visible={isMockMode} />
          <div className="hidden sm:block text-xs text-slate-500">Market intelligence</div>
          <button type="button" onClick={() => setMobileOpen(open => !open)} className="md:hidden p-1 text-slate-600" aria-label="Open navigation" aria-expanded={mobileOpen}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <nav aria-label="Mobile navigation" className="md:hidden border-t border-[#eeeeee] bg-white px-5 py-3 shadow-sm">
          <div className="max-w-6xl mx-auto grid gap-1">
            {navigationItems.map(item => (
              <button key={item.view} type="button" onClick={() => selectView(item.view)} className={`rounded px-3 py-2.5 text-left text-sm ${activeView === item.view ? 'bg-brand-50 text-brand-600' : 'text-slate-600 hover:bg-surface-600'}`} aria-current={activeView === item.view ? 'page' : undefined}>
                {item.label}
              </button>
            ))}
          </div>
        </nav>
      )}
    </header>
  )
}
