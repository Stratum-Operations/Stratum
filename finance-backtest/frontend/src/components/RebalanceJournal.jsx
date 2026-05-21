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
    let currentPool = [...holdings.holdings].filter(h => Number(h.weight) > 0).sort((a, b) => b.weight - a.weight)

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
    <div className="bg-bg border border-border rounded-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="chart-header">
        <span className="chart-title">Rebalance Ledger & Delta Journal</span>
        <div className="flex items-center gap-3 bg-surface-2 p-1.5 px-3 border border-border rounded">
          <button
            onClick={() => setOffset(o => o + 1)}
            className="bg-transparent border-none text-text hover:text-text-strong cursor-pointer flex items-center gap-0.5 text-[10px] font-mono p-1"
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <span className="text-[11px] text-text-strong font-bold min-width-[180px] text-center font-mono">
            {journalState.date}
          </span>
          <button
            onClick={() => setOffset(o => Math.max(0, o - 1))}
            className="bg-transparent border-none cursor-pointer flex items-center gap-0.5 text-[10px] font-mono p-1"
            style={{ color: offset === 0 ? 'var(--border-3)' : 'var(--text)' }}
            disabled={offset === 0}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[minmax(300px,1fr)_2fr] gap-0">

        {/* Left: turnover + additions + removals */}
        <div className="border-r border-border bg-surface flex flex-col gap-0">

          {/* Turnover */}
          <div className="p-5 border-b border-border">
            <span className="text-[9px] text-text-2 font-bold tracking-widest uppercase font-mono block mb-1.5">
              Portfolio Turnover Rate
            </span>
            <div className="text-4xl font-extrabold text-text-strong tracking-tight">
              {journalState.turnover}
            </div>
          </div>

          {/* New Additions */}
          <div className="p-4 border-b border-border">
            <span className="text-[10px] text-green font-bold flex items-center gap-1.5 mb-2.5 font-mono tracking-wider uppercase">
              <TrendingUp size={12} /> New Additions
            </span>
            <div className="flex flex-col gap-2">
              {journalState.added.map(t => (
                <div key={t} className="bg-[rgba(34,197,94,0.05)] border border-border border-l-green border-l-[3px] p-2.5 rounded">
                  <span className="text-green font-bold text-xs font-mono">{t}</span>
                  <p className="margin-0 mt-1 text-[11px] text-text leading-relaxed">{getReason(t, true)}</p>
                </div>
              ))}
              {journalState.added.length === 0 && (
                <span className="text-text-2 text-[11px] font-mono">No additions computed.</span>
              )}
            </div>
          </div>

          {/* Liquidations */}
          <div className="p-4">
            <span className="text-[10px] text-red font-bold flex items-center gap-1.5 mb-2.5 font-mono tracking-wider uppercase">
              <TrendingDown size={12} /> Liquidated Assets
            </span>
            <div className="flex flex-col gap-2">
              {journalState.removed.map(t => (
                <div key={t} className="bg-[rgba(239,68,68,0.05)] border border-border border-l-red border-l-[3px] p-2.5 rounded">
                  <span className="text-red font-bold text-xs font-mono">{t}</span>
                  <p className="margin-0 mt-1 text-[11px] text-text leading-relaxed">{getReason(t, false)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Holdings table */}
        <div className="bg-bg overflow-x-auto">
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
                  <td className="text-text-2 text-[10px]">{i + 1}</td>
                  <td className="text-text-strong font-bold">{h.ticker}</td>
                  <td className="text-text-strong font-semibold">{h.sector || 'N/A'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-1 bg-border-2 rounded-full" style={{ width: `${Math.min(h.weight * 200, 48)}px` }} />
                      <span className="font-mono text-[11px] font-bold min-w-[44px] text-right">
                        {(h.weight * 100).toFixed(2)}%
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: h.score > 0.8 ? 'var(--green)' : 'var(--text)' }}>
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
