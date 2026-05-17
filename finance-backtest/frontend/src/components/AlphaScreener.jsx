import { useState, useMemo, useEffect } from 'react'
import axios from 'axios'

const API_BASE = 'http://127.0.0.1:8001/api'

// ─── Column definitions — every column displayed has a fixed pixel width ──
// ─── Column definitions — every column displayed has a fixed pixel width ──
const COLS = [
  { key: 'rank',    label: '#',          width: 36,  align: 'right',  title: 'Composite rank (1 = highest alpha score)' },
  { key: 'ticker',  label: 'TICKER',     width: 68,  align: 'left',   title: 'Ticker symbol' },
  { key: 'sector',  label: 'SECTOR',     width: 148, align: 'left',   title: 'GICS sector classification' },
  // Raw factor inputs
  { key: 'm6',      label: 'MOM 6M',     width: 72,  align: 'right',  title: '6-month raw price momentum (decimal return)', fmt: 'pct' },
  { key: 'm12',     label: 'MOM 12M',    width: 72,  align: 'right',  title: '12-month raw price momentum (decimal return)', fmt: 'pct' },
  { key: 'vol',     label: 'RVOL',       width: 64,  align: 'right',  title: 'Realised annualised volatility', fmt: 'pct' },
  { key: 'roe',     label: 'ROE',        width: 64,  align: 'right',  title: 'Return on Equity (TTM)', fmt: 'pct' },
  { key: 'de',      label: 'D/E',        width: 56,  align: 'right',  title: 'Debt-to-Equity ratio', fmt: 'x2' },
  { key: 'fcf',     label: 'FCF MGN',    width: 72,  align: 'right',  title: 'Free Cash Flow margin', fmt: 'pct' },
  // Z-score outputs — these are the alpha signals
  { key: 'r6',      label: 'Z·MOM6',     width: 72,  align: 'right',  title: 'Cross-sectional Z-score: 6M momentum', fmt: 'z', zscore: true },
  { key: 'r12',     label: 'Z·MOM12',    width: 72,  align: 'right',  title: 'Cross-sectional Z-score: 12M momentum', fmt: 'z', zscore: true },
  { key: 'rv',      label: 'Z·VOL',      width: 72,  align: 'right',  title: 'Cross-sectional Z-score: low-volatility (inverted)', fmt: 'z', zscore: true },
  { key: 'rq',      label: 'Z·QUAL',     width: 72,  align: 'right',  title: 'Cross-sectional Z-score: quality composite', fmt: 'z', zscore: true },
  // Composite output
  { key: 'score',   label: 'COMPOSITE',  width: 84,  align: 'right',  title: 'Final composite alpha score (equal-weighted Z-scores)', fmt: 'z', zscore: true },
  { key: 'weight',  label: 'ALLOC %',    width: 72,  align: 'right',  title: 'QP optimizer target weight (0 = not selected)', fmt: 'pct' },
]

// ─── Formatter helpers ────────────────────────────────────────────────────
function fmt(value, type) {
  if (value === null || value === undefined || value === '') return '—'
  const v = parseFloat(value)
  if (isNaN(v)) return '—'
  switch (type) {
    case 'pct':  return `${(v * 100).toFixed(2)}%`
    case 'x2':   return v.toFixed(2) + 'x'
    case 'z':    return (v >= 0 ? '+' : '') + v.toFixed(2)
    default:     return String(value)
  }
}

// ─── Z-score cell colour — strictly monochromatic ─────────────────────────
function zColor(value) {
  return '#000000'
}

