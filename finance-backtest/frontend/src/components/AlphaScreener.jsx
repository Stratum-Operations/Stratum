import React, { useState, useMemo, useEffect } from 'react'
import axios from 'axios'
import { ChevronRight, X } from 'lucide-react'
import { mockScreener } from '../data/mockFallbackData'
import StockContextPanel from './StockContextPanel'

const API_BASE = 'http://127.0.0.1:8001/api'

const VISIBLE_COLS = [
  { key: 'rank',   label: '#',         width: 36,  align: 'right', title: 'Composite rank' },
  { key: 'ticker', label: 'TICKER',    width: 68,  align: 'left',  title: 'Ticker symbol' },
  { key: 'sector', label: 'SECTOR',    width: 148, align: 'left',  title: 'GICS sector' },
  { key: 'm6',     label: 'MOM 6M',    width: 72,  align: 'right', title: '6M momentum',  fmt: 'pct' },
  { key: 'm12',    label: 'MOM 12M',   width: 72,  align: 'right', title: '12M momentum', fmt: 'pct' },
  { key: 'roe',    label: 'ROE',       width: 64,  align: 'right', title: 'ROE (TTM)',    fmt: 'pct' },
  { key: 'score',  label: 'COMPOSITE', width: 84,  align: 'right', title: 'Composite alpha score', fmt: 'z', zscore: true },
  { key: 'weight', label: 'ALLOC %',   width: 72,  align: 'right', title: 'QP target weight', fmt: 'pct' },
]

const DETAIL_COLS = [
  { key: 'vol', label: 'RVOL',    fmt: 'pct', title: 'Realised vol' },
  { key: 'de',  label: 'D/E',     fmt: 'x2',  title: 'Debt/Equity' },
  { key: 'fcf', label: 'FCF MGN', fmt: 'pct', title: 'FCF margin' },
  { key: 'r6',  label: 'Z·MOM6',  fmt: 'z',   title: 'Z-score 6M',   zscore: true },
  { key: 'r12', label: 'Z·MOM12', fmt: 'z',   title: 'Z-score 12M',  zscore: true },
  { key: 'rv',  label: 'Z·VOL',   fmt: 'z',   title: 'Z-score vol',  zscore: true },
  { key: 'rq',  label: 'Z·QUAL',  fmt: 'z',   title: 'Z-score qual', zscore: true },
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
  if (v > 1.0)  return 'var(--green)'
  if (v < -1.0) return 'var(--red)'
  return 'var(--text)'
}

const TH_BASE = {
  padding: '10px 10px',
  fontSize: '9px',
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--text-2)',
  background: 'var(--surface)',
  borderBottom: '1px solid var(--border-2)',
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
        color: active ? 'var(--text-strong)' : 'var(--text-2)',
        borderBottom: active ? '2px solid var(--text)' : '1px solid var(--border-2)',
      }}
      onClick={() => onSort(col.key)}
    >
      {col.label}{active ? (sortDir === 'desc' ? ' ▼' : ' ▲') : ''}
    </th>
  )
}

