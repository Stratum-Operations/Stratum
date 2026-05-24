import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { TrendingUp, Table as TableIcon, Download, Printer } from 'lucide-react'

const C = {
  bg:     'var(--bg)',
  base:   'var(--surface)',
  raised: 'var(--surface-2)',
  border: 'var(--border)',
  hi:     'var(--text-strong)',
  muted:  'var(--text-2)',
  sub:    'var(--text)',
  dim:    'var(--text-3)',
  lime:   'var(--green)',
  red:    'var(--red)',
  green:  'var(--green)',
}
const MONO = { fontFamily: 'Geist Mono, monospace' }

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

  const reportDate = useMemo(() => {
    if (perf && perf.length > 0) {
      const lastRow = perf[perf.length - 1]
      if (lastRow && lastRow.date) {
        const d = new Date(lastRow.date)
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()
        }
      }
    }
    return 'DECEMBER 2023' // Fallback to last date in standard performance set
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
    a.download = `stratum_report_${reportDate.toLowerCase().replace(' ', '_')}.csv`
    a.click()
  }

  const printReport = () => {
    setIsPrinting(true)
    setTimeout(() => { window.print(); setIsPrinting(false) }, 400)
  }

  return (
    <div style={{ background: C.bg, color: C.hi, minHeight: '100%', fontSize: '12px', ...MONO }} className="reporting-wrapper">
      <style dangerouslySetInnerHTML={{ __html: `
        .reporting-wrapper {
          background-color: var(--bg);
          color: var(--text);
          min-height: 100%;
          font-size: 12px;
          font-family: 'Geist Mono', monospace;
        }
        .reporting-body-container {
          background-color: var(--surface);
          border: 1px solid var(--border);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          border-radius: 8px;
          margin: 20px auto !important;
          max-width: 1000px;
          transition: all 0.2s;
        }
        @media print {
          body, .reporting-wrapper {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .reporting-body-container {
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
          /* Force standard dark colors override to print in clear black/white */
          :root, [data-theme] {
            --bg: #ffffff !important;
            --surface: #ffffff !important;
            --surface-2: #ffffff !important;
            --border: #000000 !important;
            --border-2: #000000 !important;
            --border-3: #666666 !important;
            --text: #000000 !important;
            --text-strong: #000000 !important;
            --text-2: #333333 !important;
            --text-3: #555555 !important;
            --green: #000000 !important;
            --red: #000000 !important;
            --blue: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

      {/* ── Header / Controls ───────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderBottom: `2px solid ${C.hi}`, background: C.base }} className="no-print">
        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
          Strategy Reporting Engine
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[['↓ EXPORT CSV', downloadCSV], ['⎙ PRINT TEAR SHEET', printReport]].map(([l, fn]) => (
            <button key={l} onClick={fn}
              style={{ background: 'none', border: `1px solid ${C.border}`, color: C.muted, padding: '4px 14px', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', ...MONO }}
            >{l}</button>
          ))}
        </div>
      </div>

      {/* ── Report body ─────────────────────────────────────────── */}
      <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '0' }} className="reporting-body-container">

        {/* Title block */}
        <div style={{ borderBottom: `2px solid ${C.lime}`, paddingBottom: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em', fontFamily: 'Inter, sans-serif' }}>STRATUM</div>
            <div style={{ fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', color: C.lime, marginTop: '4px' }}>
              Monthly Quant Strategy Report — V7 QP Optimizer
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', fontWeight: 700 }}>
              {reportDate}
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
                  <CartesianGrid stroke="var(--border)" strokeDasharray="" />
                  <XAxis dataKey="date" tick={{ fontSize: 8, fill: 'var(--text-2)', fontFamily: 'Geist Mono, monospace', fontWeight: 600 }} stroke="var(--border)" tickFormatter={v => v.substring(0, 4)} minTickGap={40} />
                  <YAxis tick={{ fontSize: 8, fill: 'var(--text-2)', fontFamily: 'Geist Mono, monospace', fontWeight: 600 }} stroke="var(--border)" tickFormatter={v => `$${(v/1000).toFixed(0)}k`} width={44} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: '10px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-strong)' }}
                    itemStyle={{ color: 'var(--text)' }}
                    labelStyle={{ color: 'var(--text-strong)', fontWeight: 700 }}
                    formatter={(v, name) => [`$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, name === 'equity' ? 'Strategy' : 'SPY']}
                  />
                  <Line type="linear" dataKey="equity" stroke="var(--text-strong)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  <Line type="linear" dataKey="spy"    stroke="var(--text-3)"      strokeWidth={1} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
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
                  {['TICKER', 'SECTOR', 'WEIGHT', 'Q-SCORE [0.0-1.0]'].map(h => (
                    <th key={h} style={{ padding: '5px 8px', textAlign: h === 'WEIGHT' || h.startsWith('Q-SCORE') ? 'right' : 'left', fontSize: '8px', letterSpacing: '0.12em', color: C.muted, fontWeight: 600, borderRight: h !== 'Q-SCORE [0.0-1.0]' ? `1px solid ${C.border}` : 'none' }}>{h}</th>
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
          PAST PERFORMANCE IS NOT INDICATIVE OF FUTURE RESULTS. Q-SCORES REPRESENT COMPOSITE QUALITY / ALPHA RANKINGS SCALED DYNAMICALLY FROM 0.0000 (LOWEST RANK) TO 1.0000 (HIGHEST RANK).
          REBALANCE ASSUMES VWAP EXECUTION WITH FIXED COMMISSIONS AND DYNAMIC TCA SLIPPAGE MODELING.
          V7 · QP OPTIMIZER · 2014–2024
        </div>

      </div>
    </div>
  )
}

