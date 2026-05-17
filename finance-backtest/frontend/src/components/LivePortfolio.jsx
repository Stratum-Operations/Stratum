import { useEffect, useState } from 'react'
import axios from 'axios'

// Theme-compliant sector colors from Phineus UI design tokens
const SECTOR_COLORS = {
  'Technology': 'var(--accent-cyan)',
  'Healthcare': 'var(--accent-green)',
  'Financial Services': 'var(--accent-purple)',
  'Financials': 'var(--accent-purple)',
  'Consumer Cyclical': '#ffb703',
  'Industrials': '#fb8500',
  'Communication Services': '#2196f3',
  'Consumer Defensive': '#e91e63',
  'Real Estate': '#9c27b0',
  'Utilities': '#009688',
  'Energy': '#ffeb3b',
  'Basic Materials': '#8bc34a',
  'Other': 'var(--text-muted)'
}

export default function LivePortfolio() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchWeights = async () => {
      try {
        const res = await axios.get('http://127.0.0.1:8001/api/portfolio/current_weights')
        setData(res.data)
        setLoading(false)
      } catch (err) {
        console.error(err)
        setError('Failed to fetch target weights')
        setLoading(false)
      }
    }
    fetchWeights()
  }, [])

  if (loading) {
    return (
      <div className="glass-panel flex-center" style={{ minHeight: '300px', flexDirection: 'column', gap: '16px' }}>
        <div className="spinner"></div>
        <p style={{ color: 'var(--accent-cyan)', fontSize: '0.85rem', fontWeight: 500 }}>
          Fetching target optimizer allocations...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-panel flex-center" style={{ minHeight: '300px', color: 'var(--accent-red)' }}>
        <p>{error}</p>
      </div>
    )
  }

  if (!data || !data.weights) return null

  return (
    <div className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="chart-header">
        <div>
          <span className="chart-title">Live Target Weights</span>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>
            Current optimal joint-QP allocations
          </p>
        </div>
        <span style={{ 
          fontSize: '0.75rem', 
          fontFamily: 'monospace', 
          background: 'rgba(0, 229, 255, 0.05)', 
          color: 'var(--accent-cyan)', 
          border: '1px solid rgba(0, 229, 255, 0.1)', 
          padding: '4px 10px', 
          borderRadius: '12px' 
        }}>
          Rebalanced: {data.date}
        </span>
      </div>
      
      <div className="table-wrapper" style={{ flex: 1, maxHeight: '460px' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Sector</th>
              <th style={{ textAlign: 'right' }}>Weight</th>
              <th style={{ textAlign: 'right' }}>Z-Score</th>
            </tr>
          </thead>
          <tbody>
            {data.weights.map(w => {
              const color = SECTOR_COLORS[w.sector] || SECTOR_COLORS['Other']
              return (
                <tr key={w.ticker}>
                  {/* Styling the left border of the first td cell to support beautiful sector indicators */}
                  <td style={{ borderLeft: `3px solid ${color}`, paddingLeft: '16px', fontWeight: 'bold' }}>
                    {w.ticker}
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{w.sector}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {(w.weight * 100).toFixed(2)}%
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {w.score ? w.score.toFixed(4) : '-'}
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