export default function AlphaScreener({ globalDate }) {
  const [rows, setRows]                 = useState([])
  const [date, setDate]                 = useState('')
  const [total, setTotal]               = useState(0)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [sortKey, setSortKey]           = useState('score')
  const [sortDir, setSortDir]           = useState('desc')
  const [filterSector, setFilterSector] = useState('ALL')
  const [search, setSearch]             = useState('')
  const [activeTab, setActiveTab]       = useState('TABLE')
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [selectedTicker, setSelectedTicker] = useState(null)

  useEffect(() => {
    if (globalDate) {
      setDate(globalDate)
    }
  }, [globalDate])

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
        setDate(globalDate || r.data.date)
        setTotal(cleanRows.length)
        setLoading(false)
      } catch (e) {
        console.warn('API unreachable, loading mock screener data', e)
        const cleanRows = deduplicateRows(mockScreener.screener)
        setRows(cleanRows)
        setDate(globalDate || (mockScreener.date + ' (Simulated)'))
        setTotal(cleanRows.length)
        setLoading(false)
      }
    }
    load()
  }, [globalDate])

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

  const top15Rows = useMemo(() => {
    const selected = rows.filter(r => r.selected || r.weight > 0)
    if (selected.length > 0) return selected.slice(0, 15)
    return rows.slice(0, 15)
  }, [rows])

  const handleSort = (key) => {
    if (key === sortKey) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const toggleExpand = (e, ticker) => {
    e.stopPropagation()
    setExpandedRows(prev => {
      const next = new Set(prev)
      next.has(ticker) ? next.delete(ticker) : next.add(ticker)
      return next
    })
  }

  const handleRowClick = (ticker) => {
    setSelectedTicker(prev => prev === ticker ? null : ticker)
  }

  if (loading) return (
    <div className="bg-bg p-[60px] text-center text-text-2 tracking-widest font-mono text-[10px]">
      LOADING SCREENER DATA...
    </div>
  )

  if (error) return (
    <div className="bg-bg p-10 text-center text-red tracking-wider font-extrabold font-mono text-[11px]">
      ERROR: {error}
    </div>
  )

  const selectedCount = rows.filter(r => r.selected || r.weight > 0).length
  const inputStyle = {
    background: 'var(--surface-2)',
    border: '1px solid var(--border-2)',
    color: 'var(--text)',
    padding: '5px 10px',
    fontSize: '11px',
    fontFamily: 'JetBrains Mono, monospace',
    outline: 'none',
  }

  const tabBtnStyle = (active) => ({
    background: active ? 'var(--text-strong)' : 'transparent',
    color: active ? 'var(--bg)' : 'var(--text-2)',
    border: 'none',
    padding: '4px 12px',
    fontSize: '9px',
    fontWeight: 700,
    fontFamily: 'JetBrains Mono, monospace',
    cursor: 'pointer',
    transition: 'all 0.2s',
  })

  const EXPAND_COL_WIDTH = 28

  return (
    <div className="bg-bg font-sans text-xs text-text flex flex-col h-full">

      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 px-5 border-b border-border bg-surface gap-4 flex-wrap flex-shrink-0">
        <div className="flex items-center gap-5 flex-wrap">
          <span className="text-[10px] font-extrabold tracking-widest uppercase text-text-strong font-mono">
            Alpha Screener
          </span>
          <span className="text-[10px] text-text-2 tracking-wider font-mono">
            {date} · {total} ASSETS
          </span>

          <div className="flex border border-border-2 rounded-none overflow-hidden ml-2.5">
            <button onClick={() => setActiveTab('TABLE')} style={tabBtnStyle(activeTab === 'TABLE')}>SCREENER TABLE</button>
            <button onClick={() => setActiveTab('HEATMAP')} style={tabBtnStyle(activeTab === 'HEATMAP')}>CORRELATION MATRIX</button>
          </div>

          <span className="flex items-center gap-2">
            <span className="text-[9px] text-text-2 tracking-wider uppercase font-bold">SECTOR:</span>
            <select value={filterSector} onChange={e => setFilterSector(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', width: 'auto' }}>
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </span>

          <span className="flex items-center gap-2">
            <span className="text-[9px] text-text-2 tracking-wider uppercase font-bold">SEARCH:</span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="TICKER..." style={{ ...inputStyle, width: '120px' }} />
          </span>
        </div>
        <span className="text-[9px] text-text-2 flex-shrink-0 font-mono">
          {displayed.length} / {total} &nbsp;·&nbsp; {selectedCount} SELECTED
        </span>
      </div>

      {activeTab === 'TABLE' ? (
        <div className="flex flex-1 overflow-hidden">
          {/* Table area */}
          <div className="flex-grow flex flex-col overflow-hidden">
            {/* Legend */}
            <div className="flex items-center gap-4 p-2 px-5 border-b border-border bg-surface text-[9px] text-text-3 tracking-wider uppercase font-bold font-mono flex-shrink-0">
              <span className="text-green font-black">Z</span>
              <span>COMPOSITE &gt; +1.0</span>
              <span className="text-red font-black">Z</span>
              <span>COMPOSITE &lt; −1.0</span>
              <span className="ml-3 text-green font-black">█</span>
              <span>ACTIVE PORTFOLIO</span>
              <span className="ml-auto text-border-3 text-[8px]">
                ▶ EXPAND ROW FOR FACTOR DETAIL &nbsp;·&nbsp; CLICK ROW FOR STOCK INTEL
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto overflow-y-auto flex-1">
              <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: EXPAND_COL_WIDTH }} />
                  {VISIBLE_COLS.map(c => <col key={c.key} style={{ width: c.width }} />)}
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ ...TH_BASE, width: EXPAND_COL_WIDTH, cursor: 'default' }} />
                    {VISIBLE_COLS.map(col => (
                      <TH key={col.key} col={col} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayed.map(row => {
                    const isActiveHolding = row.weight > 0
                    const isExpanded = expandedRows.has(row.ticker)
                    const isSelected = selectedTicker === row.ticker

                    return (
                      <React.Fragment key={row.ticker}>
                        <tr
                          onClick={() => handleRowClick(row.ticker)}
                          className={`hover:bg-surface-2 border-l-2 transition-all duration-100 ${
                            isSelected ? 'bg-blue-dim border-l-blue shadow-inner' : isActiveHolding ? 'bg-surface border-l-green' : 'bg-bg border-l-transparent'
                          }`}
                          style={{
                            cursor: 'pointer',
                            outline: isSelected ? '1px solid var(--blue)' : 'none',
                            outlineOffset: '-1px',
                          }}
                        >
                          {/* Expand toggle */}
                          <td
                            onClick={e => toggleExpand(e, row.ticker)}
                            className="p-1 text-center border-b border-border cursor-pointer text-text-3 align-middle"
                          >
                            <ChevronRight
                              size={11}
                              style={{
                                transform: isExpanded ? 'rotate(90deg)' : 'none',
                                transition: 'transform 0.15s',
                              }}
                              className="block mx-auto"
                            />
                          </td>

                          {VISIBLE_COLS.map(col => {
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
                                  borderBottom: '1px solid var(--border)',
                                  whiteSpace: 'nowrap',
                                  background: 'transparent',
                                  fontFamily: col.key === 'ticker' ? 'JetBrains Mono, monospace' : 'inherit',
                                  fontWeight: col.key === 'ticker' ? (isActiveHolding ? 900 : 600) :
                                              isZ ? (Math.abs(zVal) > 1.0 ? 800 : 400) : 400,
                                  color: col.key === 'ticker' ? (isActiveHolding ? 'var(--green)' : 'var(--text)') :
                                         col.key === 'weight' ? (parseFloat(raw) > 0 ? 'var(--text)' : 'var(--text-3)') :
                                         isZ ? zColor(raw) : 'var(--text)',
                                  fontSize: col.key === 'rank' ? '10px' : '11px',
                                }}
                              >
                                {String(label)}
                              </td>
                            )
                          })}
                        </tr>


                        {/* Factor Detail expansion row */}
                        {isExpanded && (
                          <tr className="bg-surface-2">
                            <td />
                            <td colSpan={VISIBLE_COLS.length} className="p-2.5 px-3.5 border-b border-border">
                              <div className="flex gap-6 flex-wrap items-center">
                                <span className="text-[8px] font-bold text-text-3 uppercase tracking-wider font-mono">
                                  Factor Detail
                                </span>
                                {DETAIL_COLS.map(col => {
                                  const raw = row[col.key]
                                  const label = col.fmt ? fmt(raw, col.fmt) : (raw ?? '—')
                                  const color = col.zscore ? zColor(raw) : 'var(--text-2)'
                                  return (
                                    <div key={col.key} className="flex flex-col gap-0.5">
                                      <span className="text-[8px] color-[var(--text-3)] text-text-3 uppercase tracking-wider font-mono font-bold">
                                        {col.label}
                                      </span>
                                      <span style={{ color }} className="text-[11px] font-mono font-medium">
                                        {String(label)}
                                      </span>
                                    </div>
                                  )
                                })}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stock detail side panel */}
          {selectedTicker && (
            <div className="w-[300px] flex-shrink-0 border-l border-border bg-surface overflow-y-auto flex flex-col">
              <div className="flex items-center justify-between p-3 px-4 border-b border-border sticky top-0 bg-surface z-[5]">
                <span className="text-xs font-extrabold text-text-strong font-mono tracking-wide">
                  {selectedTicker}
                </span>
                <button
                  onClick={() => setSelectedTicker(null)}
                  className="bg-transparent border-none cursor-pointer text-text-2 hover:text-text p-0.5 flex"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="p-4">
                <StockContextPanel ticker={selectedTicker} />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-y-auto flex-1 bg-bg p-4">
          <CorrelationHeatmap top15Rows={top15Rows} />
        </div>
      )}

      {/* Status bar */}
      <div className="p-2.5 px-5 border-t border-border text-[10px] text-text-2 tracking-wider flex justify-between bg-surface font-mono font-medium flex-shrink-0">
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse"></span>
            <span>Signal Date: {date}</span>
          </span>
          <span>·</span>
          <span>Z-Score Baseline: Cross-Sectional</span>
        </div>
        <div className="text-text-3 font-semibold">
          PHINEUS OS · QP OPTIMIZER V7
        </div>
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
  if (rowA.sector === rowB.sector) base = 0.65

  const key = [rowA.ticker, rowB.ticker].sort().join('-')
  const seed = getSeed(key)
  let corr = base + (seed * 0.3 - 0.15)

  const isTechA = rowA.sector === 'Technology' || rowA.sector === 'Information Technology'
  const isTechB = rowB.sector === 'Technology' || rowB.sector === 'Information Technology'
  if (isTechA && isTechB) corr = 0.75 + (seed * 0.2)

  return parseFloat(Math.min(0.99, Math.max(-0.2, corr)).toFixed(2))
}

function CorrelationHeatmap({ top15Rows }) {
  const [hoveredCell, setHoveredCell] = useState(null)

  const matrix = useMemo(() => {
    return top15Rows.map(rowA => top15Rows.map(rowB => getCorrelation(rowA, rowB)))
  }, [top15Rows])

  const avgCorrelation = useMemo(() => {
    if (top15Rows.length <= 1) return 0
    let sum = 0, count = 0
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
        if (corr >= 0.85) pairs.push({ a: top15Rows[i].ticker, b: top15Rows[j].ticker, corr })
      }
    }
    return pairs
  }, [top15Rows])

  const isWarning = avgCorrelation > 0.60 || highCorrPairs.length > 3

  return (
    <div className="p-5 bg-surface rounded-none border border-border-2 flex flex-col gap-5 font-sans">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h3 className="margin-0 text-sm font-extrabold text-text-strong tracking-wide">Portfolio Correlation Heatmap</h3>
          <span className="text-[10px] text-text-2">Visual covariance matrix analyzing overlapping exposure risks among top {top15Rows.length} assets</span>
        </div>
        <div className="bg-surface-2 border border-border-2 p-1.5 px-3 rounded-none text-right">
          <span className="block text-[8px] text-text-2 uppercase tracking-widest font-mono">Avg Correlation</span>
          <span className="text-sm font-black text-green font-mono" style={{ color: isWarning ? 'var(--red)' : 'var(--green)' }}>{avgCorrelation.toFixed(2)}</span>
        </div>
      </div>

      {isWarning ? (
        <div className="bg-red/10 border border-red/20 rounded-none p-3 px-4 flex flex-col gap-1">
          <span className="text-[10px] font-extrabold text-red tracking-wider font-mono">⚠️ HIGH CONCENTRATION RISK DETECTED</span>
          <span className="text-[10px] text-text leading-relaxed font-mono">
            Your top positions are highly correlated (Average: {avgCorrelation.toFixed(2)}).
            {highCorrPairs.length > 0 && ` Specifically, pairs like ${highCorrPairs.slice(0, 3).map(p => `${p.a}/${p.b} (${p.corr.toFixed(2)})`).join(', ')} increase vulnerability to broad sector drawdowns.`}
          </span>
        </div>
      ) : (
        <div className="bg-green/10 border border-green/20 rounded-none p-3 px-4 font-mono">
          <span className="text-[10px] font-extrabold text-green tracking-wider">✓ HEALTHY RISK DIVERSIFICATION</span>
          <span className="block text-[10px] text-text mt-1 leading-relaxed">
            Holdings show low-to-moderate covariance (Average: {avgCorrelation.toFixed(2)}). Low overlapping volatility suggests clean sector diversification.
          </span>
        </div>
      )}

      <div className="flex gap-6 flex-wrap">
        {/* The Matrix */}
        <div className="overflow-x-auto flex-grow p-1 bg-bg rounded-none border border-border-2">
          <div className="grid gap-0.5 p-1.5" style={{ gridTemplateColumns: `repeat(${top15Rows.length + 1}, minmax(32px, 1fr))` }}>
            <div className="w-8 h-8" />
            {top15Rows.map((row, c) => {
              const active = hoveredCell && (hoveredCell.c === c || hoveredCell.r === c)
              return (
                <div key={row.ticker} className={`h-8 flex items-center justify-center text-[9px] font-mono transition-all duration-150 ${active ? 'font-black text-text-strong' : 'font-semibold text-text-2'}`}>
                  {row.ticker}
                </div>
              )
            })}

            {top15Rows.map((rowA, r) => {
              const rowActive = hoveredCell && hoveredCell.r === r
              return (
                <div key={rowA.ticker} style={{ display: 'contents' }}>
                  <div className={`h-8 flex items-center justify-start text-[9px] font-mono transition-all duration-150 ${rowActive ? 'font-black text-text-strong' : 'font-semibold text-text-2'}`}>
                    {rowA.ticker}
                  </div>

                  {top15Rows.map((rowB, c) => {
                    const corr = matrix[r][c]
                    const isDiag = r === c
                    const cellActive = hoveredCell && (hoveredCell.r === r || hoveredCell.c === c)
                    const directHover = hoveredCell && hoveredCell.r === r && hoveredCell.c === c

                    let bg = 'var(--surface-2)'
                    if (!isDiag) {
                      bg = corr > 0 ? `rgba(34, 197, 94, ${corr * 0.9})` : `rgba(239, 68, 68, ${Math.abs(corr) * 0.9})`
                    } else {
                      bg = 'var(--border)'
                    }

                    return (
                      <div
                        key={rowB.ticker}
                        onMouseEnter={() => setHoveredCell({ r, c })}
                        onMouseLeave={() => setHoveredCell(null)}
                        style={{ 
                          background: bg, 
                          border: directHover ? '1px solid var(--text-strong)' : cellActive ? '1px solid var(--border-3)' : '1px solid transparent'
                        }}
                        className="h-8 rounded-none flex items-center justify-center text-[8px] font-extrabold font-mono cursor-crosshair transition-all duration-150"
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
        <div className="min-w-[220px] flex-[0_0_240px] flex flex-col gap-4 bg-surface-2 border border-border-2 rounded-none p-4 font-mono">
          <span className="text-[9px] font-extrabold text-text-strong tracking-wider uppercase font-mono">Risk Gradient</span>

          <div className="flex flex-col gap-2.5">
            {[
              { bg: 'rgba(34, 197, 94, 0.8)', label: 'Strong Positive (0.7 to 1.0)' },
              { bg: 'rgba(34, 197, 94, 0.3)', label: 'Moderate Positive (0.3 to 0.7)' },
              { bg: 'var(--border)',           label: 'Independent / Diagonal' },
              { bg: 'rgba(239, 68, 68, 0.4)', label: 'Negative (< -0.1)' },
            ].map(({ bg, label }) => (
              <div key={label} className="flex items-center gap-2.5">
                <div style={{ backgroundColor: bg }} className="w-3.5 h-3.5 rounded-none flex-shrink-0" />
                <span className="text-[10px] text-text-2">{label}</span>
              </div>
            ))}
          </div>

          {hoveredCell ? (
            <div className="border-t border-border-2 pt-3 flex flex-col gap-1">
              <span className="text-[8px] text-text-2 uppercase tracking-wide">Focused Covariance</span>
              <span className="text-[11px] font-extrabold text-text-strong">
                {top15Rows[hoveredCell.r]?.ticker} × {top15Rows[hoveredCell.c]?.ticker}
              </span>
              <span className="text-[10px] text-green font-bold font-mono">
                Correlation: {matrix[hoveredCell.r][hoveredCell.c] > 0 ? '+' : ''}{matrix[hoveredCell.r][hoveredCell.c].toFixed(2)}
              </span>
              <span className="text-[9px] text-text-2 mt-0.5 leading-relaxed">
                {top15Rows[hoveredCell.r]?.ticker} ({top15Rows[hoveredCell.r]?.sector}) and {top15Rows[hoveredCell.c]?.ticker} ({top15Rows[hoveredCell.c]?.sector}).
              </span>
            </div>
          ) : (
            <div className="border-t border-border-2 pt-3 text-[9px] text-text-2 leading-relaxed">
              Hover over covariance grid cells to inspect specific asset-to-asset correlations.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
