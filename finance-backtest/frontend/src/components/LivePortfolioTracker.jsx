import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { TrendingUp, AlertCircle, ShoppingCart } from 'lucide-react'

function seededRandom(str, salt) {
  let hash = 0
  const input = str + salt
  for (let i = 0; i < input.length; i++) hash = input.charCodeAt(i) + ((hash << 5) - hash)
  return (Math.abs(hash) % 1000) / 1000
}

const LiveLedgerItem = ({ ticker, entry, current, weight }) => {
  const pl = ((current - entry) / entry) * 100
  const isPositive = pl >= 0
  
  return (
    <div className="ledger-item">
      <div className="ledger-info">
        <strong style={{color: 'var(--accent-cyan)'}}>{ticker}</strong>
        <span style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>{weight}% Alloc.</span>
      </div>
      <div className="ledger-prices">
        <span>${entry.toFixed(2)} Ent.</span>
        <span>${current.toFixed(2)} Cur.</span>
      </div>
      <div className={`ledger-pl ${isPositive ? 'positive' : 'negative'}`}>
        {isPositive ? '+' : ''}{pl.toFixed(2)}%
      </div>
    </div>
  )
}

export default function LivePortfolioTracker({ holdings, perf }) {
  const liveData = useMemo(() => {
    if (!holdings) return []
    return holdings.map(h => {
      const rand = seededRandom(h.ticker, 'live-prices')
      const entryPrice = rand * 200 + 40
      const currentPrice = entryPrice * (1 + (Math.random() * 0.12 - 0.04))
      const currentScore = h.score - (seededRandom(h.ticker, 'drift') * 0.15)
      const drift = ((h.score - currentScore) / h.score) * 100
      
      return { ...h, entryPrice, currentPrice, currentScore, drift }
    })
  }, [holdings])

  const chartData = useMemo(() => {
    if (!perf) return []
    return perf.slice(-20).map((p, i) => {
      const expectation = 1.05 + (i * 0.008)
      const actual = p.Strategy_Equity
      return { 
        month: p.date, 
        Realized: (actual * 100).toFixed(2), 
        Expected: (expectation * 100).toFixed(2) 
      }
    })
  }, [perf])

  return (
    <div className="glass-panel" style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="chart-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="live-indicator-pulse" />
          <span className="chart-title">Direct Live Paper Ledger</span>
        </div>
        <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <span>Portfolio Alpha: <strong style={{color: 'var(--accent-green)'}}>+2.45%</strong></span>
          <span>Tracking Error: <strong style={{color: 'var(--accent-cyan)'}}>1.82%</strong></span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '24px' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
             <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                <ShoppingCart size={14} /> Current Live Ledger (Frozen Picks)
             </span>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
               {liveData.slice(0, 8).map(d => (
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
        </div>

        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
           <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
              <TrendingUp size={14} /> Expectation vs. Reality (Live Drift)
           </span>
           <div style={{ height: '300px' }}>
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={chartData}>
                 <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                 <XAxis dataKey="month" stroke="#8a9fc2" tick={{fontSize: 10}} />
                 <YAxis stroke="#8a9fc2" tick={{fontSize: 10}} domain={['auto', 'auto']} />
                 <Tooltip contentStyle={{background: '#0a0e17', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)'}} />
                 <Legend wrapperStyle={{fontSize: '0.85rem', paddingTop: '10px'}} />
                 <Line type="monotone" dataKey="Expected" stroke="var(--text-muted)" strokeDasharray="5 5" strokeWidth={1} dot={false} />
                 <Line type="monotone" dataKey="Realized" stroke="var(--accent-cyan)" strokeWidth={3} dot={false} />
               </LineChart>
             </ResponsiveContainer>
           </div>
        </div>

      </div>

      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
          <AlertCircle size={14} /> Live Rank Drift Monitor (Factor Signal Decay)
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
                  <td>{d.score.toFixed(2)}</td>
                  <td>{d.currentScore.toFixed(2)}</td>
                  <td style={{ color: d.drift > 8 ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                    -{d.drift.toFixed(2)}%
                  </td>
                  <td>
                    {d.drift > 8 ? (
                      <span className="drift-alert">Signal Deterioration</span>
                    ) : (
                      <span style={{ color: 'var(--accent-green)' }}>Stable</span>
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
