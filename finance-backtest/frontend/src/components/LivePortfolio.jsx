import { useState, useEffect } from 'react'
import axios from 'axios'

export default function LivePortfolio() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [showLogs, setShowLogs] = useState(false)

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const res = await axios.get('http://127.0.0.1:8001/api/portfolio/current_weights')
        setData(res.data)
      } catch (err) {
        setError('Failed to fetch live portfolio metrics')
      }
      setLoading(false)
    }
    fetchPortfolio()
  }, [])

  if (loading) return (
    <div style={{ padding: '32px', background: '#0e0e0e', borderBottom: '1px solid #1c1c1c', display: 'flex', alignItems: 'center', gap: '14px' }}>
      <div className="spinner" />
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#888888' }}>
        Querying Core Optimizer Engine...
      </span>
    </div>
  )

  if (error) return (
    <div style={{ padding: '20px 32px', background: '#0e0e0e', borderBottom: '1px solid #1c1c1c', color: '#ef4444', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700 }}>
      ERROR: {error}
    </div>
  )

  const kpiCard = { background: '#0e0e0e', border: '1px solid #1c1c1c', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '10px' }

  return (
    <div style={{ background: '#070707', borderBottom: '1px solid #1c1c1c' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: '#1c1c1c' }}>

        {/* Total Equity */}
        <div style={kpiCard}>
          <span style={{ fontSize: '9px', color: '#888888', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
            Total Equity
          </span>
          <span style={{ fontSize: '2.8rem', fontWeight: 900, lineHeight: 1.1, color: '#ffffff', fontFamily: 'Inter, sans-serif', letterSpacing: '-0.03em' }}>
            $12,450,892
          </span>
          <span style={{ fontSize: '11px', color: '#22c55e', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
            +$145,280 today (+1.18%)
          </span>
        </div>

        {/* Daily PnL */}
        <div style={kpiCard}>
          <span style={{ fontSize: '9px', color: '#888888', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
            Daily P&L
          </span>
          <span style={{ fontSize: '2.8rem', fontWeight: 900, lineHeight: 1.1, color: '#22c55e', fontFamily: 'Inter, sans-serif', letterSpacing: '-0.03em' }}>
            +$145,280
          </span>
          <span style={{ fontSize: '11px', color: '#888888', fontFamily: 'JetBrains Mono, monospace' }}>
            +1.18% · Outpacing SPY by +0.43%
          </span>
        </div>

        {/* Market Regime */}
        <div style={kpiCard}>
          <span style={{ fontSize: '9px', color: '#888888', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
            Market Regime
          </span>
          <span style={{ fontSize: '2.8rem', fontWeight: 900, lineHeight: 1.1, color: '#ffffff', fontFamily: 'Inter, sans-serif', letterSpacing: '-0.03em' }}>
            BULLISH
          </span>
          <span style={{ fontSize: '11px', color: '#888888', fontFamily: 'JetBrains Mono, monospace' }}>
            Expansion · Momentum favorable
          </span>
        </div>
      </div>

      {/* Historical logs toggle */}
      <div style={{ padding: '12px 32px', borderTop: '1px solid #1c1c1c' }}>
        <button
          onClick={() => setShowLogs(!showLogs)}
          style={{ background: 'none', border: 'none', padding: 0, color: '#3d3d3d', textDecoration: 'underline', fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontWeight: 700 }}
        >
          {showLogs ? '▲ Hide Historical Logs' : '▼ View Historical Logs'}
        </button>

        {showLogs && data?.weights && (
          <div style={{ marginTop: '14px', border: '1px solid #1c1c1c', padding: '16px', background: '#0e0e0e', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '9px', fontWeight: 700, color: '#888888', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px', fontFamily: 'JetBrains Mono, monospace' }}>
              Optimal Allocations — {data.date}
            </span>
            {data.weights.map(w => (
              <div key={w.ticker} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #111111', padding: '5px 0', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}>
                <span style={{ color: '#d0d0d0' }}>{w.ticker} <span style={{ color: '#4a4a4a' }}>[{w.sector}]</span></span>
                <span style={{ color: '#888888' }}>
                  {(w.weight * 100).toFixed(2)}%
                  {w.score && <span style={{ color: '#4a4a4a', marginLeft: '12px' }}>Z: {w.score.toFixed(3)}</span>}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
