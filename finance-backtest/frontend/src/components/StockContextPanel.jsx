import { useMemo } from 'react'
import { Calendar, Newspaper, TrendingUp, AlertTriangle, ExternalLink } from 'lucide-react'

function seededRand(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return (Math.abs(hash) % 1000) / 1000
}

export default function StockContextPanel({ ticker }) {
  const data = useMemo(() => {
    if (!ticker) return null
    const rand = seededRand(ticker)
    
    const earningsDays = Math.floor(rand * 90)
    const isUpcoming = earningsDays <= 7
    
    return {
      earningsDate: `May ${15 + Math.floor(rand * 10)}, 2026`,
      earningsIn: earningsDays,
      isUpcoming,
      dividend: (rand * 2.5 + 0.5).toFixed(2) + "%",
      exDiv: `Apr ${10 + Math.floor(rand * 5)}, 2026`,
      hi52: (450 * (1 + rand * 0.2)).toFixed(2),
      lo52: (450 * (1 - rand * 0.4)).toFixed(2),
      news: [
        { id: 1, title: `${ticker} to Accelerate AI Cloud Infrastructure Spend`, type: 'Headline' },
        { id: 2, title: `Goldman Sachs Reiterates Buy Rating on ${ticker}`, type: 'Analyst' },
        { id: 3, title: `${ticker} Announces $10B Share Repurchase Program`, type: 'Headline' }
      ]
    }
  }, [ticker])

  if (!data) return null

  return (
    <div className="stock-context-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {data.isUpcoming && (
        <div style={{ background: 'rgba(255, 171, 0, 0.1)', border: '1px solid rgba(255, 171, 0, 0.2)', padding: '12px', borderRadius: 'var(--radius-sm)', display: 'flex', gap: '10px' }}>
           <AlertTriangle size={16} color="#ffab00" style={{marginTop: '2px'}} />
           <div>
              <span style={{ color: '#ffab00', fontWeight: 700, fontSize: '0.8rem' }}>MACRO EVENT ALERT</span>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', opacity: 0.8 }}>Earnings call in <strong>{data.earningsIn} days</strong>. Binary volatility event detected.</p>
           </div>
        </div>
      )}

      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
         <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
           <Calendar size={14} /> Corporate Events
         </span>
         <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
               <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Next Earnings</span>
               <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{data.earningsDate}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
               <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Dividend Yield</span>
               <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--accent-green)' }}>{data.dividend}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
               <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Ex-Div Date</span>
               <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{data.exDiv}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
               <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>52W Range</span>
               <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>${data.lo52} - ${data.hi52}</span>
            </div>
         </div>
      </div>

      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
         <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
           <Newspaper size={14} /> Intelligence Feed
         </span>
         <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            {data.news.map(n => (
              <div key={n.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.65rem', color: n.type === 'Analyst' ? 'var(--accent-purple)' : 'var(--accent-cyan)', textTransform: 'uppercase', fontWeight: 800 }}>{n.type}</span>
                    <ExternalLink size={10} color="var(--text-muted)" />
                 </div>
                 <p style={{ margin: 0, fontSize: '0.8rem', color: '#fff', lineHeight: 1.4 }}>{n.title}</p>
              </div>
            ))}
         </div>
      </div>

    </div>
  )
}
