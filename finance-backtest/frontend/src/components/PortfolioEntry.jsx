import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { ClipboardPaste, UploadCloud } from 'lucide-react'

const API_BASE = 'http://127.0.0.1:8001/api'
const MONO = 'Roboto Mono, monospace'
const SANS = 'IBM Plex Sans, Inter, system-ui, sans-serif'

const TH_STYLE = {
  padding: '10px 12px',
  fontSize: '9px',
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: '#888888',
  background: '#0e0e0e',
  borderBottom: '1px solid #2e2e2e',
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
    const ticker = normalizeTicker(cells[tickerIdx])
    const shares = parseFloat(cells[sharesIdx])
    const cost = costIdx >= 0 ? parseFloat(cells[costIdx]) : NaN

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
function EditCell({ value, onChange, onKeyDown, placeholder, type = 'text', bold, mono, align = 'left' }) {
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
      style={{
        background: 'transparent',
        border: 'none',
        borderBottom: `1px solid ${focused ? 'var(--border-3)' : 'transparent'}`,
        color: bold ? 'var(--white)' : 'var(--text)',
        fontFamily: MONO,
        fontSize: '12px',
        fontWeight: bold ? 700 : 400,
        padding: '2px 4px',
        width: '100%',
        outline: 'none',
        textAlign: align,
        minWidth: 0,
      }}
    />
  )
}

