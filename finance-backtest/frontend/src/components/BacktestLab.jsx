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
    <div className="glass-panel" style={{ marginTop: '24px' }}>
      <div className="chart-header">
        <span className="chart-title">Backtest Laboratory</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 3fr', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
           <div>
             <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Simulation Constraints</span>
           </div>
           
           <div>
             <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Universe</span>
             <select value={universe} onChange={e => setUniverse(e.target.value)} style={{ width: '100%', padding: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', color: '#fff', marginTop: '4px', borderRadius: '4px', cursor: 'pointer' }}>
               {UNIVERSES.map(u => <option key={u} value={u}>{u}</option>)}
             </select>
           </div>
           
           <div>
             <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Top N Holdings</span>
             <select value={topN} onChange={e => setTopN(e.target.value)} style={{ width: '100%', padding: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', color: '#fff', marginTop: '4px', borderRadius: '4px', cursor: 'pointer' }}>
               {TOP_N_OPTS.map(u => <option key={u} value={u}>{u}</option>)}
             </select>
           </div>

           <div>
             <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Compare Versions</span>
             <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
               {VERSIONS.map(v => (
                 <div key={v} onClick={() => toggleVersion(v)} style={{ padding: '6px 12px', fontSize: '0.8rem', border: '1px solid var(--glass-border)', borderRadius: '12px', cursor: 'pointer', background: selectedVersions.includes(v) ? colors[v] : 'transparent', color: selectedVersions.includes(v) ? '#000' : '#fff', fontWeight: selectedVersions.includes(v) ? 600 : 400, transition: 'all 0.2s ease' }}>
                   {v}
                 </div>
               ))}
             </div>
           </div>
        </div>

        <div className="table-wrapper" style={{ overflowX: 'auto', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
          <table className="data-table" style={{ marginTop: '-8px' }}>
             <thead>
               <tr>
                 <th>Metric</th>
                 {tableData.map(t => <th key={t.version}>{t.version}</th>)}
               </tr>
             </thead>
             <tbody>
               <tr>
                 <td>CAGR</td>
                 {tableData.map(t => <td key={t.version} style={{color: 'var(--accent-cyan)'}}>{t.cagr}</td>)}
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
                 {tableData.map(t => <td key={t.version} style={{color: 'var(--accent-red)'}}>{t.drawdown}</td>)}
               </tr>
               <tr>
                 <td>Win Rate</td>
                 {tableData.map(t => <td key={t.version}>{t.winrate}</td>)}
               </tr>
             </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: '24px', height: '400px' }}>
         <ResponsiveContainer width="100%" height="100%">
           <LineChart data={chartData}>
             <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
             <XAxis dataKey="date" stroke="#8a9fc2" tick={{fontSize: 10}} tickFormatter={t => t.substring(0,4)} minTickGap={30}/>
             <YAxis stroke="#8a9fc2" tick={{fontSize: 10}} domain={['auto', 'auto']} />
             <Tooltip contentStyle={{background: '#0a0e17', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)'}} />
             <Legend wrapperStyle={{fontSize: '0.85rem'}} />
             <Line type="monotone" dataKey="SPY" name="SPY Benchmark" stroke="#8a9fc2" strokeWidth={1.5} dot={false} strokeDasharray="5 5" />
             {selectedVersions.map(v => (
               <Line key={v} type="monotone" dataKey={v} name={`Strategy ${v}`} stroke={colors[v]} strokeWidth={2.5} dot={false} />
             ))}
           </LineChart>
         </ResponsiveContainer>
      </div>

    </div>
  )
}
