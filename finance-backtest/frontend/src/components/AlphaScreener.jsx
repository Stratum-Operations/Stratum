import { useState, useMemo, useEffect } from 'react'
import axios from 'axios'
import { mockScreener } from '../data/mockFallbackData'

const API_BASE = 'http://127.0.0.1:8001/api'
const PAGE_SIZE = 50
const PROD_WEIGHTS = { w_m6: 40, w_m12: 25, w_vol: 20, w_qual: 15 }

function zFmt(v) {
  const n = parseFloat(v)
  if (isNaN(n)) return '—'
  return (n >= 0 ? '+' : '') + n.toFixed(2)
}

function zColorClass(v) {
  const n = parseFloat(v)
  if (isNaN(n)) return 'text-text-3'
  if (n > 0) return 'text-green'
  if (n < 0) return 'text-red'
  return 'text-text-3'
}

const COLS = [
  { key: 'rank',     label: 'RANK',     width: '5%'  },
  { key: 'ticker',   label: 'TICKER',   width: '8%'  },
  { key: 'sector',   label: 'SECTOR',   width: '16%' },
  { key: 'selected', label: 'SELECTED', width: '9%'  },
  { key: 'r6',       label: 'Z(M6)',    width: '7%',  isZ: true },
  { key: 'r12',      label: 'Z(M12)',   width: '7%',  isZ: true },
  { key: 'rv',       label: 'Z(VOL)',   width: '7%',  isZ: true },
  { key: 'rq',       label: 'Z(QUAL)',  width: '7%',  isZ: true },
  { key: 'score',    label: 'SCORE',    width: '8%',  isZ: true },
  { key: 'weight',   label: 'WEIGHT',   width: '7%'  },
]

