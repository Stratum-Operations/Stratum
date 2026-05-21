import { useMemo } from 'react'
import { LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip, YAxis, XAxis, CartesianGrid } from 'recharts'
import { CheckCircle, AlertTriangle } from 'lucide-react'
import FundamentalMetrics from './FundamentalMetrics'
import StockContextPanel from './StockContextPanel'

function seededRandom(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return (Math.abs(hash) % 1000) / 1000
}

export default function StockDetail({ holding }) {
  if (!holding) {
    return (
      <div className="glass-panel" style={{ height: '200px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', marginTop: '24px' }}>
        Select a holding actively from the Live Screener to display granular structural footprints inherently cleanly structurally.
      </div>
    )
  }

  const mockData = useMemo(() => {
    const rand = seededRandom(holding.ticker)
    const scoreVal = holding.score !== undefined && holding.score !== null ? Number(holding.score) : (seededRandom(holding.ticker) * 0.4 + 0.6)
    
    const history = []
    let currentScore = scoreVal * 100
    for(let i=12; i>=0; i--) {
       currentScore = currentScore - (rand * 10 - 4)
       history.push({ 
         month: `M-${i}`, 
         score: Math.min(100, Math.max(0, currentScore)) 
       })
    }

    const prices = []
    let p = rand * 300 + 50
    for(let i=0; i<30; i++) {
        p = p * (1 + (Math.random() * 0.04 - 0.02))
        prices.push({ day: i, price: p })
    }

    const wasHeld = rand > 0.4
    const marketCap = (rand * 1500 + 10).toFixed(1) + "B"
    const pE = (rand * 40 + 10).toFixed(1)

    return { history, wasHeld, marketCap, pE, prices }
  }, [holding])

  const radarData = [
    { subject: '6M Mom', A: holding.r6 * 100 , fullMark: 100 },
    { subject: '12M Mom', A: holding.r12 * 100 , fullMark: 100 },
    { subject: 'Low Vol', A: holding.rv * 100 , fullMark: 100 },
    { subject: 'Quality', A: holding.rq * 100 , fullMark: 100 }
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(600px, 2.5fr) minmax(300px, 1fr)', gap: '24px', alignItems: 'start' }}>
      
      <div className="glass-panel" style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '16px' }}>
          <div>
             <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
              {holding.ticker} 
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: '4px' }}>{holding.sector}</span>
              {mockData.wasHeld ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', background: 'rgba(0,255,136,0.1)', color: 'var(--accent-green)', padding: '4px 8px', borderRadius: '0px' }}>
                  <CheckCircle size={12}/> Retained (Prior Rebalance)
                </span>
              ) : (
               <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', background: 'rgba(255,51,102,0.1)', color: 'var(--accent-red)', padding: '4px 8px', borderRadius: '0px' }}>
                 <AlertTriangle size={12}/> New Addition
               </span>
              )}
             </div>
             <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
               <span>Mkt Cap: <strong style={{color: '#fff'}}>${mockData.marketCap}</strong></span>
               <span>Valuation Snapshot: <strong style={{color: '#fff'}}>{mockData.pE} P/E</strong></span>
               <span>Percentile Scoring: <strong style={{color: 'var(--accent-cyan)'}}>{(holding.score !== undefined && holding.score !== null ? Number(holding.score) : (seededRandom(holding.ticker) * 0.4 + 0.6)).toFixed(2)}</strong></span>
             </div>
          </div>
          <div style={{ width: '180px', height: '60px' }}>
             <span style={{fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase'}}>30D Pricing Snapshot</span>
             <ResponsiveContainer width="100%" height="80%">
               <LineChart data={mockData.prices}>
                 <Line type="monotone" dataKey="price" stroke="var(--accent-green)" strokeWidth={1.5} dot={false} />
               </LineChart>
             </ResponsiveContainer>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1.2fr) 2fr', gap: '24px' }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '0px', padding: '16px', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Multi-Factor Footprint</span>
            <div style={{ flex: 1, minHeight: '220px' }}>
               <ResponsiveContainer>
                  <RadarChart outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.05)" />
                    <PolarAngleAxis dataKey="subject" tick={{fill: '#8a9fc2', fontSize: 10}} />
                    <Radar name={holding.ticker} dataKey="A" stroke="var(--accent-cyan)" fill="var(--accent-cyan)" fillOpacity={0.3} />
                    <Tooltip contentStyle={{background: 'var(--bg-dark)', borderColor: 'var(--glass-border)', fontSize: '0.8rem', borderRadius: '0px'}} />
                  </RadarChart>
               </ResponsiveContainer>
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '0px', padding: '16px', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '16px' }}>Composite Score Tracking (Trailing 12M)</span>
            <div style={{ flex: 1, minHeight: '220px' }}>
               <ResponsiveContainer>
                 <LineChart data={mockData.history}>
                   <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                   <XAxis dataKey="month" stroke="#8a9fc2" tick={{fontSize: 10}} />
                   <YAxis stroke="#8a9fc2" tick={{fontSize: 10}} domain={[0, 100]} />
                   <Tooltip contentStyle={{background: 'var(--bg-dark)', borderColor: 'var(--glass-border)', borderRadius: '0px'}} labelStyle={{color: '#8a9fc2'}} />
                   <Line type="monotone" dataKey="score" stroke="var(--accent-purple)" strokeWidth={2} dot={{fill: 'var(--accent-purple)', r: 3, strokeWidth: 0}} />
                 </LineChart>
               </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div style={{ padding: '0 8px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '16px' }}>Core Fundamental Metrics & Contextual Ranks</span>
          <FundamentalMetrics holding={holding} />
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        <StockContextPanel ticker={holding.ticker} />
      </div>

    </div>
  )
}
