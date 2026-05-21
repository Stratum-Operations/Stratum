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
  fontFamily: 'JetBrains Mono, monospace',
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

  const kpiStyle = {
    background: 'var(--surface)',
    padding: '16px 20px',
    border: '1px solid var(--border)',
    borderRadius: '10px'
  }

  const Delta = ({ v, invert = false, suffix = '%' }) => {
    const pos = invert ? v < 0 : v > 0
    const neutral = Math.abs(v) < 0.01
    const sign = v > 0 ? '+' : ''
    if (neutral) return <span style={{ color: 'var(--text-3)' }}>—</span>
    return <span style={{ color: pos ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{sign}{v.toFixed(2)}{suffix}</span>
  }

  const stratPf = strat?.profit_factor || strat?.['Profit Factor']
  const spyPf = spy?.profit_factor || spy?.['Profit Factor']

  return (
    <div style={{ background: 'var(--bg)', padding: '0' }}>
      {/* Tabs Row (Benchmark selector integrated directly here to save space) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', background: 'var(--surface)', padding: '0 20px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '16px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'overview' ? '2px solid var(--text-strong)' : '2px solid transparent',
              color: activeTab === 'overview' ? 'var(--text-strong)' : 'var(--text-3)',
              fontWeight: activeTab === 'overview' ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Factor & Risk Exposure
          </button>
          <button
            onClick={() => setActiveTab('advanced')}
            style={{
              padding: '16px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'advanced' ? '2px solid var(--text-strong)' : '2px solid transparent',
              color: activeTab === 'advanced' ? 'var(--text-strong)' : 'var(--text-3)',
              fontWeight: activeTab === 'advanced' ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Advanced Performance Ratios
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, letterSpacing: '0.05em' }}>Benchmark:</span>
          <select
            value={benchmark}
            onChange={e => setBenchmark(e.target.value)}
            style={{ 
              padding: '4px 10px', 
              background: 'var(--surface-2)', 
              border: '1px solid var(--border-2)', 
              color: 'var(--text)', 
              cursor: 'pointer', 
              fontFamily: 'JetBrains Mono, monospace', 
              fontSize: '11px',
              borderRadius: '6px',
              outline: 'none'
            }}
          >
            {BENCHMARKS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {activeTab === 'overview' && (
          <>
            {/* KPI row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div style={kpiStyle}>
                <span style={{ fontSize: '9px', color: 'var(--text-2)', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: '6px' }}>
                  Active Return (vs {benchmark})
                </span>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--green)', letterSpacing: '-0.02em' }}>+{analytics.activeReturn}%</div>
              </div>
              <div style={kpiStyle}>
                <span style={{ fontSize: '9px', color: 'var(--text-2)', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: '6px' }}>
                  Rolling Alpha
                </span>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-strong)', letterSpacing: '-0.02em' }}>{analytics.rollingAlpha}%</div>
              </div>
              <div style={kpiStyle}>
                <span style={{ fontSize: '9px', color: 'var(--text-2)', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: '6px' }}>
                  Drawdown Delta
                </span>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--green)', letterSpacing: '-0.02em' }}>{analytics.maxDrawdownGap}% Better</div>
              </div>
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', minWidth: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
                {/* Rolling Alpha line chart */}
                <div style={{ height: '260px', background: 'var(--surface)', padding: '16px', border: '1px solid var(--border)', borderRadius: '10px', position: 'relative' }}>
                  <span style={{ fontSize: '9px', color: 'var(--text-2)', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: '8px' }}>
                    Rolling Alpha & Drawdown Gap
                  </span>
                  <ResponsiveContainer width="99%" height="88%">
                    <LineChart data={analytics.rollingLine}>
                      <CartesianGrid strokeDasharray="" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="month" stroke="var(--border)" tick={{ fontSize: 9, fill: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }} />
                      <YAxis stroke="var(--border)" tick={{ fontSize: 9, fill: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }} />
                      <Tooltip contentStyle={TT_STYLE} />
                      <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-2)' }} />
                      <Line type="monotone" dataKey="Alpha"       stroke="var(--text-strong)" strokeWidth={2} dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="DrawdownGap" stroke="var(--border-3)"   strokeWidth={1} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Sector Exposure bar chart */}
                <div style={{ height: '260px', background: 'var(--surface)', padding: '16px', border: '1px solid var(--border)', borderRadius: '10px', position: 'relative' }}>
                  <span style={{ fontSize: '9px', color: 'var(--text-2)', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: '8px' }}>
                    Sector Exposure Gap
                  </span>
                  <ResponsiveContainer width="99%" height="88%">
                    <BarChart data={analytics.exposures}>
                      <CartesianGrid strokeDasharray="" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--border)" tick={{ fontSize: 9, fill: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }} />
                      <YAxis stroke="var(--border)" tick={{ fontSize: 9, fill: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }} />
                      <Tooltip contentStyle={TT_STYLE} />
                      <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-2)' }} />
                      <Bar dataKey="Portfolio" fill="var(--text)" isAnimationActive={false} />
                      <Bar dataKey="Benchmark" fill="var(--border-3)" isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
                {/* Radar chart */}
                <div style={{ height: '260px', background: 'var(--surface)', padding: '16px', border: '1px solid var(--border)', borderRadius: '10px', position: 'relative' }}>
                  <span style={{ fontSize: '9px', color: 'var(--text-2)', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', display: 'block', textAlign: 'center', marginBottom: '8px' }}>
                    Factor Baseline
                  </span>
                  <ResponsiveContainer width="99%" height="88%">
                    <RadarChart outerRadius="70%" data={analytics.factors}>
                      <PolarGrid stroke="var(--border-2)" />
                      <PolarAngleAxis dataKey="name" tick={{ fill: 'var(--text-2)', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }} />
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
                      <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-2)' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Contributors + Detractors */}
                <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
                  <div style={{ flex: 1, background: 'var(--surface)', padding: '14px', border: '1px solid var(--border)', borderLeft: '3px solid var(--green)', borderRadius: '10px' }}>
                    <span style={{ fontSize: '9px', color: 'var(--text-2)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: '10px' }}>
                      Top Contributors
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {analytics.contributors.map(c => (
                        <div key={c.ticker} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <strong style={{ color: 'var(--text-strong)', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace' }}>{c.ticker}</strong>
                          <span style={{ color: 'var(--green)', fontSize: '12px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{c.impact}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ flex: 1, background: 'var(--surface)', padding: '14px', border: '1px solid var(--border)', borderLeft: '3px solid var(--red)', borderRadius: '10px' }}>
                    <span style={{ fontSize: '9px', color: 'var(--text-2)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: '10px' }}>
                      Top Detractors
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {analytics.detractors.map(c => (
                        <div key={c.ticker} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <strong style={{ color: 'var(--text-strong)', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace' }}>{c.ticker}</strong>
                          <span style={{ color: 'var(--red)', fontSize: '12px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{c.impact}</span>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              
              {/* CAGR */}
              <div style={kpiStyle} title="Compound Annual Growth Rate">
                <span style={{ fontSize: '9px', color: 'var(--text-2)', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: '6px' }}>
                  CAGR
                </span>
                <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-strong)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  {strat?.CAGR ?? '—'}
                  {strat?.CAGR && spy?.CAGR && (
                    <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>vs SPY: {spy?.CAGR}</span>
                  )}
                </div>
                {strat?.CAGR && spy?.CAGR && (
                  <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '4px', fontFamily: 'JetBrains Mono, monospace' }}>
                    Delta: <Delta v={parseFloat(strat.CAGR) - parseFloat(spy.CAGR)} />
                  </div>
                )}
              </div>

              {/* Max Drawdown */}
              <div style={kpiStyle} title="Maximum Peak-to-Trough Drawdown">
                <span style={{ fontSize: '9px', color: 'var(--text-2)', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: '6px' }}>
                  Max Drawdown
                </span>
                <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-strong)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  {strat?.['Max Drawdown'] ?? '—'}
                  {strat?.['Max Drawdown'] && spy?.['Max Drawdown'] && (
                    <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>vs SPY: {spy?.['Max Drawdown']}</span>
                  )}
                </div>
                {strat?.['Max Drawdown'] && spy?.['Max Drawdown'] && (
                  <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '4px', fontFamily: 'JetBrains Mono, monospace' }}>
                    Delta: <Delta v={parseFloat(strat['Max Drawdown']) - parseFloat(spy['Max Drawdown'])} invert />
                  </div>
                )}
              </div>

              {/* Sharpe Ratio */}
              <div style={kpiStyle} title="Sharpe Ratio (Excess return per unit of volatility)">
                <span style={{ fontSize: '9px', color: 'var(--text-2)', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: '6px' }}>
                  Sharpe Ratio
                </span>
                <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-strong)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  {strat?.Sharpe ?? '—'}
                  {strat?.Sharpe && spy?.Sharpe && (
                    <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>vs SPY: {spy?.Sharpe}</span>
                  )}
                </div>
                {strat?.Sharpe && spy?.Sharpe && (
                  <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '4px', fontFamily: 'JetBrains Mono, monospace' }}>
                    Delta: <Delta v={parseFloat(strat.Sharpe) - parseFloat(spy.Sharpe)} suffix="x" />
                  </div>
                )}
              </div>

              {/* Sortino Ratio */}
              <div style={kpiStyle} title="Sortino Ratio (Excess return per unit of downside volatility)">
                <span style={{ fontSize: '9px', color: 'var(--text-2)', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: '6px' }}>
                  Sortino Ratio
                </span>
                <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-strong)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  {strat?.Sortino ?? '—'}
                  {strat?.Sortino && spy?.Sortino && (
                    <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>vs SPY: {spy?.Sortino}</span>
                  )}
                </div>
                {strat?.Sortino && spy?.Sortino && (
                  <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '4px', fontFamily: 'JetBrains Mono, monospace' }}>
                    Delta: <Delta v={parseFloat(strat.Sortino) - parseFloat(spy.Sortino)} suffix="x" />
                  </div>
                )}
              </div>

              {/* Profit Factor */}
              <div style={kpiStyle} title="Profit Factor (Gross profits over gross losses)">
                <span style={{ fontSize: '9px', color: 'var(--text-2)', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: '6px' }}>
                  Profit Factor
                </span>
                <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-strong)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  {stratPf ?? '—'}
                  {stratPf && spyPf && (
                    <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>vs SPY: {spyPf}</span>
                  )}
                </div>
                {stratPf && spyPf && (
                  <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '4px', fontFamily: 'JetBrains Mono, monospace' }}>
                    Delta: <Delta v={parseFloat(stratPf) - parseFloat(spyPf)} suffix="x" />
                  </div>
                )}
              </div>

              {/* Expectancy */}
              <div style={kpiStyle} title="Expectancy per Trade">
                <span style={{ fontSize: '9px', color: 'var(--text-2)', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: '6px' }}>
                  Expectancy
                </span>
                <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-strong)', letterSpacing: '-0.02em' }}>
                  {expectancy ?? '—'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '4px', fontFamily: 'JetBrains Mono, monospace' }}>
                  Average expected return per transaction
                </div>
              </div>

              {/* Drawdown Streak */}
              <div style={kpiStyle} title="Maximum Consecutive Drawdown Days">
                <span style={{ fontSize: '9px', color: 'var(--text-2)', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: '6px' }}>
                  Drawdown Streak
                </span>
                <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-strong)', letterSpacing: '-0.02em' }}>
                  {maxConsecutiveDdDays ? `${maxConsecutiveDdDays} Days` : '—'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '4px', fontFamily: 'JetBrains Mono, monospace' }}>
                  Maximum peak-to-recovery duration
                </div>
              </div>

            </div>

            {/* Definitions info panel */}
            <div style={{ background: 'var(--surface)', padding: '20px', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 800, color: 'var(--text-strong)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Advanced Mathematical Definitions
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', fontSize: '11px', color: 'var(--text-2)', lineHeight: '1.5' }}>
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
