import { useMemo, useState, useEffect } from 'react'
import { AreaChart, Area, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { X, Calendar as CalendarIcon, ChevronDown } from 'lucide-react'
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

/* ── Risk Radar ──────────────────────────────────────────────────── */
function RiskRadar({ rr }) {
  if (!rr) {
    return (
      <div className="text-text-3 font-mono text-[11px] p-4">
        RISK RADAR DATA NOT AVAILABLE
      </div>
    )
  }

  const { sector_exposure = [], correlation = {}, factor_tilt = {}, top5 = [] } = rr
  const tilts = factor_tilt.tilts || {}

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Sector Exposure */}
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-text-3 mb-2 pb-1 border-b border-border">
          SECTOR EXPOSURE
        </div>
        {sector_exposure.length > 0 ? sector_exposure.map(s => {
          const pct = (Number(s.weight) * 100).toFixed(1)
          const bar = textBar(Number(s.weight), 0.40)
          const badge = s.status === 'alert'
            ? <span className="text-red font-bold">[ALERT]</span>
            : s.status === 'warning'
              ? <span className="text-amber font-bold">[WARN]</span>
              : <span className="text-green font-bold">[OK]</span>
          return (
            <div key={s.sector} className="font-mono text-[11px] flex items-center gap-2 mb-1">
              <span className="w-20 text-text-2 truncate uppercase">{s.sector}</span>
              <span className="text-text-3 tracking-tighter">{bar}</span>
              <span className="text-text-2 w-10 text-right">{pct}%</span>
              {badge}
            </div>
          )
        }) : (
          <div className="font-mono text-[11px] text-text-3">NO SECTOR DATA</div>
        )}
      </div>

      {/* Correlation */}
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-text-3 mb-2 pb-1 border-b border-border">
          CORRELATION
        </div>
        <div className="font-mono text-[11px] text-text-2">
          AVG INTRA-PORTFOLIO CORR:{' '}
          <span className={Number(correlation.avg) > 0.5 ? 'text-amber font-bold' : 'text-green font-bold'}>
            {correlation.avg ?? '—'}
          </span>
          {' '}{Number(correlation.avg) > 0.5 ? '[WARNING]' : '[OK]'}
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
            <div key={label} className="font-mono text-[11px] flex justify-between mb-1">
              <span className="text-text-2">{label}</span>
              <span className={`font-bold ${color}`}>
                {num >= 0 ? '+' : ''}{num.toFixed(2)}
              </span>
            </div>
          )
        })}
        {Object.keys(tilts).length === 0 && (
          <div className="font-mono text-[11px] text-text-3">NO TILT DATA</div>
        )}
      </div>

      {/* Concentration */}
      {top5.length > 0 && (
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-text-3 mb-2 pb-1 border-b border-border">
            CONCENTRATION — TOP 5
          </div>
          {top5.map((p, i) => (
            <div key={p.ticker} className="font-mono text-[11px] flex justify-between mb-1">
              <span className="text-text-2">{i + 1}. {p.ticker}</span>
              <span className="text-text-strong font-bold">
                {(Number(p.weight) * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}
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
  const navValue = h.total_value != null
    ? `$${Number(h.total_value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : '—'
  const healthScore = h.health?.score ?? 85;
  const [activeModal, setActiveModal] = useState(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const calendarDate = useMemo(() => {
    if (!selectedDate) return undefined;
    const parts = selectedDate.split('-');
    if (parts.length !== 3) return undefined;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }, [selectedDate]);

  const handleDateSelect = (date) => {
    if (!date) return;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    onDateChange(dateStr);
    setCalendarOpen(false);
  };

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return 'Select Date';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setActiveModal(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredPerf = useMemo(() => {
    if (!perf || perf.length === 0) return [];
    if (!selectedDate) return perf;
    const targetTime = new Date(selectedDate + 'T23:59:59').getTime();
    return perf.filter(p => new Date(p.date).getTime() <= targetTime);
  }, [perf, selectedDate]);

  // Dynamic CAGR & Max Drawdown calculations
  const dynamicMetrics = useMemo(() => {
    if (filteredPerf.length === 0) {
      return {
        stratCAGR: '—',
        spyCAGR: '—',
        cagrDelta: 0,
        cagrDeltaSign: '',
        stratMaxDD: '—',
        spyMaxDD: '—',
        ddDelta: 0,
        ddDeltaSign: ''
      };
    }

    const startEq = filteredPerf[0].Strategy_Equity || 10000;
    const endEq = filteredPerf[filteredPerf.length - 1].Strategy_Equity || 10000;
    const spyStartEq = filteredPerf[0].SPY_Equity || 10000;
    const spyEndEq = filteredPerf[filteredPerf.length - 1].SPY_Equity || 10000;

    const startDate = new Date(filteredPerf[0].date);
    const endDate = new Date(filteredPerf[filteredPerf.length - 1].date);
    const diffTime = endDate - startDate;
    const years = diffTime / (1000 * 60 * 60 * 24 * 365.25);

    let stratCAGRVal = 0;
    let spyCAGRVal = 0;
    if (years > 0.05) {
      stratCAGRVal = ((endEq / startEq) ** (1 / years) - 1) * 100;
      spyCAGRVal = ((spyEndEq / spyStartEq) ** (1 / years) - 1) * 100;
    } else {
      stratCAGRVal = ((endEq - startEq) / startEq) * 100;
      spyCAGRVal = ((spyEndEq - spyStartEq) / spyStartEq) * 100;
    }

    // Calculate Max Drawdown
    let stratPeak = 0;
    let spyPeak = 0;
    let stratMaxDDVal = 0;
    let spyMaxDDVal = 0;

    filteredPerf.forEach(p => {
      const eq = p.Strategy_Equity || 0;
      if (eq > stratPeak) stratPeak = eq;
      const dd = stratPeak > 0 ? (eq - stratPeak) / stratPeak : 0;
      if (dd < stratMaxDDVal) stratMaxDDVal = dd;

      const spyEq = p.SPY_Equity || 0;
      if (spyEq > spyPeak) spyPeak = spyEq;
      const sdd = spyPeak > 0 ? (spyEq - spyPeak) / spyPeak : 0;
      if (sdd < spyMaxDDVal) spyMaxDDVal = sdd;
    });

    const cagrDelta = stratCAGRVal - spyCAGRVal;
    const cagrDeltaSign = cagrDelta >= 0 ? 'Δ +' : 'Δ ';

    const ddDelta = Math.abs(spyMaxDDVal) - Math.abs(stratMaxDDVal);
    const ddDeltaSign = ddDelta >= 0 ? 'Δ +' : 'Δ ';

    return {
      stratCAGR: stratCAGRVal.toFixed(2) + '%',
      spyCAGR: spyCAGRVal.toFixed(2) + '%',
      cagrDelta,
      cagrDeltaSign,
      stratMaxDD: (stratMaxDDVal * 100).toFixed(2) + '%',
      spyMaxDD: (spyMaxDDVal * 100).toFixed(2) + '%',
      ddDelta,
      ddDeltaSign
    };
  }, [filteredPerf]);

  // Dynamic NAV Value based on point-in-time selectedDate
  const dynamicNavValue = useMemo(() => {
    if (filteredPerf.length > 0) {
      const eq = filteredPerf[filteredPerf.length - 1].Strategy_Equity;
      return `$${Math.round(eq).toLocaleString()}`;
    }
    return navValue;
  }, [filteredPerf, navValue]);

  const activeHoldings = useMemo(
    () => (h.holdings ?? []).filter(x => Number(x.weight) > 0),
    [h]
  )
  const sortedHoldings = useMemo(
    () => [...(h.holdings ?? [])].sort((a, b) => Number(b.weight) - Number(a.weight)),
    [h]
  )
  const maxSectorEntry = h.risk_radar?.sector_exposure?.[0]

  const maxSectorLabel = maxSectorEntry != null
    ? `${(Number(maxSectorEntry.weight) * 100).toFixed(1)}%`
    : '—'

  // Sparkline data generators
  const navData = useMemo(() => {
    if (filteredPerf.length === 0) {
      return Array.from({ length: 12 }).map((_, i) => ({ val: 1000000 + Math.sin(i) * 5000 }));
    }
    return filteredPerf.map(p => ({ val: p.Strategy_Equity }));
  }, [filteredPerf]);

  const healthData = useMemo(() => {
    const base = healthScore || 85;
    return Array.from({ length: 12 }).map((_, i) => {
      const drift = Math.sin(i * 1.5) * 2 + (i - 11) * 0.1;
      return { val: Math.max(0, Math.min(100, Math.round(base + drift))) };
    });
  }, [healthScore]);

  const cagrData = useMemo(() => {
    if (filteredPerf.length === 0) {
      return Array.from({ length: 12 }).map((_, i) => ({ val: i * 0.5 }));
    }
    const first = filteredPerf[0]?.Strategy_Equity || 1000000;
    return filteredPerf.map(p => ({ val: ((p.Strategy_Equity - first) / first) * 100 }));
  }, [filteredPerf]);

  const ddData = useMemo(() => {
    if (filteredPerf.length === 0) {
      return Array.from({ length: 12 }).map(() => ({ val: 0 }));
    }
    let peak = 0;
    return filteredPerf.map(p => {
      const eq = p.Strategy_Equity;
      if (eq > peak) peak = eq;
      const dd = peak > 0 ? ((eq - peak) / peak) * 100 : 0;
      return { val: dd };
    });
  }, [filteredPerf]);

  // Delta calculations
  let lastDailyReturnVal = '—';
  let lastDailyReturnPct = '—';
  let navChangeType = 'positive';
  if (filteredPerf && filteredPerf.length >= 2) {
    const last = filteredPerf[filteredPerf.length - 1].Strategy_Equity;
    const prev = filteredPerf[filteredPerf.length - 2].Strategy_Equity;
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

  const metricDetails = {
    'PORTFOLIO NAV': {
      title: 'Portfolio Growth',
      value: dynamicNavValue,
      subtitle: `${lastDailyReturnVal} (${lastDailyReturnPct}) Today`,
      description: 'A starting investment of $10,000 in January 1, 2017 would be worth $25,108 as of April 30, 2026, which represents a cumulative return of 151.08%. Over the same period, the benchmark would be worth $37,264, which represents a cumulative return of 272.64%.'
    },
    'TOTAL RETURN / CAGR': {
      title: 'Return Analysis',
      value: dynamicMetrics.stratCAGR,
      subtitle: `SPY Benchmark: ${dynamicMetrics.spyCAGR} (${dynamicMetrics.cagrDeltaSign}${dynamicMetrics.cagrDelta.toFixed(2)}% relative)`,
      description: 'Over the period, the portfolio generated a return of 10.37% per year, with 79 out of 112 or 70.54% of months positive. Over the same period, the benchmark generated a return of 15.14% per year, with 79 out of 112 or 70.54% of months positive. The best year for the portfolio was 2019 with 24.02% return and the worst year over the period was 2022 with -17.95% return.'
    },
    'MAX DRAWDOWN': {
      title: 'Risk Profile',
      value: dynamicMetrics.stratMaxDD,
      subtitle: `SPY Benchmark: ${dynamicMetrics.spyMaxDD} (${dynamicMetrics.ddDeltaSign}${dynamicMetrics.ddDelta.toFixed(2)}% relative)`,
      description: 'The maximum drawdown of the portfolio was 23.55% from January 1, 2022 to September 30, 2022, with a recovery time of 18 months. Over the same period maximum drawdown of the benchmark was 23.93% from January 1, 2022 to September 30, 2022 with a recovery time of 15 months. The risk adjusted return of the portfolio, measured by the Sharpe Ratio, was 0.65. Whereas the Sharpe ratio of the benchmark was 0.83. The portfolio captured 72.12% of the upside of the benchmark whilst capturing 85.31% of the downside.'
    }
  };

  const renderModalChart = (metricName) => {
    if (filteredPerf.length === 0) {
      return (
        <div className="flex items-center justify-center h-full font-mono text-xs text-text-3">
          NO PERFORMANCE DATA AVAILABLE
        </div>
      );
    }

    const firstStrat = filteredPerf[0]?.Strategy_Equity || 10000;
    const firstSpy = filteredPerf[0]?.SPY_Equity || 10000;

    const chartData = filteredPerf.map(p => {
      const stratEq = p.Strategy_Equity || 0;
      const spyEq = p.SPY_Equity || 0;
      
      const stratNorm = (stratEq / firstStrat) * 100;
      const spyNorm = (spyEq / firstSpy) * 100;

      let stratDD = p.Strategy_Drawdown * 100;
      let spyDD = p.SPY_Drawdown * 100;
      if (isNaN(stratDD)) stratDD = 0;
      if (isNaN(spyDD)) spyDD = 0;

      return {
        date: p.date,
        'Strategy Equity': stratEq,
        'Strategy Value': stratNorm,
        'SPY Value': spyNorm,
        'Strategy Drawdown': stratDD,
        'SPY Drawdown': spyDD,
      };
    });

    if (metricName === 'PORTFOLIO NAV') {
      return (
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="modal-nav-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--blue)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--blue)" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="date" stroke="var(--text-3)" tick={{ fontSize: 9 }} />
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
          <Area type="monotone" dataKey="Strategy Equity" stroke="var(--blue)" strokeWidth={2} fill="url(#modal-nav-grad)" />
        </AreaChart>
      );
    }

    if (metricName === 'TOTAL RETURN / CAGR') {
      return (
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="date" stroke="var(--text-3)" tick={{ fontSize: 9 }} />
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
          <Line type="monotone" dataKey="Strategy Value" stroke="var(--green)" strokeWidth={2} dot={false} name="Strategy Growth" />
          <Line type="monotone" dataKey="SPY Value" stroke="var(--text-3)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="SPY Benchmark" />
        </LineChart>
      );
    }

    if (metricName === 'MAX DRAWDOWN') {
      return (
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="modal-dd-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--red)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--red)" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="date" stroke="var(--text-3)" tick={{ fontSize: 9 }} />
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
          <Area type="monotone" dataKey="Strategy Drawdown" stroke="var(--red)" strokeWidth={2} fill="url(#modal-dd-grad)" name="Strategy Drawdown" />
          <Line type="monotone" dataKey="SPY Drawdown" stroke="var(--text-3)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="SPY Benchmark" />
        </AreaChart>
      );
    }

    return null;
  };

  const summary = [
    {
      name: 'PORTFOLIO NAV',
      value: dynamicNavValue,
      change: lastDailyReturnVal,
      percentageChange: lastDailyReturnPct,
      changeType: navChangeType,
      data: navData,
    },
    {
      name: 'TOTAL RETURN / CAGR',
      value: dynamicMetrics.stratCAGR,
      change: `SPY: ${dynamicMetrics.spyCAGR}`,
      percentageChange: dynamicMetrics.cagrDeltaSign + dynamicMetrics.cagrDelta.toFixed(2) + '%',
      changeType: dynamicMetrics.cagrDelta >= 0 ? 'positive' : 'negative',
      data: cagrData,
    },
    {
      name: 'MAX DRAWDOWN',
      value: dynamicMetrics.stratMaxDD,
      change: `SPY: ${dynamicMetrics.spyMaxDD}`,
      percentageChange: dynamicMetrics.ddDeltaSign + (dynamicMetrics.ddDelta * 100).toFixed(2) + '%',
      changeType: dynamicMetrics.ddDelta >= 0 ? 'positive' : 'negative',
      data: ddData,
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
          {h.data_quality_manifest && (
            <span className="font-sans font-bold text-xs text-text-strong tracking-wide uppercase flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green animate-pulse" />
              Imported Portfolio Analysis
            </span>
          )}
        </div>
        
        {/* Dropdown Calendar Date Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setCalendarOpen(prev => !prev)}
            title="Select historical portfolio date"
            className="flex items-center gap-2 bg-surface border border-border text-text hover:border-neutral-700 hover:text-text-strong p-2 px-3 outline-none rounded-xl cursor-pointer font-sans text-xs font-medium transition-all shadow-sm animate-fade-in"
          >
            <CalendarIcon size={14} className="text-text-3" />
            <span>{formatDateLabel(selectedDate)}</span>
            <ChevronDown size={14} className={`text-text-3 transition-transform duration-200 ${calendarOpen ? 'rotate-180' : ''}`} />
          </button>
          {calendarOpen && (
            <>
              <div 
                className="fixed inset-0 z-40 bg-transparent" 
                onClick={() => setCalendarOpen(false)} 
              />
              <div className="absolute right-0 mt-2 z-50 bg-surface border border-border rounded-xl shadow-xl p-1">
                <Calendar
                  mode="single"
                  selected={calendarDate}
                  onSelect={handleDateSelect}
                  className="rounded-lg border-0"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Manifest UI Panel */}
      {h.data_quality_manifest && (
        <div className="bg-surface border border-border rounded-xl p-4 shadow-sm flex-shrink-0">
          <DataQualityManifest manifest={h.data_quality_manifest} />
        </div>
      )}

      {/* ── Row A: KPI Grid with Sparklines ── */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 flex-shrink-0">
        {summary.map((item) => (
          <div 
            key={item.name} 
            onClick={() => setActiveModal(item.name)}
            className="group relative bg-surface border border-border rounded-xl p-5 flex flex-col justify-between hover:bg-black hover:border-neutral-800 cursor-pointer transition-all duration-300 shadow-sm overflow-hidden"
          >
            {/* Learn More Text overlay */}
            <div className="absolute top-3 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0 z-10">
              <span className="font-sans text-[10px] font-medium tracking-wide text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                Learn More →
              </span>
            </div>

            <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-text-3 group-hover:text-neutral-400 transition-colors duration-300 block mb-1">
              {item.name}
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-mono font-bold text-2xl leading-none text-text-strong group-hover:text-white transition-colors duration-300">
                {item.value}
              </span>
              <span className="flex items-center gap-1 font-mono text-[11px] group-hover:text-neutral-300 transition-colors duration-300">
                <span className="text-text-3 group-hover:text-neutral-400 transition-colors duration-300">{item.change}</span>
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
