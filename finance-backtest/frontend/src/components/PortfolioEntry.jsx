import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { ClipboardPaste, UploadCloud } from 'lucide-react'

const API_BASE = 'http://127.0.0.1:8001/api'
const MONO = 'JetBrains Mono, monospace'
const SANS = 'Inter, system-ui, sans-serif'

const TH_STYLE = {
  padding: '10px 12px',
  fontSize: '9px',
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--text-3)',
  background: 'var(--surface-3)',
  borderBottom: '1px solid var(--border-2)',
  whiteSpace: 'nowrap',
  fontFamily: MONO,
  position: 'sticky',
  top: 0,
  zIndex: 10,
}

let _uid = 1
function uid() { return _uid++ }
function newRow() { return { id: uid(), ticker: '', shares: '', cost_basis: '' } }

const HEADER_ALIASES = {
  ticker: [
    'ticker', 'symbol', 'symbols', 'security symbol', 'security', 'asset', 'holding',
    'instrument', 'instrument symbol', 'stock', 'stock symbol',
  ],
  shares: [
    'shares', 'share', 'quantity', 'qty', 'units', 'position', 'position quantity',
    'current quantity', 'holding quantity',
  ],
  cost_basis: [
    'avg cost', 'average cost', 'avg price', 'average price', 'cost basis',
    'cost basis/share', 'cost basis per share', 'unit cost', 'price paid',
    'average cost basis',
  ],
}

function cleanCell(value) {
  return String(value ?? '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/^\$/, '')
    .replace(/,/g, '')
}

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[$()]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
}

function splitCsvLine(line) {
  const cells = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"' && inQuotes && next === '"') {
      current += '"'
      i += 1
    } else if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      cells.push(current)
      current = ''
    } else {
      current += char
    }
  }

  cells.push(current)
  return cells
}

function splitDelimitedLine(line) {
  if (line.includes(',')) return splitCsvLine(line)
  if (line.includes('\t')) return line.split('\t')
  return line.trim().split(/\s+/)
}

function findColumn(headers, type) {
  const aliases = HEADER_ALIASES[type]
  for (const alias of aliases) {
    const idx = headers.findIndex(h => h === alias)
    if (idx >= 0) return idx
  }
  for (const alias of aliases) {
    const idx = headers.findIndex(h => h.includes(alias))
    if (idx >= 0) return idx
  }
  return -1
}

function looksLikeHeader(cells) {
  const headers = cells.map(normalizeHeader)
  return findColumn(headers, 'ticker') >= 0 && findColumn(headers, 'shares') >= 0
}

function normalizeTicker(value) {
  return cleanCell(value).toUpperCase().replace(/[^A-Z0-9.-]/g, '')
}

function parsePortfolioImport(text) {
  const rawLines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)

  if (!rawLines.length) return { rows: [], rejected: [] }

  const firstCells = splitDelimitedLine(rawLines[0]).map(cleanCell)
  const hasHeader = looksLikeHeader(firstCells)
  const headers = hasHeader ? firstCells.map(normalizeHeader) : []
  const tickerIdx = hasHeader ? findColumn(headers, 'ticker') : 0
  const sharesIdx = hasHeader ? findColumn(headers, 'shares') : 1
  const costIdx = hasHeader ? findColumn(headers, 'cost_basis') : 2
  const dataLines = hasHeader ? rawLines.slice(1) : rawLines

  const parsed = []
  const rejected = []

  dataLines.forEach((line, index) => {
    const cells = splitDelimitedLine(line).map(cleanCell)
    let ticker = normalizeTicker(cells[tickerIdx])
    let shares = parseFloat(cells[sharesIdx])
    let cost = costIdx >= 0 ? parseFloat(cells[costIdx]) : NaN

    // Smart heuristic fallback if standard column lookup fails
    if (!ticker || Number.isNaN(shares) || shares <= 0) {
      const potentialTickerIdx = cells.findIndex(c => {
        const cleaned = normalizeTicker(c)
        return cleaned && cleaned.length >= 1 && cleaned.length <= 6 && !/^\d+$/.test(cleaned)
      })

      const numberCells = cells
        .map((c, i) => ({ val: parseFloat(cleanCell(c)), idx: i }))
        .filter(item => !Number.isNaN(item.val) && item.val > 0)

      if (potentialTickerIdx >= 0) {
        ticker = normalizeTicker(cells[potentialTickerIdx])
        const validNumbersWithoutTicker = numberCells.filter(n => n.idx !== potentialTickerIdx)
        if (validNumbersWithoutTicker.length > 0) {
          shares = validNumbersWithoutTicker[0].val
          if (validNumbersWithoutTicker.length > 1) {
            cost = validNumbersWithoutTicker[1].val
          } else {
            cost = NaN
          }
        }
      }
    }

    if (!ticker || Number.isNaN(shares) || shares <= 0) {
      rejected.push({ line: index + 1 + (hasHeader ? 1 : 0), raw: line })
      return
    }

    parsed.push({
      ticker,
      shares,
      cost_basis: Number.isNaN(cost) || cost <= 0 ? '' : cost,
    })
  })

  const byTicker = new Map()
  parsed.forEach(row => {
    const existing = byTicker.get(row.ticker)
    if (!existing) {
      byTicker.set(row.ticker, { ...row })
      return
    }

    const nextShares = existing.shares + row.shares
    const existingCost = parseFloat(existing.cost_basis)
    const rowCost = parseFloat(row.cost_basis)
    const hasBothCosts = !Number.isNaN(existingCost) && !Number.isNaN(rowCost)

    byTicker.set(row.ticker, {
      ticker: row.ticker,
      shares: nextShares,
      cost_basis: hasBothCosts
        ? ((existingCost * existing.shares) + (rowCost * row.shares)) / nextShares
        : existing.cost_basis || row.cost_basis || '',
    })
  })

  return {
    rows: [...byTicker.values()].map(row => ({
      id: uid(),
      ticker: row.ticker,
      shares: String(Number(row.shares.toFixed(6))),
      cost_basis: row.cost_basis === '' ? '' : String(Number(row.cost_basis.toFixed(4))),
    })),
    rejected,
  }
}

