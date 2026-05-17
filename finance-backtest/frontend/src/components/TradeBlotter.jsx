import { useEffect, useState, useMemo } from 'react'
import axios from 'axios'
import { ShoppingCart, ArrowRight, DollarSign, Activity, Percent, CheckCircle, RefreshCw } from 'lucide-react'

export default function TradeBlotter() {
  const [alpacaPositions, setAlpacaPositions] = useState([])
  const [targetWeights, setTargetWeights] = useState([])
  const [totalEquity, setTotalEquity] = useState(100000) // Default paper account size
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Execution/Rebalance state
  const [executing, setExecuting] = useState(false)
  const [executedOrders, setExecutedOrders] = useState(null)
  const [rebalanceDate, setRebalanceDate] = useState('')

  const fetchBrokerData = async () => {
    try {
      setLoading(true)
      const [posRes, wRes] = await Promise.all([
        axios.get('http://127.0.0.1:8001/api/portfolio/alpaca_positions'),
        axios.get('http://127.0.0.1:8001/api/portfolio/current_weights')
      ])
      setAlpacaPositions(posRes.data.positions)
      setTargetWeights(wRes.data.weights)
      setRebalanceDate(wRes.data.date)
      setLoading(false)
    } catch (err) {
      console.error(err)
      setError('Failed to load paper broker holdings or target weights')
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBrokerData()
  }, [])

  // Calculate reconciliation deltas dynamically based on AUM input
  const reconciliationData = useMemo(() => {
    if (!targetWeights.length && !alpacaPositions.length) return []

    const allTickers = Array.from(new Set([
      ...targetWeights.map(w => w.ticker),
      ...alpacaPositions.map(p => p.symbol)
    ]))

    const list = allTickers.map(ticker => {
      const targetObj = targetWeights.find(w => w.ticker === ticker)
      const alpacaObj = alpacaPositions.find(p => p.symbol === ticker)

      const targetW = targetObj ? targetObj.weight : 0.0
      const currentQty = alpacaObj ? alpacaObj.qty : 0
      const price = alpacaObj ? alpacaObj.current_price : (targetObj ? 150.0 : 0.0)

      // Current Weight = Current Value / Account Size (AUM)
      const currentVal = currentQty * price
      const currentW = currentVal / totalEquity

      const deltaW = targetW - currentW
      const deltaVal = deltaW * totalEquity
      const side = deltaW > 0 ? 'BUY' : 'SELL'

      return {
        ticker,
        targetW,
        currentW,
        deltaW,
        currentQty,
        price,
        side,
        deltaVal: Math.abs(deltaVal)
      }
    }).filter(item => Math.abs(item.deltaW) > 0.001) // ignore negligible changes

    // Sort by largest discrepancy (turnover value)
    return list.sort((a, b) => b.deltaVal - a.deltaVal)
  }, [targetWeights, alpacaPositions, totalEquity])

  // Trigger the FastAPI Execute Rebalance endpoint
  const handleExecuteRebalance = async () => {
    try {
      setExecuting(true)
      const res = await axios.post('http://127.0.0.1:8001/api/portfolio/execute_rebalance', {
        total_equity: totalEquity,
        current_positions: alpacaPositions
      })
      setExecutedOrders(res.data.orders)
      setExecuting(false)
    } catch (err) {
      console.error(err)
      alert('Failed to execute rebalance trigger: ' + err.message)
      setExecuting(false)
    }
  }

  if (loading) {
    return (
      <div className="glass-panel flex-center" style={{ minHeight: '400px', flexDirection: 'column', gap: '16px' }}>
        <div className="spinner"></div>
        <p style={{ color: 'var(--accent-cyan)', fontSize: '0.9rem', fontWeight: 500 }}>
          Reconciling broker holdings and target weights...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-panel flex-center" style={{ minHeight: '400px', color: 'var(--accent-red)' }}>
        <p className="font-medium">{error}</p>
      </div>
    )
  }

  return (
    <div className="glass-panel" style={{ marginTop: '24px' }}>
      
      {/* Header Panel */}
      <div className="chart-header" style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '8px', background: 'rgba(0, 229, 255, 0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(0, 229, 255, 0.1)', color: 'var(--accent-cyan)' }}>
            <ShoppingCart size={22} />
          </div>
          <div>
            <span className="chart-title">Execution Blotter & Rebalancer</span>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>
              Reconcile Alpaca Paper Accounts to QP target allocations
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Account AUM ($):
            </label>
            <input 
              type="number" 
              value={totalEquity} 
              onChange={e => setTotalEquity(Math.max(1000, parseInt(e.target.value) || 0))}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontWeight: 'bold', width: '90px', textAlign: 'right', fontSize: '0.85rem' }} 
            />
          </div>
          <button 
            onClick={fetchBrokerData}
            className="toggle-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)' }}
            title="Refresh Holdings"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.2fr', gap: '24px' }}>
        
        {/* Left Side: Summary & Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', padding: '20px', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={14} color="var(--accent-cyan)" /> Reconciliation Summary
            </span>
            
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Holdings Out-of-Sync:</span>
                <span style={{ fontWeight: 600 }}>{reconciliationData.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Target Rebalance Date:</span>
                <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{rebalanceDate}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Paper Broker Status:</span>
                <span style={{ color: 'var(--accent-green)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="live-indicator-pulse" style={{ width: '8px', height: '8px' }}></span> Connected
                </span>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '16px 0' }} />

            <button 
              onClick={handleExecuteRebalance}
              disabled={executing || reconciliationData.length === 0}
              className="toggle-btn active"
              style={{ 
                width: '100%', 
                padding: '12px', 
                fontWeight: 'bold', 
                fontSize: '0.9rem', 
                background: reconciliationData.length === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(0, 229, 255, 0.15)',
                borderColor: reconciliationData.length === 0 ? 'transparent' : 'var(--accent-cyan)',
                color: reconciliationData.length === 0 ? 'var(--text-muted)' : 'var(--accent-cyan)',
                cursor: reconciliationData.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {executing ? (
                <>
                  <div className="spinner" style={{ width: '16px', height: '16px', borderSize: '2px' }}></div>
                  Generating Orders...
                </>
              ) : (
                <>
                  <ShoppingCart size={16} />
                  Execute Rebalance
                </>
              )}
            </button>
          </div>

          {/* Simulated Broker message or Order generation output */}
          {executedOrders ? (
            <div style={{ background: 'rgba(0, 255, 136, 0.05)', border: '1px solid rgba(0, 255, 136, 0.15)', padding: '16px', borderRadius: 'var(--radius-sm)', color: 'var(--accent-green)', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                <CheckCircle size={16} /> REBALANCE COMPLETE
              </div>
              <p style={{ opacity: 0.9, lineHeight: 1.4 }}>
                Reconciled current positions. Generated <strong>{executedOrders.length} execution orders</strong> formatted for Alpaca paper execution.
              </p>
            </div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', padding: '16px', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              <strong>Execution Rules:</strong> Calculations are strictly executed using integer flooring to prevent margin overdrafts. Side actions are classified as BUY or SELL based on target weight deviations.
            </div>
          )}
        </div>

        {/* Right Side: Rebalance reconciliation table */}
        <div className="table-wrapper" style={{ background: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Discrepancy Tickets
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontStyle: 'italic' }}>
              Sorted by Value Delta
            </span>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th style={{ textAlign: 'center' }}>Action</th>
                <th style={{ textAlign: 'right' }}>Current Wt</th>
                <th style={{ textAlign: 'right' }}>Target Wt</th>
                <th style={{ textAlign: 'right' }}>Delta Wt</th>
                <th style={{ textAlign: 'right' }}>Value Delta</th>
              </tr>
            </thead>
            <tbody>
              {reconciliationData.map(r => (
                <tr key={r.ticker}>
                  <td style={{ fontWeight: 600 }}>{r.ticker}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ 
                      background: r.side === 'BUY' ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 51, 102, 0.1)', 
                      color: r.side === 'BUY' ? 'var(--accent-green)' : 'var(--accent-red)',
                      padding: '4px 10px', 
                      borderRadius: '4px', 
                      fontSize: '0.7rem', 
                      fontWeight: 'bold',
                      border: r.side === 'BUY' ? '1px solid rgba(0, 255, 136, 0.2)' : '1px solid rgba(255, 51, 102, 0.2)'
                    }}>{r.side}</span>
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{(r.currentW * 100).toFixed(2)}%</td>
                  <td style={{ textAlign: 'right' }}>{(r.targetW * 100).toFixed(2)}%</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', color: r.deltaW > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {r.deltaW > 0 ? '+' : ''}{(r.deltaW * 100).toFixed(2)}%
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: '#fff' }}>
                    ${r.deltaVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* Execution Tickets Blotter */}
      {executedOrders && (
        <div style={{ marginTop: '32px', borderTop: '1px solid var(--glass-border)', paddingTop: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <ShoppingCart size={16} color="var(--accent-cyan)" />
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Generated Alpaca Trading Orders ({executedOrders.length})
            </span>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {executedOrders.map((o, idx) => (
              <div key={idx} className="ledger-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px', padding: '16px', borderLeftColor: o.side.toLowerCase() === 'buy' ? 'var(--accent-green)' : 'var(--accent-red)', borderLeftWidth: '3px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                  <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.95rem' }}>{o.symbol}</span>
                  <span style={{ 
                    background: o.side.toLowerCase() === 'buy' ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 51, 102, 0.1)', 
                    color: o.side.toLowerCase() === 'buy' ? 'var(--accent-green)' : 'var(--accent-red)',
                    padding: '2px 8px', 
                    borderRadius: '4px', 
                    fontSize: '0.65rem', 
                    fontWeight: 'bold',
                    border: o.side.toLowerCase() === 'buy' ? '1px solid rgba(0, 255, 136, 0.2)' : '1px solid rgba(255, 51, 102, 0.2)'
                  }}>{o.side.toUpperCase()}</span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Quantity (qty):</span>
                    <span style={{ color: '#fff', fontWeight: 'bold' }}>{o.qty} shares</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Order Type:</span>
                    <span style={{ color: 'var(--text-main)' }}>{o.type}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Time-in-Force:</span>
                    <span style={{ color: 'var(--text-main)' }}>{o.time_in_force}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
