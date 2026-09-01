import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import type { MarketData } from '../../types/api'
import { TrendingUp, TrendingDown, Activity } from 'lucide-react'

interface MarketCardProps { data: MarketData }

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-700 border border-surface-400 rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="text-slate-400 mb-1">{label}</div>
      <div className="font-mono font-bold text-white">₹{Number(payload[0]?.value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
    </div>
  )
}

function VolumeTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const vol = Number(payload[0]?.value)
  return (
    <div className="bg-surface-700 border border-surface-400 rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="text-slate-400 mb-1">{label}</div>
      <div className="font-mono text-blue-400">{(vol / 1_000_000).toFixed(2)}M</div>
    </div>
  )
}

export function MarketCard({ data }: MarketCardProps) {
  const chartData = data.history.map(p => ({
    date:   new Date(p.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    close:  p.close,
    volume: p.volume,
  }))

  const firstClose = data.history[0]?.close ?? data.current_price
  const change     = data.current_price - firstClose
  const changePct  = (change / firstClose) * 100
  const isPositive = change >= 0
  const trendColor = isPositive ? '#00d09c' : '#ff5252'
  const gradientId = isPositive ? 'bullishGrad' : 'bearishGrad'

  const hi = Math.max(...data.history.map(p => p.close))
  const lo = Math.min(...data.history.map(p => p.close))

  return (
    <div className={`card p-5 space-y-4 animate-fade-in ${isPositive ? 'card-glow-green' : 'card-glow-red'}`}>

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">NSE</span>
            <h3 className="text-xl font-bold font-mono text-white tracking-wide">{data.symbol}</h3>
            {data.synthetic && <span className="tag tag-amber">SYNTHETIC</span>}
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold font-mono" style={{ color: trendColor }}>
              ₹{data.current_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <div className={`flex items-center gap-1 text-sm font-mono font-semibold`} style={{ color: trendColor }}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {isPositive ? '+' : ''}{change.toFixed(2)} ({isPositive ? '+' : ''}{changePct.toFixed(2)}%)
            </div>
          </div>
        </div>

        {/* OHLC-style summary */}
        <div className="text-right space-y-1">
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
            <span className="text-slate-600 text-right">HIGH</span>
            <span className="font-mono text-emerald-400">₹{hi.toLocaleString('en-IN')}</span>
            <span className="text-slate-600 text-right">LOW</span>
            <span className="font-mono text-red-400">₹{lo.toLocaleString('en-IN')}</span>
            <span className="text-slate-600 text-right">PTS</span>
            <span className="font-mono text-slate-300">{data.history.length}</span>
          </div>
        </div>
      </div>

      {/* ── Price Area Chart ── */}
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="bullishGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#00d09c" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#00d09c" stopOpacity={0}    />
              </linearGradient>
              <linearGradient id="bearishGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ff5252" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#ff5252" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#475569', fontSize: 10 }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fill: '#475569', fontSize: 10 }}
              axisLine={false} tickLine={false}
              width={62}
              tickFormatter={v => `₹${v.toLocaleString('en-IN')}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="close"
              stroke={trendColor}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={{ fill: trendColor, r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: trendColor, stroke: '#0a0e17', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Volume bars ── */}
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <Activity className="w-3 h-3 text-blue-400" />
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">Volume</span>
        </div>
        <div className="h-12">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 4, bottom: 0, left: 0 }}>
              <XAxis dataKey="date" hide />
              <Tooltip content={<VolumeTooltip />} />
              <Bar dataKey="volume" fill="#3b82f640" radius={[2, 2, 0, 0]}
                   activeBar={{ fill: '#3b82f6' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="text-[10px] text-slate-600 font-mono">
        src: {data.source} · {new Date(data.observed_at).toLocaleString('en-IN')}
      </div>
    </div>
  )
}
