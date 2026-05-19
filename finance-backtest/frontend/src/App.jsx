import { useEffect, useState } from 'react'
import axios from 'axios'
import {
  LayoutDashboard, BarChart2, FileText,
  SlidersHorizontal, Eye, Settings2, Activity,
  Radio, GitCommit, ClipboardList, Briefcase,
  Search, ClipboardCheck,
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

const API_BASE = 'http://127.0.0.1:8001/api'

/* ── Navigation structure ───────────────────────────────────── */
const NAV = [
  {
    section: 'Portfolio',
    items: [
      { id: 'portfolio',  label: 'My Portfolio',     icon: Briefcase       },
    ],
  },
  {
    section: 'Analyze',
    items: [
      { id: 'dashboard',  label: 'Dashboard',        icon: LayoutDashboard },
      { id: 'analytics',  label: 'Analytics',        icon: BarChart2       },
      { id: 'audit',      label: 'Evaluator Audit',  icon: ClipboardCheck  },
      { id: 'reporting',  label: 'Reporting',        icon: FileText        },
    ],
  },
  {
    section: 'Research',
    items: [
      { id: 'screener',   label: 'Screener',         icon: SlidersHorizontal },
      { id: 'watchlist',  label: 'Watchlist',        icon: Eye               },
      { id: 'builder',    label: 'Build Strategy',   icon: Settings2         },
      { id: 'robustness', label: 'Stress Test',      icon: Activity          },
    ],
  },
  {
    section: 'Trade',
    items: [
      { id: 'tracker',    label: 'Live Positions',   icon: Radio             },
      { id: 'rebalance',  label: 'Rebalance',        icon: GitCommit         },
      { id: 'blotter',    label: 'Orders',           icon: ClipboardList     },
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
      } catch (e) {
        console.error(e)
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
  const cagrNum = parseFloat(cagr)
  const ddNum   = parseFloat(dd)
  const shNum   = parseFloat(sharpe)

  let winRate = 0
  if (data.perf?.length) {
    winRate = (data.perf.filter(d => d.Strategy_Return > 0).length / data.perf.length * 100)
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
            label="Sharpe Ratio"
            value={sharpe}
            isPositive={shNum > 1}
          />
          <TopKPI
            label="Win Rate"
            value={winRate > 0 ? `${winRate.toFixed(1)}%` : '—'}
            isPositive={winRate > 50}
            isNegative={winRate > 0 && winRate < 50}
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
          {NAV.map(group => (
            <div key={group.section} className="sidebar-section">
              <span className="sidebar-section-label">{group.section}</span>
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
          ))}

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
            {/* KPI Header — always visible inside each view */}
            <KpiHeader strat={strat} spy={spy} winRate={winRate} perf={data.perf} />

            {/* ── Portfolio ──────────────────────────────────────── */}
            {view === 'portfolio' && <PortfolioEntry />}

            {/* ── Command Center ─────────────────────────────────── */}
            {view === 'dashboard' && (
              <DashboardView perf={data.perf} holdings={data.holdings} winRate={winRate} />
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
function KpiHeader({ strat, spy, winRate, perf }) {
  const cagrDelta   = (parseFloat(strat?.CAGR) || 0) - (parseFloat(spy?.CAGR) || 0)
  const ddDelta     = (parseFloat(strat?.['Max Drawdown']) || 0) - (parseFloat(spy?.['Max Drawdown']) || 0)
  const sharpeDelta = (parseFloat(strat?.Sharpe) || 0) - (parseFloat(spy?.Sharpe) || 0)

  const Delta = ({ v, invert = false, suffix = '%' }) => {
    const pos = invert ? v < 0 : v > 0
    const neutral = Math.abs(v) < 0.01
    const sign = v > 0 ? '+' : ''
    if (neutral) return <span className="neutral">—</span>
    return <span className={pos ? 'up' : 'down'}>{sign}{v.toFixed(2)}{suffix}</span>
  }

  return (
    <div className="header-grid">
      <div className="metric-card">
        <span className="metric-label">CAGR</span>
        <span className="metric-value">{strat?.CAGR ?? '—'}</span>
        <div className="metric-benchmark"><Delta v={cagrDelta} /></div>
      </div>
      <div className="metric-card">
        <span className="metric-label">Max Drawdown</span>
        <span className="metric-value">{strat?.['Max Drawdown'] ?? '—'}</span>
        <div className="metric-benchmark"><Delta v={ddDelta} invert /></div>
      </div>
      <div className="metric-card">
        <span className="metric-label">Sharpe Ratio</span>
        <span className="metric-value">{strat?.Sharpe ?? '—'}</span>
        <div className="metric-benchmark"><Delta v={sharpeDelta} suffix="x" /></div>
      </div>
    </div>
  )
}

/* ── Dashboard view ─────────────────────────────────────────────── */
function DashboardView({ perf, holdings, winRate }) {
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
              <span><strong>{winRate.toFixed(0)}%</strong> win rate</span>
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
