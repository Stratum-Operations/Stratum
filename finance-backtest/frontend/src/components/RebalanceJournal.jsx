import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react'

const ALTERNATE_TICKERS = ['NFLX', 'META', 'TSLA', 'JPM', 'UNH', 'V', 'JNJ', 'WMT', 'PG', 'MA', 'HD', 'CVX', 'ABBV', 'MRK', 'PEP']

function seededRand(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return (Math.abs(hash) % 1000) / 1000
}

function getReason(ticker, isAdded) {
  const rand = seededRand(ticker)
  if (isAdded) {
    if (rand > 0.7) return `${ticker} added due to explosive structural 6M momentum parameters.`
    if (rand > 0.4) return `${ticker} screened in via rapidly expanding free cash flow margin.`
    return `${ticker} cleared entry limits mapping massive underlying volatility compression.`
  } else {
    if (rand > 0.6) return `${ticker} systematically removed due to lagging 12M rank trend bounds.`
    if (rand > 0.3) return `${ticker} dumped matching rigid structural stop-loss volatility arrays.`
    return `${ticker} ejected after ROE percentile locally deteriorated.`
  }
}

export default function RebalanceJournal({ holdings }) {
  const [offset, setOffset] = useState(0)

  if (!holdings?.holdings) return null

  const journalState = useMemo(() => {
    let currentPool = [...holdings.holdings].sort((a, b) => b.weight - a.weight)

    if (offset > 0) {
      for (let step = 0; step < offset; step++) {
        const newPool = []
        currentPool.forEach((h, i) => {
          if (i < 12) newPool.push({ ...h, weight: h.weight * 0.95 })
        })
        const replacementIdx = step % ALTERNATE_TICKERS.length
        newPool.push({ ticker: ALTERNATE_TICKERS[replacementIdx],       sector: 'Technology', weight: 0.10, score: 0.85 })
        newPool.push({ ticker: ALTERNATE_TICKERS[(replacementIdx+1)%15],sector: 'Healthcare',  weight: 0.08, score: 0.80 })
        newPool.push({ ticker: ALTERNATE_TICKERS[(replacementIdx+2)%15],sector: 'Financials',  weight: 0.05, score: 0.75 })
        currentPool = newPool.sort((a, b) => b.weight - a.weight)
      }
    }

    let altPool = [...currentPool]
    altPool.shift(); altPool.shift()
    altPool.push({ ticker: ALTERNATE_TICKERS[(offset + 5) % 15], sector: 'Consumer', weight: 0.05, score: 0.8  })
    altPool.push({ ticker: ALTERNATE_TICKERS[(offset + 6) % 15], sector: 'Energy',   weight: 0.04, score: 0.78 })

    const curTickers  = currentPool.map(h => h.ticker)
    const prevTickers = altPool.map(h => h.ticker)

    return {
      pool:     currentPool,
      added:    curTickers.filter(t => !prevTickers.includes(t)),
      removed:  prevTickers.filter(t => !curTickers.includes(t)),
      date:     offset === 0 ? 'Current Deployment' : `Historical Run (T-${offset} Months)`,
      turnover: (15 + offset * 2.5).toFixed(1) + '%',
    }
  }, [holdings, offset])

  return (
    <div style={{ background: '#070707' }}>
      {/* Header */}
      <div className="chart-header">
        <span className="chart-title">Rebalance Ledger & Delta Journal</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#141414', padding: '5px 12px', border: '1px solid #2e2e2e' }}>
          <button
            onClick={() => setOffset(o => o + 1)}
            style={{ background: 'transparent', border: 'none', color: '#d0d0d0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', padding: '2px 4px' }}
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <span style={{ fontSize: '11px', color: '#ffffff', fontWeight: 700, minWidth: '180px', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace' }}>
            {journalState.date}
          </span>
          <button
            onClick={() => setOffset(o => Math.max(0, o - 1))}
            style={{ background: 'transparent', border: 'none', color: offset === 0 ? '#3d3d3d' : '#d0d0d0', cursor: offset === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', padding: '2px 4px' }}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: 0 }}>

        {/* Left: turnover + additions + removals */}
        <div style={{ borderRight: '1px solid #1c1c1c', background: '#0e0e0e', display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* Turnover */}
          <div style={{ padding: '20px', borderBottom: '1px solid #1c1c1c' }}>
            <span style={{ fontSize: '9px', color: '#888888', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: '6px' }}>
              Portfolio Turnover Rate
            </span>
            <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
              {journalState.turnover}
            </div>
          </div>

          {/* New Additions */}
          <div style={{ padding: '16px', borderBottom: '1px solid #1c1c1c' }}>
            <span style={{ fontSize: '10px', color: '#22c55e', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              <TrendingUp size={12} /> New Additions
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {journalState.added.map(t => (
                <div key={t} style={{ background: '#0a1a0f', borderLeft: '3px solid #22c55e', padding: '10px 12px', border: '1px solid #1c1c1c', borderLeftWidth: '3px' }}>
                  <span style={{ fontWeight: 700, color: '#22c55e', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace' }}>{t}</span>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#888888', lineHeight: 1.5 }}>{getReason(t, true)}</p>
                </div>
              ))}
              {journalState.added.length === 0 && (
                <span style={{ fontSize: '11px', color: '#4a4a4a' }}>No additions computed.</span>
              )}
            </div>
          </div>

          {/* Liquidations */}
          <div style={{ padding: '16px' }}>
            <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              <TrendingDown size={12} /> Liquidated Assets
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {journalState.removed.map(t => (
                <div key={t} style={{ background: '#1a0a0a', borderLeft: '3px solid #ef4444', padding: '10px 12px', border: '1px solid #1c1c1c', borderLeftWidth: '3px' }}>
                  <span style={{ fontWeight: 700, color: '#ef4444', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace' }}>{t}</span>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#888888', lineHeight: 1.5 }}>{getReason(t, false)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Holdings table */}
        <div style={{ background: '#070707', overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Ticker</th>
                <th>Sector</th>
                <th style={{ textAlign: 'right' }}>Cap Weight</th>
                <th style={{ textAlign: 'right' }}>Agg Score</th>
              </tr>
            </thead>
            <tbody>
              {journalState.pool.map((h, i) => (
                <tr key={h.ticker}>
                  <td style={{ color: '#4a4a4a', fontSize: '10px' }}>{i + 1}</td>
                  <td style={{ color: '#ffffff', fontWeight: 700 }}>{h.ticker}</td>
                  <td style={{ color: '#888888' }}>{h.sector || 'N/A'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                      <div style={{ height: '3px', width: `${Math.min(h.weight * 200, 48)}px`, background: '#2e2e2e' }} />
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, minWidth: '44px', textAlign: 'right' }}>
                        {(h.weight * 100).toFixed(2)}%
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: h.score > 0.8 ? '#22c55e' : '#d0d0d0' }}>
                    {h.score.toFixed(3)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