// ─── Inline styles — monochromatic brutalist table ────────────────────────
const S = {
  // Outer shell
  shell: {
    fontFamily: 'Inter, sans-serif',
    fontSize: '11px',
    background: '#ffffff',
    color: '#000000',
  },
  // Top toolbar strip
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '15px 24px', /* Increased by 50% */
    borderBottom: '1px solid #e5e7eb',
    background: '#ffffff',
    gap: '24px',
    flexWrap: 'wrap',
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '30px',
    flexWrap: 'wrap',
  },
  title: {
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color: '#000000',
  },
  metaChip: {
    fontSize: '10px',
    color: '#000000',
    letterSpacing: '0.05em',
    fontWeight: 600,
  },
  // Sort controls
  sortLabel: {
    fontSize: '10px',
    color: '#000000',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginRight: '9px',
    fontWeight: 700,
  },
  // Filter input
  filterInput: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    color: '#000000',
    padding: '6px 12px', /* Increased by 50% */
    fontSize: '11px',
    fontFamily: 'JetBrains Mono, monospace',
    outline: 'none',
    width: '120px',
    letterSpacing: '0.05em',
  },
  // Legend strip
  legendStrip: {
    display: 'flex',
    alignItems: 'center',
    gap: '18px',
    padding: '9px 24px', /* Increased by 50% */
    borderBottom: '1px solid #e5e7eb',
    background: '#ffffff',
    fontSize: '9px',
    color: '#000000',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    fontWeight: 700,
  },
  legendBox: (color) => ({
    width: '10px',
    height: '10px',
    background: '#000000',
    display: 'inline-block',
    flexShrink: 0,
    border: '1px solid #000000',
  }),
  // Scrollable table container
  tableWrap: {
    overflowX: 'auto',
    overflowY: 'auto',
    maxHeight: 'calc(100vh - 280px)',
  },
  // The table itself
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
  },
  // TH
  th: (align, width) => ({
    width: `${width}px`,
    minWidth: `${width}px`,
    padding: '15px 12px', /* Increased by 50% */
    textAlign: align,
    fontSize: '9px',
    fontWeight: 800,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: '#000000',
    background: '#ffffff',
    borderTop: '1px solid #e5e7eb',
    borderBottom: '1px solid #e5e7eb',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  }),
  thActive: {
    color: '#000000',
    borderBottom: '2px solid #000000',
    fontWeight: 900,
  },
  // Divider between raw-factor block and Z-score block
  thDivider: {},
  // TD
  td: (align, highlight, isZScore, value) => ({
    padding: '15px 12px', /* Increased by 50% */
    textAlign: align,
    borderBottom: '1px solid #e5e7eb',
    whiteSpace: 'nowrap',
    background: '#ffffff',
    color: '#000000',
    fontWeight: isZScore && Math.abs(parseFloat(value)) > 1.0 ? 800 : 400,
    textDecoration: isZScore && parseFloat(value) < -1.0 ? 'underline' : 'none',
  }),
  // The first-column divider
  tdDivider: {},
  // Highlighted row — top 15: stark black left-border
  rowHighlight: {},
  // Status bar at bottom
  statusBar: {
    padding: '12px 24px', /* Increased by 50% */
    borderTop: '1px solid #e5e7eb',
    fontSize: '9px',
    color: '#000000',
    letterSpacing: '0.08em',
    display: 'flex',
    gap: '36px',
    background: '#ffffff',
    fontWeight: 600,
  },
}

// ─── Sortable column header ───────────────────────────────────────────────
function TH({ col, sortKey, sortDir, onSort, divider }) {
  const active = sortKey === col.key
  return (
    <th
      title={col.title}
      style={{
        ...S.th(col.align, col.width),
        ...(active ? S.thActive : {}),
        ...(divider ? S.thDivider : {}),
      }}
      onClick={() => onSort(col.key)}
    >
      {col.label}
      {active ? (sortDir === 'desc' ? ' ▼' : ' ▲') : ''}
    </th>
  )
}

