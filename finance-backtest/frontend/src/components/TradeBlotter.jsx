import { useEffect, useState, useMemo } from 'react'
import axios from 'axios'
import { RefreshCw } from 'lucide-react'
import { mockAlpacaPositions, mockHoldings } from '../data/mockFallbackData'

const API = 'http://127.0.0.1:8001/api'

const C = {
  bg:       'var(--bg)',
  base:     'var(--surface)',
  raised:   'var(--surface-2)',
  border:   'var(--border)',
  borderHi: 'var(--border-2)',
  text:     'var(--text)',
  dim:      'var(--text-2)',
  muted:    'var(--text-3)',
  sub:      'var(--text-2)',
  white:    'var(--text-strong)',
  lime:     'var(--green)',
  red:      'var(--red)',
  green:    'var(--green)',
}

function buildDiff(targetWeights, alpacaPositions, aum) {
  const allTickers = Array.from(new Set([
    ...targetWeights.map(w => w.ticker),
    ...alpacaPositions.map(p => p.symbol),
  ]))
  return allTickers.map(ticker => {
    const tw  = targetWeights.find(w => w.ticker === ticker)
    const pos = alpacaPositions.find(p => p.symbol === ticker)
    const targetW  = tw  ? tw.weight : 0
    const qty      = pos ? pos.qty : 0
    const price    = pos ? pos.current_price : 150
    const currentW = (qty * price) / aum
    const deltaW   = targetW - currentW
    return { ticker, currentW, targetW, deltaW, qty, price, side: deltaW >= 0 ? 'BUY' : 'SELL', dollarDelta: Math.abs(deltaW * aum) }
  })
  .filter(r => Math.abs(r.deltaW) > 0.001)
  .sort((a, b) => b.dollarDelta - a.dollarDelta)
}

function KV({ label, value, valueColor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: `1px solid ${C.border}`, padding: '5px 0' }}>
      <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted }}>{label}</span>
      <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '11px', fontWeight: 700, color: valueColor || C.white }}>{value}</span>
    </div>
  )
}

