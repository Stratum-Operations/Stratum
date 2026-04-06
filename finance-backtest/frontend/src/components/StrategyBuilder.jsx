import { useState } from 'react'
import axios from 'axios'
import { FlaskConical, Save, Play, Database, Scaling, Clock } from 'lucide-react'

export default function StrategyBuilder() {
  const [config, setConfig] = useState({
    universe: 'SP500',
    topN: 15,
    rebalanceFreq: 'Monthly',
    weights: { momentum: 40, quality: 30, lowvol: 30 },
    sectorNeutral: true,
    costs: 0.20,
    benchmark: 'SPY'
  })
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)

  const runSimulation = async () => {
    setLoading(true)
    try {
      const res = await axios.post('http://127.0.0.1:8000/api/backtest', config)
      setResults(res.data)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const savePreset = () => {
    const name = prompt('Enter a name for this strategy preset:')
    if (name) {
      const presets = JSON.parse(localStorage.getItem('strategy_presets') || '{}')
      presets[name] = config
      localStorage.setItem('strategy_presets', JSON.stringify(presets))
      alert('Strategy Preset Saved Efficiently!')
    }
  }

  return (
    <div className="glass-panel" style={{ marginTop: '24px' }}>
      <div className="chart-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FlaskConical size={20} color="var(--accent-cyan)" />
          <span className="chart-title">Strategy Research Builder</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="toggle-btn" onClick={savePreset}><Save size={14} /> Save Preset</button>
          <button className="toggle-btn active" onClick={runSimulation} disabled={loading}>
            <Play size={14} /> {loading ? 'Simulating...' : 'Run Analysis'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginTop: '24px' }}>
        
        <div className="config-card" style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: 'var(--radius-sm)' }}>
          <span className="metric-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Database size={14} /> Universe & Scope
          </span>
          <div className="parameter-row">
             <label>Target Universe</label>
             <select value={config.universe} onChange={e => setConfig({...config, universe: e.target.value})}>
                <option value="SP500">S&P 500 Index</option>
                <option value="NASDAQ100">Nasdaq 100 Index</option>
                <option value="RUSSELL1000">Russell 1000</option>
             </select>
          </div>
          <div className="parameter-row">
             <label>Concentration (Top N)</label>
             <input type="number" value={config.topN} onChange={e => setConfig({...config, topN: e.target.value})} />
          </div>
        </div>

        <div className="config-card" style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: 'var(--radius-sm)' }}>
          <span className="metric-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Scaling size={14} /> Factor Weighting
          </span>
          {Object.keys(config.weights).map(f => (
            <div key={f} className="parameter-row">
              <label style={{ textTransform: 'capitalize' }}>{f} Allocation</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input type="range" min="0" max="100" value={config.weights[f]} onChange={e => setConfig({
                  ...config, 
                  weights: {...config.weights, [f]: parseInt(e.target.value)}
                })} />
                <span style={{ minWidth: '35px', fontSize: '0.8rem' }}>{config.weights[f]}%</span>
              </div>
            </div>
          ))}
        </div>

        <div className="config-card" style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: 'var(--radius-sm)' }}>
          <span className="metric-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Clock size={14} /> Frictions & Frequency
          </span>
          <div className="parameter-row">
             <label>Rebalance Freq</label>
             <select value={config.rebalanceFreq} onChange={e => setConfig({...config, rebalanceFreq: e.target.value})}>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
             </select>
          </div>
          <div className="parameter-row">
             <label>Sector Neutral</label>
             <input type="checkbox" checked={config.sectorNeutral} onChange={e => setConfig({...config, sectorNeutral: e.target.checked})} />
          </div>
        </div>

      </div>

      {results && (
        <div className="results-panel" style={{ marginTop: '32px', padding: '24px', background: 'rgba(0, 229, 255, 0.03)', border: '1px solid rgba(0, 229, 255, 0.1)', borderRadius: 'var(--radius-sm)' }}>
           <span className="metric-title" style={{ color: 'var(--accent-cyan)' }}>Simulated Backtest Outcomes</span>
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginTop: '16px' }}>
              <div className="res-item">
                 <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Projected CAGR</label>
                 <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-green)' }}>{results.cagr}</div>
              </div>
              <div className="res-item">
                 <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Simulated Sharpe</label>
                 <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{results.sharpe}</div>
              </div>
              <div className="res-item">
                 <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Max Drawdown</label>
                 <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-red)' }}>{results.max_drawdown}</div>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}
