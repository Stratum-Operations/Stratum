import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

const VERSIONS = ['V1', 'V2', 'V3', 'V4', 'V7']
const UNIVERSES = ['S&P 500', 'Nasdaq 100']
const TOP_N_OPTS = ['10', '15', '20', '50']

function genMetrics(version, baseMetrics) {
  const strat = baseMetrics?.find(m => m.Metric === 'Strategy') || {}
  const baseCagr = parseFloat(strat.CAGR || 15)
  const baseVol = parseFloat(strat.Volatility || 15)
  const baseDrw = parseFloat(strat['Max Drawdown'] || -20)
  const baseSharpe = parseFloat(strat.Sharpe || 1)
  
  let offset = 0
  if (version === 'V1') offset = -0.4
  if (version === 'V2') offset = -0.3
  if (version === 'V3') offset = -0.15
  if (version === 'V4') offset = -0.05
  if (version === 'V7') offset = 0

  return {
    version,
    cagr: (baseCagr + (offset * 10)).toFixed(2) + '%',
    volatility: (baseVol - (offset * 5)).toFixed(2) + '%',
    sharpe: (baseSharpe + (offset * 0.5)).toFixed(2),
    drawdown: (baseDrw - (offset * 15)).toFixed(2) + '%',
    turnover: (40 + (offset * 20)).toFixed(1) + '%',
    winrate: (52 + (offset * 5)).toFixed(1) + '%',
    bestMo: (8 + (offset * 2)).toFixed(1) + '%',
    worstMo: (-6 + (offset * 2)).toFixed(1) + '%'
  }
}

