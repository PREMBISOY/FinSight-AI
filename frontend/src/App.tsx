import { Header } from './components/layout/Header'
import { Dashboard } from './pages/Dashboard'

export default function App() {
  return (
    <div className="min-h-screen bg-surface-900 text-slate-100 selection:bg-brand-500/40">
      <Header />
      <main>
        <Dashboard />
      </main>
    </div>
  )
}
