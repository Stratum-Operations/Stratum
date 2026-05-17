import { useState, useMemo, useEffect } from 'react'
import axios from 'axios'

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

  useEffect(() => {
    const load = async () => {
      try {
        const r = await axios.get(`${API_BASE}/signals/screener`)
        setRows(r.data.screener)
        setDate(r.data.date)
        setTotal(r.data.total)
        setLoading(false)
      } catch (e) {
        setError('Failed to load screener data — is the API server running?')
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
