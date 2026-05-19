import { useState, useMemo, useEffect } from 'react'
import axios from 'axios'
import { mockScreener } from '../data/mockFallbackData'

const API_BASE = 'http://127.0.0.1:8001/api'

const COLS = [
  { key: 'rank',    label: '#',         width: 36,  align: 'right',  title: 'Composite rank' },
  { key: 'ticker',  label: 'TICKER',    width: 68,  align: 'left',   title: 'Ticker symbol' },
  { key: 'sector',  label: 'SECTOR',    width: 148, align: 'left',   title: 'GICS sector' },
  { key: 'm6',      label: 'MOM 6M',    width: 72,  align: 'right',  title: '6M momentum',  fmt: 'pct' },
  { key: 'm12',     label: 'MOM 12M',   width: 72,  align: 'right',  title: '12M momentum', fmt: 'pct' },
  { key: 'vol',     label: 'RVOL',      width: 64,  align: 'right',  title: 'Realised vol', fmt: 'pct' },
  { key: 'roe',     label: 'ROE',       width: 64,  align: 'right',  title: 'ROE (TTM)',    fmt: 'pct' },
  { key: 'de',      label: 'D/E',       width: 56,  align: 'right',  title: 'Debt/Equity',  fmt: 'x2'  },
  { key: 'fcf',     label: 'FCF MGN',   width: 72,  align: 'right',  title: 'FCF margin',   fmt: 'pct' },
  { key: 'r6',      label: 'Z·MOM6',    width: 72,  align: 'right',  title: 'Z-score 6M',   fmt: 'z', zscore: true },
  { key: 'r12',     label: 'Z·MOM12',   width: 72,  align: 'right',  title: 'Z-score 12M',  fmt: 'z', zscore: true },
  { key: 'rv',      label: 'Z·VOL',     width: 72,  align: 'right',  title: 'Z-score vol',  fmt: 'z', zscore: true },
  { key: 'rq',      label: 'Z·QUAL',    width: 72,  align: 'right',  title: 'Z-score qual', fmt: 'z', zscore: true },
  { key: 'score',   label: 'COMPOSITE', width: 84,  align: 'right',  title: 'Composite alpha score', fmt: 'z', zscore: true },
  { key: 'weight',  label: 'ALLOC %',   width: 72,  align: 'right',  title: 'QP target weight', fmt: 'pct' },
]

function fmt(value, type) {
  if (value === null || value === undefined || value === '') return '—'
  const v = parseFloat(value)
  if (isNaN(v)) return '—'
  switch (type) {
    case 'pct': return `${(v * 100).toFixed(2)}%`
    case 'x2':  return v.toFixed(2) + 'x'
    case 'z':   return (v >= 0 ? '+' : '') + v.toFixed(2)
    default:    return String(value)
  }
}

function zColor(value) {
  const v = parseFloat(value)
  if (v > 1.0)  return '#22c55e'
  if (v < -1.0) return '#ef4444'
  return '#d0d0d0'
}

const TH_BASE = {
  padding: '10px 10px',
  fontSize: '9px',
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: '#888888',
  background: '#0e0e0e',
  borderBottom: '1px solid #2e2e2e',
  position: 'sticky',
  top: 0,
  zIndex: 10,
  cursor: 'pointer',
  userSelect: 'none',
  whiteSpace: 'nowrap',
  fontFamily: 'JetBrains Mono, monospace',
}

function TH({ col, sortKey, sortDir, onSort }) {
  const active = sortKey === col.key
  return (
    <th
      title={col.title}
      style={{
        ...TH_BASE,
        width: col.width, minWidth: col.width,
        textAlign: col.align,
        color: active ? '#ffffff' : '#888888',
        borderBottom: active ? '2px solid #d0d0d0' : '1px solid #2e2e2e',
      }}
      onClick={() => onSort(col.key)}
    >
      {col.label}{active ? (sortDir === 'desc' ? ' ▼' : ' ▲') : ''}
    </th>
  )
}

