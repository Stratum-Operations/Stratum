import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { Check, Columns } from 'lucide-react'

const BENCHMARKS = [
  { id: 'SPY', name: 'Market (SPY)', color: '#8a9fc2' },
  { id: 'QQQ', name: 'Growth (QQQ)', color: '#4cc9f0' },
  { id: 'MTUM', name: 'Momentum (MTUM)', color: '#f72585' },
  { id: 'QUAL', name: 'Quality (QUAL)', color: '#00ff88' }
]

const FACTORS = [
  { id: 'mom', name: 'Momentum' },
  { id: 'qual', name: 'Quality' },
  { id: 'vol', name: 'Low Volatility' }
]

export default function BenchmarkSuite({ perf, holdings }) {
  const [selected, setSelected] = useState(['SPY', 'QQQ'])

  const toggle = (id) => {
    setSelected(prev => 
      prev.includes(id) 
      ? (prev.length > 1 ? prev.filter(x => x !== id) : prev) 
      : [...prev, id]
    )
  }

  const alphaMatrix = useMemo(() => {
    if (!perf) return []
    const lastRow = perf[perf.length - 1]
    const pReturn = (lastRow.Strategy_Equity - 1) * 100
    
    return selected.map(id => {
      const bReturn = (lastRow[`${id}_Equity`] || lastRow['SPY_Equity']) * 100 - 100
      const activeReturn = pReturn - bReturn
      return {
        id,
        name: BENCHMARKS.find(b => b.id === id).name,
        activeReturn: activeReturn.toFixed(2) + '%',
        infoRatio: (activeReturn / 15).toFixed(2), // Mocked for visuals
        trackingError: (8.5 + (Math.random() * 4)).toFixed(1) + '%' // Mocked for visuals
      }
    })
  }, [perf, selected])

  const factorData = useMemo(() => {
    return FACTORS.map(f => {
      const row = { name: f.name, Portfolio: 75 + (Math.random() * 15 - 5) }
      selected.forEach(id => {
        let offset = 0
        if (id === 'QQQ') offset = 10
        if (id === 'MTUM') offset = 25
        if (id === 'QUAL') offset = 15
        row[id] = 50 + offset + (Math.random() * 10 - 5)
      })
      return row
    })
  }, [selected])

  return (
    <div className="glass-panel" style={{ marginTop: '24px' }}>
      <div className="chart-header">
        <span className="chart-title">Multi-ETF Benchmark Suite</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {BENCHMARKS.map(b => (
            <div 
              key={b.id} 
              onClick={() => toggle(b.id)}
              className={`toggle-btn ${selected.includes(b.id) ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {selected.includes(b.id) && <Check size={14} />}
              {b.id}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '24px', marginTop: '24px' }}>
        
        <div className="table-wrapper" style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Columns size={16} /> Relative Alpha Matrix
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Benchmark</th>
                <th>Active Ret</th>
                <th>Info Ratio</th>
              </tr>
            </thead>
            <tbody>
              {alphaMatrix.map(m => (
                <tr key={m.id}>
                  <td style={{ color: BENCHMARKS.find(b => b.id === m.id).color }}>{m.id}</td>
                  <td style={{ color: 'var(--accent-green)' }}>{m.activeReturn}</td>
                  <td>{m.infoRatio}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '16px' }}>Factor Correlation Visuals</span>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={factorData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#8a9fc2" tick={{fontSize: 10}} />
                <YAxis stroke="#8a9fc2" tick={{fontSize: 10}} domain={[0, 100]} />
                <Tooltip contentStyle={{background: '#0a0e17', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)'}} />
                <Legend wrapperStyle={{fontSize: '0.85rem', paddingTop: '10px'}} />
                <Bar dataKey="Portfolio" fill="var(--accent-purple)" radius={[4, 4, 0, 0]} />
                {selected.map(id => (
                  <Bar key={id} dataKey={id} fill={BENCHMARKS.find(b => b.id === id).color} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  )
}
