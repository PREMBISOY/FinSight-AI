import { Header } from './components/layout/Header'
import { Dashboard } from './pages/Dashboard'

export default function App() {
  return (
    <div className="finsight-light min-h-screen bg-surface-900 text-slate-800 selection:bg-brand-100">
      <Header />
      <main>
        <Dashboard />
      </main>
    </div>
  )
}
