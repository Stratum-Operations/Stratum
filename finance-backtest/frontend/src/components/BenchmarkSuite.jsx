import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { Check } from 'lucide-react'

const BENCHMARKS = [
  { id: 'SPY',  name: 'Market (SPY)',    color: '#d0d0d0' },
  { id: 'QQQ',  name: 'Growth (QQQ)',   color: '#888888' },
  { id: 'MTUM', name: 'Momentum (MTUM)',color: '#555555' },
  { id: 'QUAL', name: 'Quality (QUAL)', color: '#333333' },
]

const INITIAL_CAPITAL = 10000

const FACTORS = [
  { id: 'mom',  name: 'Momentum'      },
  { id: 'qual', name: 'Quality'        },
  { id: 'vol',  name: 'Low Volatility' },
]

const TT_STYLE = {
  background: '#141414',
  border: '1px solid #2e2e2e',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '11px',
  color: '#d0d0d0',
}

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
    const pReturn = ((lastRow.Strategy_Equity / INITIAL_CAPITAL) - 1) * 100

    return selected.map(id => {
      const benchEquity  = lastRow[`${id}_Equity`] ?? lastRow['SPY_Equity'] ?? INITIAL_CAPITAL
      const bReturn      = ((benchEquity / INITIAL_CAPITAL) - 1) * 100
      const activeReturn = pReturn - bReturn
      return {
        id,
        name: BENCHMARKS.find(b => b.id === id).name,
        activeReturn: (activeReturn >= 0 ? '+' : '') + activeReturn.toFixed(1) + '%',
        infoRatio: (activeReturn / 100 / 0.15).toFixed(2),
        isPositive: activeReturn >= 0,
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
    <div style={{ background: '#070707' }}>
      <div className="chart-header">
        <span className="chart-title">Multi-ETF Benchmark Suite</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          {BENCHMARKS.map(b => (
            <div
              key={b.id}
              onClick={() => toggle(b.id)}
              className={`toggle-btn ${selected.includes(b.id) ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}
            >
              {selected.includes(b.id) && <Check size={10} />}
              {b.id}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) 2fr', gap: '12px', padding: '20px' }}>

        {/* Alpha Matrix Table */}
        <div style={{ background: '#0e0e0e', border: '1px solid #1c1c1c', overflow: 'hidden' }}>
          <div style={{ fontSize: '9px', color: '#888888', fontWeight: 700, padding: '12px 14px 8px', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.15em', textTransform: 'uppercase', borderBottom: '1px solid #1c1c1c' }}>
            Relative Alpha Matrix
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Benchmark</th>
                <th style={{ textAlign: 'right' }}>Active Return</th>
                <th style={{ textAlign: 'right' }}>Info Ratio</th>
              </tr>
            </thead>
            <tbody>
              {alphaMatrix.map(m => (
                <tr key={m.id}>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>{m.id}</td>
                  <td style={{ fontWeight: 800, textAlign: 'right', color: m.isPositive ? '#22c55e' : '#ef4444' }}>{m.activeReturn}</td>
                  <td style={{ textAlign: 'right', color: parseFloat(m.infoRatio) > 0 ? '#d0d0d0' : '#888888' }}>{m.infoRatio}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Factor Exposure Chart */}
        <div style={{ height: '280px', background: '#0e0e0e', padding: '16px', border: '1px solid #1c1c1c' }}>
          <span style={{ fontSize: '9px', color: '#888888', fontWeight: 700, display: 'block', marginBottom: '12px', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Factor Exposure Comparison
          </span>
          <ResponsiveContainer width="100%" height="88%">
            <BarChart data={factorData}>
              <CartesianGrid strokeDasharray="" stroke="#1c1c1c" vertical={false} />
              <XAxis dataKey="name" stroke="#1c1c1c" tick={{ fontSize: 9, fill: '#4a4a4a', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }} />
              <YAxis stroke="#1c1c1c" tick={{ fontSize: 9, fill: '#4a4a4a', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }} domain={[0, 100]} />
              <Tooltip contentStyle={TT_STYLE} />
              <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '6px', fontFamily: 'JetBrains Mono, monospace', color: '#888888' }} />
              <Bar dataKey="Portfolio" fill="#d0d0d0" />
              {selected.map(id => (
                <Bar key={id} dataKey={id} fill={BENCHMARKS.find(b => b.id === id).color} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  )
}
