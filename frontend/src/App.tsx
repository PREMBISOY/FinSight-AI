import { Header } from './components/layout/Header'
import { Dashboard } from './pages/Dashboard'
import { useTheme } from './hooks/useTheme'

export default function App() {
  useTheme() // initialises dark/light class on <html> and persists preference

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-page)' }}>
      <Header />
      <main>
        <Dashboard />
      </main>
    </div>
  )
}