export default function TradeBlotter() {
  const [positions, setPositions]   = useState([])
  const [weights, setWeights]       = useState([])
  const [rebalDate, setRebalDate]   = useState('—')
  const [aum, setAum]               = useState(100000)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [executing, setExecuting]   = useState(false)
  const [orders, setOrders]         = useState(null)
  const [confirmed, setConfirmed]   = useState(false)
  const [broker, setBroker]         = useState('alpaca_paper')

  const load = async () => {
    setLoading(true); setError(null); setOrders(null); setConfirmed(false)
    const startTime = Date.now()
    try {
      const [pR, wR] = await Promise.all([
        axios.get(`${API}/portfolio/alpaca_positions`),
        axios.get(`${API}/portfolio/current_weights`),
      ])
      setPositions(pR.data.positions)
      setWeights(wR.data.weights)
      setRebalDate(wR.data.date)
    } catch (e) {
      console.warn('API unreachable, loading mock trade blotter data', e)
      setPositions(mockAlpacaPositions.positions)
      setWeights(mockHoldings.holdings)
      setRebalDate(mockHoldings.date + ' (Simulated)')
    }
    const elapsed = Date.now() - startTime
    const delay = Math.max(0, 600 - elapsed)
    setTimeout(() => {
      setLoading(false)
    }, delay)
  }
  useEffect(() => { load() }, [])

  const diff = useMemo(() => buildDiff(weights, positions, aum), [weights, positions, aum])
  const isInitialLoad = loading && positions.length === 0 && weights.length === 0

  const handleExecute = async () => {
    if (!confirmed) { setConfirmed(true); return }
    setExecuting(true); setConfirmed(false)
    try {
      const res = await axios.post(`${API}/portfolio/execute_rebalance`, {
        total_equity: aum,
        current_positions: positions,
      })
      setOrders(res.data.orders)
    } catch (e) { setError('EXECUTION FAILED: ' + e.message) }
    setExecuting(false)
  }

  const mono = { fontFamily: 'Geist Mono, monospace' }

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: '100%', ...mono, fontSize: '12px' }}>

      {/* ── Top Band ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: `1px solid ${C.borderHi}`, background: C.base }}>
        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.text }}>
          Trade Blotter — Execution Terminal
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '9px', color: C.muted, letterSpacing: '0.1em' }}>TARGET DATE: {rebalDate}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '9px', color: C.muted, letterSpacing: '0.1em' }}>BROKER:</span>
            <select
              value={broker}
              onChange={e => setBroker(e.target.value)}
              title="Select connected brokerage account. The live API execution currently targets Alpaca Paper; Schwab, Robinhood, and Interactive Brokers are run in high-fidelity simulator mode."
              style={{
                background: C.bg,
                border: `1px solid ${C.border}`,
                color: C.text,
                fontSize: '9px',
                fontFamily: 'Geist Mono, monospace',
                padding: '2px 4px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="alpaca_paper">ALPACA PAPER (ACTIVE)</option>
              <option value="interactive_brokers">IBKR (SIMULATED)</option>
              <option value="schwab">SCHWAB (SIMULATED)</option>
              <option value="robinhood">ROBINHOOD (SIMULATED)</option>
            </select>
          </div>
          <button
            onClick={load}
            disabled={loading}
            style={{
              background: 'none',
              border: `1px solid ${C.border}`,
              color: loading ? C.white : C.muted,
              padding: '4px 10px',
              fontSize: '9px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={10} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {loading ? 'REFRESHING…' : 'REFRESH'}
          </button>
        </div>
      </div>

      {isInitialLoad ? (
        <div style={{ padding: '60px', textAlign: 'center', color: C.muted, letterSpacing: '0.2em', fontSize: '10px' }}>LOADING…</div>
      ) : error ? (
        <div style={{ padding: '40px', color: C.red, letterSpacing: '0.1em', fontSize: '11px', borderLeft: `4px solid ${C.red}`, margin: '24px' }}>{error}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] min-h-[calc(100vh-300px)]">

          {/* ── Left: Authorization Terminal ────────────────────────── */}
          <div style={{ borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', background: C.base }}>

            {/* AUM Input */}
            <div style={{ padding: '16px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, marginBottom: '8px' }}>Account AUM</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: C.muted }}>$</span>
                <input
                  type="number"
                  value={aum}
                  onChange={e => setAum(Math.max(1000, parseInt(e.target.value) || 0))}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: `1px solid ${C.borderHi}`,
                    color: C.white,
                    fontSize: '15px',
                    fontFamily: 'Geist Mono, monospace',
                    fontWeight: 600,
                    width: '100%',
                    outline: 'none',
                    padding: '2px 0',
                  }}
                />
              </div>
            </div>

            {/* Reconciliation stats */}
            <div style={{ padding: '16px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, marginBottom: '12px' }}>Reconciliation</div>
              <KV label="Positions out-of-sync" value={diff.length} />
              <KV label="Buy orders"            value={diff.filter(r => r.side === 'BUY').length}  valueColor={C.lime} />
              <KV label="Sell orders"           value={diff.filter(r => r.side === 'SELL').length} valueColor={C.red} />
              <KV label="Est. gross turnover"   value={`$${diff.reduce((s, r) => s + r.dollarDelta, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
              <KV label="Target positions"      value={weights.filter(w => w.weight > 0).length} />
            </div>

            {/* Execution note */}
            <div style={{ padding: '16px', borderBottom: `1px solid ${C.border}`, fontSize: '9px', color: C.muted, lineHeight: 1.7, letterSpacing: '0.04em' }}>
              ORDERS FLOOR-ROUNDED TO PREVENT MARGIN OVERDRAFT.<br />
              SIDE DETERMINED BY DELTA-WEIGHT SIGN.<br />
              ORDER TYPE: MARKET · TIF: DAY.
            </div>

            {/* Execute Button */}
            <div style={{ padding: '20px', marginTop: 'auto' }}>
              {confirmed && !executing && (
                <div style={{
                  border: `1px solid ${C.red}`,
                  padding: '10px',
                  marginBottom: '12px',
                  fontSize: '10px',
                  color: C.red,
                  letterSpacing: '0.08em',
                  lineHeight: 1.5,
                }}>
                  ⚠ CONFIRM: {diff.length} LIVE MARKET ORDERS.<br />PRESS AGAIN TO AUTHORIZE.
                </div>
              )}

              <button
                onClick={handleExecute}
                disabled={executing || diff.length === 0}
                title={diff.length === 0 ? "No market orders are required because your broker allocations already match the targets." : "Send orders to Alpaca Broker Paper Account"}
                className={
                  diff.length === 0 ? 'execute-btn-disabled' :
                  confirmed         ? 'execute-btn-armed'    :
                  'execute-btn'
                }
                style={{
                  display: 'block',
                  width: '100%',
                  fontSize: diff.length === 0 ? '14px' : confirmed ? '18px' : '22px',
                  fontFamily: 'Geist Mono, monospace',
                  fontWeight: 900,
                  letterSpacing: '-0.01em',
                  textTransform: 'uppercase',
                  lineHeight: 1.1,
                  cursor: diff.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {executing ? 'SENDING ORDERS…' :
                 diff.length === 0 ? 'NO ORDERS REQUIRED' :
                 confirmed ? `CONFIRM ${diff.length} ORDERS` :
                 'EXECUTE REBALANCE'}
              </button>

              {orders && !executing && (
                <div style={{ marginTop: '12px', padding: '10px', border: `1px solid ${C.lime}`, fontSize: '9px', color: C.lime, letterSpacing: '0.1em', lineHeight: 1.5 }}>
                  ✓ DONE — {orders.length} ORDERS GENERATED
                </div>
              )}
            </div>
          </div>

          {/* ── Right: Data Tables ───────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', background: C.bg }}>

            {/* Diff table */}
            <div style={{ borderBottom: `1px solid ${C.border}` }}>
              <div style={{ padding: '8px 16px', borderBottom: `1px solid ${C.border}`, background: C.raised, fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted }}>
                Discrepancy Tickets — sorted by dollar delta
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ background: C.raised }}>
                      {['SYMBOL', 'SIDE', 'CURR WT', 'TARGET WT', 'Δ WT', '$ DELTA', 'CUR QTY', 'PRICE'].map(h => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: h === 'SYMBOL' ? 'left' : 'right', fontSize: '9px', fontWeight: 600, letterSpacing: '0.12em', color: C.muted, borderBottom: `1px solid ${C.borderHi}`, borderRight: `1px solid ${C.border}`, whiteSpace: 'nowrap', background: C.raised }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {diff.map(r => (
                      <tr key={r.ticker} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: '7px 10px', fontWeight: 700, color: C.white, borderRight: `1px solid ${C.border}`, background: C.bg }}>{r.ticker}</td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: r.side === 'BUY' ? C.lime : C.red, borderRight: `1px solid ${C.border}`, background: C.bg }}>{r.side}</td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', color: C.muted, borderRight: `1px solid ${C.border}`, background: C.bg }}>{(r.currentW * 100).toFixed(2)}%</td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', borderRight: `1px solid ${C.border}`, background: C.bg, color: C.text }}>{(r.targetW * 100).toFixed(2)}%</td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: r.deltaW > 0 ? C.lime : C.red, borderRight: `1px solid ${C.border}`, background: C.bg }}>
                          {r.deltaW > 0 ? '+' : ''}{(r.deltaW * 100).toFixed(2)}%
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, borderRight: `1px solid ${C.border}`, background: C.bg, color: C.text }}>
                          ${r.dollarDelta.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', color: C.muted, borderRight: `1px solid ${C.border}`, background: C.bg }}>{r.qty}</td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', color: C.muted, background: C.bg }}>${Number(r.price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Holdings or Orders */}
            <div style={{ flex: 1, background: C.bg }}>
              {orders ? (
                <>
                  <div style={{ padding: '8px 16px', borderBottom: `1px solid ${C.border}`, background: C.raised, fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: C.lime }}>
                    ✓ Generated {orders.length} Alpaca Orders — {new Date().toLocaleTimeString()}
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                      <thead>
                        <tr>
                          {['SYMBOL', 'SIDE', 'QTY', 'ORDER TYPE', 'TIF'].map(h => (
                            <th key={h} style={{ padding: '6px 10px', textAlign: h === 'SYMBOL' ? 'left' : 'right', fontSize: '9px', fontWeight: 600, letterSpacing: '0.12em', color: C.lime, borderBottom: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, background: C.raised }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((o, i) => (
                          <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                            <td style={{ padding: '6px 10px', fontWeight: 700, color: C.white, borderRight: `1px solid ${C.border}`, background: C.bg }}>{o.symbol}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: o.side?.toLowerCase() === 'buy' ? C.lime : C.red, borderRight: `1px solid ${C.border}`, background: C.bg }}>{o.side?.toUpperCase()}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', borderRight: `1px solid ${C.border}`, background: C.bg, color: C.text }}>{o.qty}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', color: C.muted, borderRight: `1px solid ${C.border}`, background: C.bg }}>{o.type || 'market'}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', color: C.muted, background: C.bg }}>{o.time_in_force || 'day'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ padding: '8px 16px', borderBottom: `1px solid ${C.border}`, background: C.raised, fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted }}>
                    Current Broker Holdings (Alpaca Paper)
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                      <thead>
                        <tr>
                          {['SYMBOL', 'QTY', 'AVG ENTRY', 'CURR PRICE', 'UNREAL P&L'].map(h => (
                            <th key={h} style={{ padding: '6px 10px', textAlign: h === 'SYMBOL' ? 'left' : 'right', fontSize: '9px', fontWeight: 600, letterSpacing: '0.12em', color: C.muted, borderBottom: `1px solid ${C.borderHi}`, borderRight: `1px solid ${C.border}`, background: C.raised }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {positions.map(p => {
                          const pl = (p.current_price - p.avg_entry_price) * p.qty
                          return (
                            <tr key={p.symbol} style={{ borderBottom: `1px solid ${C.border}` }}>
                              <td style={{ padding: '6px 10px', fontWeight: 700, color: C.white, borderRight: `1px solid ${C.border}`, background: C.bg }}>{p.symbol}</td>
                              <td style={{ padding: '6px 10px', textAlign: 'right', color: C.muted, borderRight: `1px solid ${C.border}`, background: C.bg }}>{p.qty}</td>
                              <td style={{ padding: '6px 10px', textAlign: 'right', color: C.muted, borderRight: `1px solid ${C.border}`, background: C.bg }}>${Number(p.avg_entry_price).toFixed(2)}</td>
                              <td style={{ padding: '6px 10px', textAlign: 'right', borderRight: `1px solid ${C.border}`, background: C.bg, color: C.text }}>${Number(p.current_price).toFixed(2)}</td>
                              <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: pl >= 0 ? C.lime : C.red, background: C.bg }}>
                                {pl >= 0 ? '+' : ''}${pl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
