import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts'

const VIEWS = {
  equity:   { label: 'EQUITY CURVE',   keys: ['Strategy_Equity',        'SPY_Equity'           ], yFmt: v => `$${(v/1000).toFixed(0)}k` },
  drawdown: { label: 'MAX DRAWDOWN',   keys: ['Strategy_Drawdown',      'SPY_Drawdown'         ], yFmt: v => `${(v*100).toFixed(1)}%`  },
  sharpe:   { label: 'ROLLING SHARPE', keys: ['Strategy_Rolling_Sharpe','SPY_Rolling_Sharpe'   ], yFmt: v => v.toFixed(2)              },
}

const TT = ({ active, payload, label, view }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#141414',
      border: '1px solid #2e2e2e',
      padding: '10px 14px',
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '11px',
      color: '#d0d0d0',
      minWidth: '180px',
    }}>
      <div style={{ color: '#888888', marginBottom: '6px', letterSpacing: '0.08em', fontWeight: 700, fontSize: '10px' }}>
        {String(label).substring(0, 10)}
      </div>
      {payload.map(p => (
        <div key={p.dataKey} style={{
          display: 'flex', justifyContent: 'space-between', gap: '16px',
          borderTop: '1px solid #1c1c1c', padding: '3px 0',
        }}>
          <span style={{ color: p.dataKey.startsWith('Strategy') ? '#ffffff' : '#888888', fontWeight: 600 }}>
            {p.dataKey.startsWith('Strategy') ? 'STRATEGY' : 'SPY     '}
          </span>
          <span style={{ fontWeight: 800, color: '#ffffff' }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '420px', background: 'var(--surface)' }}>
      <div className="chart-header">
        <div>
          <div className="chart-title">{cfg.label}</div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'var(--text-3)', marginTop: '4px', letterSpacing: '0.04em' }}>
            <span style={{ color: 'var(--white)', fontWeight: 700, marginRight: '14px' }}>— STRATEGY V7</span>
            <span style={{ color: 'var(--text-3)' }}>· · SPY BENCHMARK</span>
          </div>
        </div>
        <div className="chart-toggles">
          {Object.entries(VIEWS).map(([key, v]) => (
            <button key={key} className={`toggle-btn ${view === key ? 'active' : ''}`} onClick={() => setView(key)}>
              {key.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: '340px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 16, right: 24, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="" stroke="#1c1c1c" vertical={true} horizontal={true} />
            <XAxis
              dataKey="date"
              stroke="#1c1c1c"
              tick={{ fontSize: 10, fill: '#4a4a4a', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}
              tickFormatter={t => String(t).substring(0, 4)}
              minTickGap={50}
              axisLine={{ stroke: '#1c1c1c' }}
              tickLine={{ stroke: '#1c1c1c' }}
            />
            <YAxis
              stroke="#1c1c1c"
              tick={{ fontSize: 10, fill: '#4a4a4a', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}
              tickFormatter={cfg.yFmt}
              axisLine={{ stroke: '#1c1c1c' }}
              tickLine={{ stroke: '#1c1c1c' }}
              width={56}
            />
            <Tooltip content={<TT view={view} />} cursor={{ stroke: '#2e2e2e', strokeWidth: 1, strokeDasharray: '4 2' }} />
            {view === 'drawdown' && <ReferenceLine y={0} stroke="#2e2e2e" />}
            {/* Strategy — solid white, dominant */}
            <Line
              type="linear"
              dataKey={cfg.keys[0]}
              stroke="#ffffff"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              activeDot={{ r: 3, fill: '#ffffff', stroke: '#ffffff' }}
            />
            {/* SPY — dim gray dashed */}
            <Line
              type="linear"
              dataKey={cfg.keys[1]}
              stroke="#3d3d3d"
              strokeWidth={1}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive={false}
              activeDot={{ r: 2, fill: '#3d3d3d', stroke: '#3d3d3d' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
