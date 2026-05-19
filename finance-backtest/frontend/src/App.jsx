import { useEffect, useState } from 'react'
import axios from 'axios'
import {
  LayoutDashboard, BarChart2, FileText,
  SlidersHorizontal, Eye, Settings2, Activity,
  Radio, GitCommit, ClipboardList, Briefcase,
  Search, ClipboardCheck, ChevronDown, ChevronRight,
} from 'lucide-react'
import './App.css'

import MainChart           from './components/MainChart'
import LivePortfolio       from './components/LivePortfolio'
import SectorExposure      from './components/SectorExposure'
import AlphaScreener       from './components/AlphaScreener'
import BacktestLab         from './components/BacktestLab'
import RebalanceJournal    from './components/RebalanceJournal'
import PortfolioAnalytics  from './components/PortfolioAnalytics'
import BenchmarkSuite      from './components/BenchmarkSuite'
import LivePortfolioTracker from './components/LivePortfolioTracker'
import StrategyBuilder     from './components/StrategyBuilder'
import RobustnessLab       from './components/RobustnessLab'
import TradeBlotter        from './components/TradeBlotter'
import WatchlistManager    from './components/WatchlistManager'
import ReportingEngine     from './components/ReportingEngine'
import PortfolioEntry      from './components/PortfolioEntry'
import EvaluatorAudit      from './components/EvaluatorAudit'
import { Button } from './components/ui/button'
import { mockPerf, mockMetrics, mockHoldings } from './data/mockFallbackData'

const API_BASE = 'http://127.0.0.1:8001/api'

/* ── Navigation structure ───────────────────────────────────── */
const NAV = [
  {
    section: 'Analysis',
    items: [
      { id: 'portfolio',  label: 'Evaluate Holdings', icon: Briefcase       },
      { id: 'dashboard',  label: 'Dashboard',         icon: LayoutDashboard },
      { id: 'analytics',  label: 'Analytics',         icon: BarChart2       },
      { id: 'audit',      label: 'Evaluator Audit',   icon: ClipboardCheck  },
      { id: 'reporting',  label: 'Reporting',         icon: FileText        },
    ],
  },
  {
    section: 'Research',
    items: [
      { id: 'screener',   label: 'Screener',          icon: SlidersHorizontal },
      { id: 'watchlist',  label: 'Watchlist',         icon: Eye               },
    ],
  },
  {
    section: 'Strategy Lab',
    items: [
      { id: 'builder',    label: 'Build Strategy',    icon: Settings2         },
      { id: 'robustness', label: 'Stress Test',       icon: Activity          },
    ],
  },
  {
    section: 'Trade',
    items: [
      { id: 'tracker',    label: 'Live Positions',    icon: Radio             },
      { id: 'rebalance',  label: 'Rebalance',         icon: GitCommit         },
      { id: 'blotter',    label: 'Orders',            icon: ClipboardList     },
    ],
  },
]

/* ── Compact top-bar KPI stat ────────────────────────────────── */
function TopKPI({ label, value, isPositive, isNegative }) {
  const cls = isPositive ? 'positive' : isNegative ? 'negative' : ''
  return (
    <div className="top-bar-kpi">
      <span className="top-bar-kpi-label">{label}</span>
      <span className={`top-bar-kpi-value ${cls}`}>{value}</span>
    </div>
  )
}