// ─── Main component ───────────────────────────────────────────────────────
export default function AlphaScreener() {
  const [rows, setRows]         = useState([])
  const [date, setDate]         = useState('')
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  // Sort state — default: composite score descending
  const [sortKey, setSortKey]   = useState('score')
  const [sortDir, setSortDir]   = useState('desc')

  // Sector filter
  const [filterSector, setFilterSector] = useState('ALL')
  // Ticker search
  const [search, setSearch]     = useState('')

  // ── Fetch ───────────────────────────────────────────────────────
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

  // ── Derived sector list ─────────────────────────────────────────
  const sectors = useMemo(() => {
    const s = new Set(rows.map(r => r.sector).filter(Boolean))
    return ['ALL', ...Array.from(s).sort()]
  }, [rows])

  // ── Filtered + sorted rows ──────────────────────────────────────
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

  // The set of top-15 tickers from the base (score-ranked) list
  const top15Tickers = useMemo(() => new Set(rows.slice(0, 15).map(r => r.ticker)), [rows])

  // ── Sort handler ────────────────────────────────────────────────
  const handleSort = (key) => {
    if (key === sortKey) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  // ── Render states ────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ ...S.shell, padding: '40px', textAlign: 'center', color: '#6b7280', letterSpacing: '0.15em' }}>
        LOADING SCREENER DATA...
      </div>
    )
  }
  if (error) {
    return (
      <div style={{ ...S.shell, padding: '40px', textAlign: 'center', color: '#ef4444', letterSpacing: '0.1em' }}>
        ERROR: {error}
      </div>
    )
  }

  const selectedCount = rows.filter(r => r.selected).length

  return (
    <div style={S.shell}>

      {/* ── Toolbar ──────────────────────────────────────── */}
      <div style={S.toolbar}>
        <div style={S.toolbarLeft}>
          <span style={S.title}>Alpha Screener</span>
          <span style={S.metaChip}>
            AS OF {date} &nbsp;·&nbsp; {total} ASSETS
          </span>

          {/* Sector filter */}
          <span>
            <span style={S.sortLabel}>SECTOR:</span>
            <select
              value={filterSector}
              onChange={e => setFilterSector(e.target.value)}
              style={{ ...S.filterInput, width: 'auto', cursor: 'pointer' }}
            >
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </span>

          {/* Ticker search */}
          <span>
            <span style={S.sortLabel}>SEARCH:</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="TICKER..."
              style={S.filterInput}
            />
          </span>
        </div>

        <span style={{ ...S.metaChip, flexShrink: 0 }}>
          SHOWING {displayed.length} / {total} &nbsp;·&nbsp; {selectedCount} SELECTED
        </span>
      </div>

      {/* ── Legend ───────────────────────────────────────── */}
      <div style={S.legendStrip}>
        <span style={{ fontWeight: 900, fontFamily: 'JetBrains Mono, monospace' }}>TICKER</span>
        <span>HEAVY BOLD TICKER: SELECTED (TOP 15)</span>
        <span style={{ marginLeft: '18px', fontWeight: 800, textDecoration: 'underline', fontFamily: 'JetBrains Mono, monospace' }}><u>Z</u></span>
        <span>Z-SCORE &lt; −1.0 (UNDERLINED DEVIATION)</span>
        <span style={{ marginLeft: '18px', fontWeight: 900, fontFamily: 'JetBrains Mono, monospace' }}>Z</span>
        <span>Z-SCORE &gt; +1.0 (BOLD SIGNAL)</span>
        <span style={{ marginLeft: '24px', color: '#000000', fontWeight: 600, textTransform: 'uppercase' }}>
          ·  CLICK HEADER TO SORT  ·  HOVER FOR DEFINITIONS
        </span>
      </div>

      {/* ── Table ────────────────────────────────────────── */}
      <div style={S.tableWrap}>
        <table style={S.table}>
          <colgroup>
            {COLS.map(c => <col key={c.key} style={{ width: c.width }} />)}
          </colgroup>

          <thead>
            <tr>
              {COLS.map((col, i) => (
                <TH
                  key={col.key}
                  col={col}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  divider={false}
                />
              ))}
            </tr>
          </thead>

          <tbody>
            {displayed.map((row, rowIdx) => {
              const isTop15 = top15Tickers.has(row.ticker)
              return (
                <tr
                  key={row.ticker}
                  style={{ background: '#ffffff' }}
                >
                  {COLS.map((col, colIdx) => {
                    const raw   = row[col.key]
                    const isZ   = !!col.zscore
                    const label = col.fmt ? fmt(raw, col.fmt) : (raw ?? '—')

                    return (
                      <td
                        key={col.key}
                        style={{
                          ...S.td(col.align, isTop15, isZ, raw),
                          // Rank cell — large, bold, right-aligned
                          ...(col.key === 'rank' ? { fontWeight: isTop15 ? 900 : 700, color: '#000000', fontSize: '11px', textAlign: 'right' } : {}),
                          // Ticker cell — heavy bold for top 15 selected, clean black text
                          ...(col.key === 'ticker' ? { fontWeight: isTop15 ? 900 : 400, color: '#000000', letterSpacing: '0.04em' } : {}),
                          // Allocation cell — clean black text
                          ...(col.key === 'weight' ? { color: '#000000', fontWeight: isTop15 ? 900 : 400 } : {}),
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

      {/* ── Status bar ───────────────────────────────────── */}
      <div style={S.statusBar}>
        <span>SORT: {sortKey.toUpperCase()} {sortDir.toUpperCase()}</span>
        <span>FILTER: {filterSector}</span>
        <span>DATE: {date}</span>
        <span>Z-SCORES: CROSS-SECTIONAL · SECTOR-NEUTRAL</span>
        <span style={{ marginLeft: 'auto' }}>
          PHINEUS OS · QP OPTIMIZER V7
        </span>
      </div>

    </div>
  )
}