/* ── Toolbar button ─────────────────────────────────────────────── */
function TBtn({ onClick, disabled, primary, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: primary ? (disabled ? 'var(--surface-2)' : 'var(--white)') : 'transparent',
        border: primary ? 'none' : '1px solid var(--border-2)',
        color: primary ? (disabled ? 'var(--text-2)' : 'var(--bg)') : 'var(--text-2)',
        padding: '6px 16px',
        fontSize: '9px',
        fontFamily: MONO,
        fontWeight: primary ? 800 : 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        cursor: disabled ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

function ImportCard({ active, icon: Icon, title, children }) {
  return (
    <div style={{
      background: active ? 'var(--surface)' : 'var(--surface-2)',
      border: `1px solid ${active ? 'var(--border-2)' : 'var(--border)'}`,
      borderRadius: 14,
      padding: 16,
      minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <Icon size={18} color="var(--teal)" />
        <strong style={{ fontFamily: SANS, fontSize: 15, color: 'var(--text-strong)' }}>{title}</strong>
      </div>
      {children}
    </div>
  )
}

function ImportPreview({ rows, rejected, onImport, loading }) {
  const canImport = rows.length > 0 && !loading

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '14px 16px',
        borderBottom: '1px solid var(--border)',
      }}>
        <strong style={{ fontFamily: SANS, fontSize: 16, color: 'var(--text-strong)' }}>Preview</strong>
        <button
          onClick={onImport}
          disabled={!canImport}
          title={!canImport ? "No holdings parsed yet. Please drag & drop a CSV file, or paste text in the input fields on the left." : "Import previewed holdings and run portfolio analysis"}
          style={{
            background: canImport ? 'var(--ink)' : 'var(--surface-2)',
            color: canImport ? '#fff' : 'var(--text-3)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '9px 14px',
            fontFamily: SANS,
            fontSize: 13,
            fontWeight: 800,
            cursor: canImport ? 'pointer' : 'not-allowed',
          }}
        >
          {loading ? 'Importing...' : 'Import portfolio'}
        </button>
      </div>

      {rows.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Ticker', 'Shares', 'Avg cost'].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 14px',
                      textAlign: i === 0 ? 'left' : 'right',
                      color: 'var(--text-2)',
                      fontFamily: SANS,
                      fontSize: 13,
                      borderBottom: '1px solid var(--border)',
                      background: 'var(--surface-2)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 12).map(row => (
                <tr key={row.id}>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontFamily: MONO, fontWeight: 800, color: 'var(--text-strong)' }}>
                    {row.ticker}
                  </td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontFamily: MONO }}>
                    {Number(row.shares).toLocaleString()}
                  </td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontFamily: MONO, color: row.cost_basis ? 'var(--text)' : 'var(--text-3)' }}>
                    {row.cost_basis ? `$${Number(row.cost_basis).toFixed(2)}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 12 && (
            <div style={{ padding: '10px 14px', color: 'var(--text-2)', fontFamily: SANS, fontSize: 13 }}>
              {rows.length - 12} more rows will be imported.
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: 18, color: 'var(--text-2)', fontFamily: SANS, fontSize: 14 }}>
          Add a CSV or paste holdings to preview them here.
        </div>
      )}

      {rejected.length > 0 && (
        <div style={{
          padding: '10px 14px',
          borderTop: '1px solid var(--border)',
          color: 'var(--amber)',
          fontFamily: SANS,
          fontSize: 13,
        }}>
          Skipped {rejected.length} row{rejected.length !== 1 ? 's' : ''} without a ticker and share count.
        </div>
      )}
    </div>
  )
}

/* ── Score sub-bar ──────────────────────────────────────────────── */
function ScoreBar({ label, value, detail }) {
  const color = value >= 80 ? '#22c55e' : value >= 60 ? '#f59e0b' : '#ef4444'
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
        <span style={{
          fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--text-3)', fontFamily: MONO,
        }}>{label}</span>
        <span style={{ fontSize: '14px', fontWeight: 700, color, fontFamily: MONO }}>{value}</span>
      </div>
      <div style={{ height: 2, background: 'var(--border-2)', marginBottom: 5 }}>
        <div style={{ height: '100%', width: `${value}%`, background: color }} />
      </div>
      <div style={{ fontSize: '9px', color: 'var(--text-3)', fontFamily: MONO }}>{detail}</div>
    </div>
  )
}

/* ── Portfolio Health Score card ────────────────────────────────── */
function HealthScoreCard({ health }) {
  if (!health) return null
  const { score, components, details, flags } = health
  const scoreColor = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444'
  const label = score >= 80 ? 'STRONG' : score >= 60 ? 'MODERATE' : 'NEEDS ATTENTION'

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '200px 1fr',
      borderBottom: '1px solid var(--border-2)',
    }}>
      {/* Score number */}
      <div style={{
        padding: '32px 24px',
        borderRight: '1px solid var(--border-2)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)',
      }}>
        <div style={{
          fontSize: '9px', fontWeight: 800, letterSpacing: '0.22em',
          textTransform: 'uppercase', color: 'var(--text-3)', fontFamily: MONO,
          marginBottom: 14,
        }}>Health Score</div>
        <div style={{
          fontSize: '72px', fontWeight: 700, fontFamily: MONO,
          color: scoreColor, lineHeight: 1,
        }}>{score}</div>
        <div style={{
          fontSize: '9px', fontWeight: 800, letterSpacing: '0.2em',
          textTransform: 'uppercase', color: scoreColor, fontFamily: MONO,
          marginTop: 10,
        }}>{label}</div>
      </div>

      {/* Component bars */}
      <div style={{ padding: '24px 32px', background: 'var(--surface)' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: '20px 48px',
          marginBottom: flags.length ? 20 : 0,
        }}>
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
          <div style={{
            padding: '12px 14px',
            background: 'var(--surface-3)',
            border: '1px solid var(--border-2)',
          }}>
            <div style={{
              fontSize: '9px', fontWeight: 700, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'var(--text-3)', fontFamily: MONO,
              marginBottom: 8,
            }}>Flagged</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {flags.map((f, i) => (
                <div key={i} style={{
                  fontSize: '10px', color: 'var(--text-2)', fontFamily: MONO,
                  lineHeight: 1.6, paddingLeft: 10,
                  borderLeft: '2px solid var(--amber)',
                }}>{f}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Risk Radar helpers ─────────────────────────────────────────── */
const STATUS_COLOR = { ok: '#22c55e', warning: '#f59e0b', alert: '#ef4444', unknown: '#4a4a4a' }

function RadarPanel({ title, status = 'ok', children }) {
  return (
    <div style={{
      padding: '20px',
      borderRight: '1px solid var(--border)',
      borderBottom: '1px solid var(--border)',
      minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{
          fontSize: '9px', fontWeight: 700, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--text-3)', fontFamily: MONO,
        }}>{title}</span>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[status] ?? STATUS_COLOR.unknown, flexShrink: 0 }} />
      </div>
      {children}
    </div>
  )
}

function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div style={{ height: 2, background: 'var(--border-2)', marginTop: 3, marginBottom: 3 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color }} />
    </div>
  )
}

function TiltRow({ label, value }) {
  if (value == null) return null
  const pos = value >= 0
  const color = pos ? '#22c55e' : '#ef4444'
  const barPct = Math.min(Math.abs(value) / 2.0, 1.0) * 100
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
        <span style={{ fontSize: '9px', color: 'var(--text-2)', fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
        <span style={{ fontSize: '11px', fontWeight: 700, color, fontFamily: MONO }}>
          {pos ? '+' : ''}{value.toFixed(2)}
        </span>
      </div>
      <div style={{ height: 2, background: 'var(--border-2)' }}>
        <div style={{ height: '100%', width: `${barPct}%`, background: color }} />
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
    <div style={{ borderBottom: '1px solid var(--border-2)' }}>

      {/* Section label */}
      <div style={{
        padding: '10px 20px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg)',
        fontSize: '9px', fontWeight: 800, letterSpacing: '0.22em',
        textTransform: 'uppercase', color: 'var(--text-3)', fontFamily: MONO,
      }}>
        Risk Radar
      </div>

      {/* 2 × 2 panel grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'var(--surface)' }}>

        {/* ── Panel 1: Sector Exposure ────────────────────────────── */}
        <RadarPanel
          title="Sector Exposure"
          status={sector_exposure.find(s => s.status === 'alert') ? 'alert'
                : sector_exposure.find(s => s.status === 'warning') ? 'warning' : 'ok'}
        >
          {sector_exposure.length === 0
            ? <span style={{ fontSize: '10px', color: 'var(--text-3)', fontFamily: MONO }}>No sector data</span>
            : sector_exposure.map(s => (
              <div key={s.sector} style={{ marginBottom: 9 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: '9px', color: 'var(--text-2)', fontFamily: MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
                    {s.sector}
                  </span>
                  <span style={{
                    fontSize: '10px', fontWeight: 700, fontFamily: MONO,
                    color: STATUS_COLOR[s.status],
                  }}>
                    {s.weight}%
                  </span>
                </div>
                <MiniBar value={s.weight} max={maxSectorW} color={STATUS_COLOR[s.status]} />
              </div>
            ))
          }
        </RadarPanel>

        {/* ── Panel 2: Correlation Risk ───────────────────────────── */}
        <RadarPanel title="Correlation Risk" status={correlation.level ?? 'unknown'}>
          {correlation.avg == null ? (
            <span style={{ fontSize: '10px', color: 'var(--text-3)', fontFamily: MONO }}>
              Requires ≥2 S&P 500 tickers
            </span>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: '28px', fontWeight: 700, fontFamily: MONO, color: STATUS_COLOR[correlation.level] }}>
                    {correlation.avg.toFixed(2)}
                  </span>
                  <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: STATUS_COLOR[correlation.level], fontFamily: MONO }}>
                    {corrLevelLabel[correlation.level]}
                  </span>
                </div>
                <div style={{ fontSize: '9px', color: 'var(--text-3)', fontFamily: MONO }}>
                  avg intra-portfolio correlation · {correlation.n_priced} priced tickers
                </div>
              </div>

              {correlation.high_pairs?.length > 0 && (
                <>
                  <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', fontFamily: MONO, marginBottom: 8 }}>
                    Highest Pairs
                  </div>
                  {correlation.high_pairs.map((p, i) => {
                    const c = p.corr >= 0.7 ? '#ef4444' : p.corr >= 0.5 ? '#f59e0b' : 'var(--text-2)'
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: '10px', fontFamily: MONO, color: 'var(--text-2)', fontWeight: 700 }}>
                          {p.a} · {p.b}
                        </span>
                        <span style={{ fontSize: '10px', fontFamily: MONO, fontWeight: 700, color: c }}>
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

        {/* ── Panel 3: Factor Tilt ────────────────────────────────── */}
        <RadarPanel title="Factor Tilt" status="ok">
          {!factor_tilt.has_data ? (
            <span style={{ fontSize: '10px', color: 'var(--text-3)', fontFamily: MONO }}>
              No universe overlap — factor data unavailable
            </span>
          ) : (
            <>
              <TiltRow label="Momentum 6M"  value={factor_tilt.tilts?.momentum_6m}  />
              <TiltRow label="Momentum 12M" value={factor_tilt.tilts?.momentum_12m} />
              <TiltRow label="Quality"      value={factor_tilt.tilts?.quality}      />
              <TiltRow label="Volatility"   value={factor_tilt.tilts?.volatility}   />
              <div style={{ marginTop: 8, fontSize: '9px', color: 'var(--text-3)', fontFamily: MONO }}>
                {factor_tilt.n_covered}/{factor_tilt.n_total} positions in universe
              </div>
            </>
          )}
        </RadarPanel>

        {/* ── Panel 4: Top-5 Concentration ───────────────────────── */}
        <RadarPanel title="Top-5 Positions" status="ok">
          {top5.length === 0
            ? <span style={{ fontSize: '10px', color: 'var(--text-3)', fontFamily: MONO }}>No data</span>
            : top5.map((p, i) => (
              <div key={p.ticker} style={{ marginBottom: 9 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, fontFamily: MONO, color: 'var(--white)' }}>
                    {i + 1}. {p.ticker}
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: 700, fontFamily: MONO, color: 'var(--text)' }}>
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
  const deltaColor = improved ? '#22c55e' : '#ef4444'
  const arrow      = improved ? '▲' : '▼'
  return (
    <div style={{
      padding: '20px 24px',
      borderRight: '1px solid var(--border)',
      flex: '1 1 0',
      minWidth: 0,
    }}>
      <div style={{
        fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--text-3)', fontFamily: MONO,
        marginBottom: 14,
      }}>{label}</div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: MONO, color: 'var(--white)', lineHeight: 1 }}>
            {current}
          </div>
          <div style={{ fontSize: '8px', color: 'var(--text-3)', fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 3 }}>
            Portfolio
          </div>
        </div>
        <div style={{ fontSize: '9px', color: 'var(--text-3)', fontFamily: MONO, marginBottom: 14 }}>vs.</div>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 600, fontFamily: MONO, color: 'var(--text-2)', lineHeight: 1 }}>
            {baseline}
          </div>
          <div style={{ fontSize: '8px', color: 'var(--text-3)', fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 3 }}>
            Baseline
          </div>
        </div>
      </div>

      <div style={{ fontSize: '10px', fontWeight: 700, color: deltaColor, fontFamily: MONO }}>
        {arrow} {delta_label}
      </div>
    </div>
  )
}

/* ── Insight row ────────────────────────────────────────────────── */
function InsightRow({ type, text }) {
  const isDefense = type === 'defense'
  const color     = isDefense ? '#22c55e' : '#f59e0b'
  return (
    <div style={{
      display: 'flex', gap: 12, alignItems: 'flex-start',
      padding: '11px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        width: 4, height: 4, borderRadius: '50%',
        background: color, flexShrink: 0, marginTop: 5,
      }} />
      <span style={{
        fontSize: '11px', color: isDefense ? 'var(--text)' : 'var(--text-2)',
        fontFamily: MONO, lineHeight: 1.7,
      }}>{text}</span>
    </div>
  )
}

/* ── Defensive Intelligence card ────────────────────────────────── */
function DefensiveIntelligence({ defense }) {
  if (!defense || !defense.metrics?.length) return null
  const { metrics, insights = [], has_vol_data } = defense

  return (
    <div style={{ borderBottom: '1px solid var(--border-2)' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 20px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg)',
      }}>
        <div style={{
          fontSize: '9px', fontWeight: 800, letterSpacing: '0.22em',
          textTransform: 'uppercase', color: 'var(--text-3)', fontFamily: MONO,
        }}>Defensive Intelligence</div>
        <div style={{ fontSize: '9px', color: 'var(--text-3)', fontFamily: MONO }}>
          vs. equal-weight baseline
          {!has_vol_data && ' · structural metrics only (≥2 S&P 500 tickers needed for vol)'}
        </div>
      </div>

      {/* Metric tiles */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-2)', background: 'var(--surface)' }}>
        {metrics.map((m, i) => <MetricTile key={i} {...m} />)}
      </div>

      {/* Insight feed */}
      {insights.length > 0 && (
        <div style={{ padding: '0 20px 4px', background: 'var(--surface)' }}>
          {insights.map((ins, i) => <InsightRow key={i} {...ins} />)}
        </div>
      )}
    </div>
  )
}

/* ── Stat chip for result header ────────────────────────────────── */
function Stat({ label, value, green }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: '9px', color: 'var(--text-3)', fontFamily: MONO, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: '16px', fontFamily: MONO, fontWeight: 700, color: green ? '#22c55e' : 'var(--white)', marginTop: 2 }}>
        {value}
      </div>
    </div>
  )
}

/* ── Results view ───────────────────────────────────────────────── */
function ResultView({ result, onBack }) {
  const { positions = [], total_value, health, risk_radar, defense } = result

  return (
    <div style={{ background: 'var(--surface)', minHeight: '100%' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        padding: '14px 20px',
        borderBottom: '1px solid var(--border-2)',
        background: 'var(--bg)',
      }}>
        <TBtn onClick={onBack}>← Edit Positions</TBtn>
        <div style={{ flex: 1 }} />
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
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
              const pnlColor = hasPnl ? (p.pnl_pct >= 0 ? '#22c55e' : '#ef4444') : 'var(--text-3)'
              return (
                <tr key={p.ticker + i} style={{
                  borderBottom: '1px solid var(--border)',
                  background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)',
                }}>
                  <td style={{ textAlign: 'center', padding: '10px 12px', fontSize: '10px', color: 'var(--text-3)', fontFamily: MONO }}>{i + 1}</td>

                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ fontFamily: MONO, fontSize: '12px', fontWeight: 700, color: 'var(--white)' }}>{p.ticker}</span>
                  </td>

                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ fontFamily: MONO, fontSize: '10px', color: 'var(--text-2)' }}>{p.sector || '—'}</span>
                  </td>

                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: MONO, fontSize: '11px', color: 'var(--text)' }}>
                    {p.shares?.toLocaleString()}
                  </td>

                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: MONO, fontSize: '11px', color: 'var(--text)' }}>
                    {p.price != null ? `$${p.price.toFixed(2)}` : '—'}
                  </td>

                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: MONO, fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>
                    {p.mkt_value != null
                      ? `$${p.mkt_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '—'}
                  </td>

                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                      <div style={{
                        height: 3,
                        width: `${Math.min(Math.round((p.weight || 0) * 200), 60)}px`,
                        background: 'var(--border-3)',
                      }} />
                      <span style={{ fontFamily: MONO, fontSize: '11px', fontWeight: 700, color: 'var(--text)', minWidth: 40, textAlign: 'right' }}>
                        {p.weight != null ? `${(p.weight * 100).toFixed(1)}%` : '—'}
                      </span>
                    </div>
                  </td>

                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: MONO, fontSize: '11px', fontWeight: 700, color: pnlColor }}>
                    {hasPnl ? `${p.pnl_pct >= 0 ? '+' : ''}${p.pnl_pct.toFixed(2)}%` : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      <div style={{
        padding: '12px 20px',
        borderTop: '1px solid var(--border)',
        fontSize: '10px', color: 'var(--text-3)', fontFamily: MONO, lineHeight: 1.8,
      }}>
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
    <div style={{ borderBottom: '1px solid var(--border-2)' }}>

      {/* Header */}
      <div style={{
        padding: '10px 20px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{
          fontSize: '9px', fontWeight: 800, letterSpacing: '0.22em',
          textTransform: 'uppercase', color: 'var(--text-3)', fontFamily: MONO,
        }}>AI Portfolio Analyst</div>
        <div style={{ fontSize: '9px', color: 'var(--text-3)', fontFamily: MONO }}>
          groq llama-3 · context-aware · portfolio-specific
        </div>
      </div>

      <div style={{ padding: '20px', background: 'var(--surface)' }}>

        {/* Chips — always visible */}
        <div style={{ marginBottom: messages.length ? 16 : 20 }}>
          {messages.length === 0 && (
            <div style={{
              fontSize: '9px', color: 'var(--text-3)', fontFamily: MONO,
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10,
            }}>
              Suggested questions
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {ANALYST_CHIPS.map(chip => (
              <button
                key={chip}
                onClick={() => send(chip)}
                disabled={loading}
                style={{
                  background: 'var(--surface-3)',
                  border: '1px solid var(--border-2)',
                  color: loading ? 'var(--text-3)' : 'var(--text-2)',
                  padding: '5px 12px',
                  fontSize: '10px',
                  fontFamily: MONO,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                }}
              >{chip}</button>
            ))}
          </div>
        </div>

        {/* Conversation */}
        {messages.length > 0 && (
          <div style={{
            maxHeight: 420,
            overflowY: 'auto',
            marginBottom: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            {messages.map((m, i) => {
              const isUser = m.role === 'user'
              return (
                <div key={i} style={{
                  padding: '10px 14px',
                  background: isUser ? 'var(--surface-3)' : 'var(--bg)',
                  borderLeft: `2px solid ${isUser ? 'var(--border-3)' : '#22c55e'}`,
                }}>
                  <div style={{
                    fontSize: '8px', fontWeight: 800, letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: isUser ? 'var(--text-3)' : '#22c55e',
                    fontFamily: MONO, marginBottom: 6,
                  }}>
                    {isUser ? 'You' : 'Analyst'}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: isUser ? 'var(--text-2)' : 'var(--text)',
                    fontFamily: MONO, lineHeight: 1.75,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {m.content}
                  </div>
                </div>
              )
            })}

            {loading && (
              <div style={{
                padding: '10px 14px',
                background: 'var(--bg)',
                borderLeft: '2px solid #22c55e',
              }}>
                <div style={{
                  fontSize: '8px', fontWeight: 800, letterSpacing: '0.2em',
                  textTransform: 'uppercase', color: '#22c55e', fontFamily: MONO, marginBottom: 6,
                }}>Analyst</div>
                <div style={{
                  fontSize: '11px', color: 'var(--text-3)', fontFamily: MONO,
                  animation: 'pulse 1.5s ease infinite',
                }}>Analyzing portfolio...</div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            padding: '9px 12px', marginBottom: 12,
            background: '#1a0a0a', border: '1px solid #3a1010',
            color: '#ef4444', fontSize: '10px', fontFamily: MONO, lineHeight: 1.6,
          }}>{error}</div>
        )}

        {/* Input row */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Ask anything about your portfolio..."
            disabled={loading}
            style={{
              flex: 1,
              background: 'var(--bg)',
              border: '1px solid var(--border-2)',
              color: 'var(--text)',
              fontFamily: MONO,
              fontSize: '11px',
              padding: '8px 12px',
              outline: 'none',
            }}
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            style={{
              background: (loading || !input.trim()) ? 'var(--surface-3)' : 'var(--white)',
              border: 'none',
              color: (loading || !input.trim()) ? 'var(--text-3)' : 'var(--bg)',
              padding: '8px 20px',
              fontSize: '9px', fontFamily: MONO, fontWeight: 800,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              cursor: (loading || !input.trim()) ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
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
  const [rows, setRows]         = useState(() => [newRow(), newRow(), newRow(), newRow(), newRow()])
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [pasteText, setPasteText] = useState('')
  const [importText, setImportText] = useState('')
  const [importName, setImportName] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const fileRef = useRef(null)

  const parsedImport = parsePortfolioImport(importText || pasteText)

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
    if (!parsedImport.rows.length) return
    setRows(parsedImport.rows)
    analyze(parsedImport.rows)
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
    <div style={{ background: 'var(--surface)', minHeight: '100%' }}>

      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        padding: '14px 20px',
        borderBottom: '1px solid var(--border-2)',
        background: 'var(--bg)',
      }}>
        <div style={{
          fontSize: '20px', fontWeight: 800, color: 'var(--text-strong)', fontFamily: SANS,
        }}>
          Import portfolio
        </div>

        <div style={{
          marginLeft: 8,
          fontSize: '14px', color: 'var(--text-2)', fontFamily: SANS,
        }}>
          {rows.filter(r => r.ticker.trim()).length > 0
            ? `${rows.filter(r => r.ticker.trim() && r.shares).length} position${rows.filter(r => r.ticker.trim() && r.shares).length !== 1 ? 's' : ''} ready`
            : 'Upload, paste, or enter holdings'}
        </div>

        <div style={{ flex: 1 }} />

        <TBtn onClick={analyze} disabled={loading} primary>
          {loading ? 'Analyzing...' : 'Analyze manual rows'}
        </TBtn>
      </div>

      {/* ── Import panel ─────────────────────────────────────────── */}
      <div style={{
        padding: 20,
        display: 'grid',
        gridTemplateColumns: 'minmax(280px, 0.9fr) minmax(320px, 1.1fr)',
        gap: 16,
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg)',
      }}>
        <div style={{ display: 'grid', gap: 16 }}>
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
              style={{
                minHeight: 128,
                border: `1px dashed ${dragActive ? 'var(--teal)' : 'var(--border-3)'}`,
                borderRadius: 12,
                background: dragActive ? 'var(--surface-3)' : 'var(--surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: 18,
                cursor: 'pointer',
                color: 'var(--text-2)',
                fontFamily: SANS,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {importName || 'Choose a CSV or drag it here'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: 8, fontFamily: SANS, lineHeight: 1.4 }}>
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
              style={{
                width: '100%',
                minHeight: 126,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                color: 'var(--text)',
                fontFamily: MONO,
                fontSize: 13,
                padding: 12,
                resize: 'vertical',
                boxSizing: 'border-box',
                outline: 'none',
                lineHeight: 1.7,
              }}
            />
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: 8, fontFamily: SANS, lineHeight: 1.4 }}>
              Supports comma, tab, or space-delimited text. Formats must follow: <code>ticker, shares, [cost_basis]</code>.
            </div>
          </ImportCard>
        </div>

        <ImportPreview
          rows={parsedImport.rows}
          rejected={parsedImport.rejected}
          onImport={importPortfolio}
          loading={loading}
        />
      </div>

      {/* ── Error banner ────────────────────────────────────────── */}
      {error && (
        <div style={{
          padding: '10px 20px',
          background: '#1a0a0a',
          borderBottom: '1px solid #3a1010',
          color: '#ef4444',
          fontSize: '11px',
          fontFamily: MONO,
        }}>
          {error}
        </div>
      )}

      {/* ── Editable grid ───────────────────────────────────────── */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...TH_STYLE, textAlign: 'center', width: 44 }}>#</th>
              <th style={{ ...TH_STYLE, width: 120 }}>TICKER</th>
              <th style={{ ...TH_STYLE, textAlign: 'right', width: 140 }}>SHARES</th>
              <th style={{ ...TH_STYLE, textAlign: 'right', width: 160 }}>AVG COST <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></th>
              <th style={{ ...TH_STYLE, width: 44 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.id} style={{
                borderBottom: '1px solid var(--border)',
                background: idx % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)',
              }}>
                <td style={{
                  textAlign: 'center', padding: '4px 8px',
                  fontSize: '10px', color: 'var(--text-3)', fontFamily: MONO,
                  width: 44,
                }}>
                  {idx + 1}
                </td>

                <td style={{ padding: '4px 8px', width: 120 }}>
                  <EditCell
                    value={row.ticker}
                    onChange={v => update(row.id, 'ticker', v)}
                    placeholder="AAPL"
                    bold
                  />
                </td>

                <td style={{ padding: '4px 8px', width: 140 }}>
                  <EditCell
                    type="number"
                    value={row.shares}
                    onChange={v => update(row.id, 'shares', v)}
                    placeholder="0"
                    align="right"
                  />
                </td>

                <td style={{ padding: '4px 8px', width: 160 }}>
                  <EditCell
                    type="number"
                    value={row.cost_basis}
                    onChange={v => update(row.id, 'cost_basis', v)}
                    placeholder="—"
                    align="right"
                  />
                </td>

                <td style={{ padding: '4px 8px', textAlign: 'center', width: 44 }}>
                  <button
                    onClick={() => removeRow(row.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-3)',
                      cursor: 'pointer',
                      fontSize: '16px',
                      lineHeight: 1,
                      padding: '2px 6px',
                      fontFamily: MONO,
                    }}
                  >×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Add row ─────────────────────────────────────────────── */}
      <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)' }}>
        <button
          onClick={addRow}
          style={{
            background: 'transparent',
            border: '1px dashed var(--border-3)',
            color: 'var(--text-3)',
            padding: '7px 20px',
            fontSize: '9px',
            fontFamily: MONO,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          + Add Row
        </button>
      </div>

      {/* ── Help text ───────────────────────────────────────────── */}
      <div style={{
        padding: '14px 20px',
        borderTop: '1px solid var(--border)',
        fontSize: '10px', color: 'var(--text-3)', fontFamily: MONO, lineHeight: 2,
      }}>
        Prices are fetched from last market close. &nbsp;·&nbsp; Avg cost is optional — required to compute P&amp;L.
        &nbsp;·&nbsp; Tickers outside the S&amp;P 500 universe resolve via yfinance.
      </div>
    </div>
  )
}
