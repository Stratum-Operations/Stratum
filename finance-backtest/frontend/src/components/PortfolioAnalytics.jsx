import { useState, useMemo } from 'react'
import { LineChart, Line, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, Radar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

const BENCHMARKS = ['SPY', 'QQQ', 'MTUM']
const SECTORS = ['Technology', 'Financials', 'Healthcare', 'Consumer', 'Energy', 'Industrials']

function seededRand(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return (Math.abs(hash) % 1000) / 1000
}

export default function PortfolioAnalytics({ perf, holdings }) {
  const [benchmark, setBenchmark] = useState('SPY')

  const analytics = useMemo(() => {
    let offset = 0
    if (benchmark === 'QQQ') offset = 0.15
    if (benchmark === 'MTUM') offset = 0.25

    const activeReturn = (4.2 + offset * 5).toFixed(2)
    const rollingAlpha = (2.1 + offset * 3).toFixed(2)
    const maxDrawdownGap = (3.5 + offset * 2).toFixed(2)

    const factors = [
      { name: 'Momentum', Portfolio: 85, Benchmark: 60 + offset * 20 },
      { name: 'Quality', Portfolio: 78, Benchmark: 70 - offset * 10 },
      { name: 'Low Volatility', Portfolio: 65, Benchmark: 55 + offset * 5 }
    ]

    const exposures = SECTORS.map(s => {
      const port = (seededRand(s) * 30).toFixed(1)
      const bench = (seededRand(s + benchmark) * 25).toFixed(1)
      return { name: s, Portfolio: parseFloat(port), Benchmark: parseFloat(bench) }
    })

    const contributors = [
      { ticker: 'NVDA', impact: '+1.2%' },
      { ticker: 'META', impact: '+0.8%' },
      { ticker: 'LLY', impact: '+0.5%' }
    ]
    const detractors = [
      { ticker: 'TSLA', impact: '-0.6%' },
      { ticker: 'AAPL', impact: '-0.3%' },
      { ticker: 'PG', impact: '-0.2%' }
    ]

    const rollingLine = []
    let aLine = 0
    let dLine = 0
    for(let i=0; i<20; i++) {
        aLine += (Math.random() * 2 - 0.8) + offset
        dLine += (Math.random() * 2 - 1.2) - offset
        rollingLine.push({ month: `T-${20-i}`, Alpha: aLine, DrawdownGap: dLine })
    }

    return { activeReturn, rollingAlpha, maxDrawdownGap, factors, exposures, contributors, detractors, rollingLine }
  }, [benchmark])

  return (
    <div className="glass-panel" style={{ marginTop: '24px' }}>
      <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="chart-title">Portfolio Analytics Engine</span>
        <select value={benchmark} onChange={e => setBenchmark(e.target.value)} style={{ padding: '6px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}>
          {BENCHMARKS.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
         <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
             <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Active Return (vs {benchmark})</span>
             <h2 style={{ color: 'var(--accent-green)', marginTop: '4px' }}>+{analytics.activeReturn}%</h2>
         </div>
         <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
             <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Rolling Alpha</span>
             <h2 style={{ color: 'var(--accent-cyan)', marginTop: '4px' }}>{analytics.rollingAlpha}%</h2>
         </div>
         <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
             <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Drawdown Delta</span>
             <h2 style={{ color: 'var(--accent-purple)', marginTop: '4px' }}>{analytics.maxDrawdownGap}% Better</h2>
         </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
         
         <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ height: '280px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Rolling Alpha & Drawdown Gap</span>
              <ResponsiveContainer width="100%" height="90%">
                <LineChart data={analytics.rollingLine}>
                   <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                   <XAxis dataKey="month" stroke="#8a9fc2" tick={{fontSize: 10}} />
                   <YAxis stroke="#8a9fc2" tick={{fontSize: 10}} />
                   <Tooltip contentStyle={{background: '#0a0e17', border: '1px solid var(--glass-border)'}} />
                   <Legend wrapperStyle={{fontSize: '0.8rem'}} />
                   <Line type="monotone" dataKey="Alpha" stroke="var(--accent-cyan)" strokeWidth={2} dot={false}/>
                   <Line type="monotone" dataKey="DrawdownGap" stroke="var(--accent-red)" strokeWidth={2} dot={false}/>
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div style={{ height: '280px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sector Exposure Gap</span>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={analytics.exposures}>
                   <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                   <XAxis dataKey="name" stroke="#8a9fc2" tick={{fontSize: 10}} />
                   <YAxis stroke="#8a9fc2" tick={{fontSize: 10}} />
                   <Tooltip contentStyle={{background: '#0a0e17', border: '1px solid var(--glass-border)'}} />
                   <Legend wrapperStyle={{fontSize: '0.8rem'}} />
                   <Bar dataKey="Portfolio" fill="var(--accent-purple)" />
                   <Bar dataKey="Benchmark" fill="#8a9fc2" />
                </BarChart>
              </ResponsiveContainer>
            </div>
         </div>

         <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ height: '280px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', textAlign: 'center' }}>Aggregated Factor Baseline</span>
              <ResponsiveContainer width="100%" height="90%">
                <RadarChart outerRadius="70%" data={analytics.factors}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="name" tick={{fill: '#8a9fc2', fontSize: 10}} />
                  <Radar name="Portfolio" dataKey="Portfolio" stroke="var(--accent-green)" fill="var(--accent-green)" fillOpacity={0.4} />
                  <Radar name={benchmark} dataKey="Benchmark" stroke="#8a9fc2" fill="#8a9fc2" fillOpacity={0.2} />
                  <Tooltip contentStyle={{background: '#0a0e17', border: '1px solid var(--glass-border)'}} />
                  <Legend wrapperStyle={{fontSize: '0.8rem'}} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
               <div style={{ flex: 1, background: 'rgba(0,255,136,0.05)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(0,255,136,0.1)' }}>
                 <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Top Contributors</span>
                 <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                   {analytics.contributors.map(c => (
                     <div key={c.ticker} style={{ display: 'flex', justifyContent: 'space-between' }}>
                       <strong style={{ color: '#fff', fontSize: '0.9rem' }}>{c.ticker}</strong>
                       <span style={{ color: 'var(--accent-green)', fontSize: '0.9rem' }}>{c.impact}</span>
                     </div>
                   ))}
                 </div>
               </div>
               <div style={{ flex: 1, background: 'rgba(255,51,102,0.05)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,51,102,0.1)' }}>
                 <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Top Detractors</span>
                 <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                   {analytics.detractors.map(c => (
                     <div key={c.ticker} style={{ display: 'flex', justifyContent: 'space-between' }}>
                       <strong style={{ color: '#fff', fontSize: '0.9rem' }}>{c.ticker}</strong>
                       <span style={{ color: 'var(--accent-red)', fontSize: '0.9rem' }}>{c.impact}</span>
                     </div>
                   ))}
                 </div>
               </div>
            </div>
         </div>

      </div>
    </div>
  )
}
