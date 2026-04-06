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
        <span className="chart-title">Backtest Visualization</span>
        <div className="chart-toggles">
          <button className={`toggle-btn ${view === 'equity' ? 'active' : ''}`} onClick={() => setView('equity')}>Equity</button>
          <button className={`toggle-btn ${view === 'drawdown' ? 'active' : ''}`} onClick={() => setView('drawdown')}>Drawdown</button>
          <button className={`toggle-btn ${view === 'sharpe' ? 'active' : ''}`} onClick={() => setView('sharpe')}>Sharpe</button>
        </div>
      </div>
      
      <div style={{ flex: 1, width: '100%' }}>
        <ResponsiveContainer>
          <LineChart data={processedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="date" stroke="#8a9fc2" tick={{fontSize: 12}} tickFormatter={(t) => t.substring(0,4)} minTickGap={30} />
            <YAxis stroke="#8a9fc2" tick={{fontSize: 12}} domain={['auto', 'auto']} />
            <Tooltip contentStyle={{backgroundColor: '#0a0e17', border: '1px solid rgba(255,255,255,0.1)'}} labelStyle={{color: '#8a9fc2'}} />
            <Legend wrapperStyle={{fontSize: '0.85rem'}} />
            
            {view === 'equity' && (
              <>
                <Line type="monotone" dataKey="Strategy_Equity" name="Strategy V7" stroke="#00e5ff" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="SPY_Equity" name="Benchmark (SPY)" stroke="#8a9fc2" strokeWidth={2} dot={false} />
              </>
            )}
            
            {view === 'drawdown' && (
              <>
                <Line type="monotone" dataKey="Strategy_Drawdown" name="Strategy Drawdown" stroke="#ff3366" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="SPY_Drawdown" name="SPY Drawdown" stroke="#8a9fc2" strokeWidth={1} dot={false} />
              </>
            )}
            
            {view === 'sharpe' && (
              <>
                <Line type="monotone" dataKey="Strategy_Rolling_Sharpe" name="Rolling Sharpe (12M)" stroke="#9d4edd" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="SPY_Rolling_Sharpe" name="SPY Sharpe" stroke="#8a9fc2" strokeWidth={1} dot={false} />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
