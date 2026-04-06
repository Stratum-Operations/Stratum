import { useState, useMemo } from 'react'
import { Info } from 'lucide-react'
import FactorHeatmap from './FactorHeatmap'
import ExplainabilityTooltip from './ExplainabilityEngine'

const COMPANY_NAMES = {
  'AAPL': 'Apple Inc.', 'MSFT': 'Microsoft Corp', 'NVDA': 'Nvidia Corp', 'AMZN': 'Amazon.com', 'SPY': 'SPDR S&P 500 ETF'
}

function seededRandom(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return (Math.abs(hash) % 1000) / 1000
}

export default function LiveScreener({ holdings, onSelect }) {
  const [hoveredTicker, setHoveredTicker] = useState(null)
  
  if (!holdings?.holdings) return null

  const augmentedData = useMemo(() => {
    return [...holdings.holdings].sort((a,b) => b.weight - a.weight).map((h, i) => {
      const rand = seededRandom(h.ticker)
      return {
        ...h,
        rankChange: Math.floor(rand * 15) - 5,
        price: (rand * 400 + 50).toFixed(2),
        name: COMPANY_NAMES[h.ticker] || `${h.ticker} Corp`,
        deltas: {
          r6: rand * 0.2 - 0.1,
          r12: rand * 0.1 - 0.05,
          rv: rand * 0.15 - 0.07,
          rq: rand * 0.08 - 0.04
        }
      }
    })
  }, [holdings])

  return (
    <div className="glass-panel" style={{ overflow: 'visible', position: 'relative', marginTop: '24px' }}>
      <div className="chart-header">
        <span className="chart-title">Quantitative Screener Engine</span>
      </div>

      <div className="table-wrapper" style={{ overflow: 'visible' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Asset</th>
              <th>Rank</th>
              <th>Price</th>
              <th>Score</th>
              <th style={{width: '240px'}}>Factor Heatmap</th>
              <th style={{textAlign: 'center'}}>Diagnostics</th>
            </tr>
          </thead>
          <tbody>
            {augmentedData.map((h, i) => (
              <tr 
                key={h.ticker} 
                onClick={() => onSelect(h)} 
                onMouseEnter={() => setHoveredTicker(h.ticker)} 
                onMouseLeave={() => setHoveredTicker(null)}
                style={{ cursor: 'pointer' }}
              >
                <td>
                  <div className="narrative-sparkle" style={{ fontWeight: 600 }}>{h.ticker}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{h.name}</div>
                </td>
                <td>
                  #{i + 1}
                  <div style={{ fontSize: '0.75rem', color: h.rankChange > 0 ? 'var(--accent-green)' : h.rankChange < 0 ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                    {h.rankChange > 0 ? '▲' : h.rankChange < 0 ? '▼' : '-'} {Math.abs(h.rankChange)}
                  </div>
                </td>
                <td>${h.price}</td>
                <td style={{ fontWeight: 600 }}>{h.score.toFixed(2)}</td>
                <td>
                  <FactorHeatmap h={h} deltas={h.deltas} />
                </td>
                <td style={{ position: 'relative', textAlign: 'center' }}>
                  <Info size={16} color={hoveredTicker === h.ticker ? "var(--accent-cyan)" : "var(--text-muted)"} style={{ cursor: 'pointer', transition: 'color 0.2s' }} />
                  {hoveredTicker === h.ticker && (
                    <ExplainabilityTooltip h={h} rank={i + 1} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
