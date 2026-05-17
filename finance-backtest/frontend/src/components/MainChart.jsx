import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
  ReferenceLine,
} from 'recharts'

// ─── Brutalist custom tooltip ─────────────────────────────────────
const BrutalTooltip = ({ active, payload, label, view }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e5e7eb',
      padding: '10px 14px',
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '11px',
      color: '#000000',
      minWidth: '180px',
    }}>
      <div style={{ color: '#000000', marginBottom: '6px', letterSpacing: '0.08em', fontWeight: 700 }}>
        {String(label).substring(0, 10)}
      </div>
      {payload.map(p => (
        <div key={p.dataKey} style={{
          display: 'flex', justifyContent: 'space-between', gap: '16px',
          color: '#000000',
          borderTop: '1px solid #e5e7eb',
          padding: '3px 0',
        }}>
          <span style={{ color: '#000000', fontWeight: 600 }}>
            {p.dataKey.startsWith('Strategy') ? 'STRATEGY' : 'SPY     '}
          </span>
          <span style={{ fontWeight: 800 }}>
            {view === 'equity'
              ? `$${Number(p.value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
              : Number(p.value).toFixed(3)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── View config ─────────────────────────────────────────────────
const VIEWS = {
  equity:   { label: 'EQUITY CURVE',   keys: ['Strategy_Equity',   'SPY_Equity'],           yFmt: v => `$${(v/1000).toFixed(0)}k` },
  drawdown: { label: 'MAX DRAWDOWN',   keys: ['Strategy_Drawdown', 'SPY_Drawdown'],          yFmt: v => `${(v*100).toFixed(1)}%`  },
  sharpe:   { label: 'ROLLING SHARPE', keys: ['Strategy_Rolling_Sharpe', 'SPY_Rolling_Sharpe'], yFmt: v => v.toFixed(2)           },
}

// Strategy is solid black, SPY is dashed black
const LINE_COLORS = { strategy: '#000000', spy: '#000000' }

export default function MainChart({ perf }) {
  const [view, setView] = useState('equity')

  // Sample every 3rd point to keep render fast — chart remains sharp/jagged
  const chartData = useMemo(() => {
    if (!perf) return []
    return perf.filter((_, i) => i % 3 === 0)
  }, [perf])

  const cfg = VIEWS[view]

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: '420px',
      background: '#ffffff',
    }}>
      {/* ── Chart Header ─────────────────────────────────── */}
      <div className="chart-header">
        <div>
          <div className="chart-title">{cfg.label}</div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '10px',
            color: '#000000',
            marginTop: '4px',
            letterSpacing: '0.05em',
            fontWeight: 600,
          }}>
            <span style={{ color: '#000000', marginRight: '14px', fontWeight: 800 }}>— STRATEGY V7</span>
            <span style={{ color: '#000000' }}>· SPY BENCHMARK (DASHED)</span>
          </div>
        </div>

        {/* Toggle buttons */}
        <div className="chart-toggles">
          {Object.entries(VIEWS).map(([key, v]) => (
            <button
              key={key}
              className={`toggle-btn ${view === key ? 'active' : ''}`}
              onClick={() => setView(key)}
            >
              {key.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── Recharts — raw, linear, no animations ────────── */}
      <div style={{ flex: 1, minHeight: '340px', padding: '0 0 0 0' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 16, right: 24, bottom: 8, left: 8 }}
          >
            {/* Subtle but visible grid — brutalist structure */}
            <CartesianGrid
              strokeDasharray=""           /* solid lines */
              stroke="#e5e7eb"
              vertical={true}
              horizontal={true}
            />

            <XAxis
              dataKey="date"
              stroke="#e5e7eb"
              tick={{ fontSize: 10, fill: '#000000', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}
              tickFormatter={t => String(t).substring(0, 4)}
              minTickGap={50}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={{ stroke: '#e5e7eb' }}
            />

            <YAxis
              stroke="#e5e7eb"
              tick={{ fontSize: 10, fill: '#000000', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}
              tickFormatter={cfg.yFmt}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={{ stroke: '#e5e7eb' }}
              width={56}
            />

            <Tooltip
              content={<BrutalTooltip view={view} />}
              cursor={{ stroke: '#000000', strokeWidth: 1, strokeDasharray: '4 2' }}
            />

            {/* Zero / reference line for drawdown view */}
            {view === 'drawdown' && (
              <ReferenceLine y={0} stroke="#e5e7eb" strokeDasharray="" />
            )}

            {/* Strategy line — solid black, dominant */}
            <Line
              type="linear"                       /* raw, jagged — no smoothing */
              dataKey={cfg.keys[0]}
              stroke={LINE_COLORS.strategy}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}            /* no animation */
              activeDot={{ r: 3, fill: '#000000', stroke: '#000000' }}
            />

            {/* SPY benchmark — dashed black, subordinate */}
            <Line
              type="linear"
              dataKey={cfg.keys[1]}
              stroke={LINE_COLORS.spy}
              strokeWidth={1}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive={false}
              activeDot={{ r: 2, fill: '#000000', stroke: '#000000' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
