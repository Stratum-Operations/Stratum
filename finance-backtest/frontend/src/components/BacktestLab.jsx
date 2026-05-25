import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'

const API_BASE = 'http://127.0.0.1:8001/api'

const FRICTION_DEFAULTS = {
  slippage: 20,
  commission: 1.00,
  tax_drag: 1.0,
  rebal_freq: 'Monthly',
}

/* ── Custom mono tooltip ─────────────────────────────────────────── */
function MonoTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--ink)',
      border: '1px solid var(--border-2)',
      padding: '8px 12px',
      fontFamily: 'Geist Mono, monospace',
      fontSize: '11px',
      color: 'var(--white)',
      borderRadius: 0,
    }}>
      <div style={{ color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </div>
      ))}
    </div>
  )
}

/* ── Evaluation Matrix ───────────────────────────────────────────── */
function EvalMatrix({ metrics, isEstimated }) {
  if (!metrics?.length) {
    return (
      <div className="p-4 font-mono text-[11px] text-text-3">
        METRICS DATA PENDING — run src/main.py or check GET /api/backtest/metrics
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-[1px]" style={{ background: 'var(--border-2)' }}>
      {metrics.map(m => {
        const delta = m.delta
        const deltaPositive = m.invert
          ? delta != null && delta <= 0
          : delta != null && delta >= 0
        const deltaColor = delta == null ? '' : deltaPositive ? 'text-green' : 'text-red'
        const sign = delta != null && delta > 0 ? '+' : ''

        return (
          <div
            key={m.label}
            className="bg-surface p-4 flex flex-col gap-1"
            style={{ flex: '1 1 130px', minWidth: 130 }}
          >
            <span className="font-mono text-[9px] uppercase tracking-widest text-text-3 flex items-center gap-2">
              {m.label}
              {isEstimated && (
                <span className="border border-amber text-amber px-1 text-[8px]">EST</span>
              )}
            </span>
            <span className="font-mono font-black text-2xl text-text-strong leading-none">
              {m.stratVal}
            </span>
            <span className="font-mono text-[10px] text-text-3">SPY: {m.spyVal}</span>
            {delta != null && (
              <span className={`font-mono text-[10px] font-bold ${deltaColor}`}>
                Δ {sign}{delta.toFixed(2)}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── BacktestLab ─────────────────────────────────────────────────── */
export default function BacktestLab({ perf }) {
  const [mode, setMode]                   = useState('historical')
  const [btMetrics, setBtMetrics]         = useState(null)
  const [scenarioResult, setScenarioResult] = useState(null)
  const [scenarioRunning, setScenarioRunning] = useState(false)
  const [friction, setFriction]           = useState(FRICTION_DEFAULTS)

  useEffect(() => {
    axios.get(`${API_BASE}/backtest/metrics`)
      .then(r => setBtMetrics(r.data))
      .catch(() => setBtMetrics(null))
  }, [])

  const runScenario = async () => {
    setScenarioRunning(true)
    try {
      const r = await axios.post(`${API_BASE}/backtest`, friction)
      setScenarioResult(r.data)
    } catch {
      setScenarioResult({ error: true })
    }
    setScenarioRunning(false)
  }

  /* chart — sample every 3rd point */
  const chartData = useMemo(() => {
    if (!perf) return []
    return perf.filter((_, i) => i % 3 === 0)
  }, [perf])

  /* which equity lines are actually present in the data */
  const lines = useMemo(() => {
    const sample = chartData[0] || {}
    return [
      { key: 'Strategy_Equity', name: 'Strategy', stroke: 'var(--text-strong)', strokeWidth: 2,   dashed: false },
      { key: 'SPY_Equity',      name: 'SPY',      stroke: 'var(--text-3)',      strokeWidth: 1,   dashed: true  },
      { key: 'QQQ_Equity',      name: 'QQQ',      stroke: 'var(--blue)',        strokeWidth: 1,   dashed: true  },
      { key: 'MTUM_Equity',     name: 'MTUM',     stroke: 'var(--amber)',       strokeWidth: 1,   dashed: true  },
      { key: 'QUAL_Equity',     name: 'QUAL',     stroke: 'var(--teal)',        strokeWidth: 1,   dashed: true  },
    ].filter(l => sample[l.key] != null)
  }, [chartData])

  /* parse eval metrics from /api/backtest/metrics response */
  const evalMetrics = useMemo(() => {
    const KEYS = [
      { label: 'CAGR',         field: 'CAGR',                 invert: false },
      { label: 'VOLATILITY',   field: 'Volatility',           invert: true  },
      { label: 'SHARPE',       field: 'Sharpe',               invert: false },
      { label: 'SORTINO',      field: 'Sortino',              invert: false },
      { label: 'MAX DRAWDOWN', field: 'Max Drawdown',         invert: true  },
      { label: 'CALMAR',       field: 'Calmar',               invert: false },
      { label: 'AVG TURNOVER', field: 'Annualized Turnover',  invert: true  },
    ]
    const src = Array.isArray(btMetrics?.metrics) ? btMetrics.metrics
              : Array.isArray(btMetrics)           ? btMetrics
              : null
    if (!src) return null

    const strat = src.find(m => m.Metric === 'Strategy') || {}
    const spy   = src.find(m => m.Metric === 'SPY')      || {}

    return KEYS.map(({ label, field, invert }) => {
      const sv = strat[field] ?? '—'
      const bv = spy[field]   ?? '—'
      const sn = parseFloat(sv)
      const bn = parseFloat(bv)
      const delta = !isNaN(sn) && !isNaN(bn) ? sn - bn : null
      return { label, stratVal: sv, spyVal: bv, delta, invert }
    })
  }, [btMetrics])

  /* scenario metrics — map POST response to the same shape when available */
  const scenarioMetrics = useMemo(() => {
    if (!scenarioResult || scenarioResult.error) return evalMetrics
    const base = evalMetrics || []
    const sc = scenarioResult
    return base.map(m => ({
      ...m,
      stratVal: sc[m.label.toLowerCase().replace(/ /g, '_')] ?? sc[m.label] ?? m.stratVal,
    }))
  }, [scenarioResult, evalMetrics])

  const displayMetrics = mode === 'scenario' ? scenarioMetrics : evalMetrics

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 104px)',
        overflow: 'hidden',
      }}
    >
      {/* ── Mode Toggle ──────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 flex border-b border-border-2 bg-surface"
      >
        {[
          { id: 'historical', label: 'HISTORICAL RESULTS'  },
          { id: 'scenario',   label: 'SCENARIO ESTIMATOR'  },
        ].map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`
              font-mono text-[10px] uppercase tracking-widest px-6 py-3
              border-b-2 bg-transparent cursor-pointer transition-colors
              ${mode === m.id
                ? 'border-text-strong text-text-strong font-bold'
                : 'border-transparent text-text-3 hover:text-text-2'
              }
            `}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* ── Scenario warning banner ───────────────────────────────── */}
      {mode === 'scenario' && (
        <div
          className="flex-shrink-0 border-b border-amber px-4 py-2 font-mono text-[10px] text-amber"
          style={{ background: 'rgba(217,119,6,0.06)' }}
        >
          ⚠ ESTIMATED MODE — Results are parameterized approximations, not real simulations.
          Run src/main.py to generate real backtest data.
        </div>
      )}

      {/* ── Chart row + Friction config (60%) ────────────────────── */}
      <div
        style={{
          flex: '0 0 57%',
          display: 'flex',
          overflow: 'hidden',
          borderBottom: '1px solid var(--border-2)',
        }}
      >
        {/* Equity Curve Chart */}
        <div className="flex-1 bg-surface flex flex-col overflow-hidden">
          <div className="px-4 py-2 border-b border-border-2 bg-surface-2 flex-shrink-0 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-text-3">
              EQUITY CURVE
            </span>
            {mode === 'scenario' && (
              <span className="font-mono text-[9px] border border-amber text-amber px-2 py-0.5">
                [ESTIMATED]
              </span>
            )}
          </div>
          <div className="flex-1 p-3 min-h-0">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <XAxis
                    dataKey="date"
                    stroke="var(--border-2)"
                    tick={{
                      fontSize: 9,
                      fill: 'var(--text-3)',
                      fontFamily: 'Geist Mono, monospace',
                    }}
                    tickFormatter={t => t?.substring(0, 7) ?? t}
                    minTickGap={50}
                  />
                  <YAxis
                    stroke="var(--border-2)"
                    tick={{
                      fontSize: 9,
                      fill: 'var(--text-3)',
                      fontFamily: 'Geist Mono, monospace',
                    }}
                    domain={['auto', 'auto']}
                    width={52}
                  />
                  <Tooltip content={<MonoTooltip />} />
                  <Legend
                    wrapperStyle={{
                      fontSize: '10px',
                      fontFamily: 'Geist Mono, monospace',
                      color: 'var(--text-2)',
                      paddingTop: '4px',
                    }}
                  />
                  {lines.map(l => (
                    <Line
                      key={l.key}
                      type="linear"
                      dataKey={l.key}
                      name={l.name}
                      stroke={l.stroke}
                      strokeWidth={l.strokeWidth}
                      dot={false}
                      strokeDasharray={l.dashed ? '4 4' : undefined}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full font-mono text-[11px] text-text-3">
                NO PERFORMANCE DATA — run src/main.py
              </div>
            )}
          </div>
        </div>

        {/* Friction Config */}
        <div
          className="flex-shrink-0 bg-surface flex flex-col overflow-y-auto"
          style={{ width: 256, borderLeft: '1px solid var(--border-2)' }}
        >
          <div className="px-4 py-2 border-b border-border-2 bg-surface-2 flex-shrink-0">
            <span className="font-mono text-[10px] uppercase tracking-widest text-text-3">
              FRICTION CONFIG
            </span>
          </div>
          <div className="p-4 flex flex-col gap-4 flex-1">
            {[
              { key: 'slippage',   label: 'SLIPPAGE (bps)', type: 'number', step: 1     },
              { key: 'commission', label: 'COMMISSION ($)',  type: 'number', step: 0.01  },
              { key: 'tax_drag',   label: 'TAX DRAG (%)',   type: 'number', step: 0.1   },
            ].map(f => (
              <div key={f.key} className="flex flex-col gap-1">
                <label className="font-mono text-[9px] uppercase tracking-widest text-text-3">
                  {f.label}
                </label>
                <input
                  type={f.type}
                  step={f.step}
                  value={friction[f.key]}
                  onChange={e =>
                    setFriction(fr => ({ ...fr, [f.key]: Number(e.target.value) }))
                  }
                  className={`w-full font-mono text-[12px] p-1.5 bg-surface-2 border border-border-2
                    text-text-strong outline-none transition-opacity
                    ${mode !== 'scenario' ? 'opacity-40' : ''}
                  `}
                />
              </div>
            ))}

            <div className="flex flex-col gap-1">
              <label className="font-mono text-[9px] uppercase tracking-widest text-text-3">
                REBAL FREQ
              </label>
              <select
                value={friction.rebal_freq}
                onChange={e =>
                  setFriction(fr => ({ ...fr, rebal_freq: e.target.value }))
                }
                className={`w-full font-mono text-[11px] p-1.5 bg-surface-2 border border-border-2
                  text-text outline-none cursor-pointer transition-opacity
                  ${mode !== 'scenario' ? 'opacity-40' : ''}
                `}
              >
                {['Weekly', 'Monthly', 'Quarterly'].map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            {mode === 'scenario' ? (
              <button
                onClick={runScenario}
                disabled={scenarioRunning}
                className="mt-2 w-full font-mono text-[10px] uppercase tracking-widest border border-border-2 bg-transparent py-2.5 cursor-pointer hover:bg-surface-2 disabled:opacity-50 text-text-strong"
              >
                {scenarioRunning ? 'RUNNING...' : 'RUN SCENARIO'}
              </button>
            ) : (
              <p className="font-mono text-[9px] text-text-3 mt-2 leading-relaxed">
                Friction parameters apply to Scenario Estimator mode only.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Evaluation Matrix (40%) ───────────────────────────────── */}
      <div className="flex-1 bg-surface overflow-auto min-h-0">
        <div className="px-4 py-2 border-b border-border-2 bg-surface-2 sticky top-0 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-widest text-text-3">
            EVALUATION MATRIX
          </span>
          {mode === 'scenario' && (
            <span className="font-mono text-[9px] border border-amber text-amber px-2 py-0.5">
              [ESTIMATED]
            </span>
          )}
        </div>
        <EvalMatrix
          metrics={displayMetrics}
          isEstimated={mode === 'scenario'}
        />
      </div>
    </div>
  )
}
