import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { mockEvaluatorAudit } from '../data/mockFallbackData'

const API_BASE = 'http://127.0.0.1:8001/api'

function scoreColor(s) {
  if (s >= 80) return 'text-green'
  if (s >= 60) return 'text-amber'
  return 'text-red'
}

function SeverityBadge({ sev }) {
  if (sev === 'high')
    return <span className="font-mono text-[8px] border border-red text-red px-1 font-bold flex-shrink-0">[HIGH]</span>
  if (sev === 'medium')
    return <span className="font-mono text-[8px] border border-amber text-amber px-1 font-bold flex-shrink-0">[MED]</span>
  return <span className="font-mono text-[8px] border border-border text-text-3 px-1 font-bold flex-shrink-0">[LOW]</span>
}

function MetricRow({ label, value }) {
  return (
    <div className="flex items-baseline justify-between border-b border-border py-1.5">
      <span className="font-mono text-[9px] uppercase tracking-widest text-text-3">{label}</span>
      <span className="font-mono text-[12px] font-bold text-text-strong">{value ?? '—'}</span>
    </div>
  )
}

const BENCH_FIELDS = [
  { label: 'CAGR',         field: 'CAGR',        invert: false },
  { label: 'SHARPE',       field: 'Sharpe',       invert: false },
  { label: 'SORTINO',      field: 'Sortino',      invert: false },
  { label: 'MAX DRAWDOWN', field: 'Max Drawdown', invert: true  },
  { label: 'VOLATILITY',   field: 'Volatility',   invert: true  },
  { label: 'CALMAR',       field: 'Calmar',       invert: false },
]

const BENCHMARKS = ['SPY', 'QQQ', 'MTUM', 'QUAL']

