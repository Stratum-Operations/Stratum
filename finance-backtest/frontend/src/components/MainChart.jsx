import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

export default function MainChart({ perf }) {
  const [view, setView] = useState('equity')

  const processedData = useMemo(() => {
    if (!perf) return []
    return perf.filter((_, i) => i % 5 === 0) 
  }, [perf])

  return (
    <div className="glass-panel" style={{ height: '480px', display: 'flex', flexDirection: 'column' }}>
      <div className="chart-header">
        <div>
          <span className="chart-title">Strategy Performance Visualization</span>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>
            Historical performance comparisons (2014-2024)
          </p>
        </div>
        
        <div className="chart-toggles">
          <button 
            className={`toggle-btn ${view === 'equity' ? 'active' : ''}`}
            onClick={() => setView('equity')}
          >
            Equity
          </button>
          <button 
            className={`toggle-btn ${view === 'drawdown' ? 'active' : ''}`}
            onClick={() => setView('drawdown')}
          >
            Drawdown
          </button>
          <button 
            className={`toggle-btn ${view === 'sharpe' ? 'active' : ''}`}
            onClick={() => setView('sharpe')}
          >
            Sharpe
          </button>
        </div>
      </div>
      
      {/* Explicitly style the flex parent container to prevent Recharts ResponsiveContainer from collapsing to 0 height */}
      <div style={{ flex: 1, width: '100%', minHeight: '320px', position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={processedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="date" 
              stroke="var(--text-muted)" 
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }} 
              tickFormatter={(t) => String(t).substring(0, 4)} 
              minTickGap={40} 
            />
            <YAxis 
              stroke="var(--text-muted)" 
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }} 
              domain={['auto', 'auto']}
              tickFormatter={(val) => view === 'equity' ? `$${val.toLocaleString()}` : `${val}`}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'var(--bg-dark)', 
                border: '1px solid var(--glass-border)', 
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-main)',
                fontSize: '0.85rem'
              }} 
            />
            <Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: '10px' }} />
            
            {view === 'equity' && (
              <>
                <Line 
                  type="monotone" 
                  dataKey="Strategy_Equity" 
                  name="Strategy V7 (QP Optimizer)" 
                  stroke="var(--accent-cyan)" 
                  strokeWidth={2.5} 
                  dot={false} 
                />
                <Line 
                  type="monotone" 
                  dataKey="SPY_Equity" 
                  name="Benchmark (SPY)" 
                  stroke="var(--text-muted)" 
                  strokeWidth={1.5} 
                  dot={false} 
                />
              </>
            )}
            
            {view === 'drawdown' && (
              <>
                <Line 
                  type="monotone" 
                  dataKey="Strategy_Drawdown" 
                  name="Strategy Drawdown" 
                  stroke="var(--accent-red)" 
                  strokeWidth={2} 
                  dot={false} 
                />
                <Line 
                  type="monotone" 
                  dataKey="SPY_Drawdown" 
                  name="SPY Drawdown" 
                  stroke="var(--text-muted)" 
                  strokeWidth={1} 
                  dot={false} 
                />
              </>
            )}
            
            {view === 'sharpe' && (
              <>
                <Line 
                  type="monotone" 
                  dataKey="Strategy_Rolling_Sharpe" 
                  name="Rolling Sharpe (12M)" 
                  stroke="var(--accent-purple)" 
                  strokeWidth={2.5} 
                  dot={false} 
                />
                <Line 
                  type="monotone" 
                  dataKey="SPY_Rolling_Sharpe" 
                  name="SPY Sharpe" 
                  stroke="var(--text-muted)" 
                  strokeWidth={1} 
                  dot={false} 
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
