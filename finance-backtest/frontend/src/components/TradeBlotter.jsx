import { useEffect, useState, useMemo } from 'react'
import axios from 'axios'
import { mockAlpacaPositions, mockHoldings } from '../data/mockFallbackData'

const API = '/api'
const AUM = 1_000_000

export default function TradeBlotter({ holdings: propHoldings }) {
  const [positions, setPositions]   = useState([])
  const [weights, setWeights]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [orders, setOrders]         = useState(null)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied]         = useState(false)
  const [btnHovered, setBtnHovered] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const pR = await axios.get(`${API}/portfolio/alpaca_positions`)
        setPositions(pR.data.positions || [])
      } catch {
        setPositions(mockAlpacaPositions.positions)
      }
      if (propHoldings?.length) {
        setWeights(propHoldings)
      } else {
        try {
          const wR = await axios.get(`${API}/portfolio/current_weights`)
          setWeights(wR.data.weights || [])
        } catch {
          setWeights(mockHoldings.holdings)
        }
      }
      setLoading(false)
    }
    load()
  }, [propHoldings])

  const deltaRows = useMemo(() => {
    return (weights || [])
      .filter(w => Number(w.weight) > 0)
      .map(w => {
        const pos = positions.find(p => p.symbol === w.ticker)
        const price = pos ? Number(pos.current_price) : 150
        const targetShares  = Math.floor((AUM * Number(w.weight)) / price)
        const currentShares = pos ? Number(pos.qty) : 0
        const deltaShares   = targetShares - currentShares
        const deltaValue    = deltaShares * price
        return { ticker: w.ticker, targetWeight: Number(w.weight), targetShares, currentShares, deltaShares, deltaValue, price }
      })
      .sort((a, b) => Math.abs(b.deltaValue) - Math.abs(a.deltaValue))
  }, [weights, positions])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const r = await axios.post(`${API}/portfolio/execute_rebalance`, {
        total_equity: AUM,
        current_positions: positions,
      })
      setOrders(r.data.orders || [])
    } catch {
      setOrders(
        deltaRows
          .filter(r => r.deltaShares !== 0)
          .map(r => ({
            symbol: r.ticker,
            side: r.deltaShares > 0 ? 'buy' : 'sell',
            qty: Math.abs(r.deltaShares),
            type: 'market',
            time_in_force: 'day',
          }))
      )
    }
    setGenerating(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(orders, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div
        className="flex items-center justify-center font-mono text-[11px] text-text-3"
        style={{ height: 'calc(100vh - 104px)' }}
      >
        LOADING BLOTTER DATA...
      </div>
    )
  }

  const estTurnover = deltaRows.reduce((s, r) => s + Math.abs(r.deltaValue), 0)
  const buyCount    = (orders || []).filter(o => o.side?.toLowerCase() === 'buy').length
  const sellCount   = (orders || []).filter(o => o.side?.toLowerCase() === 'sell').length

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 104px)',
        overflow: 'hidden',
      }}
    >
      {/* ── Simulated Banner ─────────────────────────────────────── */}
      <div
        className="flex-shrink-0 border-b border-amber px-4 py-2 font-mono text-[10px] text-amber"
        style={{ background: 'rgba(217,119,6,0.06)' }}
      >
        ⚠ SIMULATED POSITIONS — Alpaca paper trading integration is not yet live. Current holdings shown are generated for UI demonstration purposes only.
      </div>

      {/* ── Panel A: Delta Table (~50%) ───────────────────────────── */}
      <div
        style={{
          flex: '0 0 50%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          borderBottom: '1px solid var(--border-2)',
        }}
      >
        {/* Two-column header */}
        <div className="flex-shrink-0 flex border-b border-border-2 bg-surface-2">
          <div className="flex-1 px-4 py-2 border-r border-border-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-text-3">
              TARGET ALLOCATION
            </span>
          </div>
          <div className="flex-1 px-4 py-2 flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-text-3">
              CURRENT POSITIONS
            </span>
            <span className="font-mono text-[8px] border border-amber text-amber px-1">
              [SIMULATED]
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full table-fixed font-mono text-[11px] border-collapse">
            <thead className="sticky top-0 z-10">
              <tr>
                {[
                  { label: 'TICKER',       w: '12%' },
                  { label: 'TARGET WT',    w: '13%' },
                  { label: 'TARGET SHS',   w: '15%' },
                  { label: 'CURRENT SHS',  w: '15%' },
                  { label: 'DELTA SHS',    w: '14%' },
                  { label: 'DELTA VALUE',  w: '31%' },
                ].map(col => (
                  <th
                    key={col.label}
                    style={{ width: col.w }}
                    className="px-3 py-2 text-left text-[9px] uppercase tracking-widest text-text-3 font-normal border-b border-border-2 bg-surface-2 whitespace-nowrap"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deltaRows.map((r, i) => {
                const deltaColor = r.deltaShares > 0
                  ? 'text-green font-bold'
                  : r.deltaShares < 0
                    ? 'text-red font-bold'
                    : 'text-text-3'
                return (
                  <tr
                    key={r.ticker}
                    className={`border-b border-border ${i % 2 === 0 ? 'bg-surface' : 'bg-surface-2'}`}
                  >
                    <td className="px-3 py-1.5 text-text-strong font-bold">{r.ticker}</td>
                    <td className="px-3 py-1.5 text-text-2">{(r.targetWeight * 100).toFixed(1)}%</td>
                    <td className="px-3 py-1.5 text-text-2">{r.targetShares.toLocaleString()}</td>
                    <td className="px-3 py-1.5 text-text-3">{r.currentShares.toLocaleString()}</td>
                    <td className={`px-3 py-1.5 ${deltaColor}`}>
                      {r.deltaShares > 0 ? '+' : ''}{r.deltaShares.toLocaleString()}
                    </td>
                    <td className={`px-3 py-1.5 ${deltaColor}`}>
                      {r.deltaValue >= 0 ? '+' : '-'}${Math.abs(r.deltaValue).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Panel B: Paper Orders ─────────────────────────────────── */}
      <div
        style={{
          flex: '1',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          borderBottom: '1px solid var(--border-2)',
        }}
      >
        <div className="flex-shrink-0 px-4 py-2 border-b border-border-2 bg-surface-2 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-widest text-text-3">
            PAPER ORDERS
          </span>
          {orders && (
            <span className="font-mono text-[9px] text-green">
              {orders.length} ORDERS GENERATED
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {orders ? (
            <table className="w-full table-fixed font-mono text-[11px] border-collapse">
              <thead className="sticky top-0 z-10">
                <tr>
                  {['SYMBOL', 'ACTION', 'QTY', 'TYPE', 'TIF'].map(h => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left text-[9px] uppercase tracking-widest text-text-3 font-normal border-b border-border-2 bg-surface-2 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o, i) => {
                  const isBuy = o.side?.toLowerCase() === 'buy'
                  return (
                    <tr
                      key={i}
                      className={`border-b border-border ${i % 2 === 0 ? 'bg-surface' : 'bg-surface-2'}`}
                    >
                      <td className="px-3 py-1.5 text-text-strong font-bold">{o.symbol}</td>
                      <td className={`px-3 py-1.5 font-bold ${isBuy ? 'text-green' : 'text-red'}`}>
                        {(o.side || '').toUpperCase()}
                      </td>
                      <td className="px-3 py-1.5 text-text-2">{Number(o.qty).toLocaleString()}</td>
                      <td className="px-3 py-1.5 text-text-3 uppercase">{o.type || 'market'}</td>
                      <td className="px-3 py-1.5 text-text-3 uppercase">{o.time_in_force || 'day'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="flex items-center justify-center h-full font-mono text-[11px] text-text-3">
              PENDING — click GENERATE PAPER ORDERS to compute
            </div>
          )}
        </div>

        {/* Orders footer */}
        <div className="flex-shrink-0 border-t border-border-2 px-4 py-2 bg-surface-2 flex items-center justify-between">
          <div className="font-mono text-[9px] text-text-3 flex gap-4">
            <span>TOTAL: {orders ? orders.length : '—'} ORDERS</span>
            {orders && (
              <>
                <span className="text-green">{buyCount} BUY</span>
                <span className="text-red">{sellCount} SELL</span>
              </>
            )}
            <span>EST. TURNOVER: ${estTurnover.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
          </div>
          <span className="font-mono text-[9px] text-text-3">
            Alpaca API compliant (market / day). Integer shares only. Fractional shares floor()-rounded to prevent margin overdraft.
          </span>
        </div>
      </div>

      {/* ── Panel C: Action Buttons ───────────────────────────────── */}
      <div className="flex-shrink-0 p-4 bg-surface flex items-center gap-3">
        <button
          onClick={handleGenerate}
          disabled={generating}
          onMouseEnter={() => setBtnHovered(true)}
          onMouseLeave={() => setBtnHovered(false)}
          className="font-mono text-[11px] uppercase tracking-widest px-6 py-3 transition-colors disabled:opacity-50"
          style={{
            border: '2px solid var(--border-2)',
            background: btnHovered ? 'var(--text-strong)' : 'transparent',
            color: btnHovered ? 'var(--bg)' : 'var(--text-strong)',
            cursor: generating ? 'not-allowed' : 'pointer',
          }}
        >
          {generating ? 'GENERATING...' : 'GENERATE PAPER ORDERS'}
        </button>

        {orders && (
          <button
            onClick={handleCopy}
            className="font-mono text-[10px] uppercase tracking-widest px-4 py-3 border border-border-2 bg-transparent cursor-pointer hover:bg-surface-2 transition-colors"
            style={{ color: copied ? 'var(--green)' : 'var(--text-3)' }}
          >
            {copied ? '✓ COPIED' : 'COPY JSON TO CLIPBOARD'}
          </button>
        )}
      </div>
    </div>
  )
}
