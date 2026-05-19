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

const PARAM_EXPLANATIONS = {
  equity: "Growth of $10,000 Initial Investment. Compare absolute strategy returns against benchmark (SPY).",
  drawdown: "Drawdown Curve: Peak-to-trough losses. Measures historical downside risk and maximum peak losses.",
  sharpe: "Rolling Sharpe Ratio (252-day): Risk-adjusted performance over time.",
}

const TT = ({ active, payload, label, view }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--surface-3)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '12px 14px',
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '12px',
      color: 'var(--text)',
      minWidth: '220px',
      boxShadow: '0 16px 32px rgba(15, 23, 42, 0.12)',
    }}>
      <div style={{ color: 'var(--text-3)', marginBottom: '8px', fontWeight: 700, fontSize: '11px' }}>
        DATE: {String(label).substring(0, 10)}
      </div>
      {payload.map(p => {
        // Skip trendlines in tooltip to keep it clean, unless we want to show it
        if (p.dataKey.startsWith('trendline')) return null
        const isSma = p.dataKey.endsWith('_SMA')
        const labelText = isSma ? 'Strategy SMA (20d)' : p.dataKey.startsWith('Strategy') ? 'Strategy' : 'SPY'
        const color = isSma ? '#d97706' : p.dataKey.startsWith('Strategy') ? '#0f766e' : 'var(--text-3)'
        
        return (
          <div key={p.dataKey} style={{
            display: 'flex', justifyContent: 'space-between', gap: '16px',
            borderTop: '1px solid var(--border)', padding: '4px 0',
          }}>
            <span style={{ color, fontWeight: 700 }}>
              {labelText}
            </span>
            <span style={{ fontWeight: 800, color: 'var(--text-strong)' }}>
              {view === 'equity'
                ? `$${Number(p.value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                : view === 'drawdown'
                ? `${(Number(p.value) * 100).toFixed(2)}%`
                : Number(p.value).toFixed(3)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function MainChart({ perf }) {
  const [view, setView] = useState('equity')
  const [showSma, setShowSma] = useState(false)
  const [drawingMode, setDrawingMode] = useState(false)
  const [trendlines, setTrendlines] = useState([])

  const chartData = useMemo(() => {
    if (!perf) return []
    return perf.filter((_, i) => i % 3 === 0)
  }, [perf])

  const cfg = VIEWS[view]

  // Calculate 20-period Moving Average on filtered chart data (roughly ~30 trading days)
  const processedData = useMemo(() => {
    let data = [...chartData]
    if (showSma && view === 'equity') {
      const key = cfg.keys[0] // Strategy_Equity
      const period = 10
      data = data.map((d, index) => {
        if (index < period - 1) return { ...d, [`${key}_SMA`]: null }
        const slice = data.slice(index - period + 1, index + 1)
        const sum = slice.reduce((acc, row) => acc + (parseFloat(row[key]) || 0), 0)
        return { ...d, [`${key}_SMA`]: sum / period }
      })
    }
    return data
  }, [chartData, showSma, view, cfg])

  // Interpolate user drawn trendlines
  const finalData = useMemo(() => {
    let data = [...processedData]
    trendlines.forEach((line, lineIdx) => {
      if (!line.p1) return
      const idx1 = data.findIndex(d => d.date === line.p1.date)
      const idx2 = line.p2 ? data.findIndex(d => d.date === line.p2.date) : -1
      
      if (idx1 !== -1) {
        if (idx2 !== -1) {
          const startIdx = Math.min(idx1, idx2)
          const endIdx = Math.max(idx1, idx2)
          const startVal = startIdx === idx1 ? line.p1.value : line.p2.value
          const endVal = startIdx === idx1 ? line.p2.value : line.p1.value
          
          for (let j = startIdx; j <= endIdx; j++) {
            const pct = endIdx === startIdx ? 1 : (j - startIdx) / (endIdx - startIdx)
            const val = startVal + pct * (endVal - startVal)
            data[j] = { ...data[j], [`trendline_${lineIdx}`]: val }
          }
        } else {
          data[idx1] = { ...data[idx1], [`trendline_${lineIdx}`]: line.p1.value }
        }
      }
    })
    return data
  }, [processedData, trendlines])

  const handleChartClick = (e) => {
    if (!drawingMode || !e?.activeLabel) return
    const date = e.activeLabel
    const activePayload = e.activePayload
    if (!activePayload || activePayload.length === 0) return

    const primaryKey = cfg.keys[0]
    const pld = activePayload.find(p => p.dataKey === primaryKey) || activePayload[0]
    const value = pld.value

    setTrendlines(prev => {
      const copy = [...prev]
      if (copy.length === 0 || copy[copy.length - 1].p2 !== null) {
        return [...copy, { p1: { date, value }, p2: null }]
      } else {
        copy[copy.length - 1] = { ...copy[copy.length - 1], p2: { date, value } }
        return copy
      }
    })
  }

  return (
    <Card 
      style={{ display: 'flex', flexDirection: 'column', minHeight: '450px', overflow: 'hidden' }}
      title={PARAM_EXPLANATIONS[view]}
    >
      <div className="chart-header">
        <div>
          <div className="chart-title">
            {cfg.label} <span style={{ opacity: 0.5, fontSize: '11px', cursor: 'help' }} title={PARAM_EXPLANATIONS[view]}>ⓘ</span>
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

      {/* Technical Indicators & Drawings Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '8px 20px',
        background: 'var(--surface-2)',
        borderBottom: '1px solid var(--border)',
        fontSize: '11px',
        fontFamily: 'JetBrains Mono, monospace',
      }}>
        {/* Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Indicators:</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: 'var(--text-2)' }}>
            <input
              type="checkbox"
              checked={showSma}
              onChange={e => setShowSma(e.target.checked)}
              disabled={view !== 'equity'}
              style={{ accentColor: '#0f766e', cursor: 'pointer' }}
            />
            <span>20-day SMA Overlay {view !== 'equity' && '(Growth view only)'}</span>
          </label>
        </div>

        {/* Drawings */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Drawing:</span>
          <button
            onClick={() => setDrawingMode(!drawingMode)}
            style={{
              background: drawingMode ? 'rgba(239, 68, 68, 0.15)' : 'var(--surface)',
              color: drawingMode ? '#ef4444' : 'var(--text-2)',
              border: `1px solid ${drawingMode ? '#ef4444' : 'var(--border)'}`,
              borderRadius: '6px',
              padding: '3px 8px',
              fontSize: '10px',
              cursor: 'pointer',
              fontWeight: drawingMode ? 700 : 500,
            }}
          >
            {drawingMode ? '✏️ Drawing (Click chart)' : '✏️ Draw Trendline'}
          </button>
          {trendlines.length > 0 && (
            <button
              onClick={() => {
                setTrendlines([])
                setDrawingMode(false)
              }}
              style={{
                background: 'transparent',
                color: 'var(--text-3)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '10px',
                cursor: 'pointer',
              }}
            >
              Clear Trendlines ({trendlines.length})
            </button>
          )}
        </div>
      </div>

      {/* Guide Banner for active Drawing Mode */}
      {drawingMode && (
        <div style={{
          background: 'var(--surface-3)',
          padding: '6px 20px',
          fontSize: '10px',
          color: 'var(--teal)',
          borderBottom: '1px solid var(--border)',
          fontFamily: 'JetBrains Mono, monospace',
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <span>👉 CLICK two points on the line chart below to draw a trendline.</span>
          {trendlines.length > 0 && !trendlines[trendlines.length - 1].p2 && (
            <span style={{ color: '#ef4444', fontWeight: 700 }}>[ANCHOR 1 SET. Click second point to draw line...]</span>
          )}
        </div>
      )}

      <div style={{ flex: 1, minHeight: '340px', background: 'linear-gradient(180deg, var(--bg) 0%, var(--surface-2) 100%)', cursor: drawingMode ? 'crosshair' : 'default' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={finalData} margin={{ top: 16, right: 24, bottom: 8, left: 8 }} onClick={handleChartClick}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} horizontal={true} />
            <XAxis
              dataKey="date"
              stroke="var(--border)"
              tick={{ fontSize: 11, fill: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}
              tickFormatter={t => String(t).substring(0, 4)}
              minTickGap={50}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
            />
            <YAxis
              stroke="var(--border)"
              tick={{ fontSize: 11, fill: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}
              tickFormatter={cfg.yFmt}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip content={<TT view={view} />} cursor={{ stroke: 'var(--border-3)', strokeWidth: 1, strokeDasharray: '4 2' }} />
            {view === 'drawdown' && <ReferenceLine y={0} stroke="var(--border-3)" />}
            
            {/* Primary Strategy Line */}
            <Line
              type="monotone"
              dataKey={cfg.keys[0]}
              stroke="#0f766e"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
              activeDot={{ r: 4, fill: '#0f766e', stroke: 'var(--bg)', strokeWidth: 2 }}
            />
            
            {/* Benchmark line */}
            <Line
              type="monotone"
              dataKey={cfg.keys[1]}
              stroke="var(--text-3)"
              strokeWidth={1.8}
              strokeDasharray="5 5"
              dot={false}
              isAnimationActive={false}
              activeDot={{ r: 3, fill: 'var(--text-3)', stroke: 'var(--bg)', strokeWidth: 2 }}
            />

            {/* Technical Indicator SMA overlay */}
            {showSma && view === 'equity' && (
              <Line
                type="monotone"
                dataKey={`${cfg.keys[0]}_SMA`}
                stroke="#d97706"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={false}
                isAnimationActive={false}
              />
            )}

            {/* User drawn trendlines */}
            {trendlines.map((line, lineIdx) => (
              <Line
                key={lineIdx}
                type="linear"
                dataKey={`trendline_${lineIdx}`}
                stroke="#ef4444"
                strokeWidth={2}
                dot={line.p2 ? false : { r: 5, fill: '#ef4444', stroke: '#ffffff', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
