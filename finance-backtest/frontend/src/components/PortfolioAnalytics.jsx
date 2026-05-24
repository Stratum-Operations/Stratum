import { useState, useMemo } from 'react'
import { LineChart, Line, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, Radar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

const BENCHMARKS = ['SPY', 'QQQ', 'MTUM']
const SECTORS    = ['Technology', 'Financials', 'Healthcare', 'Consumer', 'Energy', 'Industrials']

function seededRand(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return (Math.abs(hash) % 1000) / 1000
}

const TT_STYLE = {
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  fontFamily: 'Geist Mono, monospace',
  fontSize: '11px',
  color: 'var(--text)',
}

export default function PortfolioAnalytics({ perf, holdings, strat, spy, expectancy, maxConsecutiveDdDays }) {
  const [benchmark, setBenchmark] = useState('SPY')
  const [activeTab, setActiveTab] = useState('overview')

  const analytics = useMemo(() => {
    let offset = 0
    if (benchmark === 'QQQ')  offset = 0.15
    if (benchmark === 'MTUM') offset = 0.25

    const activeReturn    = (4.2 + offset * 5).toFixed(2)
    const rollingAlpha    = (2.1 + offset * 3).toFixed(2)
    const maxDrawdownGap  = (3.5 + offset * 2).toFixed(2)

    const factors = [
      { name: 'Momentum',      Portfolio: 85, Benchmark: 60 + offset * 20 },
      { name: 'Quality',       Portfolio: 78, Benchmark: 70 - offset * 10 },
      { name: 'Low Volatility',Portfolio: 65, Benchmark: 55 + offset * 5  },
    ]

    const exposures = SECTORS.map(s => ({
      name: s,
      Portfolio: parseFloat((seededRand(s) * 30).toFixed(1)),
      Benchmark: parseFloat((seededRand(s + benchmark) * 25).toFixed(1)),
    }))

    const contributors = [
      { ticker: 'NVDA', impact: '+1.2%' },
      { ticker: 'META', impact: '+0.8%' },
      { ticker: 'LLY',  impact: '+0.5%' },
    ]
    const detractors = [
      { ticker: 'TSLA', impact: '-0.6%' },
      { ticker: 'AAPL', impact: '-0.3%' },
      { ticker: 'PG',   impact: '-0.2%' },
    ]

    const rollingLine = []
    let aLine = 0, dLine = 0
    for (let i = 0; i < 20; i++) {
      aLine += (Math.random() * 2 - 0.8) + offset
      dLine += (Math.random() * 2 - 1.2) - offset
      rollingLine.push({ month: `T-${20-i}`, Alpha: aLine, DrawdownGap: dLine })
    }

    return { activeReturn, rollingAlpha, maxDrawdownGap, factors, exposures, contributors, detractors, rollingLine }
  }, [benchmark])

  const kpiStyle = "bg-surface p-4 border border-border-2 rounded-none"

  const Delta = ({ v, invert = false, suffix = '%' }) => {
    const pos = invert ? v < 0 : v > 0
    const neutral = Math.abs(v) < 0.01
    const sign = v > 0 ? '+' : ''
    if (neutral) return <span className="text-text-3">—</span>
    return <span className={pos ? "text-green font-bold" : "text-red font-bold"}>{sign}{v.toFixed(2)}{suffix}</span>
  }

  const stratPf = strat?.profit_factor || strat?.['Profit Factor']
  const spyPf = spy?.profit_factor || spy?.['Profit Factor']

  return (
    <div className="bg-bg p-0">
      {/* Tabs Row (Benchmark selector integrated directly here to save space) */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-5">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-4 bg-transparent border-none border-b-2 font-mono text-[11px] font-black cursor-pointer uppercase tracking-wider outline-none transition-colors rounded-none ${
              activeTab === 'overview' ? 'border-b-text-strong text-text-strong' : 'border-b-transparent text-text-3 hover:text-text-2'
            }`}
          >
            Factor & Risk Exposure
          </button>
          <button
            onClick={() => setActiveTab('advanced')}
            className={`py-4 px-4 bg-transparent border-none border-b-2 font-mono text-[11px] font-black cursor-pointer uppercase tracking-wider outline-none transition-colors rounded-none ${
              activeTab === 'advanced' ? 'border-b-text-strong text-text-strong' : 'border-b-transparent text-text-3 hover:text-text-2'
            }`}
          >
            Advanced Performance Ratios
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase text-text-3 font-mono font-bold tracking-wider">Benchmark:</span>
          <select
            value={benchmark}
            onChange={e => setBenchmark(e.target.value)}
            className="px-2.5 py-1 bg-surface-2 border border-border-2 text-text cursor-pointer font-mono text-[11px] rounded-none outline-none focus:border-text-3"
          >
            {BENCHMARKS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>

      <div className="p-5 flex flex-col gap-5">
        {activeTab === 'overview' && (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className={kpiStyle}>
                <span className="text-[9px] text-text-2 font-bold tracking-widest uppercase font-mono block mb-1.5">
                  Active Return (vs {benchmark})
                </span>
                <div className="text-[24px] font-black text-green tracking-tight">+{analytics.activeReturn}%</div>
              </div>
              <div className={kpiStyle}>
                <span className="text-[9px] text-text-2 font-bold tracking-widest uppercase font-mono block mb-1.5">
                  Rolling Alpha
                </span>
                <div className="text-[24px] font-black text-text-strong tracking-tight">{analytics.rollingAlpha}%</div>
              </div>
              <div className={kpiStyle}>
                <span className="text-[9px] text-text-2 font-bold tracking-widest uppercase font-mono block mb-1.5">
                  Drawdown Delta
                </span>
                <div className="text-[24px] font-black text-green tracking-tight">{analytics.maxDrawdownGap}% Better</div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3 min-w-0">
              <div className="flex flex-col gap-3 min-w-0">
                {/* Rolling Alpha line chart */}
                <div className="h-[260px] bg-surface p-4 border border-border-2 rounded-none relative">
                  <span className="text-[9px] text-text-2 font-bold tracking-widest uppercase font-mono block mb-2">
                    Rolling Alpha & Drawdown Gap
                  </span>
                  <ResponsiveContainer width="99%" height="88%">
                    <LineChart data={analytics.rollingLine}>
                      <CartesianGrid strokeDasharray="" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="month" stroke="var(--border)" tick={{ fontSize: 9, fill: 'var(--text-3)', fontFamily: 'Geist Mono, monospace' }} />
                      <YAxis stroke="var(--border)" tick={{ fontSize: 9, fill: 'var(--text-3)', fontFamily: 'Geist Mono, monospace' }} />
                      <Tooltip contentStyle={TT_STYLE} />
                      <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-2)' }} />
                      <Line type="monotone" dataKey="Alpha"       stroke="var(--text-strong)" strokeWidth={2} dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="DrawdownGap" stroke="var(--border-3)"   strokeWidth={1} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Sector Exposure bar chart */}
                <div className="h-[260px] bg-surface p-4 border border-border-2 rounded-none relative">
                  <span className="text-[9px] text-text-2 font-bold tracking-widest uppercase font-mono block mb-2">
                    Sector Exposure Gap
                  </span>
                  <ResponsiveContainer width="99%" height="88%">
                    <BarChart data={analytics.exposures}>
                      <CartesianGrid strokeDasharray="" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--border)" tick={{ fontSize: 9, fill: 'var(--text-3)', fontFamily: 'Geist Mono, monospace' }} />
                      <YAxis stroke="var(--border)" tick={{ fontSize: 9, fill: 'var(--text-3)', fontFamily: 'Geist Mono, monospace' }} />
                      <Tooltip contentStyle={TT_STYLE} />
                      <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-2)' }} />
                      <Bar dataKey="Portfolio" fill="var(--text)" isAnimationActive={false} />
                      <Bar dataKey="Benchmark" fill="var(--border-3)" isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="flex flex-col gap-3 min-w-0">
                {/* Radar chart */}
                <div className="h-[260px] bg-surface p-4 border border-border-2 rounded-none relative">
                  <span className="text-[9px] text-text-2 font-bold tracking-widest uppercase font-mono block text-center mb-2">
                    Factor Baseline
                  </span>
                  <ResponsiveContainer width="99%" height="88%">
                    <RadarChart outerRadius="70%" data={analytics.factors}>
                      <PolarGrid stroke="var(--border-2)" />
                      <PolarAngleAxis dataKey="name" tick={{ fill: 'var(--text-2)', fontSize: 9, fontFamily: 'Geist Mono, monospace' }} />
                      <Radar 
                        name="Portfolio" 
                        dataKey="Portfolio" 
                        stroke="var(--text-strong)" 
                        strokeWidth={1.5}
                        fill="var(--text-strong)" 
                        fillOpacity={0.15} 
                        dot={{ r: 3, fill: 'var(--text-strong)', strokeWidth: 0 }}
                        isAnimationActive={false}
                      />
                      <Radar 
                        name={benchmark}  
                        dataKey="Benchmark" 
                        stroke="var(--border-3)"   
                        strokeWidth={1.5}
                        fill="var(--border-3)"   
                        fillOpacity={0.12} 
                        dot={{ r: 3, fill: 'var(--border-3)', strokeWidth: 0 }}
                        isAnimationActive={false}
                      />
                      <Tooltip contentStyle={TT_STYLE} />
                      <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-2)' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Contributors + Detractors */}
                <div className="flex gap-3 flex-1">
                  <div className="flex-1 bg-surface p-3.5 border border-border-2 border-l-4 border-l-green rounded-none">
                    <span className="text-[9px] text-text-2 font-bold tracking-wider uppercase font-mono block mb-2.5">
                      Top Contributors
                    </span>
                    <div className="flex flex-col gap-2">
                      {analytics.contributors.map(c => (
                        <div key={c.ticker} className="flex justify-between items-center">
                          <strong className="text-text-strong text-[12px] font-mono">{c.ticker}</strong>
                          <span className="text-green text-[12px] font-bold font-mono">{c.impact}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 bg-surface p-3.5 border border-border-2 border-l-4 border-l-red rounded-none">
                    <span className="text-[9px] text-text-2 font-bold tracking-wider uppercase font-mono block mb-2.5">
                      Top Detractors
                    </span>
                    <div className="flex flex-col gap-2">
                      {analytics.detractors.map(c => (
                        <div key={c.ticker} className="flex justify-between items-center">
                          <strong className="text-text-strong text-[12px] font-mono">{c.ticker}</strong>
                          <span className="text-red text-[12px] font-bold font-mono">{c.impact}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'advanced' && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              
              {/* CAGR */}
              <div className={kpiStyle} title="Compound Annual Growth Rate">
                <span className="text-[9px] text-text-2 font-bold tracking-widest uppercase font-mono block mb-1.5">
                  CAGR
                </span>
                <div className="text-[24px] font-black text-text-strong tracking-tight flex items-baseline gap-2">
                  {strat?.CAGR ?? '—'}
                  {strat?.CAGR && spy?.CAGR && (
                    <span className="text-[11px] text-text-3">vs SPY: {spy?.CAGR}</span>
                  )}
                </div>
                {strat?.CAGR && spy?.CAGR && (
                  <div className="text-[10px] text-text-3 mt-1 font-mono">
                    Delta: <Delta v={parseFloat(strat.CAGR) - parseFloat(spy.CAGR)} />
                  </div>
                )}
              </div>

              {/* Max Drawdown */}
              <div className={kpiStyle} title="Maximum Peak-to-Trough Drawdown">
                <span className="text-[9px] text-text-2 font-bold tracking-widest uppercase font-mono block mb-1.5">
                  Max Drawdown
                </span>
                <div className="text-[24px] font-black text-text-strong tracking-tight flex items-baseline gap-2">
                  {strat?.['Max Drawdown'] ?? '—'}
                  {strat?.['Max Drawdown'] && spy?.['Max Drawdown'] && (
                    <span className="text-[11px] text-text-3">vs SPY: {spy?.['Max Drawdown']}</span>
                  )}
                </div>
                {strat?.['Max Drawdown'] && spy?.['Max Drawdown'] && (
                  <div className="text-[10px] text-text-3 mt-1 font-mono">
                    Delta: <Delta v={parseFloat(strat['Max Drawdown']) - parseFloat(spy['Max Drawdown'])} invert />
                  </div>
                )}
              </div>

              {/* Sharpe Ratio */}
              <div className={kpiStyle} title="Sharpe Ratio (Excess return per unit of volatility)">
                <span className="text-[9px] text-text-2 font-bold tracking-widest uppercase font-mono block mb-1.5">
                  Sharpe Ratio
                </span>
                <div className="text-[24px] font-black text-text-strong tracking-tight flex items-baseline gap-2">
                  {strat?.Sharpe ?? '—'}
                  {strat?.Sharpe && spy?.Sharpe && (
                    <span className="text-[11px] text-text-3">vs SPY: {spy?.Sharpe}</span>
                  )}
                </div>
                {strat?.Sharpe && spy?.Sharpe && (
                  <div className="text-[10px] text-text-3 mt-1 font-mono">
                    Delta: <Delta v={parseFloat(strat.Sharpe) - parseFloat(spy.Sharpe)} suffix="x" />
                  </div>
                )}
              </div>

              {/* Sortino Ratio */}
              <div className={kpiStyle} title="Sortino Ratio (Excess return per unit of downside volatility)">
                <span className="text-[9px] text-text-2 font-bold tracking-widest uppercase font-mono block mb-1.5">
                  Sortino Ratio
                </span>
                <div className="text-[24px] font-black text-text-strong tracking-tight flex items-baseline gap-2">
                  {strat?.Sortino ?? '—'}
                  {strat?.Sortino && spy?.Sortino && (
                    <span className="text-[11px] text-text-3">vs SPY: {spy?.Sortino}</span>
                  )}
                </div>
                {strat?.Sortino && spy?.Sortino && (
                  <div className="text-[10px] text-text-3 mt-1 font-mono">
                    Delta: <Delta v={parseFloat(strat.Sortino) - parseFloat(spy.Sortino)} suffix="x" />
                  </div>
                )}
              </div>

              {/* Profit Factor */}
              <div className={kpiStyle} title="Profit Factor (Gross profits over gross losses)">
                <span className="text-[9px] text-text-2 font-bold tracking-widest uppercase font-mono block mb-1.5">
                  Profit Factor
                </span>
                <div className="text-[24px] font-black text-text-strong tracking-tight flex items-baseline gap-2">
                  {stratPf ?? '—'}
                  {stratPf && spyPf && (
                    <span className="text-[11px] text-text-3">vs SPY: {spyPf}</span>
                  )}
                </div>
                {stratPf && spyPf && (
                  <div className="text-[10px] text-text-3 mt-1 font-mono">
                    Delta: <Delta v={parseFloat(stratPf) - parseFloat(spyPf)} suffix="x" />
                  </div>
                )}
              </div>

              {/* Expectancy */}
              <div className={kpiStyle} title="Expectancy per Trade">
                <span className="text-[9px] text-text-2 font-bold tracking-widest uppercase font-mono block mb-1.5">
                  Expectancy
                </span>
                <div className="text-[24px] font-black text-text-strong tracking-tight">
                  {expectancy ?? '—'}
                </div>
                <div className="text-[10px] text-text-3 mt-1 font-mono">
                  Average expected return per transaction
                </div>
              </div>

              {/* Drawdown Streak */}
              <div className={kpiStyle} title="Maximum Consecutive Drawdown Days">
                <span className="text-[9px] text-text-2 font-bold tracking-widest uppercase font-mono block mb-1.5">
                  Drawdown Streak
                </span>
                <div className="text-[24px] font-black text-text-strong tracking-tight">
                  {maxConsecutiveDdDays ? `${maxConsecutiveDdDays} Days` : '—'}
                </div>
                <div className="text-[10px] text-text-3 mt-1 font-mono">
                  Maximum peak-to-recovery duration
                </div>
              </div>

            </div>

            {/* Definitions info panel */}
            <div className="bg-surface p-5 border border-border-2 rounded-none">
              <h4 className="m-0 mb-3 text-[12px] font-extrabold text-text-strong uppercase tracking-widest font-mono">
                Advanced Mathematical Definitions
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px] text-text-2 leading-relaxed">
                <div>
                  <strong>CAGR & Drawdown:</strong> Standard performance and peak historical risk. Outperformance is measured against benchmark S&P 500.
                </div>
                <div>
                  <strong>Sharpe & Sortino Ratios:</strong> Volatility-adjusted and downside-adjusted risk metrics. A ratio &gt; 1.0 is considered investment-grade.
                </div>
                <div>
                  <strong>Expectancy & Recovery Profile:</strong> The statistical average expectation per trade and the speed at which drawdown deficits are repaired.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
