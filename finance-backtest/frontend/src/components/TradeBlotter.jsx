import { useEffect, useState, useMemo } from 'react'
import axios from 'axios'

const API = 'http://127.0.0.1:8001/api'

// ─── Raw system-UI color tokens ──────────────────────────────────────────
const C = {
  bg:       '#ffffff',
  base:     '#ffffff',
  raised:   '#ffffff',
  border:   '#e5e7eb',
  borderHi: '#000000',
  dim:      '#000000',
  muted:    '#000000',
  sub:      '#000000',
  white:    '#ffffff',
  lime:     '#000000',
  red:      '#000000',
  green:    '#000000',
}

// ─── Reconciliation row math ─────────────────────────────────────────────
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

// ─── Tiny label/value row ────────────────────────────────────────────────
function KV({ label, value, valueColor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: `1px solid ${C.border}`, padding: '5px 0' }}>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted }}>{label}</span>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, color: valueColor || C.white }}>{value}</span>
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
  const [confirmed, setConfirmed]   = useState(false)  // two-step confirm gate

  const load = async () => {
    setLoading(true); setError(null); setOrders(null); setConfirmed(false)
    try {
      const [pR, wR] = await Promise.all([
        axios.get(`${API}/portfolio/alpaca_positions`),
        axios.get(`${API}/portfolio/current_weights`),
      ])
      setPositions(pR.data.positions)
      setWeights(wR.data.weights)
      setRebalDate(wR.data.date)
    } catch { setError('API UNREACHABLE') }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const diff = useMemo(() => buildDiff(weights, positions, aum), [weights, positions, aum])

  const handleExecute = async () => {
    if (!confirmed) { setConfirmed(true); return }   // first press → arm
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

  // ─── Layout constants ────────────────────────────────────────────────
  const mono = { fontFamily: 'JetBrains Mono, monospace' }

  return (
    <div style={{ background: C.bg, color: C.white, minHeight: '100%', ...mono, fontSize: '12px' }}>

      {/* ══ TOP BAND ═══════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: `2px solid ${C.borderHi}`, background: C.base }}>
        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
          Trade Blotter — Execution Terminal
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '9px', color: C.muted, letterSpacing: '0.1em' }}>
            TARGET DATE: {rebalDate}
          </span>
          <span style={{ fontSize: '9px', color: C.muted, letterSpacing: '0.1em' }}>
            BROKER: ALPACA PAPER
          </span>
          <button
            onClick={load}
            style={{ background: 'none', border: `1px solid ${C.border}`, color: C.muted, padding: '3px 10px', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}
          >
            ↺ REFRESH
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: C.muted, letterSpacing: '0.2em', fontSize: '10px' }}>LOADING…</div>
      ) : error ? (
        <div style={{ padding: '40px', color: C.red, letterSpacing: '0.1em', fontSize: '11px', borderLeft: `4px solid ${C.red}`, margin: '24px' }}>{error}</div>
      ) : (
        /* ══ MAIN BODY — INTENTIONALLY ASYMMETRIC COLUMNS ══════════════════ */
        /* Left col is narrow and tall (auth terminal), right col is wide (data) */
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', minHeight: 'calc(100vh - 300px)' }}>

          {/* ─── LEFT: AUTHORIZATION TERMINAL ────────────────────────────── */}
          <div style={{ borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>

            {/* AUM input — raw system UI */}
            <div style={{ padding: '16px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, marginBottom: '8px' }}>
                Account AUM
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '13px', color: C.dim }}>$</span>
                <input
                  type="number"
                  value={aum}
                  onChange={e => setAum(Math.max(1000, parseInt(e.target.value) || 0))}
                  style={{
                    /* Deliberately unstyled — system default appearance */
                    background: 'transparent',
                    border: 'none',
                    borderBottom: `1px solid ${C.border}`,
                    color: C.white,
                    fontSize: '22px',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 700,
                    width: '100%',
                    outline: 'none',
                    padding: '2px 0',
                  }}
                />
              </div>
            </div>

            {/* Reconciliation stats */}
            <div style={{ padding: '16px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, marginBottom: '12px' }}>
                Reconciliation
              </div>
              <KV label="Positions out-of-sync" value={diff.length} />
              <KV label="Buy orders" value={diff.filter(r => r.side === 'BUY').length} valueColor={C.lime} />
              <KV label="Sell orders" value={diff.filter(r => r.side === 'SELL').length} valueColor={C.red} />
              <KV label="Est. gross turnover" value={`$${diff.reduce((s, r) => s + r.dollarDelta, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
              <KV label="Target positions" value={weights.filter(w => w.weight > 0).length} />
            </div>

            {/* Execution rules note */}
            <div style={{ padding: '16px', borderBottom: `1px solid ${C.border}`, fontSize: '9px', color: C.dim, lineHeight: 1.6, letterSpacing: '0.04em' }}>
              ORDERS ARE FLOOR-ROUNDED TO PREVENT MARGIN OVERDRAFT.
              SIDE DETERMINED BY DELTA-WEIGHT SIGN.
              ORDER TYPE: MARKET · TIF: DAY.
            </div>

            {/* ── THE BIG BUTTON — stark, massive, no embellishment ── */}
            <div style={{ padding: '20px', marginTop: 'auto' }}>

              {/* Confirmation gate message */}
              {confirmed && !executing && (
                <div style={{
                  border: `2px solid ${C.red}`,
                  padding: '10px',
                  marginBottom: '12px',
                  fontSize: '10px',
                  color: C.red,
                  letterSpacing: '0.08em',
                  lineHeight: 1.5,
                }}>
                  ⚠ CONFIRM: THIS WILL SUBMIT {diff.length} LIVE MARKET ORDERS.
                  PRESS AGAIN TO AUTHORIZE.
                </div>
              )}

              <button
                onClick={handleExecute}
                disabled={executing || diff.length === 0}
                style={{
                  display: 'block',
                  width: '100%',
                  /* Massive, stark typography — the entire button IS the text */
                  fontSize: diff.length === 0 ? '14px' : (confirmed ? '18px' : '22px'),
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontWeight: 900,
                  letterSpacing: executing ? '0.05em' : '-0.01em',
                  textTransform: 'uppercase',
                  lineHeight: 1.1,
                  /* No decoration — outline only when armed */
                  background:   confirmed    ? C.red
                                : diff.length === 0 ? C.raised
                                : C.lime,
                  color:        diff.length === 0 ? C.dim
                                : C.black || '#000000',
                  border:       'none',
                  padding:      '24px 16px',
                  cursor:       diff.length === 0 ? 'not-allowed' : 'pointer',
                  /* Deliberately no border-radius (handled by global reset) */
                }}
              >
                {executing
                  ? 'SENDING ORDERS…'
                  : diff.length === 0
                  ? 'NO ORDERS\nREQUIRED'
                  : confirmed
                  ? `CONFIRM\n${diff.length} ORDERS`
                  : 'EXECUTE\nREBALANCE'}
              </button>

              {orders && !executing && (
                <div style={{ marginTop: '12px', padding: '10px', border: `1px solid ${C.lime}`, fontSize: '9px', color: C.lime, letterSpacing: '0.1em', lineHeight: 1.5 }}>
                  ✓ DONE — {orders.length} ORDERS GENERATED
                </div>
              )}
            </div>
          </div>

          {/* ─── RIGHT: TWO-PANEL DATA AREA ──────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>

            {/* Top half: diff table */}
            <div style={{ borderBottom: `1px solid ${C.border}` }}>
              <div style={{ padding: '8px 16px', borderBottom: `1px solid ${C.border}`, background: C.raised, fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted }}>
                Discrepancy Tickets — sorted by dollar delta
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ background: C.raised }}>
                      {['SYMBOL', 'SIDE', 'CURR WT', 'TARGET WT', 'Δ WT', '$ DELTA', 'CUR QTY', 'PRICE'].map(h => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: h === 'SYMBOL' ? 'left' : 'right', fontSize: '9px', fontWeight: 600, letterSpacing: '0.12em', color: C.muted, borderBottom: `2px solid ${C.borderHi}`, borderRight: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>
                          {h === 'SYMBOL' ? h : h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {diff.map((r, i) => (
                      <tr key={r.ticker} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: '7px 10px', fontWeight: 700, color: C.white, borderRight: `1px solid ${C.border}` }}>{r.ticker}</td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: r.side === 'BUY' ? C.lime : C.red, borderRight: `1px solid ${C.border}` }}>{r.side}</td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', color: C.muted, borderRight: `1px solid ${C.border}` }}>{(r.currentW * 100).toFixed(2)}%</td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', borderRight: `1px solid ${C.border}` }}>{(r.targetW * 100).toFixed(2)}%</td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: r.deltaW > 0 ? C.lime : C.red, borderRight: `1px solid ${C.border}` }}>
                          {r.deltaW > 0 ? '+' : ''}{(r.deltaW * 100).toFixed(2)}%
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, borderRight: `1px solid ${C.border}` }}>
                          ${r.dollarDelta.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', color: C.muted, borderRight: `1px solid ${C.border}` }}>{r.qty}</td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', color: C.muted }}>${Number(r.price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom half: generated orders OR current holdings */}
            <div style={{ flex: 1 }}>
              {orders ? (
                <>
                  <div style={{ padding: '8px 16px', borderBottom: `1px solid ${C.border}`, background: C.raised, fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: C.lime }}>
                    ✓ Generated {orders.length} Alpaca Orders — {new Date().toLocaleTimeString()}
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                      <thead>
                        <tr style={{ background: C.raised }}>
                          {['SYMBOL', 'SIDE', 'QTY', 'ORDER TYPE', 'TIF'].map(h => (
                            <th key={h} style={{ padding: '6px 10px', textAlign: h === 'SYMBOL' ? 'left' : 'right', fontSize: '9px', fontWeight: 600, letterSpacing: '0.12em', color: C.lime, borderBottom: `1px solid ${C.lime}`, borderRight: `1px solid ${C.border}` }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((o, i) => (
                          <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                            <td style={{ padding: '6px 10px', fontWeight: 700, color: C.white, borderRight: `1px solid ${C.border}` }}>{o.symbol}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: o.side?.toLowerCase() === 'buy' ? C.lime : C.red, borderRight: `1px solid ${C.border}` }}>{o.side?.toUpperCase()}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', borderRight: `1px solid ${C.border}` }}>{o.qty}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', color: C.muted, borderRight: `1px solid ${C.border}` }}>{o.type || 'market'}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', color: C.muted }}>{o.time_in_force || 'day'}</td>
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
                        <tr style={{ background: C.raised }}>
                          {['SYMBOL', 'QTY', 'AVG ENTRY', 'CURR PRICE', 'UNREAL P&L'].map(h => (
                            <th key={h} style={{ padding: '6px 10px', textAlign: h === 'SYMBOL' ? 'left' : 'right', fontSize: '9px', fontWeight: 600, letterSpacing: '0.12em', color: C.muted, borderBottom: `2px solid ${C.borderHi}`, borderRight: `1px solid ${C.border}` }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {positions.map(p => {
                          const pl = (p.current_price - p.avg_entry_price) * p.qty
                          return (
                            <tr key={p.symbol} style={{ borderBottom: `1px solid ${C.border}` }}>
                              <td style={{ padding: '6px 10px', fontWeight: 700, color: C.white, borderRight: `1px solid ${C.border}` }}>{p.symbol}</td>
                              <td style={{ padding: '6px 10px', textAlign: 'right', color: C.sub, borderRight: `1px solid ${C.border}` }}>{p.qty}</td>
                              <td style={{ padding: '6px 10px', textAlign: 'right', color: C.muted, borderRight: `1px solid ${C.border}` }}>${Number(p.avg_entry_price).toFixed(2)}</td>
                              <td style={{ padding: '6px 10px', textAlign: 'right', borderRight: `1px solid ${C.border}` }}>${Number(p.current_price).toFixed(2)}</td>
                              <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: pl >= 0 ? C.lime : C.red }}>
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