export default function AlphaScreener() {
  const [rows, setRows]               = useState([])
  const [date, setDate]               = useState('')
  const [total, setTotal]             = useState(0)
  const [loading, setLoading]         = useState(true)
  const [page, setPage]               = useState(0)
  const [sortKey, setSortKey]         = useState('rank')
  const [sortDir, setSortDir]         = useState('asc')
  const [selectedOnly, setSelectedOnly] = useState(false)
  const [sectorFilter, setSectorFilter] = useState('ALL')
  const [weights, setWeights]         = useState(PROD_WEIGHTS)
  const [previewRows, setPreviewRows] = useState(null)

  useEffect(() => {
    const dedup = (arr) => {
      if (!Array.isArray(arr)) return []
      const seen = new Set()
      return arr.filter(r => {
        if (!r?.ticker || seen.has(r.ticker)) return false
        seen.add(r.ticker)
        return true
      })
    }
    const load = async () => {
      try {
        const r = await axios.get(`${API_BASE}/signals/screener?limit=200`)
        const clean = dedup(r.data.screener)
        setRows(clean)
        setDate(r.data.date)
        setTotal(clean.length)
      } catch {
        const clean = dedup(mockScreener.screener)
        setRows(clean)
        setDate(mockScreener.date + ' (DEMO)')
        setTotal(clean.length)
      }
      setLoading(false)
    }
    load()
  }, [])

  const sectors = useMemo(() => {
    const s = new Set(rows.map(r => r.sector).filter(Boolean))
    return ['ALL', ...Array.from(s).sort()]
  }, [rows])

  const displayRows = previewRows ?? rows

  const sorted = useMemo(() => {
    let d = [...displayRows]
    if (selectedOnly) d = d.filter(r => r.selected)
    if (sectorFilter !== 'ALL') d = d.filter(r => r.sector === sectorFilter)
    d.sort((a, b) => {
      const av = parseFloat(a[sortKey]) ?? 0
      const bv = parseFloat(b[sortKey]) ?? 0
      return sortDir === 'asc' ? av - bv : bv - av
    })
    return d
  }, [displayRows, selectedOnly, sectorFilter, sortKey, sortDir])

  const paginated = useMemo(
    () => sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [sorted, page]
  )
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))

  const handleSort = (key) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const weightSum = Object.values(weights).reduce((a, b) => a + Number(b), 0)
  const weightsValid = weightSum === 100

  const applyPreview = () => {
    const w = {
      m6: weights.w_m6 / 100, m12: weights.w_m12 / 100,
      vol: weights.w_vol / 100, qual: weights.w_qual / 100,
    }
    const scored = rows.map(r => ({
      ...r,
      score: w.m6 * Number(r.r6 || 0) + w.m12 * Number(r.r12 || 0)
           + w.vol * Number(r.rv || 0) + w.qual * Number(r.rq || 0),
    }))
    const ranked = [...scored]
      .sort((a, b) => b.score - a.score)
      .map((r, i) => ({ ...r, rank: i + 1 }))
    setPreviewRows(ranked)
    setPage(0)
  }

  if (loading) {
    return (
      <div
        className="flex items-center justify-center font-mono text-[11px] text-text-3"
        style={{ height: 'calc(100vh - 104px)' }}
      >
        LOADING SCREENER DATA...
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        height: 'calc(100vh - 104px)',
        overflow: 'hidden',
        gap: '1px',
        background: 'var(--border-2)',
      }}
    >
      {/* ── Left: Control Panel ──────────────────────────────────── */}
      <div
        className="bg-surface overflow-y-auto flex-shrink-0 flex flex-col"
        style={{ width: '20%', minWidth: '200px' }}
      >
        {/* Header */}
        <div className="px-4 pt-3 pb-2 border-b border-border-2 bg-surface-2 flex-shrink-0">
          <span className="font-mono text-[10px] uppercase tracking-widest text-text-3">
            FACTOR WEIGHTS
          </span>
        </div>

        <div className="p-4 flex flex-col gap-3 flex-1">
          {[
            { key: 'w_m6',   label: 'Momentum 6M'   },
            { key: 'w_m12',  label: 'Momentum 12M'  },
            { key: 'w_vol',  label: 'Low Volatility' },
            { key: 'w_qual', label: 'Quality'        },
          ].map(({ key, label }) => (
            <div key={key} className="flex flex-col gap-1">
              <label className="font-mono text-[9px] uppercase tracking-widest text-text-3">
                {label}
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={weights[key]}
                onChange={e =>
                  setWeights(w => ({ ...w, [key]: Number(e.target.value) }))
                }
                className="w-full font-mono text-[12px] p-1.5 bg-surface-2 border border-border-2 text-text-strong outline-none"
              />
            </div>
          ))}

          {/* Validation */}
          <div
            className={`font-mono text-[11px] font-bold ${weightsValid ? 'text-green' : 'text-red'}`}
          >
            {weightsValid ? '[VALID: 100%]' : `[INVALID: ${weightSum}%]`}
          </div>

          {/* Apply button */}
          <button
            onClick={applyPreview}
            disabled={!weightsValid}
            className="w-full font-mono text-[10px] uppercase tracking-widest border border-border-2 bg-transparent py-2 cursor-pointer hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed text-text-strong"
          >
            PREVIEW SCORING
          </button>

          {previewRows && (
            <button
              onClick={() => { setPreviewRows(null); setPage(0) }}
              className="w-full font-mono text-[9px] uppercase tracking-widest border border-amber bg-transparent py-1.5 cursor-pointer text-amber"
            >
              CLEAR PREVIEW
            </button>
          )}

          <p className="font-mono text-[9px] text-text-3 leading-relaxed mt-1">
            Preview only — adjusting weights does not trigger a rebalance.
            <br />
            Production weights: 0.40 / 0.25 / 0.20 / 0.15
          </p>

          {/* Divider */}
          <div className="border-t border-border my-1" />

          {/* Filters */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="selected-only"
              checked={selectedOnly}
              onChange={e => { setSelectedOnly(e.target.checked); setPage(0) }}
              className="cursor-pointer"
            />
            <label
              htmlFor="selected-only"
              className="font-mono text-[9px] uppercase tracking-widest text-text-2 cursor-pointer"
            >
              SELECTED ONLY
            </label>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-mono text-[9px] uppercase tracking-widest text-text-3">
              SECTOR
            </label>
            <select
              value={sectorFilter}
              onChange={e => { setSectorFilter(e.target.value); setPage(0) }}
              className="w-full font-mono text-[11px] p-1.5 bg-surface-2 border border-border-2 text-text outline-none cursor-pointer"
            >
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border bg-surface-2 flex-shrink-0">
          <div className="font-mono text-[9px] text-text-3 flex flex-col gap-0.5">
            <div>{date}</div>
            <div>{total} TICKERS</div>
            {previewRows && (
              <div className="text-amber font-bold mt-1">[PREVIEW MODE]</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Right: Main Table ─────────────────────────────────────── */}
      <div className="flex-1 bg-surface flex flex-col overflow-hidden">
        {/* Table */}
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full table-fixed font-mono text-[11px] border-collapse">
            <thead className="sticky top-0 z-10">
              <tr>
                {COLS.map(col => {
                  const active = sortKey === col.key
                  return (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      style={{ width: col.width }}
                      className={`
                        px-3 py-2 text-left text-[9px] uppercase tracking-widest
                        cursor-pointer select-none whitespace-nowrap border-b-2
                        bg-surface-2 transition-colors
                        ${active
                          ? 'text-text-strong border-text-strong'
                          : 'text-text-3 border-border-2 hover:text-text-2'
                        }
                      `}
                    >
                      {col.label}{active ? (sortDir === 'desc' ? ' ▼' : ' ▲') : ''}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {paginated.map((row, i) => {
                const isSelected = Boolean(row.selected)
                return (
                  <tr
                    key={row.ticker}
                    className={`
                      border-b border-border border-l-2
                      ${isSelected ? 'border-l-green' : 'border-l-transparent'}
                      ${i % 2 === 0 ? 'bg-surface' : 'bg-surface-2'}
                    `}
                  >
                    <td className="px-3 py-1.5 text-text-3">{row.rank}</td>
                    <td className="px-3 py-1.5 text-text-strong font-bold">{row.ticker}</td>
                    <td className="px-3 py-1.5 text-text-2 truncate">{row.sector || '—'}</td>
                    <td className="px-3 py-1.5">
                      {isSelected
                        ? <span className="text-green font-bold">[IN]</span>
                        : <span className="text-text-3">[OUT]</span>
                      }
                    </td>
                    {['r6', 'r12', 'rv', 'rq', 'score'].map(k => (
                      <td key={k} className={`px-3 py-1.5 font-mono font-bold ${zColorClass(row[k])}`}>
                        {zFmt(row[k])}
                      </td>
                    ))}
                    <td className="px-3 py-1.5 text-text-2">
                      {Number(row.weight) > 0
                        ? `${(Number(row.weight) * 100).toFixed(2)}%`
                        : '—'
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <div className="flex-shrink-0 border-t border-border-2 px-4 py-2 bg-surface-2 flex items-center justify-between">
          <span className="font-mono text-[10px] text-text-3">
            SHOWING {sorted.length === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} OF {sorted.length} TICKERS
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="font-mono text-[9px] border border-border-2 px-3 py-1 bg-transparent text-text-2 disabled:opacity-30 cursor-pointer hover:bg-surface"
            >
              ◀ PREV
            </button>
            <span className="font-mono text-[10px] text-text-3">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="font-mono text-[9px] border border-border-2 px-3 py-1 bg-transparent text-text-2 disabled:opacity-30 cursor-pointer hover:bg-surface"
            >
              NEXT ▶
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
