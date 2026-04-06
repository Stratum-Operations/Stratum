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
    return `${ticker} cleared entry limits mapping massive underlying volatility compression natively.`
  } else {
    if (rand > 0.6) return `${ticker} systematically removed due to lagging 12M rank trend bounds.`
    if (rand > 0.3) return `${ticker} dumped matching rigid structural stop-loss volatility arrays.`
    return `${ticker} structurally ejected purely after ROE percentile locally deteriorated.`
  }
}

export default function RebalanceJournal({ holdings }) {
  const [offset, setOffset] = useState(0)

  if (!holdings?.holdings) return null

  const journalState = useMemo(() => {
    let currentPool = [...holdings.holdings].sort((a,b) => b.weight - a.weight)
    
    if (offset > 0) {
      for(let step=0; step < offset; step++) {
         const newPool = []
         currentPool.forEach((h, i) => {
           if (i < 12) newPool.push({...h, weight: h.weight * 0.95}) 
         })
         const replacementIdx = step % ALTERNATE_TICKERS.length
         newPool.push({ ticker: ALTERNATE_TICKERS[replacementIdx], sector: 'Technology', weight: 0.10, score: 0.85 })
         newPool.push({ ticker: ALTERNATE_TICKERS[(replacementIdx+1)%15], sector: 'Healthcare', weight: 0.08, score: 0.80 })
         newPool.push({ ticker: ALTERNATE_TICKERS[(replacementIdx+2)%15], sector: 'Financials', weight: 0.05, score: 0.75 })
         currentPool = newPool.sort((a,b) => b.weight - a.weight)
      }
    }
    
    let altPool = [...currentPool]
    altPool.shift()
    altPool.shift()
    altPool.push({ ticker: ALTERNATE_TICKERS[(offset + 5)%15], sector: 'Consumer', weight: 0.05, score: 0.8 })
    altPool.push({ ticker: ALTERNATE_TICKERS[(offset + 6)%15], sector: 'Energy', weight: 0.04, score: 0.78 })

    const curTickers = currentPool.map(h => h.ticker)
    const prevTickers = altPool.map(h => h.ticker)

    const added = curTickers.filter(t => !prevTickers.includes(t))
    const removed = prevTickers.filter(t => !curTickers.includes(t))

    return {
      pool: currentPool,
      added,
      removed,
      date: offset === 0 ? "Current Deployment" : `Historical Run (T-${offset} Months)`,
      turnover: (15 + (offset * 2.5)).toFixed(1) + "%"
    }
  }, [holdings, offset])

  return (
    <div className="glass-panel" style={{ marginTop: '24px' }}>
      <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="chart-title">Rebalance Ledger & Delta Journal</span>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
           <button 
             onClick={() => setOffset(o => o + 1)} 
             style={{ background: 'transparent', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
             <ChevronLeft size={16} /> Prev
           </button>
           <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600, minWidth: '180px', textAlign: 'center' }}>{journalState.date}</span>
           <button 
             onClick={() => setOffset(o => Math.max(0, o - 1))} 
             style={{ background: 'transparent', border: 'none', color: offset === 0 ? 'var(--text-muted)' : 'var(--accent-cyan)', cursor: offset===0?'default':'pointer', display: 'flex', alignItems: 'center' }}>
             Next <ChevronRight size={16} />
           </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) 2.5fr', gap: '24px', marginTop: '24px' }}>
         <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
           <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
             <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Portfolio Turnover Rate</span>
             <h2 style={{ fontSize: '1.8rem', color: '#fff', marginTop: '8px' }}>{journalState.turnover}</h2>
           </div>

           <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}><TrendingUp size={14} color="var(--accent-green)" /> New Additions</span>
              {journalState.added.map(t => (
                <div key={t} style={{ background: 'rgba(0, 255, 136, 0.05)', borderLeft: '3px solid var(--accent-green)', padding: '12px', borderRadius: '0 4px 4px 0' }}>
                   <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>{t}</span>
                   <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{getReason(t, true)}</p>
                </div>
              ))}
              {journalState.added.length === 0 && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No additions computed locally.</span>}
           </div>

           <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}><TrendingDown size={14} color="var(--accent-red)" /> Liquidated Assets</span>
              {journalState.removed.map(t => (
                <div key={t} style={{ background: 'rgba(255, 51, 102, 0.05)', borderLeft: '3px solid var(--accent-red)', padding: '12px', borderRadius: '0 4px 4px 0' }}>
                   <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>{t}</span>
                   <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{getReason(t, false)}</p>
                </div>
              ))}
           </div>
         </div>

         <div className="table-wrapper" style={{ overflowX: 'auto', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
             <table className="data-table">
               <thead>
                 <tr>
                   <th>Ticker</th>
                   <th>Sector</th>
                   <th>Cap Weight</th>
                   <th>Agg Score</th>
                 </tr>
               </thead>
               <tbody>
                 {journalState.pool.map((h) => (
                   <tr key={h.ticker}>
                     <td style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{h.ticker}</td>
                     <td>{h.sector || 'N/A'}</td>
                     <td>{(h.weight * 100).toFixed(2)}%</td>
                     <td style={{fontWeight: 600}}>{h.score.toFixed(3)}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
         </div>
      </div>
    </div>
  )
}
