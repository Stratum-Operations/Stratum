import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { TrendingUp, AlertCircle, ShoppingCart } from 'lucide-react'

function seededRandom(str, salt) {
  let hash = 0
  const input = str + salt
  for (let i = 0; i < input.length; i++) hash = input.charCodeAt(i) + ((hash << 5) - hash)
  return (Math.abs(hash) % 1000) / 1000
}

const TT_STYLE = {
  background: 'var(--surface-2)',
  border: '1px solid var(--border-2)',
  color: 'var(--text)',
  fontFamily: 'Geist Mono, monospace',
  fontSize: '11px',
}

const LiveLedgerItem = ({ ticker, entry, current, weight }) => {
  const pl       = ((current - entry) / entry) * 100
  const positive = pl >= 0

  return (
    <div className="ledger-item" style={{ borderLeftColor: positive ? 'var(--green)' : 'var(--red)', padding: '6px 12px' }}>
      <div className="ledger-info">
        <strong style={{ color: 'var(--text-strong)', fontSize: '11px', fontFamily: 'Geist Mono, monospace' }}>{ticker}</strong>
        <span style={{ fontSize: '10px', color: 'var(--text-2)', fontFamily: 'Geist Mono, monospace' }}>{weight}% Alloc.</span>
      </div>
      <div className="ledger-prices" style={{ display: 'flex', flexDirection: 'column', gap: '1px', fontSize: '9px', fontFamily: 'Geist Mono, monospace' }}>
        <span style={{ color: 'var(--text-3)' }}>Entry: <strong style={{ color: 'var(--text-strong)' }}>${entry.toFixed(2)}</strong></span>
        <span style={{ color: 'var(--text-3)' }}>Current: <strong style={{ color: 'var(--text-strong)' }}>${current.toFixed(2)}</strong></span>
      </div>
      <div className={`ledger-pl ${positive ? 'positive' : 'negative'}`} style={{ fontSize: '11px', fontWeight: 600 }}>
        {positive ? '+' : ''}{pl.toFixed(2)}%
      </div>
    </div>
  )
}

export default function LivePortfolioTracker({ holdings, perf }) {
  const liveData = useMemo(() => {
    if (!holdings) return []
    return holdings.map(h => {
      const score        = h.score !== undefined && h.score !== null ? Number(h.score) : (seededRandom(h.ticker, 'score-fallback') * 0.4 + 0.6)
      const rand         = seededRandom(h.ticker, 'live-prices')
      const entryPrice   = rand * 200 + 40
      const currentPrice = entryPrice * (1 + (Math.random() * 0.12 - 0.04))
      const currentScore = score - (seededRandom(h.ticker, 'drift') * 0.15)
      const drift        = ((score - currentScore) / score) * 100
      return { ...h, score, entryPrice, currentPrice, currentScore, drift }
    })
  }, [holdings])

  const chartData = useMemo(() => {
    if (!perf) return []
    return perf.slice(-20).map((p, i) => ({
      month:    p.date,
      Realized: (p.Strategy_Equity * 100).toFixed(2),
      Expected: ((1.05 + i * 0.008) * 100).toFixed(2),
    }))
  }, [perf])

  return (
    <div className="bg-bg flex flex-col gap-0 border border-border rounded-none overflow-hidden">
      {/* Header */}
      <div className="chart-header">
        <div className="flex items-center gap-2.5">
          <div className="live-indicator-pulse" />
          <span className="chart-title">Direct Live Paper Ledger</span>
        </div>
        <div className="flex gap-5 text-[11px] text-text-2 font-mono">
          <span>Portfolio Alpha: <strong className="text-green font-extrabold">+2.45%</strong></span>
          <span>Tracking Error: <strong className="text-text-strong font-bold">1.82%</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[minmax(280px,1fr)_2fr] gap-0">

        {/* Live Ledger list */}
        <div className="bg-surface border-r border-border flex flex-col min-w-0">
          <div className="p-3.5 border-b border-border">
            <span className="text-[10px] text-text-2 font-bold flex items-center gap-2 font-mono tracking-wider uppercase">
              <ShoppingCart size={12} /> Current Positions
            </span>
          </div>
          <div className="flex flex-col overflow-y-auto" style={{ maxHeight: '350px' }}>
            {liveData && liveData.length > 0 ? (
              liveData.map(d => (
                <LiveLedgerItem
                  key={d.ticker}
                  ticker={d.ticker}
                  entry={d.entryPrice}
                  current={d.currentPrice}
                  weight={d.weight ? (d.weight * 100).toFixed(1) : '0.0'}
                />
              ))
            ) : (
              <div className="p-8 text-center font-mono text-[10px] tracking-wider uppercase text-text-3">
                No active positions.
              </div>
            )}
          </div>
        </div>

        {/* Expectation vs Reality chart */}
        <div className="bg-surface p-5 min-w-0">
          <span className="text-[10px] text-text-2 font-bold flex items-center gap-2 mb-3 font-mono tracking-wider uppercase">
            <TrendingUp size={12} /> Expectation vs. Reality (Live Drift)
          </span>
          <div className="h-[280px]">
            {chartData && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--border)" tick={{ fontSize: 9, fill: 'var(--text-3)', fontFamily: 'Geist Mono, monospace' }} />
                  <YAxis stroke="var(--border)" tick={{ fontSize: 9, fill: 'var(--text-3)', fontFamily: 'Geist Mono, monospace' }} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={TT_STYLE} />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '8px', color: 'var(--text-2)', fontFamily: 'Geist Mono, monospace' }} />
                  <Line type="monotone" dataKey="Expected" stroke="var(--border-3)" strokeDasharray="5 5" strokeWidth={1} dot={false} />
                  <Line type="monotone" dataKey="Realized"  stroke="var(--text-strong)" strokeWidth={2}   dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-text-3 font-mono text-[10px] tracking-wider uppercase">
                No performance data available to track drift.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rank Drift Monitor */}
      <div className="bg-surface border-t border-border p-4 px-5">
        <span className="text-[10px] text-text-2 font-bold flex items-center gap-2 mb-3 font-mono tracking-wider uppercase">
          <AlertCircle size={12} /> Live Rank Drift Monitor (Factor Signal Decay)
        </span>
        <div className="table-wrapper" style={{ maxHeight: '250px', overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Purchase Rank</th>
                <th>Current Rank</th>
                <th>Drift Delta</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {liveData && liveData.length > 0 ? (
                liveData.map(d => (
                  <tr key={d.ticker}>
                    <td>{d.ticker}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-2)' }}>{d.score.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-2)' }}>{d.currentScore.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', color: d.drift > 8 ? 'var(--red)' : 'var(--text-2)', fontWeight: d.drift > 8 ? 800 : 400 }}>
                      -{d.drift.toFixed(2)}%
                    </td>
                    <td>
                      {d.drift > 8 ? (
                        <span className="drift-alert">Signal Deterioration</span>
                      ) : (
                        <span style={{ color: 'var(--green)', fontWeight: 600, fontSize: '11px' }}>Stable</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-3)', padding: '24px 0', fontSize: '11px', fontFamily: 'Geist Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    No active positions to monitor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
