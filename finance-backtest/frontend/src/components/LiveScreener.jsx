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
    <div className="glass-panel mt-6" style={{ overflow: 'visible', position: 'relative' }}>
      <div className="chart-header">
        <span className="chart-title">Quantitative Screener Engine</span>
      </div>

      <div className="table-wrapper" style={{ overflow: 'visible' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '15px 12px', borderBottom: '1px solid var(--border)', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-2)' }}>Asset</th>
              <th style={{ textAlign: 'right', padding: '15px 12px', borderBottom: '1px solid var(--border)', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-2)' }}>Rank</th>
              <th style={{ textAlign: 'right', padding: '15px 12px', borderBottom: '1px solid var(--border)', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-2)' }}>Price</th>
              <th style={{ textAlign: 'right', padding: '15px 12px', borderBottom: '1px solid var(--border)', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-2)' }}>Score</th>
              <th style={{ textAlign: 'left', padding: '15px 12px', borderBottom: '1px solid var(--border)', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', width: '240px', color: 'var(--text-2)' }}>Factor Heatmap</th>
              <th style={{ textAlign: 'center', padding: '15px 12px', borderBottom: '1px solid var(--border)', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-2)' }}>Diagnostics</th>
            </tr>
          </thead>
          <tbody>
            {augmentedData.map((h, i) => {
              const isTop15 = i < 15
              return (
                <tr 
                  key={h.ticker} 
                  onClick={() => onSelect(h)} 
                  onMouseEnter={() => setHoveredTicker(h.ticker)} 
                  onMouseLeave={() => setHoveredTicker(null)}
                  className="hover:bg-surface-2 transition-colors duration-150"
                  style={{ cursor: 'pointer' }}
                >
                  <td style={{ padding: '15px 12px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: isTop15 ? 900 : 400, color: 'var(--text-strong)', fontSize: '11px', letterSpacing: '0.04em' }}>{h.ticker}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-2)' }}>{h.name}</div>
                  </td>
                  <td style={{ textAlign: 'right', padding: '15px 12px', borderBottom: '1px solid var(--border)', fontFamily: 'Geist Mono, monospace', fontSize: '11px', color: 'var(--text-strong)' }}>
                    #{i + 1}
                    <div style={{ fontSize: '9px', color: 'var(--text-2)' }}>
                      {h.rankChange > 0 ? '▲' : h.rankChange < 0 ? '▼' : '-'} {Math.abs(h.rankChange)}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', padding: '15px 12px', borderBottom: '1px solid var(--border)', fontFamily: 'Geist Mono, monospace', fontSize: '11px', color: 'var(--text-strong)' }}>
                    ${parseFloat(h.price).toFixed(2)}
                  </td>
                  <td style={{ textAlign: 'right', padding: '15px 12px', borderBottom: '1px solid var(--border)', fontFamily: 'Geist Mono, monospace', fontSize: '11px', fontWeight: isTop15 ? 900 : 600, color: 'var(--text-strong)' }}>
                    {parseFloat(h.score).toFixed(2)}
                  </td>
                  <td style={{ padding: '15px 12px', borderBottom: '1px solid var(--border)' }}>
                    <FactorHeatmap h={h} deltas={h.deltas} />
                  </td>
                  <td style={{ position: 'relative', textAlign: 'center', padding: '15px 12px', borderBottom: '1px solid var(--border)' }}>
                    <div className="flex justify-center">
                      <Info size={16} color={hoveredTicker === h.ticker ? "var(--text-strong)" : "var(--text-3)"} style={{ cursor: 'pointer', transition: 'color 0.2s' }} />
                    </div>
                    {hoveredTicker === h.ticker && (
                      <ExplainabilityTooltip h={h} rank={i + 1} />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
