import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function Header({ metrics, perf }) {
  const strat = metrics?.find(m => m.Metric === 'Strategy')
  const spy   = metrics?.find(m => m.Metric === 'SPY')

  // --- Win Rate from daily returns ---
  let winRate = 0
  let tradingDays = 0
  if (perf && perf.length > 0) {
    const posDays = perf.filter(d => d.Strategy_Return > 0).length
    tradingDays   = perf.length
    winRate        = (posDays / tradingDays) * 100
  }

  // --- Benchmark comparison helpers ---
  const stratCAGR    = parseFloat(strat?.CAGR)    || 0
  const spyCAGR      = parseFloat(spy?.CAGR)      || 0
  const stratDD      = parseFloat(strat?.['Max Drawdown']) || 0
  const spyDD        = parseFloat(spy?.['Max Drawdown'])   || 0
  const stratSharpe  = parseFloat(strat?.Sharpe)   || 0
  const spySharpe    = parseFloat(spy?.Sharpe)     || 0

  const cagrDelta    = stratCAGR   - spyCAGR
  const ddDelta      = stratDD     - spyDD
  const sharpeDelta  = stratSharpe - spySharpe

  const Delta = ({ value, invert = false, suffix = '%' }) => {
    // invert=true → lower is better (drawdown)
    const positive = invert ? value < 0 : value > 0
    const neutral  = Math.abs(value) < 0.01
    const prefix   = value > 0 ? '+' : ''
    return (
      <span className={neutral ? 'neutral' : positive ? 'up' : 'down'}>
        {neutral ? '—' : `${prefix}${value.toFixed(2)}${suffix} vs SPY`}
      </span>
    )
  }

  const cards = [
    {
      id: 'cagr',
      label: 'CAGR — Strategy',
      value: strat?.CAGR  ?? '—',
      bench: <Delta value={cagrDelta} />,
      subLabel: `SPY ${spy?.CAGR ?? '—'}`,
    },
    {
      id: 'drawdown',
      label: 'Max Drawdown',
      value: strat?.['Max Drawdown'] ?? '—',
      bench: <Delta value={ddDelta} invert />,
      subLabel: `SPY ${spy?.['Max Drawdown'] ?? '—'}`,
    },
    {
      id: 'sharpe',
      label: 'Sharpe Ratio',
      value: strat?.Sharpe ?? '—',
      bench: <Delta value={sharpeDelta} suffix='x' />,
      subLabel: `${tradingDays.toLocaleString()} trading days  ·  ${winRate.toFixed(1)}% win rate`,
    },
  ]

  return (
    <div className="header-grid">
      {cards.map(c => (
        <div key={c.id} className="metric-card">
          {/* Label row */}
          <span className="metric-label">{c.label}</span>

          {/* Oversized value — the visual anchor */}
          <span className="metric-value">{c.value}</span>

          {/* Benchmark delta + context */}
          <div className="metric-benchmark">
            {c.bench}
          </div>
          <div style={{
            fontSize: '10px',
            fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--b-dim)',
            letterSpacing: '0.05em',
          }}>
            {c.subLabel}
          </div>
        </div>
      ))}
    </div>
  )
}