/* ── Focusable input cell ───────────────────────────────────────── */
function EditCell({ value, onChange, onKeyDown, placeholder, type = 'text', bold, align = 'left' }) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(type === 'text' ? e.target.value.toUpperCase() : e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className={`bg-transparent border-none border-b text-xs py-1 px-1.5 w-full outline-none min-w-0 font-mono transition-all duration-150 placeholder:text-text-3/60 placeholder:font-normal placeholder:opacity-100 ${
        focused ? 'border-border-3 text-text-strong' : 'border-transparent text-text'
      } ${bold ? 'font-bold' : 'font-normal'} text-${align}`}
    />
  )
}

/* ── Generic toolbar button ─────────────────────────────────────── */
function TBtn({ onClick, disabled, primary, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-1.5 text-[9px] font-mono tracking-wider uppercase whitespace-nowrap transition-colors duration-150 ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      } ${
        primary
          ? (disabled ? 'bg-surface-2 text-text-2 border border-border' : 'bg-text-strong text-bg font-extrabold hover:opacity-90')
          : 'bg-transparent border border-border-2 text-text-2 hover:text-text hover:border-border-3'
      }`}
    >
      {children}
    </button>
  )
}

/* ── Card wrapper for file drop / paste panels ─────────────────── */
function ImportCard({ active, icon: Icon, title, children }) {
  return (
    <div className={`rounded-xl p-4 min-w-0 border transition-all duration-150 ${
      active ? 'bg-surface border-border-2 shadow-sm' : 'bg-surface-2 border-border'
    }`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={18} className="text-teal" />
        <strong className="font-sans text-sm text-text-strong tracking-wide">{title}</strong>
      </div>
      {children}
    </div>
  )
}

/* ── Preview table for incoming imports ─────────────────────────── */
function ImportPreview({ rows, rejected, onImport, loading }) {
  const canImport = rows.length > 0 && !loading

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm flex flex-col">
      <div className="flex items-center justify-between gap-3 p-3.5 px-4 border-b border-border bg-bg">
        <div className="flex items-center gap-2">
          <strong className="font-sans text-xs font-bold text-text-strong uppercase tracking-wider">Preview</strong>
          {!canImport && (
            <span className="px-1.5 py-0.5 text-[8px] font-extrabold font-sans uppercase tracking-wider bg-[rgba(245,158,11,0.08)] text-amber rounded border border-amber/10">
              Awaiting Data
            </span>
          )}
        </div>
        <div 
          title={!canImport ? "No holdings parsed yet. Drag & drop a CSV file, or paste text in the 'Paste holdings' field on the left to preview and import." : "Import previewed holdings and run portfolio analysis"}
          className={!canImport ? "cursor-not-allowed" : ""}
        >
          <button
            onClick={onImport}
            disabled={!canImport}
            className={`border rounded px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-all duration-150 ${
              canImport 
                ? 'bg-text-strong text-bg hover:opacity-90 cursor-pointer border-border-2' 
                : 'bg-surface-3 text-text-3 border-border pointer-events-none'
            }`}
          >
            {loading ? 'Importing...' : 'Import portfolio'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-[220px]">
        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Ticker', 'Shares', 'Avg cost'].map((h, i) => (
                    <th
                      key={h}
                      className={`p-2 px-3 text-[10px] text-text-2 font-mono border-b border-border bg-surface-2 font-bold uppercase tracking-wider ${
                        i === 0 ? 'text-left' : 'text-right'
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 12).map(row => (
                  <tr key={row.id} className="hover:bg-surface-2 transition-colors duration-100">
                    <td className="p-2 px-3 border-b border-border font-mono font-bold text-text-strong">
                      {row.ticker}
                    </td>
                    <td className="p-2 px-3 border-b border-border text-right font-mono text-text">
                      {Number(row.shares).toLocaleString()}
                    </td>
                    <td className={`p-2 px-3 border-b border-border text-right font-mono ${
                      row.cost_basis ? 'text-text' : 'text-text-3'
                    }`}>
                      {row.cost_basis ? `$${Number(row.cost_basis).toFixed(2)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 12 && (
              <div className="p-2.5 px-3.5 text-text-3 font-mono text-[10px]">
                + {rows.length - 12} more rows will be imported.
              </div>
            )}
          </div>
        ) : (
          <div className="p-5 text-text-3 font-mono text-xs flex items-center justify-center h-full text-center">
            Add a CSV or paste holdings to preview them here.
          </div>
        )}
      </div>

      {rejected.length > 0 && (
        <div className="p-2.5 px-3.5 border-t border-border bg-[rgba(245,158,11,0.05)] text-amber font-mono text-[10px]">
          Skipped {rejected.length} row{rejected.length !== 1 ? 's' : ''} without a ticker and share count.
        </div>
      )}
    </div>
  )
}

/* ── Score sub-bar ──────────────────────────────────────────────── */
function ScoreBar({ label, value, detail }) {
  const color = value >= 80 ? 'var(--green)' : value >= 60 ? 'var(--amber)' : 'var(--red)'
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[9px] font-bold tracking-wider uppercase text-text-3 font-mono">{label}</span>
        <span className="text-sm font-bold font-mono" style={{ color }}>{value}</span>
      </div>
      <div className="h-0.5 bg-border-2 mb-1.5 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <div className="text-[9px] text-text-3 font-mono">{detail}</div>
    </div>
  )
}

/* ── Portfolio Health Score card ────────────────────────────────── */
function HealthScoreCard({ health }) {
  if (!health) return null
  const { score, components, details, flags } = health
  const scoreColor = score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--amber)' : 'var(--red)'
  const label = score >= 80 ? 'STRONG' : score >= 60 ? 'MODERATE' : 'NEEDS ATTENTION'

  return (
    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] border-b border-border-2">
      {/* Score number */}
      <div className="p-8 px-6 border-r border-b md:border-b-0 border-border-2 flex flex-col items-center justify-center bg-bg">
        <div className="text-[9px] font-extrabold tracking-widest uppercase text-text-3 font-mono mb-3.5">Health Score</div>
        <div className="text-[72px] font-bold font-mono leading-none" style={{ color: scoreColor }}>{score}</div>
        <div className="text-[9px] font-extrabold tracking-widest uppercase font-mono mt-2.5" style={{ color: scoreColor }}>{label}</div>
      </div>

      {/* Component bars */}
      <div className="p-6 px-8 bg-surface">
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-x-12 ${flags.length ? 'mb-5' : 'mb-0'}`}>
          <ScoreBar
            label="Diversification"
            value={components.diversification}
            detail={`${details.effective_n} effective positions`}
          />
          <ScoreBar
            label="Concentration"
            value={components.concentration}
            detail={`Max ${details.max_position_weight}% · Top-3 ${details.top3_weight}%`}
          />
          <ScoreBar
            label="Sector Balance"
            value={components.sector_balance}
            detail={`${details.n_sectors} sector${details.n_sectors !== 1 ? 's' : ''} · Max ${details.max_sector_weight}%`}
          />
          <ScoreBar
            label="Position Count"
            value={components.position_count}
            detail={`${details.n_positions} holdings`}
          />
        </div>

        {flags.length > 0 && (
          <div className="p-3 bg-surface-3 border border-border-2 rounded-sm mt-4">
            <div className="text-[9px] font-bold tracking-wider uppercase text-text-3 font-mono mb-2">Flagged Warnings</div>
            <div className="flex flex-col gap-1.5">
              {flags.map((f, i) => (
                <div key={i} className="text-[10px] text-text-2 font-mono leading-relaxed pl-2.5 border-l-2 border-amber">{f}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Risk Radar helpers ─────────────────────────────────────────── */
const STATUS_COLOR = { ok: 'var(--green)', warning: 'var(--amber)', alert: 'var(--red)', unknown: 'var(--text-3)' }

function RadarPanel({ title, status = 'ok', children }) {
  return (
    <div className="p-5 border-r border-b border-border min-w-0 last:border-r-0 md:even:border-r-0">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[9px] font-bold tracking-wider uppercase text-text-3 font-mono">{title}</span>
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLOR[status] ?? STATUS_COLOR.unknown }} />
      </div>
      {children}
    </div>
  )
}

function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="h-0.5 bg-border-2 my-1 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}

function TiltRow({ label, value }) {
  if (value == null) return null
  const pos = value >= 0
  const color = pos ? 'var(--green)' : 'var(--red)'
  const barPct = Math.min(Math.abs(value) / 2.0, 1.0) * 100
  return (
    <div className="mb-2.5">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[9px] text-text-2 font-mono uppercase tracking-wider">{label}</span>
        <span className="text-[11px] font-bold font-mono" style={{ color }}>
          {pos ? '+' : ''}{value.toFixed(2)}
        </span>
      </div>
      <div className="h-0.5 bg-border-2 rounded-full overflow-hidden">
        <div className="h-full rounded-full animate-pulse-slow" style={{ width: `${barPct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

/* ── Risk Radar card ────────────────────────────────────────────── */
function RiskRadar({ radar }) {
  if (!radar || !Object.keys(radar).length) return null
  const { sector_exposure = [], correlation = {}, factor_tilt = {}, top5 = [] } = radar
  const maxSectorW = sector_exposure[0]?.weight ?? 1

  const corrLevelLabel = { ok: 'LOW', warning: 'MODERATE', alert: 'HIGH', unknown: '—' }

  return (
    <div className="border-b border-border-2">
      {/* Section label */}
      <div className="p-2.5 px-5 border-b border-border bg-bg text-[9px] font-extrabold tracking-widest uppercase text-text-3 font-mono">
        Risk Radar
      </div>

      {/* 2 × 2 panel grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 bg-surface">
        {/* Panel 1: Sector Exposure */}
        <RadarPanel
          title="Sector Exposure"
          status={sector_exposure.find(s => s.status === 'alert') ? 'alert'
                : sector_exposure.find(s => s.status === 'warning') ? 'warning' : 'ok'}
        >
          {sector_exposure.length === 0
            ? <span className="text-xs text-text-3 font-mono">No sector data</span>
            : sector_exposure.map(s => (
              <div key={s.sector} className="mb-2.5">
                <div className="flex justify-between mb-0.5">
                  <span className="text-[9px] text-text-2 font-mono overflow-hidden text-ellipsis whitespace-nowrap max-w-[65%]">
                    {s.sector}
                  </span>
                  <span className="text-xs font-bold font-mono" style={{ color: STATUS_COLOR[s.status] }}>
                    {s.weight}%
                  </span>
                </div>
                <MiniBar value={s.weight} max={maxSectorW} color={STATUS_COLOR[s.status]} />
              </div>
            ))
          }
        </RadarPanel>

        {/* Panel 2: Correlation Risk */}
        <RadarPanel title="Correlation Risk" status={correlation.level ?? 'unknown'}>
          {correlation.avg == null ? (
            <span className="text-xs text-text-3 font-mono">
              Requires ≥2 S&P 500 tickers
            </span>
          ) : (
            <>
              <div className="mb-4">
                <div className="flex items-baseline gap-2.5 mb-1">
                  <span className="text-3xl font-bold font-mono" style={{ color: STATUS_COLOR[correlation.level] }}>
                    {correlation.avg.toFixed(2)}
                  </span>
                  <span className="text-[9px] font-extrabold tracking-wider uppercase font-mono" style={{ color: STATUS_COLOR[correlation.level] }}>
                    {corrLevelLabel[correlation.level]}
                  </span>
                </div>
                <div className="text-[9px] text-text-3 font-mono">
                  avg intra-portfolio correlation · {correlation.n_priced} priced tickers
                </div>
              </div>

              {correlation.high_pairs?.length > 0 && (
                <>
                  <div className="text-[9px] font-bold tracking-wider uppercase text-text-3 font-mono mb-2">
                    Highest Pairs
                  </div>
                  {correlation.high_pairs.map((p, i) => {
                    const c = p.corr >= 0.7 ? 'var(--red)' : p.corr >= 0.5 ? 'var(--amber)' : 'var(--text-2)'
                    return (
                      <div key={i} className="flex justify-between mb-1">
                        <span className="text-[10px] font-mono text-text-2 font-bold">
                          {p.a} · {p.b}
                        </span>
                        <span className="text-[10px] font-mono font-bold" style={{ color: c }}>
                          {p.corr.toFixed(2)}
                        </span>
                      </div>
                    )
                  })}
                </>
              )}
            </>
          )}
        </RadarPanel>

        {/* Panel 3: Factor Tilt */}
        <RadarPanel title="Factor Tilt" status="ok">
          {!factor_tilt.has_data ? (
            <span className="text-xs text-text-3 font-mono">
              No universe overlap — factor data unavailable
            </span>
          ) : (
            <>
              <TiltRow label="Momentum 6M"  value={factor_tilt.tilts?.momentum_6m}  />
              <TiltRow label="Momentum 12M" value={factor_tilt.tilts?.momentum_12m} />
              <TiltRow label="Quality"      value={factor_tilt.tilts?.quality}      />
              <TiltRow label="Volatility"   value={factor_tilt.tilts?.volatility}   />
              <div className="mt-2 text-[9px] text-text-3 font-mono">
                {factor_tilt.n_covered}/{factor_tilt.n_total} positions in universe
              </div>
            </>
          )}
        </RadarPanel>

        {/* Panel 4: Top-5 Concentration */}
        <RadarPanel title="Top-5 Positions" status="ok">
          {top5.length === 0
            ? <span className="text-xs text-text-3 font-mono">No data</span>
            : top5.map((p, i) => (
              <div key={p.ticker} className="mb-2">
                <div className="flex justify-between mb-0.5">
                  <span className="text-[11px] font-bold font-mono text-text-strong">
                    {i + 1}. {p.ticker}
                  </span>
                  <span className="text-xs font-bold font-mono text-text">
                    {p.weight}%
                  </span>
                </div>
                <MiniBar value={p.weight} max={top5[0]?.weight ?? 1} color="var(--border-3)" />
              </div>
            ))
          }
        </RadarPanel>
      </div>
    </div>
  )
}

/* ── Metric comparison tile ─────────────────────────────────────── */
function MetricTile({ label, current, baseline, delta_label, improved }) {
  const deltaColor = improved ? 'var(--green)' : 'var(--red)'
  const arrow      = improved ? '▲' : '▼'
  return (
    <div className="p-5 px-6 border-r border-border last:border-r-0 flex-1 min-w-0">
      <div className="text-[9px] font-bold tracking-wider uppercase text-text-3 font-mono mb-3.5">
        {label}
      </div>

      <div className="flex items-end gap-3 mb-2.5">
        <div>
          <div className="text-2xl font-bold font-mono text-text-strong leading-none">
            {current}
          </div>
          <div className="text-[8px] text-text-3 font-mono tracking-wider uppercase mt-1">
            Portfolio
          </div>
        </div>
        <div className="text-[9px] text-text-3 font-mono mb-3.5">vs.</div>
        <div>
          <div className="text-base font-semibold font-mono text-text-2 leading-none">
            {baseline}
          </div>
          <div className="text-[8px] text-text-3 font-mono tracking-wider uppercase mt-1">
            Baseline
          </div>
        </div>
      </div>

      <div className="text-[10px] font-bold font-mono" style={{ color: deltaColor }}>
        {arrow} {delta_label}
      </div>
    </div>
  )
}

/* ── Insight row ────────────────────────────────────────────────── */
function InsightRow({ type, text }) {
  const isDefense = type === 'defense'
  const color     = isDefense ? 'var(--green)' : 'var(--amber)'
  return (
    <div className="flex gap-3 items-start py-2.5 border-b border-border last:border-b-0">
      <div className="w-1 h-1 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: color }} />
      <span className={`text-[11px] font-mono leading-relaxed ${isDefense ? 'text-text' : 'text-text-2'}`}>{text}</span>
    </div>
  )
}

/* ── Defensive Intelligence card ────────────────────────────────── */
function DefensiveIntelligence({ defense }) {
  if (!defense || !defense.metrics?.length) return null
  const { metrics, insights = [], has_vol_data } = defense

  return (
    <div className="border-b border-border-2">
      {/* Header */}
      <div className="flex items-center justify-between p-2.5 px-5 border-b border-border bg-bg">
        <div className="text-[9px] font-extrabold tracking-widest uppercase text-text-3 font-mono">
          Defensive Intelligence
        </div>
        <div className="text-[9px] text-text-3 font-mono">
          vs. equal-weight baseline
          {!has_vol_data && ' · structural metrics only (≥2 S&P 500 tickers needed for vol)'}
        </div>
      </div>

      {/* Metric tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 border-b border-border-2 bg-surface">
        {metrics.map((m, i) => <MetricTile key={i} {...m} />)}
      </div>

      {/* Insight feed */}
      {insights.length > 0 && (
        <div className="p-5 py-2.5 bg-surface flex flex-col">
          {insights.map((ins, i) => <InsightRow key={i} {...ins} />)}
        </div>
      )}
    </div>
  )
}

/* ── Stat chip for result header ────────────────────────────────── */
function Stat({ label, value, green }) {
  return (
    <div className="text-right">
      <div className="text-[9px] text-text-3 font-mono tracking-wider uppercase">
        {label}
      </div>
      <div className="text-base font-mono font-bold mt-0.5" style={{ color: green ? 'var(--green)' : 'var(--text-strong)' }}>
        {value}
      </div>
    </div>
  )
}

/* ── Results view ───────────────────────────────────────────────── */
function ResultView({ result, onBack }) {
  const { positions = [], total_value, health, risk_radar, defense } = result

  return (
    <div className="bg-surface min-h-full">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap p-3.5 px-5 border-b border-border-2 bg-bg">
        <TBtn onClick={onBack}>← Edit Positions</TBtn>
        <div className="flex-1" />
        <Stat label="Portfolio Value"
          value={`$${(total_value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
        <Stat label="Positions" value={positions.length} />
        <Stat label="Sectors" value={[...new Set(positions.map(p => p.sector).filter(s => s && s !== '—'))].length} />
      </div>

      {/* Health Score */}
      <HealthScoreCard health={health} />

      {/* Risk Radar */}
      <RiskRadar radar={risk_radar} />

      {/* Defensive Intelligence */}
      <DefensiveIntelligence defense={defense} />

      {/* AI Analyst */}
      <PortfolioAnalyst result={result} />

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {[
                { label: '#',         align: 'center', w: 40  },
                { label: 'TICKER',    align: 'left'           },
                { label: 'SECTOR',    align: 'left'           },
                { label: 'SHARES',    align: 'right'          },
                { label: 'PRICE',     align: 'right'          },
                { label: 'MKT VALUE', align: 'right'          },
                { label: 'WEIGHT',    align: 'right'          },
                { label: 'P&L %',     align: 'right'          },
              ].map((h, i) => (
                <th key={i} style={{ ...TH_STYLE, textAlign: h.align, width: h.w }}>{h.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {positions.map((p, i) => {
              const hasPnl = p.pnl_pct != null
              const pnlColor = hasPnl ? (p.pnl_pct >= 0 ? 'var(--green)' : 'var(--red)') : 'var(--text-3)'
              return (
                <tr key={p.ticker + i} className={`border-b border-border ${i % 2 === 0 ? 'bg-surface' : 'bg-surface-2'}`}>
                  <td className="text-center p-2.5 px-3 text-[10px] text-text-3 font-mono">{i + 1}</td>

                  <td className="p-2.5 px-3">
                    <span className="font-mono text-xs font-bold text-text-strong">{p.ticker}</span>
                  </td>

                  <td className="p-2.5 px-3">
                    <span className="font-mono text-[10px] text-text-2">{p.sector || '—'}</span>
                  </td>

                  <td className="p-2.5 px-3 text-right font-mono text-xs text-text">
                    {p.shares?.toLocaleString()}
                  </td>

                  <td className="p-2.5 px-3 text-right font-mono text-xs text-text">
                    {p.price != null ? `$${p.price.toFixed(2)}` : '—'}
                  </td>

                  <td className="p-2.5 px-3 text-right font-mono text-xs font-bold text-text">
                    {p.mkt_value != null
                      ? `$${p.mkt_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '—'}
                  </td>

                  <td className="p-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-0.5 bg-border-3 rounded-full" style={{ width: `${Math.min(Math.round((p.weight || 0) * 200), 60)}px` }} />
                      <span className="font-mono text-[10px] font-bold text-text min-w-[40px] text-right">
                        {p.weight != null ? `${(p.weight * 100).toFixed(1)}%` : '—'}
                      </span>
                    </div>
                  </td>

                  <td className="p-2.5 px-3 text-right font-mono text-xs font-bold" style={{ color: pnlColor }}>
                    {hasPnl ? `${p.pnl_pct >= 0 ? '+' : ''}${p.pnl_pct.toFixed(2)}%` : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      <div className="p-3 px-5 border-t border-border text-[10px] text-text-3 font-mono leading-relaxed">
        Prices sourced from last market close. P&L requires avg cost basis.
        Tickers not in the S&P 500 universe are resolved via yfinance.
      </div>
    </div>
  )
}

/* ── AI Portfolio Analyst ───────────────────────────────────────── */
const ANALYST_CHIPS = [
  "What's my biggest hidden risk?",
  "How well diversified am I?",
  "Am I overexposed to any sector?",
  "What would improve my health score most?",
  "Explain my correlation risk",
  "How exposed am I to a market downturn?",
]

function PortfolioAnalyst({ result }) {
  const [messages, setMessages] = useState([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const endRef   = useRef(null)
  const inputRef = useRef(null)

  const context = {
    total_value: result.total_value,
    positions:   result.positions,
    health:      result.health,
    risk_radar:  result.risk_radar,
    defense:     result.defense,
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text) {
    const msg = (text ?? input).trim()
    if (!msg || loading) return

    const next = [...messages, { role: 'user', content: msg }]
    setMessages(next)
    setInput('')
    setLoading(true)
    setError(null)
    inputRef.current?.focus()

    try {
      const res = await axios.post(`${API_BASE}/portfolio/analyst`, {
        messages: next,
        context,
      })
      setMessages(m => [...m, { role: 'assistant', content: res.data.response }])
    } catch (e) {
      setError(e.response?.data?.detail || 'Analyst unavailable — check ANTHROPIC_API_KEY in .env')
    }
    setLoading(false)
  }

  return (
    <div className="border-b border-border-2">
      {/* Header */}
      <div className="p-2.5 px-5 border-b border-border bg-bg flex items-center justify-between">
        <div className="text-[9px] font-extrabold tracking-widest uppercase text-text-3 font-mono">
          AI Portfolio Analyst
        </div>
        <div className="text-[9px] text-text-3 font-mono">
          groq llama-3 · context-aware · portfolio-specific
        </div>
      </div>

      <div className="p-5 bg-surface">
        {/* Chips — always visible */}
        <div className={messages.length ? 'mb-4' : 'mb-5'}>
          {messages.length === 0 && (
            <div className="text-[9px] text-text-3 font-mono tracking-wider uppercase mb-2.5">
              Suggested questions
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {ANALYST_CHIPS.map(chip => (
              <button
                key={chip}
                onClick={() => send(chip)}
                disabled={loading}
                className={`bg-surface-3 border border-border-2 text-[10px] font-mono p-1.5 px-3 text-left transition-colors duration-150 rounded ${
                  loading ? 'text-text-3 cursor-not-allowed' : 'text-text-2 hover:text-text hover:border-border-3 cursor-pointer'
                }`}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation */}
        {messages.length > 0 && (
          <div className="max-h-[420px] overflow-y-auto mb-4 flex flex-col gap-2">
            {messages.map((m, i) => {
              const isUser = m.role === 'user'
              return (
                <div 
                  key={i} 
                  className={`p-2.5 px-3.5 border-l-2 rounded-r ${
                    isUser ? 'bg-surface-3 border-border-3' : 'bg-bg border-green'
                  }`}
                >
                  <div className={`text-[8px] font-extrabold tracking-widest uppercase font-mono mb-1.5 ${
                    isUser ? 'text-text-3' : 'text-green'
                  }`}>
                    {isUser ? 'You' : 'Analyst'}
                  </div>
                  <div className={`text-xs font-mono leading-relaxed whitespace-pre-wrap ${
                    isUser ? 'text-text-2' : 'text-text'
                  }`}>
                    {m.content}
                  </div>
                </div>
              )
            })}

            {loading && (
              <div className="p-2.5 px-3.5 bg-bg border-l-2 border-green rounded-r">
                <div className="text-[8px] font-extrabold tracking-widest uppercase font-mono mb-1.5 text-green">Analyst</div>
                <div className="text-xs text-text-3 font-mono animate-pulse">Analyzing portfolio...</div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-2.5 px-3.5 mb-3 bg-red-dim border border-red text-red text-[10px] font-mono leading-relaxed rounded">
            {error}
          </div>
        )}

        {/* Input row */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Ask anything about your portfolio..."
            disabled={loading}
            className="flex-1 bg-bg border border-border-2 text-text font-mono text-xs p-2 px-3 outline-none rounded focus:border-border-3 disabled:opacity-50"
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className={`border-none p-2 px-5 text-[9px] font-mono font-extrabold tracking-wider uppercase whitespace-nowrap transition-colors duration-150 rounded ${
              (loading || !input.trim())
                ? 'bg-surface-3 text-text-3 cursor-not-allowed'
                : 'bg-text-strong text-bg hover:opacity-90 cursor-pointer'
            }`}
          >
            Send →
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Input view ─────────────────────────────────────────────────── */
export default function PortfolioEntry() {
  const [rows, setRows]         = useState(() => [newRow(), newRow(), newRow()])
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [pasteText, setPasteText] = useState('')
  const [importText, setImportText] = useState('')
  const [importName, setImportName] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const fileRef = useRef(null)

  const [previewRows, setPreviewRows] = useState([])
  const [previewRejected, setPreviewRejected] = useState([])

  useEffect(() => {
    const textToParse = importText || pasteText
    if (!textToParse.trim()) {
      setPreviewRows([])
      setPreviewRejected([])
      return
    }
    const parsed = parsePortfolioImport(textToParse)
    setPreviewRows(parsed.rows)
    setPreviewRejected(parsed.rejected)
  }, [importText, pasteText])

  function update(id, field, value) {
    setRows(r => r.map(row => row.id === id ? { ...row, [field]: value } : row))
  }

  function addRow() {
    setRows(r => [...r, newRow()])
  }

  function removeRow(id) {
    setRows(r => r.filter(row => row.id !== id))
  }

  function buildPositions(inputRows = rows) {
    return inputRows
      .filter(r => r.ticker.trim() && r.shares)
      .map(r => ({
        ticker: r.ticker.trim().toUpperCase(),
        shares: parseFloat(r.shares) || 0,
        cost_basis: r.cost_basis ? parseFloat(r.cost_basis) : null,
      }))
      .filter(p => p.shares > 0)
  }

  async function analyze(inputRows = rows) {
    const positions = buildPositions(inputRows)

    if (!positions.length) {
      setError('Enter at least one position with a ticker and share count.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await axios.post(`${API_BASE}/portfolio/manual`, { positions })
      setResult(res.data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to fetch portfolio data. Ensure the API server is running.')
    }
    setLoading(false)
  }

  function importPortfolio() {
    if (!previewRows.length) return
    setRows(previewRows)
    analyze(previewRows)
  }

  function loadImportText(text, name = '') {
    setImportText(text)
    setImportName(name)
    setPasteText('')
    setError(null)
  }

  function handleFile(file) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv') && file.type && !file.type.includes('csv')) {
      setError('Upload a CSV file.')
      return
    }

    const reader = new FileReader()
    reader.onload = event => loadImportText(String(event.target?.result || ''), file.name)
    reader.onerror = () => setError('Could not read that file.')
    reader.readAsText(file)
  }

  function handleDrop(event) {
    event.preventDefault()
    setDragActive(false)
    handleFile(event.dataTransfer.files?.[0])
  }

  if (result) {
    return <ResultView result={result} onBack={() => setResult(null)} />
  }

  return (
    <div className="bg-surface min-h-full">

      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 flex-wrap p-3.5 px-5 border-b border-border-2 bg-bg">
        <div className="text-xl font-extrabold text-text-strong font-sans">
          Import portfolio
        </div>

        <div className="ml-2 text-xs text-text-2 font-sans font-medium">
          {rows.filter(r => r.ticker.trim()).length > 0
            ? `${rows.filter(r => r.ticker.trim() && r.shares).length} position${rows.filter(r => r.ticker.trim() && r.shares).length !== 1 ? 's' : ''} ready`
            : 'Upload, paste, or enter holdings'}
        </div>

        <div className="flex-1" />

        <TBtn onClick={analyze} disabled={loading} primary>
          {loading ? 'Analyzing...' : 'Analyze manual rows'}
        </TBtn>
      </div>

      {/* ── Import panel ─────────────────────────────────────────── */}
      <div className="p-5 grid grid-cols-1 lg:grid-cols-[minmax(280px,0.9fr)_minmax(320px,1.1fr)] gap-4 border-b border-border bg-bg">
        <div className="grid gap-4">
          <ImportCard active={dragActive || !!importName} icon={UploadCloud} title="Drop CSV">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={e => handleFile(e.target.files?.[0])}
              style={{ display: 'none' }}
            />
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragActive(true) }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={`min-h-[128px] border border-dashed rounded-xl flex items-center justify-center text-center p-4.5 cursor-pointer text-text-2 font-sans text-sm font-semibold transition-all duration-150 ${
                dragActive ? 'border-teal bg-surface-3' : 'border-border-3 bg-surface hover:border-border-2'
              }`}
            >
              {importName || 'Choose a CSV or drag it here'}
            </div>
            <div className="text-[11px] text-text-3 mt-2 font-sans leading-relaxed">
              Requires headers for <strong>ticker / symbol</strong> and <strong>shares / quantity</strong> (e.g. <code>ticker,shares,cost_basis</code>).
            </div>
          </ImportCard>

          <ImportCard active={!!pasteText} icon={ClipboardPaste} title="Paste holdings">
            <textarea
              value={pasteText}
              onChange={e => {
                setPasteText(e.target.value)
                setImportText('')
                setImportName('')
              }}
              placeholder={'AAPL, 100, 155.00\nMSFT, 50, 280.00\nNVDA, 25, 400.00'}
              className="w-full min-h-[126px] bg-surface border border-border rounded-xl text-text font-mono text-xs p-3 resize-y box-border outline-none leading-relaxed focus:border-border-3"
            />
            <div className="text-[11px] text-text-3 mt-2 font-sans leading-relaxed">
              Supports comma, tab, or space-delimited text. Formats must follow: <code>ticker, shares, [cost_basis]</code>.
            </div>
          </ImportCard>
        </div>

        <ImportPreview
          rows={previewRows}
          rejected={previewRejected}
          onImport={importPortfolio}
          loading={loading}
        />
      </div>

      {/* ── Error banner ────────────────────────────────────────── */}
      {error && (
        <div className="p-2.5 px-5 bg-red-dim border-b border-red text-red text-xs font-mono">
          {error}
        </div>
      )}

      {/* ── Editable grid ───────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th style={{ ...TH_STYLE, textAlign: 'center', width: 44 }}>#</th>
              <th style={{ ...TH_STYLE, width: 120 }}>TICKER</th>
              <th style={{ ...TH_STYLE, textAlign: 'right', width: 140 }}>SHARES</th>
              <th style={{ ...TH_STYLE, textAlign: 'right', width: 160 }}>AVG COST <span className="text-text-3 font-normal font-sans text-[10px]">(optional)</span></th>
              <th style={{ ...TH_STYLE, width: 44 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.id} className={`border-b border-border ${idx % 2 === 0 ? 'bg-surface' : 'bg-surface-2'}`}>
                <td className="text-center p-1 px-2 text-[10px] text-text-3 font-mono w-11">
                  {idx + 1}
                </td>

                <td className="p-1 px-2 w-[120px]">
                  <EditCell
                    value={row.ticker}
                    onChange={v => update(row.id, 'ticker', v)}
                    placeholder="e.g. AAPL"
                    bold
                  />
                </td>

                <td className="p-1 px-2 w-[140px]">
                  <EditCell
                    type="number"
                    value={row.shares}
                    onChange={v => update(row.id, 'shares', v)}
                    placeholder="e.g. 100"
                    align="right"
                  />
                </td>

                <td className="p-1 px-2 w-[160px]">
                  <EditCell
                    type="number"
                    value={row.cost_basis}
                    onChange={v => update(row.id, 'cost_basis', v)}
                    placeholder="e.g. 150"
                    align="right"
                  />
                </td>

                <td className="p-1 px-2 text-center w-11">
                  <button
                    onClick={() => removeRow(row.id)}
                    className="bg-transparent border-none text-text-3 hover:text-red cursor-pointer text-base leading-none p-0.5 px-1.5 font-mono"
                  >×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Add row ─────────────────────────────────────────────── */}
      <div className="p-2.5 px-5 border-top border-border">
        <button
          onClick={addRow}
          className="bg-transparent border border-dashed border-border-3 text-text-3 hover:text-text hover:border-border-2 p-2 px-5 text-[9px] font-mono font-bold tracking-wider uppercase cursor-pointer w-full transition-colors duration-150"
        >
          + Add Row
        </button>
      </div>

      {/* ── Help text ───────────────────────────────────────────── */}
      <div className="p-3.5 px-5 border-t border-border text-[10px] text-text-3 font-mono leading-relaxed">
        Prices are fetched from last market close. &nbsp;·&nbsp; Avg cost is optional — required to compute P&amp;L.
        &nbsp;·&nbsp; Tickers outside the S&amp;P 500 universe resolve via yfinance.
      </div>
    </div>
  )
}
