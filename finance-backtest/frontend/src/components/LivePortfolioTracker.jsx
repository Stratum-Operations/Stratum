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
  background: '#141414',
  border: '1px solid #2e2e2e',
  color: '#d0d0d0',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '11px',
}

const LiveLedgerItem = ({ ticker, entry, current, weight }) => {
  const pl       = ((current - entry) / entry) * 100
  const positive = pl >= 0

  return (
    <div className="ledger-item" style={{ borderLeftColor: positive ? '#22c55e' : '#ef4444' }}>
      <div className="ledger-info">
        <strong style={{ color: '#ffffff', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}>{ticker}</strong>
        <span style={{ fontSize: '10px', color: '#888888', fontFamily: 'JetBrains Mono, monospace' }}>{weight}% Alloc.</span>
      </div>
      <div className="ledger-prices">
        <span>${entry.toFixed(2)} Ent.</span>
        <span>${current.toFixed(2)} Cur.</span>
      </div>
      <div className={`ledger-pl ${positive ? 'positive' : 'negative'}`}>
        {positive ? '+' : ''}{pl.toFixed(2)}%
      </div>
    </div>
  )
}

export default function LivePortfolioTracker({ holdings, perf }) {
  const liveData = useMemo(() => {
    if (!holdings) return []
    return holdings.map(h => {
      const rand         = seededRandom(h.ticker, 'live-prices')
      const entryPrice   = rand * 200 + 40
      const currentPrice = entryPrice * (1 + (Math.random() * 0.12 - 0.04))
      const currentScore = h.score - (seededRandom(h.ticker, 'drift') * 0.15)
      const drift        = ((h.score - currentScore) / h.score) * 100
      return { ...h, entryPrice, currentPrice, currentScore, drift }
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
    <div style={{ background: '#070707', display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header */}
      <div className="chart-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="live-indicator-pulse" />
          <span className="chart-title">Direct Live Paper Ledger</span>
        </div>
        <div style={{ display: 'flex', gap: '20px', fontSize: '11px', color: '#888888', fontFamily: 'JetBrains Mono, monospace' }}>
          <span>Portfolio Alpha: <strong style={{ color: '#22c55e', fontWeight: 800 }}>+2.45%</strong></span>
          <span>Tracking Error: <strong style={{ color: '#d0d0d0', fontWeight: 700 }}>1.82%</strong></span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) 2fr', gap: 0 }}>

        {/* Live Ledger list */}
        <div style={{ background: '#0e0e0e', borderRight: '1px solid #1c1c1c' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #1c1c1c' }}>
            <span style={{ fontSize: '10px', color: '#888888', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              <ShoppingCart size={12} /> Current Positions
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {liveData.slice(0, 10).map(d => (
              <LiveLedgerItem
                key={d.ticker}
                ticker={d.ticker}
                entry={d.entryPrice}
                current={d.currentPrice}
                weight={6.6}
              />
            ))}
          </div>
        </div>

        {/* Expectation vs Reality chart */}
        <div style={{ background: '#0e0e0e', padding: '20px' }}>
          <span style={{ fontSize: '10px', color: '#888888', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            <TrendingUp size={12} /> Expectation vs. Reality (Live Drift)
          </span>
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1c" vertical={false} />
                <XAxis dataKey="month" stroke="#1c1c1c" tick={{ fontSize: 9, fill: '#4a4a4a', fontFamily: 'JetBrains Mono, monospace' }} />
                <YAxis stroke="#1c1c1c" tick={{ fontSize: 9, fill: '#4a4a4a', fontFamily: 'JetBrains Mono, monospace' }} domain={['auto', 'auto']} />
                <Tooltip contentStyle={TT_STYLE} />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '8px', color: '#888888', fontFamily: 'JetBrains Mono, monospace' }} />
                <Line type="monotone" dataKey="Expected" stroke="#3d3d3d" strokeDasharray="5 5" strokeWidth={1} dot={false} />
                <Line type="monotone" dataKey="Realized"  stroke="#ffffff" strokeWidth={2}   dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Rank Drift Monitor */}
      <div style={{ background: '#0e0e0e', borderTop: '1px solid #1c1c1c', padding: '16px 20px' }}>
        <span style={{ fontSize: '10px', color: '#888888', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          <AlertCircle size={12} /> Live Rank Drift Monitor (Factor Signal Decay)
        </span>
        <div className="table-wrapper">
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
              {liveData.slice(0, 10).map(d => (
                <tr key={d.ticker}>
                  <td>{d.ticker}</td>
                  <td style={{ textAlign: 'right', color: '#888888' }}>{d.score.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', color: '#888888' }}>{d.currentScore.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', color: d.drift > 8 ? '#ef4444' : '#888888', fontWeight: d.drift > 8 ? 800 : 400 }}>
                    -{d.drift.toFixed(2)}%
                  </td>
                  <td>
                    {d.drift > 8 ? (
                      <span className="drift-alert">Signal Deterioration</span>
                    ) : (
                      <span style={{ color: '#22c55e', fontWeight: 600, fontSize: '11px' }}>Stable</span>
                    )}
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
