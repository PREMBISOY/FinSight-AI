import { useState } from 'react'
import { ArrowRight, BrainCircuit, CheckCircle2, Database, FileSearch, MessageSquareText, UserRound } from 'lucide-react'
import clsx from 'clsx'

interface HowItWorksPageProps {
  onOpenResearch: () => void
}

const steps = [
  { title: 'Gather the inputs', icon: Database, detail: 'FinSight receives the stock, the investor profile, portfolio context, and the selected scenario. The request is validated before agent work starts.', points: ['Profile and holdings are read first', 'The selected scenario is captured in the decision trace'] },
  { title: 'Run independent specialists', icon: FileSearch, detail: 'Technical, fundamental/RAG, and sentiment agents run concurrently. Each produces a structured output with evidence, confidence, limitations, and latency.', points: ['Agents cannot overwrite each other', 'Unavailable agents become safe degraded outputs'] },
  { title: 'Synthesize market evidence', icon: BrainCircuit, detail: 'The deterministic synthesis layer combines usable agent signals, records disagreement, and calculates confidence from evidence completeness and agreement.', points: ['Conflicting evidence lowers confidence', 'The decision trace preserves weights and inputs'] },
  { title: 'Apply investor suitability', icon: UserRound, detail: 'Only after market synthesis, personalization checks risk tolerance, investment horizon, existing exposure, and position limits to form the final recommendation.', points: ['Portfolio concentration can override a bullish market view', 'The final recommendation is repeatable'] },
]

export function HowItWorksPage({ onOpenResearch }: HowItWorksPageProps) {
  const [activeStep, setActiveStep] = useState(0)
  const active = steps[activeStep]
  const ActiveIcon = active.icon

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-6 py-10 space-y-10 animate-fade-in">
      <section className="max-w-3xl"><div className="eyebrow mb-3">How it works</div><h1 className="text-3xl font-normal tracking-tight text-slate-800">A recommendation you can inspect, not just receive.</h1><p className="mt-4 text-base leading-7 text-slate-500">Explore each stage of the FinSight pipeline. Every result preserves its evidence, limitations, timing, and decision path.</p></section>

      <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.4fr] gap-6">
        <section className="card overflow-hidden">
          {steps.map((step, index) => { const Icon = step.icon; return <button key={step.title} type="button" onClick={() => setActiveStep(index)} className={clsx('w-full flex items-center gap-4 border-l-2 px-5 py-5 text-left transition-colors', activeStep === index ? 'border-brand-500 bg-brand-50' : 'border-transparent hover:bg-surface-600')}><span className={clsx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium', activeStep === index ? 'bg-brand-500 text-white' : 'bg-surface-400 text-slate-500')}>{index + 1}</span><div className="min-w-0 flex-1"><div className="text-sm font-medium text-slate-800">{step.title}</div><div className="mt-1 text-xs text-slate-500">{index === 1 ? 'Three agents in parallel' : index === 2 ? 'Evidence becomes a market view' : index === 3 ? 'Market view meets investor context' : 'Create an auditable request'}</div></div><Icon className="w-4 h-4 text-brand-500" /></button> })}
        </section>
        <section className="card p-7 sm:p-8"><div className="flex h-10 w-10 items-center justify-center rounded bg-brand-50"><ActiveIcon className="w-5 h-5 text-brand-500" /></div><div className="mt-6 section-label">Stage {activeStep + 1} of {steps.length}</div><h2 className="mt-2 text-2xl font-normal text-slate-800">{active.title}</h2><p className="mt-4 max-w-xl text-sm leading-7 text-slate-500">{active.detail}</p><ul className="mt-6 space-y-3">{active.points.map(point => <li key={point} className="flex items-start gap-3 text-sm text-slate-600"><CheckCircle2 className="mt-0.5 w-4 h-4 shrink-0 text-brand-500" />{point}</li>)}</ul><button type="button" onClick={onOpenResearch} className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-brand-500 hover:text-brand-600">Open the research desk <ArrowRight className="w-4 h-4" /></button></section>
      </div>

      <section className="rounded border border-[#e7e7e7] bg-surface-600 p-6"><div className="flex items-start gap-3"><MessageSquareText className="mt-0.5 w-5 h-5 text-brand-500" /><div><div className="text-sm font-medium text-slate-800">Designed for transparent decisions</div><p className="mt-1 text-sm leading-6 text-slate-500">FinSight does not hide a failing agent or turn missing evidence into certainty. Degraded signals, conflicts, evidence, and the final trace stay visible in the analysis result.</p></div></div></section>
    </div>
  )
}
