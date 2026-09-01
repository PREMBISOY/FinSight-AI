import { AlertTriangle, AlertCircle, Info } from 'lucide-react'

interface DegradedWarningProps {
  warnings: string[]
  conflictDetected?: boolean
}

export function DegradedWarning({ warnings, conflictDetected }: DegradedWarningProps) {
  if (warnings.length === 0 && !conflictDetected) return null

  return (
    <div className="space-y-2 animate-fade-in">
      {conflictDetected && (
        <div className="flex items-start gap-3 px-4 py-3 bg-bearish/10 border border-bearish/30 rounded-lg">
          <AlertCircle className="w-4 h-4 text-bearish flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-xs font-mono font-bold text-bearish tracking-wider">CONFLICT DETECTED</span>
            <p className="text-xs text-slate-300 mt-0.5">
              Technical and fundamental agents produced opposing classifications. Synthesis confidence is significantly reduced.
            </p>
          </div>
        </div>
      )}
      {warnings.map((w, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-3 bg-warning/10 border border-warning/30 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-300">{w}</p>
        </div>
      ))}
    </div>
  )
}

interface MockModeBannerProps {
  visible: boolean
}

export function MockModeBanner({ visible }: MockModeBannerProps) {
  if (!visible) return null
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-600/20 border border-brand-500/30 rounded text-xs text-brand-400">
      <Info className="w-3.5 h-3.5 flex-shrink-0" />
      <span>Running with mock data — set <code className="font-mono bg-surface-500 px-1 rounded">VITE_USE_MOCK=false</code> to connect to the live backend</span>
    </div>
  )
}
