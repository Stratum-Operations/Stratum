import { useEffect, useState } from 'react'
import axios from 'axios'
import {
  LayoutDashboard, BarChart2, FileText,
  SlidersHorizontal, Eye, Settings2, Activity,
  Radio, GitCommit, ClipboardList, Briefcase,
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
    section: 'Command Center',
    items: [
      { id: 'dashboard',  label: 'Dashboard',        icon: LayoutDashboard },
      { id: 'analytics',  label: 'Analytics',        icon: BarChart2       },
      { id: 'reporting',  label: 'Reporting',        icon: FileText        },
    ],
  },
  {
    section: 'Signal Lab',
    items: [
      { id: 'screener',   label: 'Alpha Screener',   icon: SlidersHorizontal },
      { id: 'watchlist',  label: 'Watchlist',        icon: Eye               },
      { id: 'builder',    label: 'Strategy Builder', icon: Settings2         },
      { id: 'robustness', label: 'Robustness Lab',   icon: Activity          },
    ],
  },
  {
    section: 'Execution Desk',
    items: [
      { id: 'tracker',    label: 'Live Tracker',     icon: Radio             },
      { id: 'rebalance',  label: 'Rebalance Journal',icon: GitCommit         },
      { id: 'blotter',    label: 'Trade Blotter',    icon: ClipboardList     },
    ],
  },
]

/* ── Compact top-bar KPI stat ────────────────────────────────── */
function TopKPI({ label, value, sub, isPositive, isNegative }) {
  const cls = isPositive ? 'positive' : isNegative ? 'negative' : ''
  return (
    <div className="top-bar-kpi">
      <span className="top-bar-kpi-label">{label}</span>
      <span className={`top-bar-kpi-value ${cls}`}>{value}</span>
      {sub && <span className="top-bar-kpi-sub">{sub}</span>}
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
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '9px',
          letterSpacing: '0.25em',
          color: 'var(--text-2)',
          textTransform: 'uppercase',
          fontWeight: 700,
        }}>
          Initializing Phineus OS...
        </span>
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
            sub={`SPY ${spy?.CAGR ?? '—'}`}
            isPositive={cagrNum > 0}
          />
          <TopKPI
            label="Max Drawdown"
            value={dd}
            sub={`SPY ${spy?.['Max Drawdown'] ?? '—'}`}
            isNegative={ddNum < 0}
          />
          <TopKPI
            label="Sharpe Ratio"
            value={sharpe}
            sub={`${data.perf?.length?.toLocaleString() ?? '—'} days`}
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
        <div className="top-bar-status">
          <div style={{ width: 7, height: 7, background: 'var(--green)', borderRadius: '50%', animation: 'pulse 2s ease infinite' }} />
          <span>API:8001 · LIVE</span>
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
            <div style={{
              fontSize: '8px',
              fontFamily: 'JetBrains Mono, monospace',
              color: 'var(--text-3)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              lineHeight: 1.8,
            }}>
              Phineus OS v7.0<br />
              QP Optimizer<br />
              {data.holdings?.holdings?.length ?? '—'} Active Positions
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
              <DashboardView perf={data.perf} holdings={data.holdings} />
            )}
            {view === 'analytics' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <PortfolioAnalytics perf={data.perf} holdings={data.holdings} />
                <BenchmarkSuite     perf={data.perf} holdings={data.holdings} />
              </div>
            )}
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
    return <span className={pos ? 'up' : 'down'}>{sign}{v.toFixed(2)}{suffix} vs SPY</span>
  }

  return (
    <div className="header-grid">
      <div className="metric-card">
        <span className="metric-label">CAGR — Strategy</span>
        <span className="metric-value">{strat?.CAGR ?? '—'}</span>
        <div className="metric-benchmark"><Delta v={cagrDelta} /></div>
        <div style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-2)' }}>
          SPY {spy?.CAGR ?? '—'}
        </div>
      </div>
      <div className="metric-card">
        <span className="metric-label">Max Drawdown</span>
        <span className="metric-value">{strat?.['Max Drawdown'] ?? '—'}</span>
        <div className="metric-benchmark"><Delta v={ddDelta} invert /></div>
        <div style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-2)' }}>
          SPY {spy?.['Max Drawdown'] ?? '—'}
        </div>
      </div>
      <div className="metric-card">
        <span className="metric-label">Sharpe Ratio</span>
        <span className="metric-value">{strat?.Sharpe ?? '—'}</span>
        <div className="metric-benchmark"><Delta v={sharpeDelta} suffix="x" /></div>
        <div style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-2)' }}>
          {perf?.length?.toLocaleString() ?? '—'} days · {winRate.toFixed(1)}% win rate
        </div>
      </div>
    </div>
  )
}

/* ── Dashboard view ─────────────────────────────────────────────── */
function DashboardView({ perf, holdings }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <LivePortfolio />
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: 0,
        borderTop: '1px solid var(--border-2)',
      }}>
        {/* Left: Chart + Sector */}
        <div style={{ borderRight: '1px solid var(--border-2)' }}>
          <MainChart perf={perf} />
          <div style={{ borderTop: '1px solid var(--border-2)' }}>
            <SectorExposure holdings={holdings} />
          </div>
        </div>

        {/* Right: System overview + positions */}
        <div style={{ background: 'var(--surface)' }}>
          {/* System overview */}
          <div style={{ padding: '24px', borderBottom: '1px solid var(--border-2)' }}>
            <div style={{
              fontSize: '9px', fontWeight: 800, letterSpacing: '0.2em',
              textTransform: 'uppercase', color: 'var(--text-3)',
              fontFamily: 'JetBrains Mono, monospace', marginBottom: '12px',
            }}>System Overview</div>
            <p style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.8 }}>
              Phineus OS quant engine is active. QP allocations are continuously re-optimized relative to sector bounds and S&P 500 drift metrics.
            </p>
          </div>

          {/* Active tickers */}
          <div style={{ padding: '20px' }}>
            <div style={{
              fontSize: '9px', fontWeight: 700, color: 'var(--text-3)',
              textTransform: 'uppercase', letterSpacing: '0.15em',
              fontFamily: 'JetBrains Mono, monospace', marginBottom: '12px',
            }}>
              Active Optimizer Tickers
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {holdings?.holdings?.slice(0, 15).map(h => (
                <span key={h.ticker} style={{
                  fontSize: '10px',
                  fontFamily: 'JetBrains Mono, monospace',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-2)',
                  padding: '4px 8px',
                  fontWeight: 700,
                  color: 'var(--text)',
                }}>
                  {h.ticker}
                </span>
              ))}
            </div>
          </div>

          {/* Top holdings mini-table */}
          {holdings?.holdings && (
            <div style={{ borderTop: '1px solid var(--border)' }}>
              <div style={{
                padding: '12px 20px 8px',
                fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em',
                textTransform: 'uppercase', color: 'var(--text-3)',
                fontFamily: 'JetBrains Mono, monospace',
                borderBottom: '1px solid var(--border)',
              }}>
                Top Holdings
              </div>
              {holdings.holdings.slice(0, 8).map(h => (
                <div key={h.ticker} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 20px',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'default',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--white)',
                      minWidth: '48px',
                    }}>{h.ticker}</span>
                    <span style={{
                      fontSize: '10px', color: 'var(--text-3)',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}>{h.sector || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      height: '3px',
                      width: `${Math.round(h.weight * 300)}px`,
                      background: 'var(--border-3)',
                      maxWidth: '60px',
                    }} />
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--text)',
                      minWidth: '42px',
                      textAlign: 'right',
                    }}>
                      {(h.weight * 100).toFixed(1)}%
                    </span>
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
