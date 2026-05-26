import { useState, useRef, useEffect, useMemo } from 'react'
import axios from 'axios'
import { ClipboardPaste, UploadCloud, AlertCircle, Sparkles, Search } from 'lucide-react'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts'

const API_BASE = '/api'
const MONO = 'Geist Mono, monospace'
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

// Ensure clean parsing
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
function EditCell({ value, onChange, onKeyDown, placeholder, type = 'text', bold, align = 'left', mono = true }) {
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
      className={`bg-transparent border-none text-[12px] p-[2px_4px] w-full outline-none min-w-0 border-b transition-colors duration-150 ${
        focused ? 'border-border-3' : 'border-transparent'
      } ${
        bold ? 'text-white font-bold' : 'text-text font-normal'
      } ${
        mono ? 'font-mono' : 'font-sans'
      }`}
      style={{ textAlign: align }}
    />
  )
}

/* ── Toolbar button ─────────────────────────────────────────────── */
function TBtn({ onClick, disabled, primary, children, className = '' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-1.5 text-[9px] font-mono tracking-widest uppercase cursor-pointer border whitespace-nowrap font-bold transition-colors duration-150 rounded-none ${
        primary 
          ? 'bg-white text-bg border-transparent hover:bg-text disabled:bg-surface-2 disabled:text-text-2 disabled:cursor-not-allowed' 
          : 'bg-transparent border-border-2 text-text-2 hover:bg-surface-2 hover:text-white'
      } ${className}`}
    >
      {children}
    </button>
  )
}

/* ── Card wrapper for file drop / paste panels ─────────────────── */
function ImportCard({ active, icon: Icon, title, children }) {
  return (
    <div className={`p-4 min-w-0 border rounded-none ${
      active ? 'bg-surface border-border-2' : 'bg-surface-2 border-border'
    }`}>
      <div className="flex items-center gap-2.5 mb-3">
        <Icon size={18} className="text-teal" />
        <strong className="font-sans text-[15px] text-text-strong">{title}</strong>
      </div>
      {children}
    </div>
  )
}

/* ── Score sub-bar ──────────────────────────────────────────────── */
function ScoreBar({ label, value, detail }) {
  const color = value >= 80 ? 'var(--green)' : value >= 60 ? 'var(--amber)' : 'var(--red)'
  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-[9px] font-bold tracking-widest uppercase text-text-3 font-mono">{label}</span>
        <span style={{ color }} className="text-[14px] font-bold font-mono">{value}</span>
      </div>
      <div className="h-0.5 bg-border-2 mb-1.5">
        <div style={{ width: `${value}%`, background: color }} className="h-full" />
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
    <div className="grid grid-cols-[200px_1fr] border-b border-border-2">
      {/* Score number */}
      <div className="p-8 px-6 border-r border-border-2 flex flex-col items-center justify-center bg-bg">
        <div className="text-[9px] font-black tracking-widest uppercase text-text-3 font-mono mb-3.5">
          Health Score
        </div>
        <div style={{ color: scoreColor }} className="text-[72px] font-bold font-mono leading-none">
          {score}
        </div>
        <div style={{ color: scoreColor }} className="text-[9px] font-black tracking-wider uppercase font-mono mt-2.5">
          {label}
        </div>
      </div>

      {/* Component bars */}
      <div className="p-6 px-8 bg-surface">
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-[20px_48px] ${flags.length ? 'mb-5' : 'mb-0'}`}>
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
          <div className="p-4 bg-surface-2 border border-border-2 mt-4 rounded-none">
            <div className="text-[10px] font-black tracking-wider uppercase text-text-strong font-mono mb-3 flex items-center gap-1.5">
              <AlertCircle size={14} style={{ color: score < 60 ? '#ef4444' : '#f59e0b' }} />
              <span>Risk Warning Flags ({flags.length})</span>
            </div>
            <div className="flex flex-col gap-2">
              {flags.map((f, i) => (
                <div 
                  key={i} 
                  className={`text-[11px] font-mono leading-relaxed p-2 px-3 border-l-2 flex items-center gap-2.5 rounded-none ${
                    score < 60 ? 'text-[#fca5a5] bg-[#2a1212] border-[#ef4444]' : 'text-[#fef08a] bg-[#27200c] border-[#f59e0b]'
                  }`}
                >
                  <AlertCircle size={14} className={score < 60 ? "text-red flex-shrink-0" : "text-amber flex-shrink-0"} />
                  <span className="font-bold">{f}</span>
                </div>
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

function RadarPanel({ title, status = 'ok', className = '', children }) {
  return (
    <div className={`p-5 border-r border-b border-border flex flex-col min-w-0 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[9px] font-bold tracking-wider uppercase text-text-3 font-mono">{title}</span>
        <div style={{ background: STATUS_COLOR[status] ?? STATUS_COLOR.unknown }} className="w-1.5 h-1.5 flex-shrink-0" />
      </div>
      {children}
    </div>
  )
}

function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="h-0.5 bg-border-2 mt-1 mb-1">
      <div style={{ width: `${pct}%`, background: color }} className="h-full" />
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
        <span style={{ color }} className="text-[11px] font-bold font-mono">
          {pos ? '+' : ''}{value.toFixed(2)}
        </span>
      </div>
      <div className="h-0.5 bg-border-2">
        <div style={{ width: `${barPct}%`, background: color }} className="h-full" />
      </div>
    </div>
  )
}

/* ── Risk Radar card ────────────────────────────────────────────── */
function RiskRadar({ radar }) {
  if (!radar || !Object.keys(radar).length) return null
  const { sector_exposure = [], correlation = {}, factor_tilt = {} } = radar

  const corrLevelLabel = { ok: 'LOW', warning: 'MODERATE', alert: 'HIGH', unknown: '—' }

  return (
    <div className="border-b border-border-2">
      {/* Section label */}
      <div className="px-5 py-2.5 border-b border-border bg-bg text-[9px] font-black tracking-widest uppercase text-text-3 font-mono">
        Risk Profile Diagnostics
      </div>

      {/* 2 × 2 panel grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 bg-surface">

        {/* ── Panel 1: Sector Exposure ────────────────────────────── */}
        <RadarPanel
          title="Sector Exposure"
          status={sector_exposure.find(s => s.status === 'alert') ? 'alert'
                : sector_exposure.find(s => s.status === 'warning') ? 'warning' : 'ok'}
        >
          {sector_exposure.length === 0 ? (
            <span className="text-[10px] text-text-3 font-mono">No sector data</span>
          ) : (
            <>
              <div className="flex h-3 w-full bg-surface-2 border border-border rounded-none overflow-hidden mb-3">
                {sector_exposure.map((s, idx) => {
                  const weight = Number(s.weight);
                  if (weight <= 0) return null;
                  const colors = [
                    'var(--chart-1)',
                    'var(--chart-3)',
                    'var(--chart-4)',
                    'var(--chart-5)',
                    'var(--blue)',
                    'var(--text-2)',
                    'var(--amber)',
                  ];
                  const color = colors[idx % colors.length];
                  return (
                    <div
                      key={s.sector}
                      style={{
                        width: `${(weight * 100).toFixed(2)}%`,
                        backgroundColor: color,
                      }}
                      title={`${s.sector}: ${(weight * 100).toFixed(1)}%`}
                    />
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {sector_exposure.map((s, idx) => {
                  const weight = Number(s.weight);
                  if (weight <= 0) return null;
                  const colors = [
                    'var(--chart-1)',
                    'var(--chart-3)',
                    'var(--chart-4)',
                    'var(--chart-5)',
                    'var(--blue)',
                    'var(--text-2)',
                    'var(--amber)',
                  ];
                  const color = colors[idx % colors.length];
                  const badge = s.status === 'alert'
                    ? <span className="text-red font-bold ml-1 text-[9px]">[ALERT]</span>
                    : s.status === 'warning'
                      ? <span className="text-amber font-bold ml-1 text-[9px]">[WARN]</span>
                      : null;
                  return (
                    <div key={s.sector} className="font-mono text-[11px] flex items-center gap-1.5">
                      <span style={{ backgroundColor: color }} className="w-1.5 h-1.5 flex-shrink-0" />
                      <span className="text-text-2 uppercase">{s.sector}</span>
                      <span className="text-text-strong font-bold">{(weight * 100).toFixed(1)}%</span>
                      {badge}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </RadarPanel>

        {/* Panel 2: Correlation Risk */}
        <RadarPanel title="Correlation Risk" status={correlation.level ?? 'unknown'}>
          {correlation.avg == null ? (
            <span className="text-[10px] text-text-3 font-mono">
              Requires ≥2 S&P 500 tickers
            </span>
          ) : (
            <>
              <div className="mb-4">
                <div className="flex items-baseline gap-2.5 mb-1">
                  <span style={{ color: STATUS_COLOR[correlation.level] }} className="text-[28px] font-bold font-mono">
                    {correlation.avg.toFixed(2)}
                  </span>
                  <span style={{ color: STATUS_COLOR[correlation.level] }} className="text-[9px] font-black tracking-widest uppercase font-mono">
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
                      <div key={i} className="flex justify-between mb-1.5">
                        <span className="text-[10px] font-mono text-text-2 font-bold">
                          {p.a} · {p.b}
                        </span>
                        <span style={{ color: c }} className="text-[10px] font-mono font-bold">
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
        <RadarPanel title="Factor Tilt" status="ok" className="md:col-span-2 border-r-0">
          {!factor_tilt.has_data ? (
            <span className="text-[10px] text-text-3 font-mono">
              No universe overlap — factor data unavailable
            </span>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Radar Chart */}
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart outerRadius="70%" data={[
                    { subject: 'MOM 6M', value: Number(factor_tilt.tilts?.momentum_6m || 0) },
                    { subject: 'MOM 12M', value: Number(factor_tilt.tilts?.momentum_12m || 0) },
                    { subject: 'QUALITY', value: Number(factor_tilt.tilts?.quality || 0) },
                    { subject: 'VOLATILITY', value: Number(factor_tilt.tilts?.volatility || 0) },
                  ]}>
                    <PolarGrid stroke="#333" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-3)', fontSize: 9, fontFamily: 'Geist Mono, monospace' }} />
                    <Radar
                      name="Factor Tilt"
                      dataKey="value"
                      stroke="var(--green)"
                      fill="var(--green)"
                      fillOpacity={0.25}
                      dot={{ r: 3, fill: 'var(--green)', strokeWidth: 0 }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Numerical List */}
              <div className="flex flex-col justify-center">
                <TiltRow label="Momentum 6M"  value={factor_tilt.tilts?.momentum_6m}  />
                <TiltRow label="Momentum 12M" value={factor_tilt.tilts?.momentum_12m} />
                <TiltRow label="Quality"      value={factor_tilt.tilts?.quality}      />
                <TiltRow label="Volatility"   value={factor_tilt.tilts?.volatility}   />
                <div className="mt-2 text-[9px] text-text-3 font-mono">
                  {factor_tilt.n_covered}/{factor_tilt.n_total} positions in universe
                </div>
              </div>
            </div>
          )}
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
    <div className="p-5 px-6 border-r border-border flex-1 min-w-0">
      <div className="text-[9px] font-bold tracking-wider uppercase text-text-3 font-mono mb-3.5">
        {label}
      </div>

      <div className="flex items-end gap-3 mb-2.5">
        <div>
          <div className="text-[22px] font-bold font-mono text-white leading-none">
            {current}
          </div>
          <div className="text-[8px] text-text-3 font-mono tracking-wider uppercase mt-1">
            Portfolio
          </div>
        </div>
        <div className="text-[9px] text-text-3 font-mono mb-3">vs.</div>
        <div>
          <div className="text-[15px] font-semibold font-mono text-text-2 leading-none">
            {baseline}
          </div>
          <div className="text-[8px] text-text-3 font-mono tracking-wider uppercase mt-1">
            Baseline
          </div>
        </div>
      </div>

      <div style={{ color: deltaColor }} className="text-[10px] font-bold font-mono">
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
    <div className="flex gap-3 items-start py-[11px] border-b border-border">
      <span 
        style={{ background: color }} 
        className="w-1 h-1 flex-shrink-0 mt-2" 
      />
      <span className={`text-[11px] font-mono leading-relaxed ${isDefense ? 'text-text' : 'text-text-2'}`}>
        {text}
      </span>
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
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-border bg-bg">
        <div className="text-[9px] font-black tracking-widest uppercase text-text-3 font-mono">
          Defensive Intelligence
        </div>
        <div className="text-[9px] text-text-3 font-mono">
          vs. equal-weight baseline
          {!has_vol_data && ' · structural metrics only (≥2 S&P 500 tickers needed for vol)'}
        </div>
      </div>

      {/* Metric tiles */}
      <div className="flex border-b border-border-2 bg-surface">
        {metrics.map((m, i) => <MetricTile key={i} {...m} />)}
      </div>

      {/* Insight feed */}
      {insights.length > 0 && (
        <div className="px-5 pb-1 bg-surface">
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
      <div className={`text-[16px] font-mono font-bold mt-0.5 ${green ? 'text-green' : 'text-white'}`}>
        {value}
      </div>
    </div>
  )
}

/* ── Results view ───────────────────────────────────────────────── */
function ResultView({ result }) {
  const { positions = [], total_value, health, risk_radar, defense } = result

  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('weight')
  const [sortDir, setSortDir] = useState('desc')

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const filteredAndSortedPositions = useMemo(() => {
    let items = [...positions]
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      items = items.filter(p => 
        p.ticker.toLowerCase().includes(q) || 
        (p.sector && p.sector.toLowerCase().includes(q))
      )
    }
    items.sort((a, b) => {
      let av = a[sortKey]
      let bv = b[sortKey]
      
      if (av == null) av = sortDir === 'desc' ? -Infinity : Infinity
      if (bv == null) bv = sortDir === 'desc' ? -Infinity : Infinity

      if (typeof av === 'string') {
        return sortDir === 'desc' ? bv.localeCompare(av) : av.localeCompare(bv)
      }
      return sortDir === 'desc' ? bv - av : av - bv
    })
    return items
  }, [positions, search, sortKey, sortDir])

  return (
    <div className="portfolio-results-layout grid grid-cols-1">
      {/* Left Column: Dashboard metrics and table */}
      <div className="min-w-0 flex flex-col overflow-y-auto">

        {/* Header */}
        <div className="flex items-center gap-4 flex-wrap px-5 py-3.5 border-b border-border-2 bg-bg">
          <div className="text-[11px] font-black font-mono text-white tracking-wider uppercase">
            ✦ PORTFOLIO EVALUATION REPORT
          </div>
          <TBtn
            onClick={() => window.dispatchEvent(new CustomEvent('toggle-ai-chat', { detail: { open: true } }))}
            className="flex items-center gap-1.5 ml-auto"
          >
            <Sparkles size={13} className="text-green" />
            <span>Ask Copilot (⌘K)</span>
          </TBtn>
        </div>

        {/* Hero Stats Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 border-b border-border-2 bg-surface-2">
          {/* Portfolio Value Hero */}
          <div className="px-5 py-6 border-r border-border-2 flex flex-col justify-center">
            <span className="text-[9px] text-text-3 font-mono tracking-widest uppercase mb-1.5">
              Portfolio Value
            </span>
            <strong className="text-[32px] text-white font-mono font-bold leading-none">
              {`$${(total_value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </strong>
          </div>

          {/* Asset Count */}
          <div className="px-5 py-6 border-r border-border-2 flex flex-col justify-center">
            <span className="text-[9px] text-text-3 font-mono tracking-widest uppercase mb-1.5">
              Positions
            </span>
            <strong className="text-[24px] text-text-strong font-mono font-bold leading-none">
              {positions.length}
            </strong>
          </div>

          {/* Sector Count */}
          <div className="px-5 py-6 flex flex-col justify-center">
            <span className="text-[9px] text-text-3 font-mono tracking-widest uppercase mb-1.5">
              Sector Spread
            </span>
            <strong className="text-[24px] text-text-strong font-mono font-bold leading-none">
              {[...new Set(positions.map(p => p.sector).filter(s => s && s !== '—' && s !== 'Unknown'))].length} Sectors
            </strong>
          </div>
        </div>

        {/* Health Score */}
        <HealthScoreCard health={health} />

        {/* Risk Radar */}
        <RiskRadar radar={risk_radar} />

        {/* Defensive Intelligence */}
        <DefensiveIntelligence defense={defense} />

        {/* Table Warning Banner */}
        {positions.some(p => p.error) && (
          <div className="mx-5 my-3.5 p-[10px_14px] bg-[#2b1515] border-l-4 border-red text-[#fca5a5] text-[12px] flex items-center gap-2 rounded-none">
            <AlertCircle size={16} className="text-red flex-shrink-0" />
            <span>
              <strong>Price Sync Issues:</strong> Tickers (
              {positions.filter(p => p.error).map(p => p.ticker).join(', ')}
              ) could not be resolved. Hover over the red alert icons in the table for details.
            </span>
          </div>
        )}

        {/* Table Search & Filter Input */}
        <div className="px-5 py-3 bg-surface-2 border-b border-border-2 flex items-center gap-3">
          <Search size={14} className="text-text-3" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter holdings by ticker or sector..."
            className="flex-1 bg-transparent border-none text-white text-[11px] font-mono outline-none"
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="bg-transparent border-none text-text-3 cursor-pointer font-mono text-[10px] hover:text-white"
            >
              CLEAR
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {[
                  { label: '#',         align: 'center', w: 40,  key: null },
                  { label: 'TICKER',    align: 'left',   w: 120, key: 'ticker' },
                  { label: 'SECTOR',    align: 'left',   w: 150, key: 'sector' },
                  { label: 'SHARES',    align: 'right',  w: 100, key: 'shares' },
                  { label: 'PRICE',     align: 'right',  w: 100, key: 'price' },
                  { label: 'MKT VALUE', align: 'right',  w: 120, key: 'mkt_value' },
                  { label: 'WEIGHT',    align: 'right',  w: 120, key: 'weight' },
                  { label: 'P&L %',     align: 'right',  w: 100, key: 'pnl_pct' },
                ].map((h, i) => {
                  const isSortable = h.key != null
                  const isActive = sortKey === h.key
                  return (
                    <th 
                      key={i} 
                      onClick={() => isSortable && handleSort(h.key)}
                      style={{ 
                        ...TH_STYLE, 
                        textAlign: h.align, 
                        width: h.w,
                        cursor: isSortable ? 'pointer' : 'default',
                        userSelect: 'none',
                        background: isActive ? 'var(--surface-3)' : 'transparent',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <div className={`inline-flex items-center gap-1 w-full ${h.align === 'right' ? 'justify-end' : 'justify-start'}`}>
                        <span>{h.label}</span>
                        {isSortable && isActive && (
                          <span>{sortDir === 'desc' ? ' ▼' : ' ▲'}</span>
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedPositions.map((p, i) => {
                const hasPnl = p.pnl_pct != null
                const pnlColor = hasPnl ? (p.pnl_pct >= 0 ? '#22c55e' : '#ef4444') : 'var(--text-3)'
                return (
                  <tr key={p.ticker + i} className={`border-b border-border ${i % 2 === 0 ? 'bg-surface' : 'bg-surface-2'}`}>
                    <td className="text-center px-3 py-2.5 text-[10px] text-text-3 font-mono w-10">{i + 1}</td>

                    <td className="px-3 py-2.5">
                      <span className="font-mono text-[12px] font-bold text-white">{p.ticker}</span>
                    </td>

                    <td className="px-3 py-2.5">
                      <span className="font-mono text-[10px] text-text-2">{p.sector || '—'}</span>
                    </td>

                    <td className="px-3 py-2.5 text-right font-mono text-[11px] text-text">
                      {p.shares?.toLocaleString()}
                    </td>

                    <td className="px-3 py-2.5 text-right font-mono text-[11px] text-text">
                      {p.price != null ? `$${p.price.toFixed(2)}` : (
                        <span className="bg-red-dim border border-red text-red px-1.5 py-0.5 text-[9px] font-mono font-bold inline-flex items-center gap-1 cursor-help rounded-none"
                          title={p.error || "Price unavailable (Ticker not found in local index and yfinance fallback returned empty data)"}
                        >
                          <span>Fetch Error</span>
                          <AlertCircle size={10} />
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-2.5 text-right font-mono text-[12px] font-bold text-text">
                      {p.mkt_value != null
                        ? `$${p.mkt_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : '—'}
                    </td>

                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <div 
                          style={{ width: `${Math.min(Math.round((p.weight || 0) * 200), 60)}px` }} 
                          className="h-0.5 bg-border-3" 
                        />
                        <span className="font-mono text-[11px] font-bold text-text min-w-10 text-right">
                          {p.weight != null ? `${(p.weight * 100).toFixed(1)}%` : '—'}
                        </span>
                      </div>
                    </td>

                    <td style={{ color: pnlColor }} className="px-3 py-2.5 text-right font-mono text-[11px] font-bold">
                      {hasPnl ? (
                        `${p.pnl_pct >= 0 ? '+' : ''}${p.pnl_pct.toFixed(2)}%`
                      ) : p.price == null ? (
                        <span className="bg-red-dim border border-red text-red px-1.5 py-0.5 text-[9px] font-mono font-bold cursor-help rounded-none"
                          title="Price is missing; cannot compute P&L."
                        >
                          No Price
                        </span>
                      ) : (
                        <span className="bg-amber/10 border border-amber text-amber px-1.5 py-0.5 text-[9px] font-mono font-bold cursor-help rounded-none"
                          title="Average cost basis is missing. Set cost basis in the editor grid to compute P&L."
                        >
                          Missing Cost
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer note */}
        <div className="px-5 py-3 border-t border-border text-[10px] text-text-3 font-mono leading-relaxed">
          Prices sourced from last market close. P&L requires avg cost basis.
          Tickers not in the S&P 500 universe are resolved via yfinance.
        </div>
      </div>
    </div>
  )
}

function ReportSkeleton() {
  return (
    <div className="flex flex-col gap-5 p-5 bg-surface min-h-[600px] rounded-none">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center h-10 border-b border-border-2 pb-3 animate-pulse">
        <div className="w-60 h-3.5 bg-border-3" />
        <div className="w-30 h-7 bg-border-2" />
      </div>

      {/* Hero Stats Panel Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-surface-2 border border-border-2 p-[24px_20px] animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex flex-col gap-2">
            <div className="w-20 h-2 bg-border-3" />
            <div className="w-36 h-6 bg-border-2" />
          </div>
        ))}
      </div>

      {/* Warnings Skeleton */}
      <div className="h-20 bg-surface-2 border border-border-2 p-4 flex flex-col gap-3 animate-pulse">
        <div className="w-36 h-2.5 bg-border-3" />
        <div className="w-[90%] h-3.5 bg-border-2" />
      </div>

      {/* Table Skeleton */}
      <div className="flex flex-col gap-3 border border-border-2 overflow-hidden animate-pulse">
        <div className="h-9 bg-surface-3" />
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex justify-between p-[14px_16px] border-t border-border-2">
            <div className="w-15 h-3 bg-border-2" />
            <div className="w-30 h-2.5 bg-border-3" />
            <div className="w-20 h-3 bg-border-2" />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Input view ─────────────────────────────────────────────────── */
export default function PortfolioEntry({ rows = [], setRows, result, setResult, onApplyPortfolio }) {
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [inputText, setInputText] = useState('')
  const [importName, setImportName] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [activeTab, setActiveTab]   = useState('editor')
  const fileRef = useRef(null)

  const parsedImport = parsePortfolioImport(inputText)

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
      setActiveTab('editor')
      return
    }
    setError(null)
    setLoading(true)
    setActiveTab('report')
    try {
      const res = await axios.post(`${API_BASE}/portfolio/manual`, { positions })
      setResult(res.data)
      if (onApplyPortfolio) {
        onApplyPortfolio(res.data)
      }
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to fetch portfolio data. Ensure the API server is running.')
      setActiveTab('editor')
    }
    setLoading(false)
  }

  function importPortfolio() {
    if (!parsedImport.rows.length) return
    setRows(parsedImport.rows)
    setInputText('')
    setImportName('')
  }

  async function quickImportAndAnalyze() {
    if (!parsedImport.rows.length) return
    const targetRows = parsedImport.rows
    setRows(targetRows)
    setInputText('')
    setImportName('')
    await analyze(targetRows)
  }

  function handleFile(file) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv') && file.type && !file.type.includes('csv')) {
      setError('Upload a CSV file.')
      return
    }

    const reader = new FileReader()
    reader.onload = event => {
      setInputText(String(event.target?.result || ''))
      setImportName(file.name)
      setError(null)
    }
    reader.onerror = () => setError('Could not read that file.')
    reader.readAsText(file)
  }

  function handleDrop(event) {
    event.preventDefault()
    setDragActive(false)
    handleFile(event.dataTransfer.files?.[0])
  }

  return (
    <div className="bg-surface min-h-full">

      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 flex-wrap px-5 py-3.5 border-b border-border-2 bg-bg">
        <div className="text-[20px] font-black text-white tracking-tight">
          Import portfolio
        </div>

        <div className="ml-2 text-[14px] text-text-2">
          {rows.filter(r => r.ticker.trim()).length > 0
            ? `${rows.filter(r => r.ticker.trim() && r.shares).length} position${rows.filter(r => r.ticker.trim() && r.shares).length !== 1 ? 's' : ''} ready`
            : 'Upload, paste, or enter holdings'}
        </div>
      </div>

      {/* ── Tabs Header ────────────────────────────────────────── */}
      <div className="flex border-b border-border-2 bg-surface-2">
        <button
          onClick={() => setActiveTab('editor')}
          className={`flex-1 py-3.5 bg-transparent border-none border-r border-border-2 border-b-2 font-mono text-[11px] font-black cursor-pointer uppercase tracking-wider outline-none transition-colors rounded-none ${
            activeTab === 'editor' ? 'bg-surface border-b-white text-white' : 'border-b-transparent text-text-3 hover:text-text-2 hover:bg-surface-3'
          }`}
        >
          Position Editor {rows.length > 0 ? `(${rows.length})` : ''}
        </button>
        <button
          onClick={() => setActiveTab('report')}
          className={`flex-1 py-3.5 bg-transparent border-none border-b-2 font-mono text-[11px] font-black cursor-pointer uppercase tracking-wider outline-none transition-colors rounded-none ${
            activeTab === 'report' ? 'bg-surface border-b-white text-white' : 'border-b-transparent text-text-3 hover:text-text-2 hover:bg-surface-3'
          }`}
        >
          Diagnostics Report {result ? '✦' : ''}
        </button>
      </div>

      {/* ── Tab Contents: Editor ───────────────────────────────── */}
      {activeTab === 'editor' && (
        <div>
          {/* Unified Ingest panel (Unified Ingest Terminal) */}
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5 border-b border-border bg-bg">
            {/* Left Column: Code Textarea / Drag & Drop Target */}
            <div
              onDragOver={e => { e.preventDefault(); setDragActive(true) }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className="relative flex flex-col gap-2"
            >
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-black font-mono text-white tracking-wider uppercase">
                  Raw Ingest Terminal
                </span>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="bg-transparent border-none text-blue cursor-pointer font-bold text-[11px] underline hover:text-blue-dim"
                >
                  Upload CSV file
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={e => handleFile(e.target.files?.[0])}
                  className="hidden"
                />
              </div>

              <div className="relative flex-1 min-h-[180px] flex">
                <textarea
                  value={inputText}
                  onChange={e => {
                    setInputText(e.target.value)
                    if (importName) setImportName('')
                  }}
                  placeholder={`// Paste CSV rows or drag & drop a CSV file here...\n// Format: TICKER, SHARES, [AVG_COST]\n// Example:\nAAPL, 100, 150.25\nMSFT, 250, 420.50`}
                  className={`w-full min-h-[180px] bg-surface border text-white font-mono text-[12px] p-3.5 resize-none outline-none leading-relaxed rounded-none ${
                    dragActive ? 'border-blue' : 'border-border-3'
                  }`}
                />
                {dragActive && (
                  <div className="absolute inset-0 bg-blue/15 border-2 border-dashed border-blue flex items-center justify-center text-blue font-mono text-[13px] font-black pointer-events-none backdrop-blur-[2px]">
                    Drop CSV file to load
                  </div>
                )}
              </div>
              <div className="text-[10px] text-text-3 font-mono flex justify-between">
                <span>Supports comma, tab, or space-separated files.</span>
                {importName && <span className="text-green font-bold">Active file: {importName}</span>}
              </div>
            </div>

            {/* Right Column: Dynamic Preview & actions */}
            <div className="flex flex-col justify-between bg-surface border border-border p-4 rounded-none">
              <div>
                <div className="text-[11px] font-black font-mono text-white tracking-wider uppercase mb-3">
                  Ingest Status & Preview
                </div>

                {parsedImport.rows.length === 0 ? (
                  <div className="py-6 text-center text-text-3 text-[12px]">
                    Awaiting input in terminal...
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-4 mb-3">
                      <div>
                        <span className="text-[10px] text-text-3 font-mono">VALID ROWS:</span>
                        <strong className="block text-[16px] text-green font-mono font-bold">{parsedImport.rows.length}</strong>
                      </div>
                      {parsedImport.rejected.length > 0 && (
                        <div>
                          <span className="text-[10px] text-text-3 font-mono">SKIPPED ROWS:</span>
                          <strong className="block text-[16px] text-amber font-mono font-bold">{parsedImport.rejected.length}</strong>
                        </div>
                      )}
                    </div>

                    <div className="overflow-x-auto max-h-[90px] border border-border-2 rounded-none">
                      <table className="w-full border-collapse text-[11px] font-mono">
                        <thead>
                          <tr className="bg-surface-2">
                            <th className="px-2 py-1 text-left text-text-2 font-bold">TICKER</th>
                            <th className="px-2 py-1 text-right text-text-2 font-bold">SHARES</th>
                            <th className="px-2 py-1 text-right text-text-2 font-bold">AVG COST</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedImport.rows.slice(0, 3).map((r, i) => (
                            <tr key={i} className="border-t border-border-2">
                              <td className="px-2 py-1 font-bold text-white">{r.ticker}</td>
                              <td className="px-2 py-1 text-right">{Number(r.shares).toLocaleString()}</td>
                              <td className={`px-2 py-1 text-right ${r.cost_basis ? 'text-white' : 'text-text-3'}`}>
                                {r.cost_basis ? `$${Number(r.cost_basis).toFixed(2)}` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {parsedImport.rows.length > 3 && (
                        <div className="px-2 py-1 text-text-3 text-[10px] border-t border-border-2">
                          + {parsedImport.rows.length - 3} more positions detected
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2.5 mt-3">
                <button
                  onClick={importPortfolio}
                  disabled={parsedImport.rows.length === 0}
                  className={`flex-1 bg-transparent text-[12px] font-black py-2.5 border border-border-3 text-center cursor-pointer transition-colors duration-150 rounded-none ${
                    parsedImport.rows.length > 0 ? 'text-white hover:bg-surface-2' : 'text-text-3 cursor-not-allowed'
                  }`}
                >
                  Load into Grid
                </button>
                <button
                  onClick={quickImportAndAnalyze}
                  disabled={parsedImport.rows.length === 0}
                  className={`flex-[1.2] border border-border-3 py-2.5 text-center cursor-pointer text-[12px] font-black transition-colors duration-150 rounded-none ${
                    parsedImport.rows.length > 0 ? 'bg-white text-bg hover:bg-text' : 'bg-surface-2 text-text-3 cursor-not-allowed'
                  }`}
                >
                  Quick Ingest & Analyze
                </button>
              </div>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="px-5 py-2.5 bg-[#1a0a0a] border-b border-[#3a1010] text-red text-[11px] font-mono">
              {error}
            </div>
          )}

          {/* Editable grid or Empty State */}
          {rows.length === 0 ? (
            <div className="py-12 px-6 text-center border border-dashed border-border-2 mx-5 my-5 bg-surface-2 flex flex-col items-center gap-3 rounded-none">
              <div className="text-[12px] color-text-2 font-mono font-bold tracking-wider uppercase">
                Manual Entry Sheet Empty
              </div>
              <div className="text-[11px] text-text-3 max-w-[320px] leading-relaxed mb-2">
                No active positions found in this sheet. You can use the Unified Ingest Terminal above to load raw data, or manually start adding positions.
              </div>
              <div className="flex gap-2.5">
                <TBtn onClick={addRow} primary>+ Add Position</TBtn>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th style={{ ...TH_STYLE, textAlign: 'center', width: 44 }}>#</th>
                    <th style={{ ...TH_STYLE, width: 120 }}>TICKER</th>
                    <th style={{ ...TH_STYLE, textAlign: 'right', width: 140 }}>SHARES</th>
                    <th style={{ ...TH_STYLE, textAlign: 'right', width: 160 }}>AVG COST <span className="text-text-3 font-normal">(optional)</span></th>
                    <th style={{ ...TH_STYLE, width: 44 }} />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={row.id} className={`border-b border-border ${idx % 2 === 0 ? 'bg-surface' : 'bg-surface-2'}`}>
                      <td className="text-center px-2 py-1.5 text-[10px] text-text-3 font-mono w-11">
                        {idx + 1}
                      </td>

                      <td className="p-2 w-30">
                        <EditCell
                          value={row.ticker}
                          onChange={v => update(row.id, 'ticker', v)}
                          placeholder="AAPL"
                          bold
                        />
                      </td>

                      <td className="p-2 w-36">
                        <EditCell
                          type="number"
                          value={row.shares}
                          onChange={v => update(row.id, 'shares', v)}
                          placeholder="0"
                          align="right"
                        />
                      </td>

                      <td className="p-2 w-40">
                        <EditCell
                          type="number"
                          value={row.shares ? row.cost_basis : ''}
                          onChange={v => update(row.id, 'cost_basis', v)}
                          placeholder="—"
                          align="right"
                        />
                      </td>

                      <td className="p-2 text-center w-11">
                        <button
                          onClick={() => removeRow(row.id)}
                          className="bg-transparent border-none text-text-3 cursor-pointer text-[16px] leading-none px-1.5 py-0.5 font-mono hover:text-white"
                        >×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add row */}
          <div className="p-2.5 px-5 border-t border-border bg-bg">
            <button
              onClick={addRow}
              className="bg-transparent border border-dashed border-border-3 text-text-3 py-2 text-[9px] font-mono font-bold tracking-widest uppercase cursor-pointer w-full hover:border-text-2 hover:text-text-2 transition-colors rounded-none"
            >
              + Add Row
            </button>
          </div>

          {/* Main Action Button */}
          {rows.length > 0 && (
            <div className="p-4 px-5 border-t border-border bg-bg flex justify-end">
              <TBtn 
                onClick={() => analyze(rows)} 
                disabled={loading} 
                primary 
                className="w-full py-3 text-[13px] font-black"
              >
                {loading ? 'Analyzing portfolio...' : 'Analyze & Apply to Active Workspace'}
              </TBtn>
            </div>
          )}

          {/* Help text */}
          <div className="px-5 py-3 border-t border-border text-[10px] text-text-3 font-mono leading-relaxed">
            Prices are fetched from last market close. &nbsp;·&nbsp; Avg cost is optional — required to compute P&amp;L.
            &nbsp;·&nbsp; Tickers outside the S&amp;P 500 universe resolve via yfinance.
          </div>
        </div>
      )}

      {/* ── Tab Contents: Report ───────────────────────────────── */}
      {activeTab === 'report' && (
        <div>
          {loading ? (
            <ReportSkeleton />
          ) : result ? (
            <ResultView result={result} />
          ) : (
            <div className="mx-5 my-10 p-[60px_40px] text-center border border-dashed border-border-3 bg-surface-2 flex flex-col items-center gap-4 rounded-none">
              <Sparkles size={24} className="text-text-3" />
              <div className="text-[13px] font-black font-mono text-text-strong uppercase tracking-wider">
                Diagnostics Workspace Empty
              </div>
              <div className="text-[11px] text-text-3 max-w-[360px] leading-relaxed">
                You have not analyzed any holdings in this session yet. Go to the <strong>Position Editor</strong> tab, load or enter your portfolio, and hit <strong>Analyze</strong> to populate report.
              </div>
              <button
                onClick={() => setActiveTab('editor')}
                className="bg-white text-bg border border-border-3 px-4 py-2 font-mono text-[11px] font-bold cursor-pointer hover:bg-text rounded-none"
              >
                GO TO EDITOR
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
