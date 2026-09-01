import { useEffect, useState } from 'react'
import { Header } from './components/layout/Header'
import type { AppView } from './components/layout/Header'
import { Dashboard } from './pages/Dashboard'
import { PortfolioPage } from './pages/PortfolioPage'
import { HowItWorksPage } from './pages/HowItWorksPage'

function viewFromHash(): AppView {
  const hash = window.location.hash.replace('#/', '')
  if (hash === 'portfolio') return 'portfolio'
  if (hash === 'how-it-works') return 'guide'
  return 'research'
}

export default function App() {
  const [activeView, setActiveView] = useState<AppView>(viewFromHash)

  useEffect(() => {
    const syncView = () => setActiveView(viewFromHash())
    window.addEventListener('hashchange', syncView)
    return () => window.removeEventListener('hashchange', syncView)
  }, [])

  const navigate = (view: AppView) => {
    const hash = view === 'research' ? '#/' : view === 'portfolio' ? '#/portfolio' : '#/how-it-works'
    if (window.location.hash === hash) {
      setActiveView(view)
      return
    }
    window.location.hash = hash
  }

  return (
    <div className="finsight-light min-h-screen bg-surface-900 text-slate-800 selection:bg-brand-100">
      <Header activeView={activeView} onNavigate={navigate} />
      <main>
        {activeView === 'research' && <Dashboard />}
        {activeView === 'portfolio' && <PortfolioPage onOpenResearch={() => navigate('research')} />}
        {activeView === 'guide' && <HowItWorksPage onOpenResearch={() => navigate('research')} />}
      </main>
    </div>
  )
}
