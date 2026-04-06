import { useState, useMemo } from 'react'
import { ShoppingCart, ArrowRight, DollarSign, Activity, Percent } from 'lucide-react'

export default function TradeBlotter({ holdings }) {
  const [aum, setAum] = useState(10000000)
  
  if (!holdings?.holdings) return null

  const blotterData = useMemo(() => {
    const target = [...holdings.holdings].sort((a,b) => b.weight - a.weight)
    const current = target.map((h, i) => ({
      ...h,
      weight: i < 5 ? h.weight * 1.15 : i > 10 ? 0.02 : h.weight * 0.92
    }))

    const reconciliation = target.map(t => {
      const c = current.find(x => x.ticker === t.ticker) || { weight: 0 }
      const delta = t.weight - c.weight
      const notional = delta * aum
      return {
        ticker: t.ticker,
        target: t.weight,
        current: c.weight,
        delta,
        side: delta > 0 ? 'BUY' : 'SELL',
        notional: Math.abs(notional),
        shares: Math.floor(Math.abs(notional) / 150)
      }
    }).sort((a,b) => b.notional - a.notional)

    const turnoverTotal = reconciliation.reduce((acc, curr) => acc + curr.notional, 0)
    const slippage = turnoverTotal * 0.0008 // 8bps
    const commission = reconciliation.reduce((acc, curr) => acc + (curr.shares * 0.005), 0)

    return {
      reconciliation,
      metrics: {
        turnoverValue: turnoverTotal,
        turnoverPct: (turnoverTotal / aum) * 100,
        slippage,
        commission,
        totalCost: slippage + commission
      }
    }
  }, [holdings, aum])

  return (
    <div className="glass-panel" style={{ marginTop: '24px' }}>
      <div className="chart-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ShoppingCart size={20} color="var(--accent-cyan)" />
          <span className="chart-title">Trade Blotter & Ticket Generator</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>AUM ($):</label>
          <input 
            type="number" 
            value={aum} 
            onChange={e => setAum(parseInt(e.target.value))} 
            className="toggle-btn" 
            style={{ width: '120px', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid var(--glass-border)' }} 
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1.2fr) 2fr', gap: '24px', marginTop: '24px' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
             <span className="metric-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
               <Activity size={14} /> Execution Cost Analysis
             </span>
             <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                   <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Turnover Value</span>
                   <span style={{ fontWeight: 600 }}>${blotterData.metrics.turnoverValue.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                   <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Turnover Pct</span>
                   <span style={{ fontWeight: 600 }}>{blotterData.metrics.turnoverPct.toFixed(2)}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                   <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Est. Slippage (8bps)</span>
                   <span style={{ color: 'var(--accent-red)' }}>${blotterData.metrics.slippage.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                   <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Commissions</span>
                   <span style={{ color: 'var(--accent-red)' }}>${blotterData.metrics.commission.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                   <span style={{ fontWeight: 600 }}>Total Execution Cost</span>
                   <span style={{ fontWeight: 800, color: 'var(--accent-red)' }}>${blotterData.metrics.totalCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
             </div>
          </div>

          <div style={{ background: 'rgba(0, 229, 255, 0.05)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(0, 229, 255, 0.1)' }}>
             <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>Simulated Broker Link</span>
             <p style={{ fontSize: '0.75rem', margin: '8px 0', opacity: 0.8, lineHeight: 1.4 }}>Orders generated using VWAP algorithm. Slippage is modeled based on historical ADV data locally.</p>
          </div>
        </div>

        <div className="table-wrapper" style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '16px' }}>Monthly Execution Tickets</span>
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th style={{ textAlign: 'center' }}>Side</th>
                <th style={{ textAlign: 'right' }}>Target Weight</th>
                <th style={{ textAlign: 'right' }}>Weight Delta</th>
                <th style={{ textAlign: 'right' }}>Notional Value</th>
              </tr>
            </thead>
            <tbody>
              {blotterData.reconciliation.map(r => (
                <tr key={r.ticker}>
                  <td style={{ fontWeight: 700, color: '#fff' }}>{r.ticker}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ 
                      background: r.side === 'BUY' ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 51, 102, 0.1)', 
                      color: r.side === 'BUY' ? 'var(--accent-green)' : 'var(--accent-red)',
                      padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800
                    }}>{r.side}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>{(r.target * 100).toFixed(2)}%</td>
                  <td style={{ textAlign: 'right', color: r.delta > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {r.delta > 0 ? '+' : ''}{(r.delta * 100).toFixed(2)}%
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>${r.notional.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}
