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

export default function PortfolioAnalytics({ perf, holdings }) {
  const [benchmark, setBenchmark] = useState('SPY')

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
  }

  return (
    <div style={{ background: 'var(--bg)', padding: '0' }}>
      {/* Header */}
      <div className="chart-header" style={{ margin: '0' }}>
        <span className="chart-title">Portfolio Analytics Engine</span>
        <select
          value={benchmark}
          onChange={e => setBenchmark(e.target.value)}
          style={{ padding: '6px 12px', background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text)', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}
        >
          {BENCHMARKS.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Rolling Alpha line chart */}
            <div style={{ height: '260px', background: 'var(--surface)', padding: '16px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-2)', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: '8px' }}>
                Rolling Alpha & Drawdown Gap
              </span>
              <ResponsiveContainer width="100%" height="88%">
                <LineChart data={analytics.rollingLine}>
                  <CartesianGrid strokeDasharray="" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--border)" tick={{ fontSize: 9, fill: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }} />
                  <YAxis stroke="var(--border)" tick={{ fontSize: 9, fill: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }} />
                  <Tooltip contentStyle={TT_STYLE} />
                  <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-2)' }} />
                  <Line type="monotone" dataKey="Alpha"       stroke="var(--text-strong)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="DrawdownGap" stroke="var(--border-3)"   strokeWidth={1} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Sector Exposure bar chart */}
            <div style={{ height: '260px', background: 'var(--surface)', padding: '16px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-2)', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: '8px' }}>
                Sector Exposure Gap
              </span>
              <ResponsiveContainer width="100%" height="88%">
                <BarChart data={analytics.exposures}>
                  <CartesianGrid strokeDasharray="" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--border)" tick={{ fontSize: 9, fill: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }} />
                  <YAxis stroke="var(--border)" tick={{ fontSize: 9, fill: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }} />
                  <Tooltip contentStyle={TT_STYLE} />
                  <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-2)' }} />
                  <Bar dataKey="Portfolio" fill="var(--text)" />
                  <Bar dataKey="Benchmark" fill="var(--border-3)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Radar chart */}
            <div style={{ height: '260px', background: 'var(--surface)', padding: '16px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-2)', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', display: 'block', textAlign: 'center', marginBottom: '8px' }}>
                Factor Baseline
              </span>
              <ResponsiveContainer width="100%" height="88%">
                <RadarChart outerRadius="70%" data={analytics.factors}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="name" tick={{ fill: 'var(--text-2)', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }} />
                  <Radar name="Portfolio" dataKey="Portfolio" stroke="var(--text-strong)" fill="var(--text-strong)" fillOpacity={0.08} />
                  <Radar name={benchmark}  dataKey="Benchmark" stroke="var(--border-3)"   fill="var(--border-3)"   fillOpacity={0.06} />
                  <Tooltip contentStyle={TT_STYLE} />
                  <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-2)' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Contributors + Detractors */}
            <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
              <div style={{ flex: 1, background: 'var(--surface)', padding: '14px', border: '1px solid var(--border)', borderLeft: '3px solid var(--green)' }}>
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
              <div style={{ flex: 1, background: 'var(--surface)', padding: '14px', border: '1px solid var(--border)', borderLeft: '3px solid var(--red)' }}>
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
      </div>
    </div>
  )
}