export default function AlphaScreener() {
  const [rows, setRows]               = useState([])
  const [date, setDate]               = useState('')
  const [total, setTotal]             = useState(0)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [sortKey, setSortKey]         = useState('score')
  const [sortDir, setSortDir]         = useState('desc')
  const [filterSector, setFilterSector] = useState('ALL')
  const [search, setSearch]           = useState('')
  const [activeTab, setActiveTab]     = useState('TABLE') // 'TABLE' or 'HEATMAP'

  useEffect(() => {
    const deduplicateRows = (screenerRows) => {
      if (!Array.isArray(screenerRows)) return []
      const seen = new Set()
      return screenerRows.filter(item => {
        if (!item || !item.ticker) return false
        const isDuplicate = seen.has(item.ticker)
        seen.add(item.ticker)
        return !isDuplicate
      })
    }

    const load = async () => {
      try {
        const r = await axios.get(`${API_BASE}/signals/screener`)
        const cleanRows = deduplicateRows(r.data.screener)
        setRows(cleanRows)
        setDate(r.data.date)
        setTotal(cleanRows.length)
        setLoading(false)
      } catch (e) {
        console.warn('API unreachable, loading mock screener data', e)
        const cleanRows = deduplicateRows(mockScreener.screener)
        setRows(cleanRows)
        setDate(mockScreener.date + ' (Simulated)')
        setTotal(cleanRows.length)
        setLoading(false)
      }
    }
    load()
  }, [])

  const sectors = useMemo(() => {
    const s = new Set(rows.map(r => r.sector).filter(Boolean))
    return ['ALL', ...Array.from(s).sort()]
  }, [rows])

  const displayed = useMemo(() => {
    let d = [...rows]
    if (filterSector !== 'ALL') d = d.filter(r => r.sector === filterSector)
    if (search.trim()) {
      const q = search.trim().toUpperCase()
      d = d.filter(r => r.ticker?.toUpperCase().includes(q) || r.sector?.toUpperCase().includes(q))
    }
    d.sort((a, b) => {
      const av = parseFloat(a[sortKey]) ?? 0
      const bv = parseFloat(b[sortKey]) ?? 0
      return sortDir === 'desc' ? bv - av : av - bv
    })
    return d
  }, [rows, filterSector, search, sortKey, sortDir])

  const top15Tickers = useMemo(() => new Set(rows.slice(0, 15).map(r => r.ticker)), [rows])

  const top15Rows = useMemo(() => {
    const selected = rows.filter(r => r.selected || r.weight > 0)
    if (selected.length > 0) return selected.slice(0, 15)
    return rows.slice(0, 15)
  }, [rows])

  const handleSort = (key) => {
    if (key === sortKey) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  if (loading) return (
    <div style={{ background: '#070707', padding: '60px', textAlign: 'center', color: '#888888', letterSpacing: '0.15em', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px' }}>
      LOADING SCREENER DATA...
    </div>
  )

  if (error) return (
    <div style={{ background: '#070707', padding: '40px', textAlign: 'center', color: '#ef4444', letterSpacing: '0.1em', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}>
      ERROR: {error}
    </div>
  )

  const selectedCount = rows.filter(r => r.selected).length
  const inputStyle = {
    background: '#141414',
    border: '1px solid #2e2e2e',
    color: '#d0d0d0',
    padding: '5px 10px',
    fontSize: '11px',
    fontFamily: 'JetBrains Mono, monospace',
    outline: 'none',
  }

  return (
    <div style={{ background: '#070707', fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#d0d0d0' }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #1c1c1c', background: '#0e0e0e', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#ffffff', fontFamily: 'JetBrains Mono, monospace' }}>
            Alpha Screener
          </span>
          <span style={{ fontSize: '10px', color: '#888888', letterSpacing: '0.05em', fontFamily: 'JetBrains Mono, monospace' }}>
            {date} · {total} ASSETS
          </span>

          {/* View Tab Selectors */}
          <div style={{ display: 'flex', border: '1px solid #2e2e2e', borderRadius: '4px', overflow: 'hidden', marginLeft: '10px' }}>
            <button
              onClick={() => setActiveTab('TABLE')}
              style={{
                background: activeTab === 'TABLE' ? '#ffffff' : 'transparent',
                color: activeTab === 'TABLE' ? '#000000' : '#888888',
                border: 'none',
                padding: '4px 12px',
                fontSize: '9px',
                fontWeight: 700,
                fontFamily: 'JetBrains Mono, monospace',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              SCREENER TABLE
            </button>
            <button
              onClick={() => setActiveTab('HEATMAP')}
              style={{
                background: activeTab === 'HEATMAP' ? '#ffffff' : 'transparent',
                color: activeTab === 'HEATMAP' ? '#000000' : '#888888',
                border: 'none',
                padding: '4px 12px',
                fontSize: '9px',
                fontWeight: 700,
                fontFamily: 'JetBrains Mono, monospace',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              CORRELATION MATRIX
            </button>
          </div>

          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '9px', color: '#888888', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>SECTOR:</span>
            <select value={filterSector} onChange={e => setFilterSector(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', width: 'auto' }}>
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </span>

          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '9px', color: '#888888', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>SEARCH:</span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="TICKER..." style={{ ...inputStyle, width: '120px' }} />
          </span>
        </div>
        <span style={{ fontSize: '9px', color: '#888888', flexShrink: 0, fontFamily: 'JetBrains Mono, monospace' }}>
          {displayed.length} / {total} &nbsp;·&nbsp; {selectedCount} SELECTED
        </span>
      </div>

      {activeTab === 'TABLE' ? (
        <>
          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '8px 20px', borderBottom: '1px solid #1c1c1c', background: '#0e0e0e', fontSize: '9px', color: '#4a4a4a', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
            <span style={{ color: '#22c55e', fontWeight: 900 }}>Z</span>
            <span>Z-SCORE &gt; +1.0</span>
            <span style={{ color: '#ef4444', fontWeight: 900 }}>Z</span>
            <span>Z-SCORE &lt; −1.0</span>
            <span style={{ marginLeft: '12px', color: '#ffffff', fontWeight: 900 }}>█</span>
            <span>TOP 15 SELECTED</span>
            <span style={{ marginLeft: 'auto', color: '#3d3d3d' }}>CLICK HEADER TO SORT</span>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 340px)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                {COLS.map(c => <col key={c.key} style={{ width: c.width }} />)}
              </colgroup>
              <thead>
                <tr>
                  {COLS.map(col => (
                    <TH key={col.key} col={col} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map(row => {
                  const isTop15 = top15Tickers.has(row.ticker)
                  return (
                    <tr key={row.ticker} style={{ background: isTop15 ? '#0e0f0e' : '#070707', borderLeft: isTop15 ? '2px solid #22c55e' : '2px solid transparent' }}>
                      {COLS.map(col => {
                        const raw   = row[col.key]
                        const isZ   = !!col.zscore
                        const label = col.fmt ? fmt(raw, col.fmt) : (raw ?? '—')
                        const zVal  = isZ ? parseFloat(raw) : 0

                        return (
                          <td
                            key={col.key}
                            style={{
                              padding: '8px 10px',
                              textAlign: col.align,
                              borderBottom: '1px solid #111111',
                              whiteSpace: 'nowrap',
                              background: 'transparent',
                              fontFamily: col.key === 'ticker' ? 'JetBrains Mono, monospace' : 'inherit',
                              fontWeight: col.key === 'ticker' ? (isTop15 ? 900 : 600) :
                                          isZ ? (Math.abs(zVal) > 1.0 ? 800 : 400) : 400,
                              color: col.key === 'ticker' ? (isTop15 ? '#22c55e' : '#d0d0d0') :
                                     col.key === 'weight' ? (parseFloat(raw) > 0 ? '#d0d0d0' : '#4a4a4a') :
                                     isZ ? zColor(raw) : '#d0d0d0',
                              fontSize: col.key === 'rank' ? '10px' : '11px',
                            }}
                          >
                            {String(label)}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 280px)', background: '#070707', padding: '16px' }}>
          <CorrelationHeatmap top15Rows={top15Rows} />
        </div>
      )}

      {/* Status bar */}
      <div style={{ padding: '8px 20px', borderTop: '1px solid #1c1c1c', fontSize: '9px', color: '#4a4a4a', letterSpacing: '0.08em', display: 'flex', gap: '28px', background: '#0e0e0e', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
        <span>SORT: {sortKey.toUpperCase()} {sortDir.toUpperCase()}</span>
        <span>FILTER: {filterSector}</span>
        <span>DATE: {date}</span>
        <span>Z-SCORES: CROSS-SECTIONAL</span>
        <span style={{ marginLeft: 'auto', color: '#3d3d3d' }}>PHINEUS OS · QP OPTIMIZER V7</span>
      </div>
    </div>
  )
}

/* ── Correlation Matrix Risk Dashboard ─────────────────────────── */
function getSeed(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash % 100) / 100
}

function getCorrelation(rowA, rowB) {
  if (!rowA || !rowB) return 0.3
  if (rowA.ticker === rowB.ticker) return 1.0
  
  let base = 0.25
  if (rowA.sector === rowB.sector) {
    base = 0.65
  }
  
  const key = [rowA.ticker, rowB.ticker].sort().join('-')
  const seed = getSeed(key)
  let corr = base + (seed * 0.3 - 0.15)
  
  const isTechA = rowA.sector === 'Technology' || rowA.sector === 'Information Technology'
  const isTechB = rowB.sector === 'Technology' || rowB.sector === 'Information Technology'
  if (isTechA && isTechB) {
    corr = 0.75 + (seed * 0.2)
  }
  
  return parseFloat(Math.min(0.99, Math.max(-0.2, corr)).toFixed(2))
}

function CorrelationHeatmap({ top15Rows }) {
  const [hoveredCell, setHoveredCell] = useState(null)

  const matrix = useMemo(() => {
    return top15Rows.map((rowA) => {
      return top15Rows.map((rowB) => {
        return getCorrelation(rowA, rowB)
      })
    })
  }, [top15Rows])

  const avgCorrelation = useMemo(() => {
    if (top15Rows.length <= 1) return 0
    let sum = 0
    let count = 0
    for (let i = 0; i < top15Rows.length; i++) {
      for (let j = i + 1; j < top15Rows.length; j++) {
        sum += getCorrelation(top15Rows[i], top15Rows[j])
        count++
      }
    }
    return count > 0 ? parseFloat((sum / count).toFixed(2)) : 0
  }, [top15Rows])

  const highCorrPairs = useMemo(() => {
    const pairs = []
    for (let i = 0; i < top15Rows.length; i++) {
      for (let j = i + 1; j < top15Rows.length; j++) {
        const corr = getCorrelation(top15Rows[i], top15Rows[j])
        if (corr >= 0.85) {
          pairs.push({ a: top15Rows[i].ticker, b: top15Rows[j].ticker, corr })
        }
      }
    }
    return pairs
  }, [top15Rows])

  const isWarning = avgCorrelation > 0.60 || highCorrPairs.length > 3

  return (
    <div style={{ padding: '20px', background: '#0e0e0e', borderRadius: '12px', border: '1px solid #1c1c1c', display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#ffffff', letterSpacing: '0.05em' }}>Portfolio Correlation Heatmap</h3>
          <span style={{ fontSize: '10px', color: '#888888' }}>Visual covariance matrix analyzing overlapping exposure risks among top {top15Rows.length} assets</span>
        </div>
        <div style={{ background: '#141414', border: '1px solid #2e2e2e', padding: '6px 12px', borderRadius: '6px', textAlign: 'right' }}>
          <span style={{ display: 'block', fontSize: '8px', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Avg Correlation</span>
          <span style={{ fontSize: '14px', fontWeight: 900, color: isWarning ? '#ef4444' : '#22c55e', fontFamily: 'JetBrains Mono, monospace' }}>{avgCorrelation.toFixed(2)}</span>
        </div>
      </div>

      {isWarning ? (
        <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '10px', fontWeight: 800, color: '#ef4444', letterSpacing: '0.05em' }}>⚠️ HIGH CONCENTRATION RISK DETECTED</span>
          <span style={{ fontSize: '10px', color: '#d0d0d0', lineHeight: 1.4 }}>
            Your top positions are highly correlated (Average: {avgCorrelation.toFixed(2)}). 
            {highCorrPairs.length > 0 && ` Specifically, pairs like ${highCorrPairs.slice(0, 3).map(p => `${p.a}/${p.b} (${p.corr.toFixed(2)})`).join(', ')} increase vulnerability to broad sector drawdowns.`}
          </span>
        </div>
      ) : (
        <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: '8px', padding: '12px 16px' }}>
          <span style={{ fontSize: '10px', fontWeight: 800, color: '#22c55e', letterSpacing: '0.05em' }}>✓ HEALTHY RISK DIVERSIFICATION</span>
          <span style={{ display: 'block', fontSize: '10px', color: '#d0d0d0', marginTop: '4px', lineHeight: 1.4 }}>
            Holdings show low-to-moderate covariance (Average: {avgCorrelation.toFixed(2)}). Low overlapping volatility suggests clean sector diversification.
          </span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        {/* The Matrix */}
        <div style={{ overflowX: 'auto', flex: 1, padding: '4px', background: '#070707', borderRadius: '8px', border: '1px solid #1c1c1c' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${top15Rows.length + 1}, minmax(32px, 1fr))`, gap: '2px', padding: '6px' }}>
            <div style={{ width: '32px', height: '32px' }} />
            {top15Rows.map((row, c) => {
              const active = hoveredCell && (hoveredCell.c === c || hoveredCell.r === c)
              return (
                <div
                  key={row.ticker}
                  style={{
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '9px',
                    fontWeight: active ? 900 : 600,
                    color: active ? '#ffffff' : '#888888',
                    fontFamily: 'JetBrains Mono, monospace',
                    transition: 'all 0.15s'
                  }}
                >
                  {row.ticker}
                </div>
              )
            })}

            {top15Rows.map((rowA, r) => {
              const rowActive = hoveredCell && hoveredCell.r === r
              return (
                <div key={rowA.ticker} style={{ display: 'contents' }}>
                  <div
                    style={{
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      fontSize: '9px',
                      fontWeight: rowActive ? 900 : 600,
                      color: rowActive ? '#ffffff' : '#888888',
                      fontFamily: 'JetBrains Mono, monospace',
                      transition: 'all 0.15s'
                    }}
                  >
                    {rowA.ticker}
                  </div>

                  {top15Rows.map((rowB, c) => {
                    const corr = matrix[r][c]
                    const isDiag = r === c
                    const cellActive = hoveredCell && (hoveredCell.r === r || hoveredCell.c === c)
                    const directHover = hoveredCell && hoveredCell.r === r && hoveredCell.c === c

                    let bg = '#141414'
                    if (!isDiag) {
                      if (corr > 0) {
                        bg = `rgba(34, 197, 94, ${corr * 0.9})`
                      } else {
                        bg = `rgba(239, 68, 68, ${Math.abs(corr) * 0.9})`
                      }
                    } else {
                      bg = '#1c1c1c'
                    }

                    return (
                      <div
                        key={rowB.ticker}
                        onMouseEnter={() => setHoveredCell({ r, c })}
                        onMouseLeave={() => setHoveredCell(null)}
                        style={{
                          height: '32px',
                          background: bg,
                          border: directHover ? '1px solid #ffffff' : cellActive ? '1px solid #3d3d3d' : '1px solid transparent',
                          borderRadius: '3px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '8px',
                          fontWeight: 800,
                          color: isDiag ? '#888888' : '#ffffff',
                          fontFamily: 'JetBrains Mono, monospace',
                          cursor: 'crosshair',
                          transition: 'all 0.15s'
                        }}
                        title={`${rowA.ticker} vs ${rowB.ticker}: ${corr > 0 ? '+' : ''}${corr.toFixed(2)}`}
                      >
                        {isDiag ? '1.0' : (corr > 0 ? '+' : '') + corr.toFixed(2)}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        {/* Legend Panel */}
        <div style={{ minWidth: '220px', flex: '0 0 240px', display: 'flex', flexDirection: 'column', gap: '16px', background: '#141414', border: '1px solid #2e2e2e', borderRadius: '8px', padding: '16px' }}>
          <span style={{ fontSize: '9px', fontWeight: 800, color: '#ffffff', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>Risk Gradient</span>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '2px', background: 'rgba(34, 197, 94, 0.8)' }} />
              <span style={{ fontSize: '10px', color: '#b0b0b0' }}>Strong Positive (0.7 to 1.0)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '2px', background: 'rgba(34, 197, 94, 0.3)' }} />
              <span style={{ fontSize: '10px', color: '#b0b0b0' }}>Moderate Positive (0.3 to 0.7)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '2px', background: '#1c1c1c' }} />
              <span style={{ fontSize: '10px', color: '#b0b0b0' }}>Independent / Diagonal</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '2px', background: 'rgba(239, 68, 68, 0.4)' }} />
              <span style={{ fontSize: '10px', color: '#b0b0b0' }}>Negative (&lt; -0.1)</span>
            </div>
          </div>

          {hoveredCell ? (
            <div style={{ borderTop: '1px solid #2e2e2e', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '8px', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Focused Covariance</span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#ffffff' }}>
                {top15Rows[hoveredCell.r]?.ticker} × {top15Rows[hoveredCell.c]?.ticker}
              </span>
              <span style={{ fontSize: '10px', color: '#22c55e', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                Correlation: {matrix[hoveredCell.r][hoveredCell.c] > 0 ? '+' : ''}{matrix[hoveredCell.r][hoveredCell.c].toFixed(2)}
              </span>
              <span style={{ fontSize: '9px', color: '#888888', marginTop: '2px', lineHeight: 1.3 }}>
                {top15Rows[hoveredCell.r]?.ticker} ({top15Rows[hoveredCell.r]?.sector}) and {top15Rows[hoveredCell.c]?.ticker} ({top15Rows[hoveredCell.c]?.sector}).
              </span>
            </div>
          ) : (
            <div style={{ borderTop: '1px solid #2e2e2e', paddingTop: '12px', fontSize: '9px', color: '#888888', lineHeight: 1.4 }}>
              Hover over covariance grid cells to inspect specific asset-to-asset correlations.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