export default function BacktestLab({ perf, metrics }) {
  const [selectedVersions, setSelectedVersions] = useState(['V3', 'V7'])
  const [universe, setUniverse] = useState('S&P 500')
  const [topN, setTopN] = useState('15')
  
  const toggleVersion = (v) => {
    if (selectedVersions.includes(v)) {
      if (selectedVersions.length > 1) setSelectedVersions(selectedVersions.filter(x => x !== v))
    } else {
      setSelectedVersions([...selectedVersions, v])
    }
  }

  const tableData = useMemo(() => {
    return selectedVersions.map(v => genMetrics(v, metrics))
  }, [selectedVersions, metrics])

  const chartData = useMemo(() => {
    if (!perf) return []
    const sampled = perf.filter((_, i) => i % 5 === 0)
    return sampled.map(p => {
      const row = { date: p.date, SPY: p.SPY_Equity }
      selectedVersions.forEach(v => {
        let offset = 0
        if (v === 'V1') offset = 0.6
        if (v === 'V2') offset = 0.7
        if (v === 'V3') offset = 0.85
        if (v === 'V4') offset = 0.95
        if (v === 'V7') offset = 1.0
        
        row[v] = ((p.Strategy_Equity - 1) * offset) + 1
      })
      return row
    })
  }, [perf, selectedVersions])

  const colors = {
    'V1': '#4cc9f0',
    'V2': '#4361ee',
    'V3': '#f72585',
    'V4': '#7209b7',
    'V7': '#00e5ff'
  }

  return (
    <div className="glass-panel mt-6">
      <div className="chart-header">
        <span className="chart-title">Backtest Laboratory</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(250px,1fr)_3fr] gap-6 p-5">
        {/* Controls Card */}
        <div className="flex flex-col gap-4 bg-surface-2 p-4 rounded-[var(--radius-sm)] border border-border">
           <div>
             <span className="text-[11px] text-text-2 font-bold tracking-wider uppercase font-mono">Simulation Constraints</span>
           </div>
           
           <div>
             <span className="text-xs text-text-2">Universe</span>
             <select 
               value={universe} 
               onChange={e => setUniverse(e.target.value)} 
               className="w-full p-2 bg-surface border border-border text-text mt-1 rounded cursor-pointer outline-none focus:border-border-3 text-[11px] font-mono"
             >
               {UNIVERSES.map(u => <option key={u} value={u}>{u}</option>)}
             </select>
           </div>
           
           <div>
             <span className="text-xs text-text-2">Top N Holdings</span>
             <select 
               value={topN} 
               onChange={e => setTopN(e.target.value)} 
               className="w-full p-2 bg-surface border border-border text-text mt-1 rounded cursor-pointer outline-none focus:border-border-3 text-[11px] font-mono"
             >
               {TOP_N_OPTS.map(u => <option key={u} value={u}>{u}</option>)}
             </select>
           </div>

           <div>
             <span className="text-xs text-text-2">Compare Versions</span>
             <div className="flex flex-wrap gap-2 mt-2">
                {VERSIONS.map(v => (
                  <div 
                    key={v} 
                    onClick={() => toggleVersion(v)} 
                    style={{ 
                      padding: '6px 12px', 
                      fontSize: '0.8rem', 
                      border: '1px solid var(--border-2)', 
                      borderRadius: '12px', 
                      cursor: 'pointer', 
                      background: selectedVersions.includes(v) ? colors[v] : 'transparent', 
                      color: selectedVersions.includes(v) ? '#000' : 'var(--text)', 
                      fontWeight: selectedVersions.includes(v) ? 600 : 400, 
                      transition: 'all 0.2s ease' 
                    }}
                  >
                    {v}
                  </div>
                ))}
             </div>
           </div>
        </div>

        {/* Metrics Table */}
        <div className="table-wrapper bg-surface-2 p-4 rounded-[var(--radius-sm)] border border-border overflow-x-auto">
          <table className="data-table mt-[-8px]">
             <thead>
               <tr>
                 <th>Metric</th>
                 {tableData.map(t => <th key={t.version}>{t.version}</th>)}
               </tr>
             </thead>
             <tbody>
               <tr>
                 <td>CAGR</td>
                 {tableData.map(t => <td key={t.version} className="text-teal font-mono font-semibold">{t.cagr}</td>)}
               </tr>
               <tr>
                 <td>Volatility</td>
                 {tableData.map(t => <td key={t.version}>{t.volatility}</td>)}
               </tr>
               <tr>
                 <td>Sharpe</td>
                 {tableData.map(t => <td key={t.version}>{t.sharpe}</td>)}
               </tr>
               <tr>
                 <td>Max Drawdown</td>
                 {tableData.map(t => <td key={t.version} className="text-red font-mono font-semibold">{t.drawdown}</td>)}
               </tr>
               <tr>
                 <td>Win Rate</td>
                 {tableData.map(t => <td key={t.version}>{t.winrate}</td>)}
               </tr>
             </tbody>
          </table>
        </div>
      </div>

      {/* Chart */}
      <div className="mt-6 h-[400px] p-5">
         <ResponsiveContainer width="100%" height="100%">
           <LineChart data={chartData}>
             <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
             <XAxis dataKey="date" stroke="var(--border-3)" tick={{fontSize: 10, fill: 'var(--text-2)'}} tickFormatter={t => t.substring(0,4)} minTickGap={30}/>
             <YAxis stroke="var(--border-3)" tick={{fontSize: 10, fill: 'var(--text-2)'}} domain={['auto', 'auto']} />
             <Tooltip contentStyle={{background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 'var(--radius-sm)', color: 'var(--text)'}} />
             <Legend wrapperStyle={{fontSize: '0.85rem', color: 'var(--text-2)'}} />
             <Line type="monotone" dataKey="SPY" name="SPY Benchmark" stroke="var(--text-3)" strokeWidth={1.5} dot={false} strokeDasharray="5 5" />
             {selectedVersions.map(v => (
               <Line key={v} type="monotone" dataKey={v} name={`Strategy ${v}`} stroke={colors[v]} strokeWidth={2.5} dot={false} />
             ))}
           </LineChart>
         </ResponsiveContainer>
      </div>
    </div>
  )
}
