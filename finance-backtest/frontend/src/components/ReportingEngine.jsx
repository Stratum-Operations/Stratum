import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { TrendingUp, Table as TableIcon, Download, Printer } from 'lucide-react'

const C = {
  bg:     '#ffffff',
  base:   '#ffffff',
  raised: '#ffffff',
  border: '#e5e7eb',
  hi:     '#000000',
  muted:  '#000000',
  sub:    '#000000',
  dim:    '#000000',
  lime:   '#000000',
  red:    '#000000',
  green:  '#000000',
}
const MONO = { fontFamily: 'JetBrains Mono, monospace' }

export default function ReportingEngine({ metrics, perf, holdings }) {
  const [isPrinting, setIsPrinting] = useState(false)

  // ── perf is already an array of row objects from App.jsx ─────────
  // Each row: { date, Strategy_Equity, SPY_Equity, Strategy_Drawdown, … }
  const chartData = useMemo(() => {
    if (!perf || !perf.length) return []
    // Sample every 5th point to keep the report chart light
    return perf.filter((_, i) => i % 5 === 0).map(row => ({
      date:   String(row.date).substring(0, 7),   // YYYY-MM
      equity: row.Strategy_Equity ?? 0,
      spy:    row.SPY_Equity ?? 0,
    }))
  }, [perf])

  const stratMetric = metrics?.find(m => m.Metric === 'Strategy')
  const spyMetric   = metrics?.find(m => m.Metric === 'SPY')

  const kpiCards = [
    { label: 'CAGR',          strat: stratMetric?.CAGR,           spy: spyMetric?.CAGR },
    { label: 'SHARPE',        strat: stratMetric?.Sharpe,          spy: spyMetric?.Sharpe },
    { label: 'MAX DRAWDOWN',  strat: stratMetric?.['Max Drawdown'],spy: spyMetric?.['Max Drawdown'] },
    { label: 'VOLATILITY',    strat: stratMetric?.Volatility,      spy: spyMetric?.Volatility },
  ]

  const downloadCSV = () => {
    if (!holdings?.length) return
    const headers = ['ticker', 'sector', 'weight', 'score']
    const rows = holdings.map(h => headers.map(k => h[k] ?? '').join(','))
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'phineus_report.csv'
    a.click()
  }

  const printReport = () => {
    setIsPrinting(true)
    setTimeout(() => { window.print(); setIsPrinting(false) }, 400)
  }

  return (
    <div style={{ background: C.bg, color: C.hi, minHeight: '100%', fontSize: '12px', ...MONO }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderBottom: `2px solid ${C.hi}`, background: C.base }} className="no-print">
        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
          Strategy Reporting Engine
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[['↓ EXPORT CSV', downloadCSV], ['⎙ TEAR SHEET', printReport]].map(([l, fn]) => (
            <button key={l} onClick={fn}
              style={{ background: 'none', border: `1px solid ${C.border}`, color: C.muted, padding: '4px 14px', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', ...MONO }}
            >{l}</button>
          ))}
        </div>
      </div>

      {/* ── Report body ─────────────────────────────────────────── */}
      <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '0' }}>

        {/* Title block */}
        <div style={{ borderBottom: `2px solid ${C.lime}`, paddingBottom: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em', fontFamily: 'Space Grotesk, sans-serif' }}>PHINEUS OS</div>
            <div style={{ fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', color: C.lime, marginTop: '4px' }}>
              Monthly Quant Strategy Report — V7 QP Optimizer
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', fontWeight: 700 }}>
              {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}
            </div>
            <div style={{ fontSize: '9px', color: C.dim, marginTop: '2px', letterSpacing: '0.06em' }}>
              CONFIDENTIAL · INTERNAL USE ONLY
            </div>
          </div>
        </div>

        {/* KPI strip — 4 cards, stark borders */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderTop: `1px solid ${C.border}`, marginBottom: '24px' }}>
          {kpiCards.map((k, i) => (
            <div key={k.label} style={{ borderRight: i < 3 ? `1px solid ${C.border}` : 'none', padding: '16px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, marginBottom: '6px' }}>
                {k.label}
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, lineHeight: 1, color: C.hi, fontFamily: 'Space Grotesk, sans-serif' }}>
                {k.strat ?? '—'}
              </div>
              <div style={{ fontSize: '9px', color: C.dim, marginTop: '4px', letterSpacing: '0.05em' }}>
                SPY {k.spy ?? '—'}
              </div>
            </div>
          ))}
        </div>

        {/* 2-col body: chart left, holdings table right */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: `1px solid ${C.border}` }}>

          {/* Equity chart */}
          <div style={{ borderRight: `1px solid ${C.border}`, padding: '16px' }}>
            <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              — Strategy Cumulative Return
            </div>
            <div style={{ height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="" />
                  <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#000000', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }} stroke="#e5e7eb" tickFormatter={v => v.substring(0, 4)} minTickGap={40} />
                  <YAxis tick={{ fontSize: 8, fill: '#000000', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }} stroke="#e5e7eb" tickFormatter={v => `$${(v/1000).toFixed(0)}k`} width={44} />
                  <Tooltip
                    contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: '#000000' }}
                    itemStyle={{ color: '#000000' }}
                    labelStyle={{ color: '#000000', fontWeight: 700 }}
                    formatter={(v, name) => [`$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, name === 'equity' ? 'Strategy' : 'SPY']}
                  />
                  <Line type="linear" dataKey="equity" stroke="#000000" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  <Line type="linear" dataKey="spy"    stroke="#000000" strokeWidth={1} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '9px', color: C.dim, marginTop: '6px' }}>
              <span><span style={{ color: C.hi }}>—</span> STRATEGY V7</span>
              <span><span style={{ color: C.dim }}>—</span> SPY BENCHMARK</span>
            </div>
          </div>

          {/* Holdings table */}
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, marginBottom: '12px' }}>
              — Active Rebalance Table
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.hi}` }}>
                  {['TICKER', 'SECTOR', 'WEIGHT', 'Q-SCORE'].map(h => (
                    <th key={h} style={{ padding: '5px 8px', textAlign: h === 'WEIGHT' || h === 'Q-SCORE' ? 'right' : 'left', fontSize: '8px', letterSpacing: '0.12em', color: C.muted, fontWeight: 600, borderRight: `1px solid ${C.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(holdings ?? []).slice(0, 15).map((h, i) => (
                  <tr key={h.ticker} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '5px 8px', fontWeight: 700, color: C.hi, borderRight: `1px solid ${C.border}` }}>{h.ticker}</td>
                    <td style={{ padding: '5px 8px', color: C.sub, fontSize: '10px', borderRight: `1px solid ${C.border}` }}>{h.sector ?? '—'}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', borderRight: `1px solid ${C.border}` }}>
                      {h.weight != null ? `${(h.weight * 100).toFixed(2)}%` : '—'}
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', color: h.weight > 0 ? C.lime : C.muted }}>
                      {h.score != null ? Number(h.score).toFixed(4) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>

        {/* Disclaimer */}
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '12px 0 0', marginTop: '0', fontSize: '9px', color: C.dim, letterSpacing: '0.04em', lineHeight: 1.6 }}>
          STRATEGIC DISCLAIMER: INTERNAL PROPRIETARY REPORTING FOR ALGORITHMIC RESEARCH.
          PAST PERFORMANCE IS NOT INDICATIVE OF FUTURE RESULTS.
          REBALANCE ASSUMES VWAP EXECUTION WITH FIXED COMMISSIONS AND DYNAMIC TCA SLIPPAGE MODELING.
          V7 · QP OPTIMIZER · 2014–2024
        </div>

      </div>
    </div>
  )
}
