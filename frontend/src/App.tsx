import { Header } from './components/layout/Header'
import { Dashboard } from './pages/Dashboard'
import { LoginPage } from './pages/LoginPage'
import { useAuth } from './hooks/useAuth'
import { useTheme } from './hooks/useTheme'

export default function App() {
  const { isDark, toggle } = useTheme()
  const { account, createAccount, signIn, signOut } = useAuth()

  if (!account) {
    return <LoginPage onCreateAccount={createAccount} onSignIn={signIn} isDark={isDark} onToggleTheme={toggle} />
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-page)' }}>
      <Header account={account} onSignOut={signOut} />
      <main>
        <Dashboard account={account} />
      </main>
    </div>
  )
}
