import { TrendingUp, Activity, Crosshair } from 'lucide-react'

export default function Header({ metrics, perf }) {
  const strat = metrics?.find(m => m.Metric === 'Strategy')
  const spy = metrics?.find(m => m.Metric === 'SPY')
  
  let winRate = 0
  if (perf && perf.length > 0) {
    const posDays = perf.filter(day => day.Strategy_Return > 0).length
    winRate = (posDays / perf.length) * 100
  }

  return (
    <div className="header-grid">
      <div className="glass-panel metric-card">
        <span className="metric-title flex-center" style={{justifyContent: 'flex-start', gap: '8px'}}>
          <TrendingUp size={16} color="var(--accent-cyan)" /> CAGR (Total)
        </span>
        <span className="metric-value">{strat?.CAGR || '0.00%'}</span>
        <span className="metric-sub">vs SPY {spy?.CAGR || '0.00%'}</span>
      </div>
      
      <div className="glass-panel metric-card">
        <span className="metric-title flex-center" style={{justifyContent: 'flex-start', gap: '8px'}}>
          <Activity size={16} color="var(--accent-red)" /> Max Drawdown
        </span>
        <span className="metric-value">{strat?.['Max Drawdown'] || '0.00%'}</span>
        <span className="metric-sub negative">vs SPY {spy?.['Max Drawdown'] || '0.00%'}</span>
      </div>

      <div className="glass-panel metric-card">
        <span className="metric-title flex-center" style={{justifyContent: 'flex-start', gap: '8px'}}>
          <Crosshair size={16} color="var(--accent-green)" /> Win Rate (Daily)
        </span>
        <span className="metric-value">{winRate.toFixed(1)}%</span>
        <span className="metric-sub">Total Trading Days: {perf?.length || 0}</span>
      </div>
    </div>
  )
}
