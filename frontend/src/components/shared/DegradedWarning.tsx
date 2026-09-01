import { AlertTriangle, Swords } from 'lucide-react'

interface DegradedWarningProps {
  warnings: string[]
  conflictDetected: boolean
}

export function DegradedWarning({ warnings, conflictDetected }: DegradedWarningProps) {
  return (
    <div className="space-y-2 animate-fade-in">
      {conflictDetected && (
        <div className="flex items-start gap-3 px-4 py-3 bg-red-500/8 border border-red-500/25 rounded-xl">
          <Swords className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-sm font-semibold text-red-400">Agent Conflict Detected</span>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Technical and fundamental agents disagree. Synthesis confidence has been reduced. Review agent outputs carefully.
            </p>
          </div>
        </div>
      )}
      {warnings.map((w, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-3 bg-amber-500/8 border border-amber-500/25 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-700 dark:text-slate-300">{w}</p>
        </div>
      ))}
    </div>
  )
}