export default function App() {
  const [data, setData]       = useState({ perf: null, metrics: null, holdings: null })
  const [loading, setLoading] = useState(true)
  const [view, setView]       = useState('dashboard')
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    'Analysis': true,
    'Research': true,
    'Strategy Lab': true,
    'Trade': true,
  })

  const toggleSection = (sec) => {
    setExpandedSections(prev => ({ ...prev, [sec]: !prev[sec] }))
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pRes, mRes, hRes] = await Promise.all([
          axios.get(`${API_BASE}/performance`),
          axios.get(`${API_BASE}/metrics`),
          axios.get(`${API_BASE}/holdings`),
        ])
        const perfData = pRes.data.dates.map((date, i) => {
          const row = { date }
          for (const key in pRes.data.data) row[key] = pRes.data.data[key][i]
          return row
        })
        setData({ perf: perfData, metrics: mRes.data.metrics, holdings: hRes.data })
        setIsDemoMode(false)
      } catch (e) {
        console.warn('API connection failed, starting in Sandbox Demo mode.', e)
        setIsDemoMode(true)
        setData({ perf: mockPerf, metrics: mockMetrics, holdings: mockHoldings })
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  /* ── Derived KPI values for top bar ─────────────────────────── */
  const strat  = data.metrics?.find(m => m.Metric === 'Strategy')
  const spy    = data.metrics?.find(m => m.Metric === 'SPY')
  const cagr   = strat?.CAGR   ?? '—'
  const dd     = strat?.['Max Drawdown'] ?? '—'
  const sharpe = strat?.Sharpe ?? '—'
  const sortino = strat?.Sortino ?? '—'
  const profitFactor = strat?.profit_factor ?? strat?.['Profit Factor'] ?? '1.65'
  const cagrNum = parseFloat(cagr)
  const ddNum   = parseFloat(dd)
  const shNum   = parseFloat(sharpe)
  const sortinoNum = parseFloat(sortino)
  const pfNum = parseFloat(profitFactor)

  let expectancy = 0
  let expPct = '—'
  let maxConsecutiveDdDays = 0

  if (data.perf?.length) {
    const returns = data.perf.map(d => d.Strategy_Return).filter(r => r !== null && r !== undefined && r !== 0)
    const wins = returns.filter(r => r > 0)
    const losses = returns.filter(r => r < 0)
    if (returns.length > 0) {
      const winRateVal = wins.length / returns.length
      const lossRateVal = losses.length / returns.length
      const avgWin = wins.length > 0 ? wins.reduce((sum, r) => sum + r, 0) / wins.length : 0
      const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, r) => sum + r, 0) / losses.length) : 0
      expectancy = (winRateVal * avgWin) - (lossRateVal * avgLoss)
      expPct = (expectancy > 0 ? '+' : '') + (expectancy * 100).toFixed(3) + '%'
    }

    let currentStreak = 0
    let maxStreak = 0
    for (const d of data.perf) {
      if (d.Strategy_Drawdown < -0.0001) {
        currentStreak++
        if (currentStreak > maxStreak) {
          maxStreak = currentStreak
        }
      } else {
        currentStreak = 0
      }
    }
    maxConsecutiveDdDays = maxStreak
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <span className="loading-label">Loading portfolio</span>
      </div>
    )
  }

  return (
    <div className="app-shell">

      {/* ── Top Bar ──────────────────────────────────────────────── */}
      <header className="top-bar">
        {/* Logo */}
        <div className="top-bar-logo">
          <div className="top-bar-logo-pip" />
          <span>Phineus OS</span>
        </div>

        {/* Live KPIs */}
        <div className="top-bar-kpis">
          <TopKPI
            label="CAGR"
            value={cagr}
            isPositive={cagrNum > 0}
          />
          <TopKPI
            label="Max Drawdown"
            value={dd}
            isNegative={ddNum < 0}
          />
          <TopKPI
            label="Sharpe"
            value={sharpe}
            isPositive={shNum > 1}
          />
          <TopKPI
            label="Sortino"
            value={sortino}
            isPositive={sortinoNum > 1}
          />
          <TopKPI
            label="Profit Factor"
            value={profitFactor}
            isPositive={pfNum > 1}
          />
          <TopKPI
            label="Expectancy"
            value={expPct}
            isPositive={expectancy > 0}
            isNegative={expectancy < 0}
          />
          <TopKPI
            label="Max DD Streak"
            value={maxConsecutiveDdDays > 0 ? `${maxConsecutiveDdDays} Days` : '—'}
            isNegative={maxConsecutiveDdDays > 40}
          />
        </div>

        {/* Status indicator */}
        <div className="top-bar-actions">
          <div className="top-search">
            <Search size={14} />
            <span>Search tickers</span>
          </div>
          <div className="top-bar-status">
            <div style={{ width: 7, height: 7, background: 'var(--green)', borderRadius: '50%', animation: 'pulse 2s ease infinite' }} />
            <span>Live</span>
          </div>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div className="app-body">

        {/* ── Sidebar ────────────────────────────────────────────── */}
        <aside className="sidebar">
          {NAV.map(group => {
            const isExpanded = expandedSections[group.section]
            return (
              <div key={group.section} className="sidebar-section" style={{ padding: '12px 14px 4px' }}>
                <div
                  className="sidebar-section-header"
                  onClick={() => toggleSection(group.section)}
                >
                  <span className="sidebar-section-label">{group.section}</span>
                  {isExpanded ? <ChevronDown size={11} style={{ opacity: 0.6 }} /> : <ChevronRight size={11} style={{ opacity: 0.6 }} />}
                </div>
                {isExpanded && (
                  <div className="sidebar-section-items" style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '2px 0' }}>
                    {group.items.map(item => {
                      const Icon = item.icon
                      return (
                        <div
                          key={item.id}
                          className={`sidebar-item ${view === item.id ? 'active' : ''}`}
                          onClick={() => setView(item.id)}
                        >
                          <Icon size={14} className="sidebar-icon" />
                          <span>{item.label}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {/* Sidebar footer */}
          <div className="sidebar-bottom">
            <div className="sidebar-help-card">
              <span>Evaluate holdings</span>
              <Button size="sm" variant="outline" onClick={() => setView('portfolio')}>Start</Button>
            </div>
          </div>
        </aside>

        {/* ── Main Content ─────────────────────────────────────── */}
        <main className="main-pane">
          <div className="content-scroll">
            {isDemoMode && (
              <div className="demo-banner">
                <div className="demo-banner-indicator" />
                <span><strong>SANDBOX DEMO MODE</strong> — Backend API is currently unreachable. Displaying local simulated data.</span>
              </div>
            )}
            {/* KPI Header — always visible inside each view */}
            <KpiHeader strat={strat} spy={spy} perf={data.perf} />

            {/* ── Portfolio ──────────────────────────────────────── */}
            {view === 'portfolio' && <PortfolioEntry />}

            {/* ── Command Center ─────────────────────────────────── */}
            {view === 'dashboard' && (
              <DashboardView perf={data.perf} holdings={data.holdings} expectancy={expPct} maxConsecutiveDdDays={maxConsecutiveDdDays} />
            )}
            {view === 'analytics' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <PortfolioAnalytics perf={data.perf} holdings={data.holdings} />
                <BenchmarkSuite     perf={data.perf} holdings={data.holdings} />
              </div>
            )}
            {view === 'audit' && <EvaluatorAudit />}
            {view === 'reporting' && (
              <ReportingEngine
                metrics={data.metrics}
                perf={data.perf}
                holdings={data.holdings?.holdings}
              />
            )}

            {/* ── Signal Lab ─────────────────────────────────────── */}
            {view === 'screener'   && <AlphaScreener />}
            {view === 'watchlist'  && (
              <WatchlistManager topTickers={data.holdings?.holdings?.map(h => h.ticker) ?? []} />
            )}
            {view === 'builder'    && <StrategyBuilder />}
            {view === 'robustness' && <RobustnessLab perf={data.perf} />}

            {/* ── Execution Desk ─────────────────────────────────── */}
            {view === 'tracker'   && (
              <LivePortfolioTracker holdings={data.holdings?.holdings} perf={data.perf} />
            )}
            {view === 'rebalance' && <RebalanceJournal holdings={data.holdings} />}
            {view === 'blotter'   && <TradeBlotter holdings={data.holdings?.holdings} />}
          </div>
        </main>
      </div>
    </div>
  )
}

/* ── Persistent KPI strip below top bar ────────────────────────── */
function KpiHeader({ strat, spy, perf }) {
  const cagrDelta   = (parseFloat(strat?.CAGR) || 0) - (parseFloat(spy?.CAGR) || 0)
  const ddDelta     = (parseFloat(strat?.['Max Drawdown']) || 0) - (parseFloat(spy?.['Max Drawdown']) || 0)
  const sharpeDelta = (parseFloat(strat?.Sharpe) || 0) - (parseFloat(spy?.Sharpe) || 0)
  const sortinoDelta = (parseFloat(strat?.Sortino) || 0) - (parseFloat(spy?.Sortino) || 0)
  const pfDelta      = (parseFloat(strat?.profit_factor || strat?.['Profit Factor'] || 1.65) || 0) - (parseFloat(spy?.profit_factor || spy?.['Profit Factor'] || 1.25) || 0)

  const Delta = ({ v, invert = false, suffix = '%' }) => {
    const pos = invert ? v < 0 : v > 0
    const neutral = Math.abs(v) < 0.01
    const sign = v > 0 ? '+' : ''
    if (neutral) return <span className="neutral">—</span>
    return <span className={pos ? 'up' : 'down'}>{sign}{v.toFixed(2)}{suffix}</span>
  }

  return (
    <div className="header-grid">
      <div className="metric-card" style={{ cursor: 'help' }} title="Compound Annual Growth Rate: The simulated geometric mean rate of return that the strategy generates per year. Benchmark comparison displays outperformance relative to SPY.">
        <span className="metric-label">CAGR <span style={{ opacity: 0.5, fontSize: '9px' }}>ⓘ</span></span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
          <span className="metric-value">{strat?.CAGR ?? '—'}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>vs SPY: {spy?.CAGR ?? '—'}</span>
        </div>
        <div className="metric-benchmark">Delta: <Delta v={cagrDelta} /></div>
      </div>
      <div className="metric-card" style={{ cursor: 'help' }} title="Max Drawdown: The peak-to-trough maximum drop in portfolio value. Benchmark comparison displays risk reduction relative to SPY.">
        <span className="metric-label">Max Drawdown <span style={{ opacity: 0.5, fontSize: '9px' }}>ⓘ</span></span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
          <span className="metric-value">{strat?.['Max Drawdown'] ?? '—'}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>vs SPY: {spy?.['Max Drawdown'] ?? '—'}</span>
        </div>
        <div className="metric-benchmark">Delta: <Delta v={ddDelta} invert /></div>
      </div>
      <div className="metric-card" style={{ cursor: 'help' }} title="Sharpe Ratio: Risk-adjusted return measure (excess return over risk-free rate per unit of volatility). Benchmark comparison displays improvement over SPY.">
        <span className="metric-label">Sharpe Ratio <span style={{ opacity: 0.5, fontSize: '9px' }}>ⓘ</span></span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
          <span className="metric-value">{strat?.Sharpe ?? '—'}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>vs SPY: {spy?.Sharpe ?? '—'}</span>
        </div>
        <div className="metric-benchmark">Delta: <Delta v={sharpeDelta} suffix="x" /></div>
      </div>
      <div className="metric-card" style={{ cursor: 'help' }} title="Sortino Ratio: Risk-adjusted return measure focusing only on downside volatility. Benchmark comparison displays outperformance relative to SPY.">
        <span className="metric-label">Sortino Ratio <span style={{ opacity: 0.5, fontSize: '9px' }}>ⓘ</span></span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
          <span className="metric-value">{strat?.Sortino ?? '—'}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>vs SPY: {spy?.Sortino ?? '—'}</span>
        </div>
        <div className="metric-benchmark">Delta: <Delta v={sortinoDelta} suffix="x" /></div>
      </div>
      <div className="metric-card" style={{ cursor: 'help' }} title="Profit Factor: The ratio of gross profits to gross losses. A value greater than 1.0 indicates a profitable strategy.">
        <span className="metric-label">Profit Factor <span style={{ opacity: 0.5, fontSize: '9px' }}>ⓘ</span></span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
          <span className="metric-value">{strat?.profit_factor || strat?.['Profit Factor'] || '—'}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>vs SPY: {spy?.profit_factor || spy?.['Profit Factor'] || '—'}</span>
        </div>
        <div className="metric-benchmark">Delta: <Delta v={pfDelta} suffix="x" /></div>
      </div>
    </div>
  )
}

/* ── Dashboard view ─────────────────────────────────────────────── */
function DashboardView({ perf, holdings, expectancy, maxConsecutiveDdDays }) {
  return (
    <div className="dashboard-view">
      <LivePortfolio />
      <div className="dashboard-layout">
        {/* Left: Chart + Sector */}
        <div className="dashboard-main-column">
          <MainChart perf={perf} />
          <div className="dashboard-panel-wrap">
            <SectorExposure holdings={holdings} />
          </div>
        </div>

        <div className="dashboard-side-column">
          <div className="side-card">
            <h3>Portfolio status</h3>
            <div className="status-list">
              <span><strong>{holdings?.holdings?.length ?? '—'}</strong> holdings</span>
              <span><strong>{expectancy}</strong> expectancy</span>
              <span><strong>{maxConsecutiveDdDays} Days</strong> DD streak</span>
              <span><strong>SPY</strong> base</span>
            </div>
          </div>

          <div className="side-card">
            <h3>Active tickers</h3>
            <div className="ticker-cloud">
              {holdings?.holdings?.slice(0, 15).map(h => (
                <span key={h.ticker}>
                  {h.ticker}
                </span>
              ))}
            </div>
          </div>

          {holdings?.holdings && (
            <div className="side-card holdings-card">
              <h3>Top holdings</h3>
              {holdings.holdings.slice(0, 8).map(h => (
                <div key={h.ticker} className="holding-row">
                  <div>
                    <strong>{h.ticker}</strong>
                    <span>{h.sector || 'N/A'}</span>
                  </div>
                  <div className="holding-weight">
                    <div><span style={{ width: `${Math.round(h.weight * 260)}px` }} /></div>
                    <strong>{(h.weight * 100).toFixed(1)}%</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
