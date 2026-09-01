import { useEffect, useState } from 'react'
import { Activity, Sun, Moon } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'

function LiveClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
      {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} IST
    </span>
  )
}

function BackendStatus() {
  const [ok, setOk] = useState<boolean | null>(null)
  useEffect(() => {
    fetch('/health')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(() => setOk(true))
      .catch(() => setOk(false))
  }, [])
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      {ok === null
        ? <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
        : ok
          ? <><span className="w-1.5 h-1.5 rounded-full bg-green-500" /><span className="text-green-600 dark:text-emerald-400 hidden sm:inline">API Connected</span></>
          : <><span className="w-1.5 h-1.5 rounded-full bg-red-500" /><span className="text-red-500 hidden sm:inline">API Offline</span></>
      }
    </div>
  )
}

export function Header() {
  const { isDark, toggle } = useTheme()

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-md border-b"
      style={{
        backgroundColor: isDark ? 'rgba(10,14,23,0.85)' : 'rgba(255,255,255,0.85)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
               style={{ background: 'linear-gradient(135deg, #2563eb, #6366f1)' }}>
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>FinSight</span>
            <span className="text-xs font-semibold" style={{ color: 'var(--brand)' }}>AI</span>
          </div>
          <span className="hidden sm:inline text-[10px] border rounded px-1.5 py-0.5 font-mono"
                style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
            SPRINT 1
          </span>
        </div>

        {/* Centre tagline */}
        <div className="hidden md:block text-[11px] tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Multi-Agent Financial Intelligence · PS-01 · HackVerse
        </div>

        {/* Right — status + clock + toggle */}
        <div className="flex items-center gap-4">
          <BackendStatus />
          <LiveClock />

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
            style={{ backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border)' }}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark
              ? <Sun  className="w-4 h-4 text-amber-400" />
              : <Moon className="w-4 h-4 text-blue-500" />
            }
          </button>
        </div>
      </div>
    </header>
  )
}
