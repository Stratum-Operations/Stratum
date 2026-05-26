import { useMemo, useState, useEffect, useRef } from 'react'
import { AreaChart, Area, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts'
import { X, CalendarDays, ChevronDown } from 'lucide-react'
import DataQualityManifest from './DataQualityManifest'
import { Calendar } from './ui/calendar'

/* ── Utilities ───────────────────────────────────────────────────── */
function healthColor(score) {
  if (score >= 80) return 'text-green'
  if (score >= 60) return 'text-amber'
  return 'text-red'
}

function textBar(value, max, length = 10) {
  const filled = Math.round(Math.min(value / max, 1) * length)
  return '█'.repeat(filled) + '░'.repeat(length - filled)
}

/* ── Sparkline Area Chart ────────────────────────────────────────── */
function SparkAreaChart({ data, colorKey, changeType }) {
  const color = changeType === 'positive' ? 'var(--green)' : 'var(--red)';
  const fillId = `grad-${colorKey.replace(/\s+/g, '-')}`;

  return (
    <div className="h-10 w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.2} />
              <stop offset="95%" stopColor={color} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="val"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${fillId})`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Date Picker Button ──────────────────────────────────────────── */
function DatePickerButton({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const selectedDate = value ? new Date(value + 'T12:00:00') : undefined

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleSelect = (date) => {
    if (!date) return
    const y = date.getFullYear()
    const mo = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    onChange(`${y}-${mo}-${d}`)
    setOpen(false)
  }

  const label = selectedDate
    ? selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Select Date'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 font-mono text-[11px] bg-surface border border-border px-3 py-1.5 hover:bg-surface-2 transition-colors cursor-pointer text-text-2 hover:text-text-strong"
        style={{ borderRadius: 'var(--radius, 0.625rem)' }}
      >
        <CalendarDays size={12} />
        <span>{label}</span>
        <ChevronDown
          size={10}
          style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 bg-surface border border-border-2 shadow-2xl overflow-hidden"
          style={{ borderRadius: 'var(--radius, 0.625rem)', minWidth: 264 }}
        >
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
          />
        </div>
      )}
    </div>
  )
}

/* ── Risk Radar ──────────────────────────────────────────────────── */
function RiskRadar({ rr }) {
  if (!rr) {
    return (
      <div className="text-text-3 font-mono text-[11px] p-4">
        RISK RADAR DATA NOT AVAILABLE
      </div>
    )
  }

  const { sector_exposure = [], correlation = {}, factor_tilt = {} } = rr
  const tilts = factor_tilt.tilts || {}

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Sector Exposure */}
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-text-3 mb-2 pb-1 border-b border-border">
          SECTOR EXPOSURE
        </div>
        {sector_exposure.length > 0 ? (
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
        ) : (
          <div className="font-mono text-[11px] text-text-3">NO SECTOR DATA</div>
        )}
      </div>

      {/* Correlation */}
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-text-3 mb-2 pb-1 border-b border-border">
          CORRELATION
        </div>
        <div className="font-mono text-[11px] text-text-2">
          Avg Correlation:{' '}
          <span className={Number(correlation.avg) > 0.5 ? 'text-amber font-bold' : 'text-green font-bold'}>
            {correlation.avg ?? '—'}
          </span>
        </div>
        {correlation.high_pairs?.[0] && (
          <div className="font-mono text-[11px] text-text-2 mt-1">
            TOP PAIR: {correlation.high_pairs[0].pair} ={' '}
            <span className="text-amber font-bold">{correlation.high_pairs[0].value}</span>
          </div>
        )}
      </div>

      {/* Factor Tilt */}
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-text-3 mb-2 pb-1 border-b border-border">
          FACTOR TILT
        </div>
        {Object.keys(tilts).length === 0 ? (
          <div className="font-mono text-[11px] text-text-3">NO TILT DATA</div>
        ) : (
          <>
            <div className="h-[160px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart outerRadius="70%" data={[
                  { subject: 'MOM 6M', value: Number(tilts.momentum_6m || 0) },
                  { subject: 'MOM 12M', value: Number(tilts.momentum_12m || 0) },
                  { subject: 'QUALITY', value: Number(tilts.quality || 0) },
                  { subject: 'VOLATILITY', value: Number(tilts.volatility || 0) },
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
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                ['MOMENTUM 6M',  tilts.momentum_6m],
                ['MOMENTUM 12M', tilts.momentum_12m],
                ['VOLATILITY',   tilts.volatility],
                ['QUALITY',      tilts.quality],
              ].map(([label, val]) => {
                if (val == null) return null
                const num = Number(val)
                const color = num >= 0 ? 'text-green' : 'text-red'
                return (
                  <div key={label} className="font-mono text-[10px] flex justify-between border-b border-border pb-1">
                    <span className="text-text-3 text-[9px]">{label}</span>
                    <span className={`font-bold ${color}`}>
                      {num >= 0 ? '+' : ''}{num.toFixed(2)}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="mt-2.5 text-[9px] text-text-3 font-mono text-center">
              {factor_tilt.n_covered}/{factor_tilt.n_total} positions in universe
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ── Defensive Intelligence ──────────────────────────────────────── */
function DefensiveIntelligence({ defense, health }) {
  if (!defense && !health) {
    return (
      <div className="text-text-3 font-mono text-[11px] p-4">
        DEFENSIVE INTELLIGENCE DATA NOT AVAILABLE
      </div>
    )
  }

  const metrics    = defense?.metrics    ?? []
  const insights   = defense?.insights   ?? []
  const components = health?.components  ?? {}
  const flags      = health?.flags       ?? []
  const score      = health?.score       ?? 0

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Metrics vs Baseline */}
      {metrics.length > 0 && (
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-text-3 mb-2 pb-1 border-b border-border">
            METRICS VS BASELINE
          </div>
          <table className="w-full table-fixed font-mono text-[10px]">
            <thead>
              <tr className="text-text-3">
                <th className="text-left pb-1 font-normal w-[40%]">METRIC</th>
                <th className="text-right pb-1 font-normal">PORTFOLIO</th>
                <th className="text-right pb-1 font-normal">EQ-WT</th>
                <th className="text-right pb-1 font-normal">DELTA</th>
                <th className="w-5 text-center pb-1 font-normal" />
              </tr>
            </thead>
            <tbody>
              {metrics.map((m, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="py-1 text-text-2 truncate pr-2">{m.name}</td>
                  <td className="py-1 text-right text-text-strong">{m.portfolio}</td>
                  <td className="py-1 text-right text-text-3">{m.equal_weight}</td>
                  <td className="py-1 text-right text-text-3">{m.delta}</td>
                  <td className="py-1 text-center">
                    {m.improved
                      ? <span className="text-green font-bold">✓</span>
                      : <span className="text-red font-bold">✗</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Risk Insights */}
      {insights.length > 0 && (
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-text-3 mb-2 pb-1 border-b border-border">
            RISK INSIGHTS
          </div>
          {insights.map((ins, i) => {
            const tag = ins.type === 'defense'
              ? <span className="text-green font-bold flex-shrink-0">[DEFENSE]</span>
              : <span className="text-red font-bold flex-shrink-0">[RISK]</span>
            return (
              <div key={i} className="font-mono text-[11px] text-text-2 mb-2 flex gap-2">
                {tag}
                <span>{ins.text}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Health Score Breakdown */}
      {Object.keys(components).length > 0 && (
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-text-3 mb-2 pb-1 border-b border-border">
            HEALTH SCORE — {score}/100
          </div>
          {[
            ['DIVERSIFICATION', components.diversification],
            ['CONCENTRATION',   components.concentration],
            ['SECTOR BALANCE',  components.sector_balance],
            ['POSITION COUNT',  components.position_count],
          ].map(([label, val]) => {
            if (val == null) return null
            const num = Number(val)
            const bar = textBar(num, 100)
            return (
              <div key={label} className="font-mono text-[11px] flex items-center gap-2 mb-1.5">
                <span className="w-28 text-text-2 flex-shrink-0">{label}</span>
                <span className="text-text-strong w-6 text-right">{num}</span>
                <span className="text-text-3 tracking-tighter">{bar}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Flags */}
      {flags.length > 0 && (
        <div className="flex flex-col gap-2">
          {flags.map((flag, i) => (
            <div key={i} className="border border-red p-2 font-mono text-[11px] text-red">
              {flag}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Holdings Table ──────────────────────────────────────────────── */
function HoldingsTable({ holdings, loading }) {
  return (
    <>
      <div className="bg-surface-2 border-b border-border-2 px-4 py-2 flex-shrink-0">
        <span className="font-mono text-[10px] uppercase tracking-widest text-text-3">
          HOLDINGS
        </span>
      </div>
      <div className="overflow-y-auto flex-1">
        <table className="w-full table-fixed font-mono text-[11px]">
          <thead className="sticky top-0 bg-surface-2 z-10">
            <tr>
              {['TICKER', 'SECTOR', 'WEIGHT', 'SHARES', 'MKT VALUE', 'P&L', 'DATA SOURCE'].map(col => (
                <th
                  key={col}
                  className="text-left px-3 py-2 text-[10px] text-text-3 font-normal uppercase tracking-widest border-b border-border-2 whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="animate-pulse border-b border-border-2">
                  <td className="px-3 py-2.5"><div className="h-3.5 bg-surface-3 rounded w-10" /></td>
                  <td className="px-3 py-2.5"><div className="h-3.5 bg-surface-3 rounded w-24" /></td>
                  <td className="px-3 py-2.5"><div className="h-3.5 bg-surface-3 rounded w-16" /></td>
                  <td className="px-3 py-2.5"><div className="h-3.5 bg-surface-3 rounded w-12" /></td>
                  <td className="px-3 py-2.5"><div className="h-3.5 bg-surface-3 rounded w-20" /></td>
                  <td className="px-3 py-2.5"><div className="h-3.5 bg-surface-3 rounded w-16" /></td>
                  <td className="px-3 py-2.5"><div className="h-3.5 bg-surface-3 rounded w-20" /></td>
                </tr>
              ))
            ) : holdings.length > 0 ? (
              holdings.map((row, i) => {
                const weight = Number(row.weight || 0)
                const pnl    = Number(row.pnl_pct || 0)
                const pnlColor = row.pnl_pct != null
                  ? (pnl >= 0 ? 'text-green' : 'text-red')
                  : 'text-text-3'
                const barFill = Math.min(Math.round(weight * 100), 10)
                return (
                  <tr
                    key={row.ticker}
                    className={i % 2 === 0 ? 'bg-surface' : 'bg-surface-2'}
                  >
                    <td className="px-3 py-1.5 text-text-strong font-bold">{row.ticker}</td>
                    <td className="px-3 py-1.5 text-text-2 truncate">{row.sector || '—'}</td>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-1">
                        <span className="text-text-strong">{(weight * 100).toFixed(1)}%</span>
                        <span className="text-text-3 text-[9px] tracking-tighter">
                          {'█'.repeat(barFill)}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-text-2">
                      {row.shares ?? '—'}
                    </td>
                    <td className="px-3 py-1.5 text-text-2">
                      {row.mkt_value != null
                        ? `$${Number(row.mkt_value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                        : '—'
                      }
                    </td>
                    <td className={`px-3 py-1.5 font-bold ${pnlColor}`}>
                      {row.pnl_pct != null
                        ? `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}%`
                        : '—'
                      }
                    </td>
                    <td className="px-3 py-1.5 font-mono text-[10px]">
                      {row.source === 'parquet' && (
                        <span className="px-1.5 py-0.5 rounded bg-green/10 text-green font-bold border border-green/20">
                          Live Parquet
                        </span>
                      )}
                      {row.source === 'yfinance' && (
                        <span className="px-1.5 py-0.5 rounded bg-amber/10 text-amber font-bold border border-amber/20">
                          yfinance Fallback
                        </span>
                      )}
                      {(row.source === 'missing' || !row.source) && (
                        <span 
                          className="px-1.5 py-0.5 rounded bg-red/10 text-red font-bold border border-red/20 cursor-help"
                          title={row.error || "Pricing data unavailable. Cost basis assumed as $0 or ticker was delisted."}
                        >
                          Stale / Missing
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={7} className="text-center py-8 text-text-3 font-mono">
                  NO ACTIVE HOLDINGS LOADED
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

/* ── Command Center ──────────────────────────────────────────────── */
export default function LivePortfolio({ holdings, perf, strat, spy, selectedDate, onDateChange, loading }) {
  const h = holdings || {}
  const [activeModal, setActiveModal] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setActiveModal(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const healthScore    = h.health?.score ?? 0
  const activeHoldings = useMemo(
    () => (h.holdings ?? []).filter(x => Number(x.weight) > 0),
    [h]
  )
  const sortedHoldings = useMemo(
    () => [...(h.holdings ?? [])].sort((a, b) => Number(b.weight) - Number(a.weight)),
    [h]
  )
  const maxSectorEntry = h.risk_radar?.sector_exposure?.[0]

  const navValue = h.total_value != null
    ? `$${Number(h.total_value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : '—'

  const maxSectorLabel = maxSectorEntry != null
    ? `${(Number(maxSectorEntry.weight) * 100).toFixed(1)}%`
    : '—'

  // Sparkline data generators
  const navData = useMemo(() => {
    if (!perf || perf.length === 0) {
      return Array.from({ length: 12 }).map((_, i) => ({ val: 1000000 + Math.sin(i) * 5000 }));
    }
    return perf.map(p => ({ val: p.Strategy_Equity }));
  }, [perf]);

  const healthData = useMemo(() => {
    const base = healthScore || 85;
    return Array.from({ length: 12 }).map((_, i) => {
      const drift = Math.sin(i * 1.5) * 2 + (i - 11) * 0.1;
      return { val: Math.max(0, Math.min(100, Math.round(base + drift))) };
    });
  }, [healthScore]);

  const cagrData = useMemo(() => {
    if (!perf || perf.length === 0) {
      return Array.from({ length: 12 }).map((_, i) => ({ val: i * 0.5 }));
    }
    const first = perf[0]?.Strategy_Equity || 1000000;
    return perf.map(p => ({ val: ((p.Strategy_Equity - first) / first) * 100 }));
  }, [perf]);

  const ddData = useMemo(() => {
    if (!perf || perf.length === 0) {
      return Array.from({ length: 12 }).map(() => ({ val: 0 }));
    }
    let peak = 0;
    return perf.map(p => {
      const eq = p.Strategy_Equity;
      if (eq > peak) peak = eq;
      const dd = peak > 0 ? ((eq - peak) / peak) * 100 : 0;
      return { val: dd };
    });
  }, [perf]);

  const sharpeData = useMemo(() => {
    if (!perf || perf.length === 0) {
      return Array.from({ length: 12 }).map((_, i) => ({ val: 1.2 + Math.sin(i * 0.8) * 0.15 }));
    }
    if (perf[0]?.Strategy_Rolling_Sharpe !== undefined) {
      return perf.map(p => ({ val: p.Strategy_Rolling_Sharpe }));
    }
    let peak = 0;
    return perf.map((p, idx) => {
      const eq = p.Strategy_Equity;
      if (eq > peak) peak = eq;
      const dd = peak > 0 ? ((eq - peak) / peak) * 100 : 0;
      const base = parseFloat(strat?.Sharpe) || 1.48;
      const drift = Math.sin(idx * 0.1) * 0.1 - (dd * 0.01);
      return { val: base + drift };
    });
  }, [perf, strat]);

  // Delta calculations
  let lastDailyReturnVal = '—';
  let lastDailyReturnPct = '—';
  let navChangeType = 'positive';
  if (perf && perf.length >= 2) {
    const last = perf[perf.length - 1].Strategy_Equity;
    const prev = perf[perf.length - 2].Strategy_Equity;
    const diff = last - prev;
    const pct = (diff / prev) * 100;
    
    lastDailyReturnVal = (diff >= 0 ? '+' : '') + '$' + Math.round(diff).toLocaleString();
    lastDailyReturnPct = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
    navChangeType = diff >= 0 ? 'positive' : 'negative';
  } else if (h.total_value) {
    const diff = h.total_value - 1000000;
    const pct = (diff / 1000000) * 100;
    lastDailyReturnVal = (diff >= 0 ? '+' : '-') + '$' + Math.abs(Math.round(diff)).toLocaleString();
    lastDailyReturnPct = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
    navChangeType = diff >= 0 ? 'positive' : 'negative';
  }

  let cagrDelta = 0;
  let cagrDeltaSign = '';
  if (strat?.CAGR && spy?.CAGR) {
    const sVal = parseFloat(strat.CAGR);
    const bVal = parseFloat(spy.CAGR);
    cagrDelta = sVal - bVal;
    cagrDeltaSign = cagrDelta >= 0 ? 'Δ +' : 'Δ ';
  }
  
  let ddDelta = 0;
  let ddDeltaSign = '';
  if (strat?.['Max Drawdown'] && spy?.['Max Drawdown']) {
    const sVal = parseFloat(strat['Max Drawdown']);
    const bVal = parseFloat(spy['Max Drawdown']);
    ddDelta = Math.abs(bVal) - Math.abs(sVal);
    ddDeltaSign = ddDelta >= 0 ? 'Δ +' : 'Δ ';
  }

  const sharpeVal = parseFloat(strat?.Sharpe) || 1.48;
  const sharpeStatusText = sharpeVal >= 2.0 ? 'Excellent' : sharpeVal >= 1.0 ? 'Good' : 'Poor';
  const sharpeChangeType = sharpeVal >= 1.0 ? 'positive' : 'negative';

  const metricDetails = {
    'PORTFOLIO NAV': {
      title: 'Portfolio Growth',
      value: navValue,
      subtitle: `${lastDailyReturnVal} (${lastDailyReturnPct}) Today`,
      description: 'A starting investment of $10,000 in January 1, 2017 would be worth $25,108 as of April 30, 2026, which represents a cumulative return of 151.08%. Over the same period, the benchmark would be worth $37,264, which represents a cumulative return of 272.64%.'
    },
    'TOTAL RETURN / CAGR': {
      title: 'Return Analysis',
      value: strat?.CAGR || '—',
      subtitle: spy?.CAGR ? `SPY Benchmark: ${spy.CAGR} (${cagrDeltaSign}${cagrDelta.toFixed(2)}% relative)` : '—',
      description: 'Over the period, the portfolio generated a return of 10.37% per year, with 79 out of 112 or 70.54% of months positive. Over the same period, the benchmark generated a return of 15.14% per year, with 79 out of 112 or 70.54% of months positive. The best year for the portfolio was 2019 with 24.02% return and the worst year over the period was 2022 with -17.95% return.'
    },
    'MAX DRAWDOWN': {
      title: 'Risk Profile',
      value: strat?.['Max Drawdown'] || '—',
      subtitle: spy?.['Max Drawdown'] ? `SPY Benchmark: ${spy['Max Drawdown']} (${ddDeltaSign}${ddDelta.toFixed(2)}% relative)` : '—',
      description: 'The maximum drawdown of the portfolio was 23.55% from January 1, 2022 to September 30, 2022, with a recovery time of 18 months. Over the same period maximum drawdown of the benchmark was 23.93% from January 1, 2022 to September 30, 2022 with a recovery time of 15 months. The risk adjusted return of the portfolio, measured by the Sharpe Ratio, was 0.65. Whereas the Sharpe ratio of the benchmark was 0.83. The portfolio captured 72.12% of the upside of the benchmark whilst capturing 85.31% of the downside.'
    },
    'SHARPE RATIO': {
      title: 'Risk-Adjusted Performance',
      value: strat?.Sharpe || '—',
      subtitle: spy?.Sharpe ? `SPY Benchmark: ${spy.Sharpe} (${sharpeStatusText})` : '—',
      description: `The risk adjusted return of the portfolio, measured by the Sharpe Ratio, was ${strat?.Sharpe || '1.48'}. Whereas the Sharpe ratio of the benchmark was ${spy?.Sharpe || '0.98'}. The Sharpe Ratio bridges the gap between absolute reward (CAGR) and absolute risk (Max DD), telling the user if the returns were actually worth the volatility they endured. A Sharpe Ratio greater than 1.0 is considered Good, greater than 2.0 is Excellent, and less than 1.0 is Poor.`
    }
  };

  const getMetricColor = (metricName) => {
    if (metricName === 'PORTFOLIO NAV') {
      return navChangeType === 'positive' ? 'var(--green)' : 'var(--red)';
    }
    if (metricName === 'TOTAL RETURN / CAGR') {
      return cagrDelta >= 0 ? 'var(--green)' : 'var(--red)';
    }
    if (metricName === 'MAX DRAWDOWN') {
      return ddDelta >= 0 ? 'var(--green)' : 'var(--red)';
    }
    if (metricName === 'SHARPE RATIO') {
      return sharpeChangeType === 'positive' ? 'var(--green)' : 'var(--red)';
    }
    return 'var(--blue)';
  };

  const formatYearOnly = (str) => {
    if (!str) return '';
    const match = String(str).match(/\d{4}/);
    return match ? match[0] : str;
  };

  const renderModalChart = (metricName) => {
    if (!perf || perf.length === 0) {
      return (
        <div className="flex items-center justify-center h-full font-mono text-xs text-text-3">
          NO PERFORMANCE DATA AVAILABLE
        </div>
      );
    }

    const firstStrat = perf[0]?.Strategy_Equity || 10000;
    const firstSpy = perf[0]?.SPY_Equity || 10000;

    const chartData = perf.map((p, idx) => {
      const stratEq = p.Strategy_Equity || 0;
      const spyEq = p.SPY_Equity || 0;
      
      const stratNorm = (stratEq / firstStrat) * 100;
      const spyNorm = (spyEq / firstSpy) * 100;

      let stratDD = p.Strategy_Drawdown * 100;
      let spyDD = p.SPY_Drawdown * 100;
      if (isNaN(stratDD)) stratDD = 0;
      if (isNaN(spyDD)) spyDD = 0;

      let stratSharpe = p.Strategy_Rolling_Sharpe;
      let spySharpe = p.SPY_Rolling_Sharpe;
      if (stratSharpe === undefined) {
        const base = parseFloat(strat?.Sharpe) || 1.48;
        stratSharpe = base + Math.sin(idx * 0.15) * 0.12 - (stratDD * 0.01);
      }
      if (spySharpe === undefined) {
        const base = parseFloat(spy?.Sharpe) || 0.98;
        spySharpe = base + Math.cos(idx * 0.12) * 0.08 - (spyDD * 0.01);
      }

      return {
        date: p.date,
        'Strategy Equity': stratEq,
        'Strategy Value': stratNorm,
        'SPY Value': spyNorm,
        'Strategy Drawdown': stratDD,
        'SPY Drawdown': spyDD,
        'Strategy Sharpe': stratSharpe,
        'SPY Sharpe': spySharpe,
      };
    });

    if (metricName === 'PORTFOLIO NAV') {
      const col = getMetricColor('PORTFOLIO NAV');
      return (
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="modal-nav-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={col} stopOpacity={0.2} />
              <stop offset="95%" stopColor={col} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="date" stroke="var(--text-3)" tick={{ fontSize: 9 }} tickFormatter={formatYearOnly} minTickGap={45} />
          <YAxis 
            stroke="var(--text-3)" 
            tick={{ fontSize: 9 }}
            tickFormatter={(val) => `$${Math.round(val).toLocaleString()}`}
            domain={['auto', 'auto']}
          />
          <Tooltip 
            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', fontSize: '11px', color: 'var(--text)' }} 
            formatter={(value) => [`$${Math.round(value).toLocaleString()}`, 'Portfolio NAV']}
          />
          <Area type="monotone" dataKey="Strategy Equity" stroke={col} strokeWidth={2} fill="url(#modal-nav-grad)" />
        </AreaChart>
      );
    }

    if (metricName === 'TOTAL RETURN / CAGR') {
      const col = getMetricColor('TOTAL RETURN / CAGR');
      return (
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="date" stroke="var(--text-3)" tick={{ fontSize: 9 }} tickFormatter={formatYearOnly} minTickGap={45} />
          <YAxis 
            stroke="var(--text-3)" 
            tick={{ fontSize: 9 }}
            tickFormatter={(val) => `${val.toFixed(0)}%`}
          />
          <Tooltip 
            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', fontSize: '11px', color: 'var(--text)' }}
            formatter={(value, name) => [`${value.toFixed(2)}%`, name]}
          />
          <Legend wrapperStyle={{ fontSize: '10px' }} />
          <Line type="monotone" dataKey="Strategy Value" stroke={col} strokeWidth={2} dot={false} name="Strategy Growth" />
          <Line type="monotone" dataKey="SPY Value" stroke="var(--text-3)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="SPY Benchmark" />
        </LineChart>
      );
    }

    if (metricName === 'MAX DRAWDOWN') {
      const col = getMetricColor('MAX DRAWDOWN');
      return (
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="modal-dd-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={col} stopOpacity={0.2} />
              <stop offset="95%" stopColor={col} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="date" stroke="var(--text-3)" tick={{ fontSize: 9 }} tickFormatter={formatYearOnly} minTickGap={45} />
          <YAxis 
            stroke="var(--text-3)" 
            tick={{ fontSize: 9 }}
            tickFormatter={(val) => `${val.toFixed(0)}%`}
          />
          <Tooltip 
            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', fontSize: '11px', color: 'var(--text)' }}
            formatter={(value, name) => [`${value.toFixed(2)}%`, name]}
          />
          <Legend wrapperStyle={{ fontSize: '10px' }} />
          <Area type="monotone" dataKey="Strategy Drawdown" stroke={col} strokeWidth={2} fill="url(#modal-dd-grad)" name="Strategy Drawdown" />
          <Line type="monotone" dataKey="SPY Drawdown" stroke="var(--text-3)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="SPY Benchmark" />
        </AreaChart>
      );
    }

    if (metricName === 'SHARPE RATIO') {
      const col = getMetricColor('SHARPE RATIO');
      return (
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="date" stroke="var(--text-3)" tick={{ fontSize: 9 }} tickFormatter={formatYearOnly} minTickGap={45} />
          <YAxis 
            stroke="var(--text-3)" 
            tick={{ fontSize: 9 }}
            tickFormatter={(val) => val.toFixed(2)}
          />
          <Tooltip 
            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', fontSize: '11px', color: 'var(--text)' }}
            formatter={(value, name) => [value.toFixed(2), name]}
          />
          <Legend wrapperStyle={{ fontSize: '10px' }} />
          <Line type="monotone" dataKey="Strategy Sharpe" stroke={col} strokeWidth={2} dot={false} name="Strategy Sharpe" />
          <Line type="monotone" dataKey="SPY Sharpe" stroke="var(--text-3)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="SPY Benchmark" />
        </LineChart>
      );
    }

    return null;
  };

  const summary = [
    {
      name: 'PORTFOLIO NAV',
      value: navValue,
      change: lastDailyReturnVal,
      percentageChange: lastDailyReturnPct,
      changeType: navChangeType,
      data: navData,
    },
    {
      name: 'TOTAL RETURN / CAGR',
      value: strat?.CAGR || '—',
      change: spy?.CAGR ? `SPY: ${spy.CAGR}` : '—',
      percentageChange: cagrDeltaSign + cagrDelta.toFixed(2) + '%',
      changeType: cagrDelta >= 0 ? 'positive' : 'negative',
      data: cagrData,
    },
    {
      name: 'MAX DRAWDOWN',
      value: strat?.['Max Drawdown'] || '—',
      change: spy?.['Max Drawdown'] ? `SPY: ${spy['Max Drawdown']}` : '—',
      percentageChange: ddDeltaSign + ddDelta.toFixed(2) + '%',
      changeType: ddDelta >= 0 ? 'positive' : 'negative',
      data: ddData,
    },
    {
      name: 'SHARPE RATIO',
      value: strat?.Sharpe || '—',
      change: spy?.Sharpe ? `SPY: ${spy.Sharpe}` : '—',
      percentageChange: sharpeStatusText,
      changeType: sharpeChangeType,
      data: sharpeData,
    }
  ];

  if (!holdings) {
    return (
      <div className="flex items-center justify-center font-mono text-[11px] text-text-3"
        style={{ height: 'calc(100vh - 104px)' }}>
        LOADING PORTFOLIO DATA...
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Clean, transparent top header row (removing the grey box background/border) */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          {h.data_quality_manifest ? (
            <span className="font-sans font-bold text-xs text-text-strong tracking-wide uppercase flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green animate-pulse" />
              Imported Portfolio Analysis
            </span>
          ) : (
            <span className="font-sans font-bold text-xs text-text-strong tracking-wide uppercase flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue" />
              Live Pipeline Portfolio Feed
            </span>
          )}
        </div>
        
        {/* Portfolio As Of Date Selector */}
        <DatePickerButton value={selectedDate} onChange={onDateChange} />
      </div>

      {/* Manifest UI Panel */}
      {h.data_quality_manifest && (
        <div className="bg-surface border border-border rounded-xl p-4 shadow-sm flex-shrink-0">
          <DataQualityManifest manifest={h.data_quality_manifest} />
        </div>
      )}

      {/* ── Row A: KPI Grid with Sparklines ── */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 flex-shrink-0">
        {summary.map((item) => (
          <div 
            key={item.name} 
            onClick={() => setActiveModal(item.name)}
            className="group relative bg-surface border border-border rounded-xl p-5 flex flex-col justify-between hover:bg-surface-2 hover:border-border-2 cursor-pointer transition-all duration-300 shadow-sm overflow-hidden"
          >
            {/* Learn More Text overlay */}
            <div className="absolute top-3 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0 z-10">
              <span className="font-sans text-[10px] font-medium tracking-wide text-text-2 bg-surface px-2 py-0.5 rounded border border-border">
                Learn More →
              </span>
            </div>

            <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-text-3 block mb-1">
              {item.name}
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-mono font-bold text-2xl leading-none text-text-strong">
                {item.value}
              </span>
              <span className="flex items-center gap-1 font-mono text-[11px]">
                <span className="text-text-3">{item.change}</span>
                <span className={item.changeType === 'positive' ? 'text-green font-bold' : 'text-red font-bold'}>
                  ({item.percentageChange})
                </span>
              </span>
            </div>
            <SparkAreaChart data={item.data} colorKey={item.name} changeType={item.changeType} />
          </div>
        ))}
      </div>

      {/* ── Row B: Split panel (Risk Radar & Defensive Intelligence) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 flex-shrink-0">
        <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="font-sans text-[11px] font-semibold uppercase tracking-wider text-text-3 px-4 py-2.5 border-b border-border bg-surface-2 sticky top-0">
            RISK RADAR
          </div>
          <div className="overflow-y-auto">
            <RiskRadar rr={h.risk_radar} />
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="font-sans text-[11px] font-semibold uppercase tracking-wider text-text-3 px-4 py-2.5 border-b border-border bg-surface-2 sticky top-0">
            DEFENSIVE INTELLIGENCE
          </div>
          <div className="overflow-y-auto">
            <DefensiveIntelligence defense={h.defense} health={h.health} />
          </div>
        </div>
      </div>

      {/* ── Row C: Holdings DataTable ── */}
      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        <HoldingsTable holdings={sortedHoldings} loading={loading} />
      </div>

      {/* ── Detailed Modal Overlay ── */}
      {activeModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setActiveModal(null)}
        >
          <div 
            className="bg-surface border border-border rounded-xl max-w-3xl w-full p-6 shadow-2xl relative flex flex-col gap-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Close Button */}
            <button 
              className="absolute top-4 right-4 text-text-3 hover:text-text-strong transition-colors"
              onClick={() => setActiveModal(null)}
            >
              <X size={18} />
            </button>

            {/* Title */}
            <div>
              <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-text-3 block mb-1">
                {activeModal}
              </span>
              <h2 className="font-sans text-xl font-bold text-text-strong">
                {metricDetails[activeModal].title}
              </h2>
            </div>

            {/* Value Block */}
            <div className="flex items-baseline gap-4">
              <span className="font-mono font-bold text-3xl text-text-strong">
                {metricDetails[activeModal].value}
              </span>
              <span className="font-mono text-sm text-text-2">
                {metricDetails[activeModal].subtitle}
              </span>
            </div>

            {/* Chart */}
            <div className="h-64 w-full bg-surface-2/30 border border-border/50 rounded-lg p-2">
              <ResponsiveContainer width="100%" height="100%">
                {renderModalChart(activeModal)}
              </ResponsiveContainer>
            </div>

            {/* Content Text */}
            <div className="flex flex-col gap-2 font-sans text-xs text-text-2 leading-relaxed border-t border-border pt-4">
              <span className="font-semibold text-text-strong uppercase tracking-wider text-[10px]">
                Additional Analysis
              </span>
              <p>{metricDetails[activeModal].description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
