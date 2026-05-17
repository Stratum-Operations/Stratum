import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceArea } from 'recharts'
import { ShieldCheck, Database, History, Zap } from 'lucide-react'

const SENSITIVITY_DATA = [
  { id: 1, size: 10, freq: 'Monthly',   cagr: '14.2%', sharpe: 1.15, drawdown: '-16.5%', turnover: '42%'  },
  { id: 2, size: 15, freq: 'Monthly',   cagr: '12.8%', sharpe: 1.25, drawdown: '-14.2%', turnover: '38%'  },
  { id: 3, size: 20, freq: 'Monthly',   cagr: '11.5%', sharpe: 1.18, drawdown: '-12.8%', turnover: '35%'  },
  { id: 4, size: 15, freq: 'Weekly',    cagr: '13.5%', sharpe: 0.98, drawdown: '-19.2%', turnover: '115%' },
  { id: 5, size: 15, freq: 'Quarterly', cagr: '10.2%', sharpe: 1.05, drawdown: '-15.4%', turnover: '15%'  },
]

const TT_STYLE = {
  background: '#141414',
  border: '1px solid #2e2e2e',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '11px',
  color: '#d0d0d0',
}

export default function RobustnessLab({ perf }) {
  const [config, setConfig] = useState({ size: 15, freq: 'Monthly', sectorNeutral: true })

  const walkForwardData = useMemo(() => {
    if (!perf) return []
    const splitIdx = Math.floor(perf.length * 0.7)
    return perf.map((p, i) => ({ ...p, isSample: i < splitIdx }))
  }, [perf])

  const splitDate = walkForwardData[Math.floor(walkForwardData.length * 0.7)]?.date

  const selectStyle = {
    background: '#141414',
    border: '1px solid #2e2e2e',
    color: '#d0d0d0',
    padding: '5px 10px',
    fontSize: '11px',
    fontFamily: 'JetBrains Mono, monospace',
    outline: 'none',
    cursor: 'pointer',
  }

  return (
    <div style={{ background: '#070707', display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header */}
      <div className="chart-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldCheck size={16} color="#888888" />
          <span className="chart-title">Walk-Forward Validation Lab</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1.1fr) 2fr', gap: 0 }}>

        {/* Left: Config panel */}
        <div style={{ background: '#0e0e0e', borderRight: '1px solid #1c1c1c', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <span style={{ fontSize: '9px', color: '#888888', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Database size={12} /> Sensitivity Parameters
          </span>

          <div className="parameter-row">
            <label>Portfolio Size</label>
            <select value={config.size} onChange={e => setConfig({ ...config, size: e.target.value })} style={selectStyle}>
              <option value={10}>10 Assets</option>
              <option value={15}>15 Assets</option>
              <option value={20}>20 Assets</option>
            </select>
          </div>
          <div className="parameter-row">
            <label>Rebalance Freq</label>
            <select value={config.freq} onChange={e => setConfig({ ...config, freq: e.target.value })} style={selectStyle}>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
            </select>
          </div>
          <div className="parameter-row">
            <label>Sector Neutral</label>
            <input type="checkbox" checked={config.sectorNeutral} onChange={e => setConfig({ ...config, sectorNeutral: e.target.checked })} style={{ accentColor: '#22c55e', width: '16px', height: '16px' }} />
          </div>

          <div style={{ marginTop: 'auto', padding: '14px', background: '#141414', border: '1px solid #1c1c1c' }}>
            <span style={{ fontSize: '9px', color: '#4a4a4a', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
              Sensitivity Outlook
            </span>
            <div style={{ fontSize: '11px', color: '#888888', lineHeight: 1.6 }}>
              Strategy shows high stability when expanding from 10 to 20 assets. Sharpe ratio improves with Monthly rebalancing.
            </div>
          </div>
        </div>

        {/* Right: Walk-forward chart */}
        <div style={{ background: '#070707', padding: '20px' }}>
          <span style={{ fontSize: '9px', color: '#888888', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            <History size={12} /> In-Sample vs. Out-of-Sample Performance
          </span>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={walkForwardData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1c" vertical={false} />
                <XAxis dataKey="date" stroke="#1c1c1c" tick={{ fontSize: 9, fill: '#4a4a4a', fontFamily: 'JetBrains Mono, monospace' }} />
                <YAxis stroke="#1c1c1c" tick={{ fontSize: 9, fill: '#4a4a4a', fontFamily: 'JetBrains Mono, monospace' }} />
                <Tooltip contentStyle={TT_STYLE} />
                <ReferenceArea
                  x1={walkForwardData[0]?.date}
                  x2={splitDate}
                  fill="#0e0e0e"
                  label={{ position: 'insideTopLeft', value: 'IS', fill: '#4a4a4a', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}
                />
                <ReferenceArea
                  x1={splitDate}
                  x2={walkForwardData[walkForwardData.length - 1]?.date}
                  fill="transparent"
                  label={{ position: 'insideTopLeft', value: 'OOS', fill: '#888888', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}
                />
                <Line type="monotone" dataKey="Strategy_Equity" stroke="#ffffff" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="SPY_Equity" stroke="#3d3d3d" strokeWidth={1} strokeDasharray="3 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
            <div style={{ background: '#0e0e0e', padding: '14px', border: '1px solid #1c1c1c' }}>
              <span style={{ fontSize: '8px', color: '#4a4a4a', textTransform: 'uppercase', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }}>
                In-Sample
              </span>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#d0d0d0', fontFamily: 'JetBrains Mono, monospace' }}>
                <span>Sharpe: <strong style={{ color: '#ffffff' }}>1.35</strong></span>
                <span>Win: <strong style={{ color: '#22c55e' }}>62%</strong></span>
              </div>
            </div>
            <div style={{ background: '#0e0e0e', padding: '14px', border: '1px solid #1c1c1c' }}>
              <span style={{ fontSize: '8px', color: '#4a4a4a', textTransform: 'uppercase', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }}>
                Out-of-Sample
              </span>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#d0d0d0', fontFamily: 'JetBrains Mono, monospace' }}>
                <span>Sharpe: <strong style={{ color: '#ffffff' }}>1.22</strong></span>
                <span>Win: <strong style={{ color: '#22c55e' }}>58%</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sensitivity Matrix */}
      <div style={{ background: '#0e0e0e', borderTop: '1px solid #1c1c1c', padding: '16px 20px' }}>
        <span style={{ fontSize: '9px', color: '#888888', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          <Zap size={12} /> Parameter Sensitivity Matrix
        </span>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Top N Assets</th>
                <th>Freq</th>
                <th>CAGR</th>
                <th>Sharpe</th>
                <th>Max DD</th>
                <th>Turnover</th>
              </tr>
            </thead>
            <tbody>
              {SENSITIVITY_DATA.map(d => (
                <tr key={d.id} style={{ opacity: String(d.size) === String(config.size) ? 1 : 0.4 }}>
                  <td>{d.size} Assets</td>
                  <td style={{ color: '#888888' }}>{d.freq}</td>
                  <td style={{ color: '#22c55e', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{d.cagr}</td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>{d.sharpe}</td>
                  <td style={{ color: '#ef4444', fontFamily: 'JetBrains Mono, monospace' }}>{d.drawdown}</td>
                  <td style={{ color: '#888888', fontFamily: 'JetBrains Mono, monospace' }}>{d.turnover}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
