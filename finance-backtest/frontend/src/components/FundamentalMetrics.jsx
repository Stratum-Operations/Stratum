import { useMemo } from 'react'

const METRICS = [
  { id: 'roe', label: 'ROE', unit: '%' },
  { id: 'roa', label: 'ROA', unit: '%' },
  { id: 'de', label: 'Debt/Equity', unit: 'x' },
  { id: 'om', label: 'Op Margin', unit: '%' },
  { id: 'fcfm', label: 'FCF Margin', unit: '%' },
  { id: 'pe', label: 'P/E', unit: 'x' },
  { id: 'evebit', label: 'EV/EBIT', unit: 'x' },
  { id: 'revgr', label: 'Rev Growth', unit: '%' }
]

function seededRandom(str, salt) {
  let hash = 0
  const input = str + salt
  for (let i = 0; i < input.length; i++) hash = input.charCodeAt(i) + ((hash << 5) - hash)
  return (Math.abs(hash) % 1000) / 1000
}

const PercentileBadge = ({ val }) => {
  let color = 'var(--text-muted)'
  if (val >= 90) color = 'var(--accent-green)'
  else if (val >= 75) color = 'rgba(0, 255, 136, 0.6)'
  else if (val <= 25) color = 'var(--accent-red)'
  
  return (
    <div className="percentile-badge" style={{ color }}>
      {Math.round(val)}th
    </div>
  )
}

export default function FundamentalMetrics({ holding }) {
  const metricsData = useMemo(() => {
    return METRICS.map(m => {
      const rand = seededRandom(holding.ticker, m.id)
      const raw = (rand * 40 + 5).toFixed(1)
      const universePct = rand * 100
      const sectorPct = ((rand * 100 + seededRandom(holding.sector, m.id) * 20) % 100)
      
      return { ...m, raw, universePct, sectorPct }
    })
  }, [holding])

  return (
    <div className="metrics-grid-container">
      <div className="metrics-grid-header">
        <div className="grid-col-label">Fundamental Factor</div>
        <div className="grid-col-value">Raw Value</div>
        <div className="grid-col-pct">Universe Pct</div>
        <div className="grid-col-pct">Sector Pct</div>
      </div>
      <div className="metrics-grid-body">
        {metricsData.map(d => (
          <div key={d.id} className="metrics-grid-row">
            <div className="grid-col-label">{d.label}</div>
            <div className="grid-col-value">{d.raw}{d.unit}</div>
            <div className="grid-col-pct">
              <PercentileBadge val={d.universePct} />
            </div>
            <div className="grid-col-pct">
              <PercentileBadge val={d.sectorPct} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
