import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts'
import { Card } from './ui/card'

const VIEWS = {
  equity:   { label: 'Growth',   keys: ['Strategy_Equity',        'SPY_Equity'           ], yFmt: v => `$${(v/1000).toFixed(0)}k` },
  drawdown: { label: 'Drawdown', keys: ['Strategy_Drawdown',      'SPY_Drawdown'         ], yFmt: v => `${(v*100).toFixed(1)}%`  },
  sharpe:   { label: 'Sharpe',   keys: ['Strategy_Rolling_Sharpe','SPY_Rolling_Sharpe'   ], yFmt: v => v.toFixed(2)              },
}

const TT = ({ active, payload, label, view }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '12px 14px',
      fontFamily: 'Roboto Mono, monospace',
      fontSize: '12px',
      color: '#334155',
      minWidth: '180px',
      boxShadow: '0 16px 32px rgba(15, 23, 42, 0.12)',
    }}>
      <div style={{ color: '#64748b', marginBottom: '8px', fontWeight: 700, fontSize: '12px' }}>
        {String(label).substring(0, 10)}
      </div>
      {payload.map(p => (
        <div key={p.dataKey} style={{
          display: 'flex', justifyContent: 'space-between', gap: '16px',
          borderTop: '1px solid #e2e8f0', padding: '4px 0',
        }}>
          <span style={{ color: p.dataKey.startsWith('Strategy') ? '#0f766e' : '#64748b', fontWeight: 700 }}>
            {p.dataKey.startsWith('Strategy') ? 'Strategy' : 'SPY'}
          </span>
          <span style={{ fontWeight: 800, color: '#0f172a' }}>
            {view === 'equity'
              ? `$${Number(p.value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
              : Number(p.value).toFixed(3)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function MainChart({ perf }) {
  const [view, setView] = useState('equity')

  const chartData = useMemo(() => {
    if (!perf) return []
    return perf.filter((_, i) => i % 3 === 0)
  }, [perf])

  const cfg = VIEWS[view]

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', minHeight: '420px', overflow: 'hidden' }}>
      <div className="chart-header">
        <div>
          <div className="chart-title">{cfg.label}</div>
        </div>
        <div className="chart-toggles">
          {Object.entries(VIEWS).map(([key, v]) => (
            <button key={key} className={`toggle-btn ${view === key ? 'active' : ''}`} onClick={() => setView(key)}>
              {key.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: '340px', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 16, right: 24, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} horizontal={true} />
            <XAxis
              dataKey="date"
              stroke="#e2e8f0"
              tick={{ fontSize: 12, fill: '#94a3b8', fontFamily: 'IBM Plex Sans, sans-serif', fontWeight: 600 }}
              tickFormatter={t => String(t).substring(0, 4)}
              minTickGap={50}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
            />
            <YAxis
              stroke="#e2e8f0"
              tick={{ fontSize: 12, fill: '#94a3b8', fontFamily: 'IBM Plex Sans, sans-serif', fontWeight: 600 }}
              tickFormatter={cfg.yFmt}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip content={<TT view={view} />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 2' }} />
            {view === 'drawdown' && <ReferenceLine y={0} stroke="#cbd5e1" />}
            <Line
              type="monotone"
              dataKey={cfg.keys[0]}
              stroke="#0f766e"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
              activeDot={{ r: 4, fill: '#0f766e', stroke: '#ffffff', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey={cfg.keys[1]}
              stroke="#94a3b8"
              strokeWidth={1.8}
              strokeDasharray="5 5"
              dot={false}
              isAnimationActive={false}
              activeDot={{ r: 3, fill: '#94a3b8', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
