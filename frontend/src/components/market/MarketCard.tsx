import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { MarketData } from '../../types/api'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface MarketCardProps {
  data: MarketData
}

export function MarketCard({ data }: MarketCardProps) {
  const chartData = data.history.map(p => ({
    date: new Date(p.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    close: p.close,
    volume: p.volume,
  }))

  const firstClose = data.history[0]?.close ?? data.current_price
  const change = data.current_price - firstClose
  const changePct = (change / firstClose) * 100
  const isPositive = change >= 0

  return (
    <div className="bg-surface-700 border border-white/5 rounded-xl p-5 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-2xl font-bold font-mono text-white">{data.symbol}</h3>
            {data.synthetic && (
              <span className="text-xs px-1.5 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-600 font-mono">SYNTHETIC</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-3xl font-bold font-mono text-white">
              {data.currency === 'INR' ? '₹' : '$'}{data.current_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <div className={`flex items-center gap-1 ${isPositive ? 'text-bullish' : 'text-bearish'}`}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="text-sm font-mono font-semibold">
                {isPositive ? '+' : ''}{change.toFixed(2)} ({isPositive ? '+' : ''}{changePct.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
        <div className="text-right text-xs text-slate-600">
          <div>src: {data.source}</div>
          <div className="mt-1">{new Date(data.observed_at).toLocaleDateString('en-IN')}</div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eeeeee" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#777777', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fill: '#777777', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={60}
              tickFormatter={v => `₹${v.toLocaleString('en-IN')}`}
            />
            <Tooltip
              contentStyle={{ background: '#ffffff', border: '1px solid #e7e7e7', borderRadius: '4px', fontSize: '12px' }}
              labelStyle={{ color: '#666666' }}
              itemStyle={{ color: '#22c55e' }}
              formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Close']}
            />
            <Line
              type="monotone"
              dataKey="close"
              stroke={isPositive ? '#22c55e' : '#ef4444'}
              strokeWidth={2}
              dot={{ fill: isPositive ? '#22c55e' : '#ef4444', r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-slate-600">
        7-session price history · {data.history.length} data points · {data.currency}
      </p>
    </div>
  )
}
