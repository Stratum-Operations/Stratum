import { useMemo } from 'react'

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

/* ── KPI Block ───────────────────────────────────────────────────── */
function KpiBlock({ value, label, valueClass = '' }) {
  return (
    <div className="flex-1 bg-surface border border-border-2 p-4 flex flex-col gap-2 justify-between overflow-hidden">
      <span className="font-mono text-[10px] uppercase tracking-widest text-text-3 block">
        {label}
      </span>
      <span className={`font-mono font-black text-3xl leading-none ${valueClass}`}>
        {value}
      </span>
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
function HoldingsTable({ holdings }) {
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
              {['TICKER', 'SECTOR', 'WEIGHT', 'SHARES', 'MKT VALUE', 'P&L'].map(col => (
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
            {holdings.map((row, i) => {
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
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

/* ── Command Center ──────────────────────────────────────────────── */
export default function LivePortfolio({ holdings, perf, strat, spy }) {
  const h = holdings || {}

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

  if (!holdings) {
    return (
      <div className="flex items-center justify-center font-mono text-[11px] text-text-3"
        style={{ height: 'calc(100vh - 104px)' }}>
        LOADING PORTFOLIO DATA...
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: '1fr 2fr 2fr',
        height: 'calc(100vh - 104px)',
        overflow: 'hidden',
        gap: '1px',
        background: 'var(--border-2)',
      }}
    >
      {/* ── Row A: KPI Strip ──────────────────────────────────────── */}
      <div className="flex gap-[1px] overflow-hidden" style={{ background: 'var(--border-2)' }}>
        <KpiBlock value={navValue}             label="PORTFOLIO NAV"    />
        <KpiBlock
          value={healthScore}
          label="HEALTH SCORE"
          valueClass={healthColor(healthScore)}
        />
        <KpiBlock value={activeHoldings.length} label="ACTIVE POSITIONS" />
        <KpiBlock value={maxSectorLabel}        label="MAX SECTOR EXP"  />
      </div>

      {/* ── Row B: Split panel ─────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1px',
          background: 'var(--border-2)',
          overflow: 'hidden',
        }}
      >
        <div className="bg-surface overflow-y-auto">
          <div className="font-mono text-[10px] uppercase tracking-widest text-text-3 px-4 py-2 border-b border-border-2 bg-surface-2 sticky top-0">
            RISK RADAR
          </div>
          <RiskRadar rr={h.risk_radar} />
        </div>
        <div className="bg-surface overflow-y-auto">
          <div className="font-mono text-[10px] uppercase tracking-widest text-text-3 px-4 py-2 border-b border-border-2 bg-surface-2 sticky top-0">
            DEFENSIVE INTELLIGENCE
          </div>
          <DefensiveIntelligence defense={h.defense} health={h.health} />
        </div>
      </div>

      {/* ── Row C: Holdings DataTable ─────────────────────────────── */}
      <div className="bg-surface overflow-hidden flex flex-col">
        <HoldingsTable holdings={sortedHoldings} />
      </div>
    </div>
  )
}
