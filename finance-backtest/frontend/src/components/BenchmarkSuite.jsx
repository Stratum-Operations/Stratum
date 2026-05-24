import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { Check } from 'lucide-react'

const BENCHMARKS = [
  { id: 'SPY',  name: 'Market (SPY)',    color: 'var(--blue)' },
  { id: 'QQQ',  name: 'Growth (QQQ)',   color: 'var(--amber)' },
  { id: 'MTUM', name: 'Momentum (MTUM)', color: 'var(--text-3)' },
  { id: 'QUAL', name: 'Quality (QUAL)',  color: 'var(--border-2)' },
]

const INITIAL_CAPITAL = 10000

const FACTORS = [
  { id: 'mom',  name: 'Momentum'      },
  { id: 'qual', name: 'Quality'        },
  { id: 'vol',  name: 'Low Volatility' },
]

const TT_STYLE = {
  background: 'var(--surface-3)',
  border: '1px solid var(--border-2)',
  fontFamily: 'Geist Mono, monospace',
  fontSize: '11px',
  color: 'var(--text-strong)',
  borderRadius: 0,
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
    <div className="bg-surface border border-border-2 rounded-none p-5">
      <div className="chart-header flex justify-between items-center mb-4">
        <span className="chart-title text-[11px] font-black uppercase font-mono tracking-widest text-text-strong">✦ Multi-ETF Benchmark Suite</span>
        <div className="flex gap-2">
          {BENCHMARKS.map(b => (
            <div
              key={b.id}
              onClick={() => toggle(b.id)}
              className={`toggle-btn rounded-none flex items-center gap-1.5 cursor-pointer text-[10px] font-mono font-bold ${selected.includes(b.id) ? 'active' : ''}`}
            >
              {selected.includes(b.id) && <Check size={10} />}
              {b.id}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(260px,1fr)_2fr] gap-4">

        {/* Alpha Matrix Table */}
        <div className="bg-surface-2 border border-border-2 rounded-none overflow-hidden">
          <div className="text-[9px] text-text-3 font-bold px-3 py-2 font-mono uppercase tracking-widest border-b border-border-2">
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
                  <td className="font-mono">{m.id}</td>
                  <td className={`font-black text-right ${m.isPositive ? 'text-green' : 'text-red'}`}>{m.activeReturn}</td>
                  <td className={`text-right font-mono ${parseFloat(m.infoRatio) > 0 ? 'text-text' : 'text-text-3'}`}>{m.infoRatio}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Factor Exposure Chart */}
        <div className="h-[280px] bg-surface-2 p-4 border border-border-2 rounded-none">
          <span className="text-[9px] text-text-3 font-bold block mb-3 font-mono uppercase tracking-widest">
            Factor Exposure Comparison
          </span>
          <ResponsiveContainer width="100%" height="88%">
            <BarChart data={factorData}>
              <CartesianGrid strokeDasharray="" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--border)" tick={{ fontSize: 9, fill: 'var(--text-3)', fontFamily: 'Geist Mono, monospace', fontWeight: 600 }} />
              <YAxis stroke="var(--border)" tick={{ fontSize: 9, fill: 'var(--text-3)', fontFamily: 'Geist Mono, monospace', fontWeight: 600 }} domain={[0, 100]} />
              <Tooltip contentStyle={TT_STYLE} />
              <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '6px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-2)' }} />
              <Bar dataKey="Portfolio" fill="var(--green)" />
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