export default function EvaluatorAudit() {
  const [audit, setAudit]       = useState(null)
  const [btMeta, setBtMeta]     = useState(null)
  const [loading, setLoading]   = useState(true)
  const [openGaps, setOpenGaps] = useState(new Set([0]))

  useEffect(() => {
    const load = async () => {
      try {
        const r = await axios.get(`${API_BASE}/portfolio/evaluator_audit`)
        setAudit(r.data)
      } catch {
        setAudit(mockEvaluatorAudit)
      }
      try {
        const r = await axios.get(`${API_BASE}/backtest/metrics`)
        setBtMeta(r.data)
      } catch {
        setBtMeta(null)
      }
      setLoading(false)
    }
    load()
  }, [])

  const btRows = useMemo(() => {
    const src = Array.isArray(btMeta?.metrics) ? btMeta.metrics
              : Array.isArray(btMeta)           ? btMeta
              : null
    if (!src) return {}
    return src.reduce((acc, m) => { acc[m.Metric] = m; return acc }, {})
  }, [btMeta])

  /* Benchmark rows: prefer audit.computed.benchmarks, fall back to btRows */
  const benchRows = useMemo(() => {
    const ab = audit?.computed?.benchmarks
    if (ab && typeof ab === 'object') return ab
    return btRows
  }, [audit, btRows])

  const toggleGap = i => {
    setOpenGaps(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  if (loading) {
    return (
      <div
        className="flex items-center justify-center font-mono text-[11px] text-text-3"
        style={{ height: 'calc(100vh - 104px)' }}
      >
        LOADING AUDIT DATA...
      </div>
    )
  }

  const score      = audit?.score ?? 0
  const strategy   = audit?.computed?.strategy || {}
  const gaps       = audit?.gaps ?? []
  const implOrder  = audit?.implementation_order ?? []
  const stratRow   = btRows['Strategy'] || {}

  const positionCount    = audit?.summary?.position_count
                        ?? strategy?.position_count
                        ?? '—'
  const metricsAvailable = audit?.summary?.metrics_available?.length
                        ?? BENCH_FIELDS.filter(({ field }) => stratRow[field] != null).length
  const missingCount     = audit?.summary?.missing_metric_count ?? '—'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 104px)',
        overflow: 'hidden',
      }}
    >
      {/* ── Top Strip ────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 border-b border-border-2 bg-surface"
        style={{ display: 'flex', alignItems: 'stretch' }}
      >
        {/* Score */}
        <div
          className="px-6 py-4 border-r border-border-2 flex flex-col justify-center flex-shrink-0"
          style={{ minWidth: 120 }}
        >
          <span className="font-mono text-[9px] uppercase tracking-widest text-text-3 block mb-1">
            EVAL SCORE
          </span>
          <span
            className={`font-mono font-black leading-none ${scoreColor(score)}`}
            style={{ fontSize: 48 }}
          >
            {score}
          </span>
        </div>

        {/* Headline + stats */}
        <div className="flex-1 px-6 py-4 flex flex-col justify-between">
          <span className="font-mono text-[11px] text-text-2 font-semibold">
            {audit?.summary?.headline || 'EVALUATOR AUDIT'}
          </span>
          <div className="flex gap-8 mt-2">
            {[
              { label: 'POSITIONS',         value: positionCount    },
              { label: 'METRICS AVAILABLE', value: metricsAvailable },
              { label: 'MISSING METRICS',   value: missingCount     },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <span className="font-mono text-[8px] uppercase tracking-widest text-text-3">{label}</span>
                <span className="font-mono text-[16px] font-black text-text-strong">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body: 2×2 grid ───────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1fr 1fr',
          gap: '1px',
          background: 'var(--border-2)',
        }}
      >
        {/* ── Cell 1: Gap Accordion ────────────────────────────── */}
        <div className="bg-surface overflow-y-auto flex flex-col">
          <div className="px-4 py-2 border-b border-border-2 bg-surface-2 flex-shrink-0 sticky top-0">
            <span className="font-mono text-[10px] uppercase tracking-widest text-text-3">
              EVALUATOR GAPS
            </span>
          </div>
          <div className="p-4 flex flex-col gap-2">
            {gaps.map((gap, i) => {
              const isOpen = openGaps.has(i)
              return (
                <div key={gap.area} className="border border-border-2">
                  <button
                    onClick={() => toggleGap(i)}
                    className="w-full px-3 py-2 flex items-center gap-2 bg-surface-2 hover:bg-surface cursor-pointer text-left"
                  >
                    <SeverityBadge sev={gap.severity} />
                    <span className="font-mono text-[10px] text-text-strong font-bold flex-1 truncate">
                      {gap.area}
                    </span>
                    <span className="font-mono text-[10px] text-text-3 flex-shrink-0">
                      {isOpen ? '▲' : '▼'}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-3 py-3 border-t border-border-2 bg-surface flex flex-col gap-2">
                      <p className="font-mono text-[10px] text-text-2 leading-relaxed">{gap.why}</p>
                      {(gap.missing || []).length > 0 && (
                        <div className="flex flex-col gap-1 mt-1">
                          {gap.missing.map(item => (
                            <div key={item} className="flex items-center gap-2 font-mono text-[10px] text-text-3">
                              <span className="w-3 h-3 border border-border-2 flex-shrink-0 inline-block" />
                              {item}
                            </div>
                          ))}
                        </div>
                      )}
                      {gap.procedure && (
                        <p className="font-mono text-[10px] text-text-3 italic leading-relaxed mt-1">
                          {gap.procedure}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            {gaps.length === 0 && (
              <div className="font-mono text-[11px] text-text-3 py-4 text-center">
                NO GAPS DETECTED
              </div>
            )}
          </div>
        </div>

        {/* ── Cell 2: Strategy Metrics + Benchmark Comparison ──── */}
        <div className="bg-surface overflow-y-auto flex flex-col">
          <div className="px-4 py-2 border-b border-border-2 bg-surface-2 flex-shrink-0 sticky top-0">
            <span className="font-mono text-[10px] uppercase tracking-widest text-text-3">
              STRATEGY METRICS
            </span>
          </div>
          <div className="p-4 flex flex-col gap-4">
            {/* Metric rows from audit computed data */}
            <div>
              {[
                { label: 'CAGR',         val: strategy.cagr         != null ? `${Number(strategy.cagr).toFixed(2)}%`          : (stratRow.CAGR ?? '—') },
                { label: 'SHARPE',       val: strategy.sharpe       != null ? Number(strategy.sharpe).toFixed(2)              : (stratRow.Sharpe ?? '—') },
                { label: 'SORTINO',      val: strategy.sortino      != null ? Number(strategy.sortino).toFixed(2)             : (stratRow.Sortino ?? '—') },
                { label: 'MAX DRAWDOWN', val: strategy.max_drawdown != null ? `${Number(strategy.max_drawdown).toFixed(2)}%`  : (stratRow['Max Drawdown'] ?? '—') },
                { label: 'VOLATILITY',   val: strategy.volatility   != null ? `${Number(strategy.volatility).toFixed(2)}%`   : (stratRow.Volatility ?? '—') },
                { label: 'CALMAR',       val: strategy.calmar       != null ? Number(strategy.calmar).toFixed(2)              : (stratRow.Calmar ?? '—') },
                { label: 'WIN RATE',     val: strategy.win_rate     != null ? `${Number(strategy.win_rate).toFixed(1)}%`      : '—' },
              ].map(m => <MetricRow key={m.label} label={m.label} value={m.val} />)}
            </div>

            {/* Benchmark comparison table */}
            <div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-text-3 mb-2 pb-1 border-b border-border">
                BENCHMARK COMPARISON
              </div>
              <table className="w-full table-fixed font-mono text-[10px] border-collapse">
                <thead>
                  <tr>
                    <th className="text-left py-1 pr-2 text-[8px] text-text-3 font-normal w-[30%]">METRIC</th>
                    {BENCHMARKS.map(b => (
                      <th key={b} className="text-right py-1 text-[8px] text-text-3 font-normal">
                        {b}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {BENCH_FIELDS.map(({ label, field, invert }) => {
                    const sv = parseFloat(stratRow[field])
                    return (
                      <tr key={label} className="border-t border-border">
                        <td className="py-1 pr-2 text-text-3 text-[9px]">{label}</td>
                        {BENCHMARKS.map(b => {
                          const bRow = benchRows[b]
                          const bv   = bRow?.[field] ?? bRow?.[field.toLowerCase()]
                          const bn   = parseFloat(bv)
                          let cellColor = 'text-text-3'
                          if (!isNaN(sv) && !isNaN(bn)) {
                            const beats = invert ? sv < bn : sv > bn
                            cellColor = beats ? 'text-green' : 'text-red'
                          }
                          return (
                            <td key={b} className={`text-right py-1 font-bold ${cellColor}`}>
                              {bv ?? '—'}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Cell 3: Factor IC Matrix ──────────────────────────── */}
        <div className="bg-surface overflow-y-auto flex flex-col">
          <div className="px-4 py-2 border-b border-border-2 bg-surface-2 flex-shrink-0 sticky top-0">
            <span className="font-mono text-[10px] uppercase tracking-widest text-text-3">
              FACTOR IC MATRIX
            </span>
          </div>
          <div className="p-4">
            <div
              className="p-4 flex flex-col gap-3"
              style={{ border: '1px dashed var(--border-2)' }}
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[10px] uppercase tracking-widest text-text-3">
                  FACTOR INFORMATION COEFFICIENT (IC)
                </span>
                <span className="font-mono text-[9px] text-text-3">
                  Pearson Correlation: Factor Rank vs 1M Forward Return
                </span>
              </div>
              {[
                { key: 'r6',  label: 'r6  (Momentum 6M)'   },
                { key: 'r12', label: 'r12 (Momentum 12M)'  },
                { key: 'rv',  label: 'rv  (Low Volatility)' },
                { key: 'rq',  label: 'rq  (Quality)'        },
              ].map(({ key, label }) => (
                <div
                  key={key}
                  className="flex items-center justify-between font-mono text-[10px] border-b border-border pb-1.5"
                >
                  <span className="text-text-2">{label}</span>
                  <span className="text-text-3 text-[9px]">[ DATA PENDING — run src/main.py ]</span>
                </div>
              ))}
              <p className="font-mono text-[9px] text-text-3 italic leading-relaxed">
                IC data is computed by metrics.py/calculate_factor_attribution()
                but is not yet exposed via an API endpoint.
              </p>
            </div>
          </div>
        </div>

        {/* ── Cell 4: Implementation Order ─────────────────────── */}
        <div className="bg-surface overflow-y-auto flex flex-col">
          <div className="px-4 py-2 border-b border-border-2 bg-surface-2 flex-shrink-0 sticky top-0">
            <span className="font-mono text-[10px] uppercase tracking-widest text-text-3">
              IMPLEMENTATION ORDER
            </span>
          </div>
          <div className="p-4 flex flex-col gap-2">
            {implOrder.map((item, i) => (
              <div key={i} className="flex gap-3 border-b border-border pb-2">
                <span className="font-mono text-[10px] font-bold text-text-3 w-6 flex-shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="font-mono text-[10px] text-text-2 leading-relaxed">{item}</span>
              </div>
            ))}
            {implOrder.length === 0 && (
              <div className="font-mono text-[11px] text-text-3">
                NO IMPLEMENTATION STEPS AVAILABLE
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
