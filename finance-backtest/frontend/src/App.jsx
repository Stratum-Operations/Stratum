import { useEffect, useState } from 'react'
import axios from 'axios'
import {
  LayoutDashboard, BarChart2, FileText,
  SlidersHorizontal, Eye, Settings2, Activity,
  Radio, GitCommit, ClipboardList, Briefcase,
  Search, ClipboardCheck, ChevronDown, ChevronRight,
  Moon, Sun, Sparkles,
} from 'lucide-react'
import './App.css'
import AiAnalystDrawer from './components/AiAnalystDrawer'

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
import { mockPerf, mockMetrics, mockHoldings } from './data/mockFallbackData'

const API_BASE = 'http://127.0.0.1:8001/api'

/* ── Navigation structure ───────────────────────────────────── */
const NAV = [
  {
    section: 'Analysis',
    items: [
      { id: 'portfolio',  label: 'Evaluate Holdings', icon: Briefcase       },
      { id: 'dashboard',  label: 'Dashboard',         icon: LayoutDashboard },
<<<<<<< Updated upstream
      { id: 'analytics',  label: 'Advanced Analytics',icon: BarChart2       },
=======
      { id: 'analytics',  label: 'Analytics',         icon: BarChart2       },
      { id: 'copilot',    label: 'AI Copilot',        icon: Sparkles        },
>>>>>>> Stashed changes
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



export default function App() {
  const [data, setData]       = useState({ perf: null, metrics: null, holdings: null })
  const [loading, setLoading] = useState(true)
  const [view, setView]       = useState('dashboard')
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [theme, setTheme]     = useState(() => localStorage.getItem('phineus-theme') || 'light')
  const [chatOpen, setChatOpen] = useState(false)
  const [portfolioRows, setPortfolioRows] = useState([])
  const [portfolioResult, setPortfolioResult] = useState(null)
  const [expandedSections, setExpandedSections] = useState({
    'Analysis': true,
    'Research': true,
    'Strategy Lab': true,
    'Trade': true,
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('phineus-theme', theme)
  }, [theme])

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
        if (hRes.data?.holdings) {
          setPortfolioRows(hRes.data.holdings.map((h, i) => ({
            id: i + 1,
            ticker: h.ticker,
            shares: String(h.shares),
            cost_basis: h.cost_basis != null ? String(h.cost_basis) : ''
          })))
          setPortfolioResult({
            total_value: hRes.data.total_value,
            positions: hRes.data.holdings,
            health: hRes.data.health,
            risk_radar: hRes.data.risk_radar,
            defense: hRes.data.defense
          })
        }
        setIsDemoMode(false)
      } catch (e) {
        console.warn('API connection failed, starting in Sandbox Demo mode.', e)
        setIsDemoMode(true)
        setData({ perf: mockPerf, metrics: mockMetrics, holdings: mockHoldings })
        if (mockHoldings?.holdings) {
          setPortfolioRows(mockHoldings.holdings.map((h, i) => ({
            id: i + 1,
            ticker: h.ticker,
            shares: String(h.shares),
            cost_basis: h.cost_basis != null ? String(h.cost_basis) : ''
          })))
          setPortfolioResult({
            total_value: mockHoldings.total_value,
            positions: mockHoldings.holdings,
            health: mockHoldings.health,
            risk_radar: mockHoldings.risk_radar,
            defense: mockHoldings.defense
          })
        }
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  useEffect(() => {
    const handleToggleChat = (e) => {
      setChatOpen(e.detail?.open ?? true)
    }
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setChatOpen(open => !open)
      }
    }
    window.addEventListener('toggle-ai-chat', handleToggleChat)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('toggle-ai-chat', handleToggleChat)
      window.removeEventListener('keydown', handleKeyDown)
    }
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
    let stratMax = 0
    for (const d of data.perf) {
      let drawdown = d.Strategy_Drawdown
      if (drawdown === undefined || drawdown === null) {
        const equity = d.Strategy_Equity ?? 0
        if (equity > stratMax) stratMax = equity
        drawdown = stratMax > 0 ? (equity / stratMax) - 1 : 0
      }
      if (drawdown < -0.0001) {
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



        {/* Status indicator */}
        <div className="top-bar-actions">
          <div className="top-search">
            <Search size={14} />
            <span>Search tickers</span>
          </div>
          <button
            className={`top-icon-button transition-colors duration-150 ${
              chatOpen ? 'active text-green border-green' : ''
            }`}
            onClick={() => setChatOpen(!chatOpen)}
            title="AI Analyst Copilot (⌘K)"
          >
            <Sparkles size={15} />
          </button>
          <button
            className="top-icon-button"
            onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
          </button>
          <div className="top-bar-status">
            <div className="w-1.5 h-1.5 bg-green rounded-full animate-pulse" />
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
              <div key={group.section} className="sidebar-section p-[12px_14px_4px]">
                <div
                  className="sidebar-section-header"
                  onClick={() => toggleSection(group.section)}
                >
                  <span className="sidebar-section-label">{group.section}</span>
                  {isExpanded ? <ChevronDown size={11} className="opacity-60" /> : <ChevronRight size={11} className="opacity-60" />}
                </div>
                {isExpanded && (
                  <div className="sidebar-section-items flex flex-col gap-0.5 p-[2px_0]">
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

<<<<<<< Updated upstream

=======
          {/* Sidebar footer */}
          <div className="sidebar-bottom flex justify-between items-center p-[16px_20px]">
            <span className="text-[10px] text-text-3 font-mono tracking-wider font-semibold">
              PHINEUS OS V1.2.0
            </span>
          </div>
>>>>>>> Stashed changes
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
            {/* ── Portfolio ──────────────────────────────────────── */}
            {view === 'portfolio' && (
              <PortfolioEntry
                rows={portfolioRows}
                setRows={setPortfolioRows}
                result={portfolioResult}
                setResult={setPortfolioResult}
                onApplyPortfolio={(manualResult) => {
                  setData(d => ({
                    ...d,
                    holdings: {
                      ...manualResult,
                      holdings: manualResult.positions
                    }
                  }))
                }}
              />
            )}

            {/* ── Command Center ─────────────────────────────────── */}
            {view === 'dashboard' && (
              <DashboardView perf={data.perf} holdings={data.holdings} expectancy={expPct} maxConsecutiveDdDays={maxConsecutiveDdDays} strat={strat} spy={spy} />
            )}
            {view === 'analytics' && (
<<<<<<< Updated upstream
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <PortfolioAnalytics
                  perf={data.perf}
                  holdings={data.holdings}
                  strat={strat}
                  spy={spy}
                  expectancy={expPct}
                  maxConsecutiveDdDays={maxConsecutiveDdDays}
                />
=======
              <div className="flex flex-col gap-0">
                <PortfolioAnalytics perf={data.perf} holdings={data.holdings} />
>>>>>>> Stashed changes
                <BenchmarkSuite     perf={data.perf} holdings={data.holdings} />
              </div>
            )}
            {view === 'audit' && <EvaluatorAudit />}
            {view === 'copilot' && (
              <AiAnalystDrawer
                isOpen={true}
                mode="immersive"
                portfolioContext={{
                  currentView: view,
                  holdings: data.holdings?.holdings || [],
                  metrics: data.metrics || {},
                  strategyKPIs: strat || {},
                  benchmarkKPIs: spy || {},
                  performanceHistory: data.perf || [],
                }}
              />
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

        {/* Global AI Copilot Drawer */}
        <AiAnalystDrawer
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          mode="drawer"
          portfolioContext={{
            currentView: view,
            holdings: data.holdings?.holdings || [],
            metrics: data.metrics || {},
            strategyKPIs: strat || {},
            benchmarkKPIs: spy || {},
            performanceHistory: data.perf || [],
          }}
        />
      </div>
    </div>
  )
}

/* ── Strategic Diagnostics Panel ────────────────────────────────── */
function StrategicDiagnostics({ strat, spy, holdings, expectancy, maxConsecutiveDdDays }) {
  const activeHoldings = (holdings?.holdings ?? []).filter(h => Number(h.weight) > 0)
  const sectorCount = new Set(activeHoldings.map(h => h.sector).filter(Boolean)).size

  const cagr = parseFloat(strat?.CAGR) || 0
  const spyCagr = parseFloat(spy?.CAGR) || 0
  const dd = Math.abs(parseFloat(strat?.['Max Drawdown']) || 0)
  const spyDd = Math.abs(parseFloat(spy?.['Max Drawdown']) || 0)
  const sharpe = parseFloat(strat?.Sharpe) || 0
  const spySharpe = parseFloat(spy?.Sharpe) || 0
  const sortino = parseFloat(strat?.Sortino) || 0

  const insights = []

  // 1. Recovery profile
  if (maxConsecutiveDdDays > 180) {
    insights.push({
      type: 'warning',
      title: 'Extended Recovery Profile',
      text: `Peak drawdown recovery takes ${maxConsecutiveDdDays} days. This points to a slow mean-reversion process. Consider adding uncorrelated assets to shorten recovery cycles.`
    })
  } else if (maxConsecutiveDdDays > 0) {
    insights.push({
      type: 'success',
      title: 'Efficient Recovery Cycle',
      text: `Portfolio rebounds in under ${maxConsecutiveDdDays} days. Reversion profile shows resilient recovery.`
    })
  }

  // 2. Diversification
  if (activeHoldings.length > 0 && sectorCount <= 2) {
    insights.push({
      type: 'caution',
      title: 'High Sector Concentration',
      text: `Assets clustered in only ${sectorCount} sector${sectorCount > 1 ? 's' : ''}. High risk of sector-specific shocks. Consider broader sector diversification.`
    })
  } else if (activeHoldings.length > 12) {
    insights.push({
      type: 'info',
      title: 'Broad Asset Diversification',
      text: `Allocated across ${activeHoldings.length} assets, reducing idiosyncratic risk. Monitor for potential alpha dilution.`
    })
  }

  // 3. Performance vs SPY
  if (cagr > spyCagr && sharpe > spySharpe) {
    insights.push({
      type: 'success',
      title: 'Benchmark Outperformance',
      text: `Strategy CAGR (${cagr.toFixed(2)}%) and Sharpe (${sharpe.toFixed(2)}) beat S&P 500 (${spyCagr.toFixed(2)}% / ${spySharpe.toFixed(2)}). Risk-adjusted return is highly efficient.`
    })
  } else if (cagr > 0 && cagr < spyCagr) {
    insights.push({
      type: 'warning',
      title: 'Lagging Market Return',
      text: `CAGR of ${cagr.toFixed(2)}% lags the benchmark S&P 500 (${spyCagr.toFixed(2)}%). Assess if the current factor tilt justifies the performance gap.`
    })
  }

  // 4. Downside safety
  if (sortino > 1.5) {
    insights.push({
      type: 'success',
      title: 'Strong Downside Protection',
      text: `Sortino of ${sortino.toFixed(2)} reflects high reward relative to downside risk. Downside volatility is well-mitigated.`
    })
  } else if (dd > 25) {
    insights.push({
      type: 'caution',
      title: 'Heavy Drawdown Vulnerability',
      text: `Peak drawdown of -${dd.toFixed(2)}% is elevated. Consider tail hedging or dynamic scaling to protect capital.`
    })
  }

  if (insights.length === 0) {
    insights.push({
      type: 'info',
      title: 'Baseline Performance',
      text: 'Performance metrics are aligned with benchmark expectations. No abnormal factor risks detected.'
    })
  }

  return (
<<<<<<< Updated upstream
    <div className="side-card diagnostics-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 800, color: 'var(--text-strong)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Strategic Diagnostics & Insights
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
        {insights.map((ins, i) => {
          const typeColors = {
            success: { bg: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.15)', text: 'var(--green)', dotBg: 'var(--green)' },
            warning: { bg: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.15)', text: 'var(--red)', dotBg: 'var(--red)' },
            caution: { bg: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.15)', text: 'var(--amber)', dotBg: 'var(--amber)' },
            info: { bg: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.15)', text: 'var(--blue)', dotBg: 'var(--blue)' }
          }
          const theme = typeColors[ins.type] || typeColors.info

          return (
            <div key={i} style={{
              background: theme.bg,
              border: theme.border,
              borderRadius: '8px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: theme.text, fontSize: '12px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: theme.dotBg }} />
                {ins.title}
              </div>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-2)', lineHeight: '1.45' }}>
                {ins.text}
              </p>
            </div>
          )
        })}
=======
    <div className="header-grid">
      <div className="metric-card cursor-help" title="Compound Annual Growth Rate: The simulated geometric mean rate of return that the strategy generates per year. Benchmark comparison displays outperformance relative to SPY.">
        <span className="metric-label">CAGR <span className="opacity-50 text-[9px]">ⓘ</span></span>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="metric-value">{strat?.CAGR ?? '—'}</span>
          <span className="text-[11px] text-text-strong font-mono font-semibold">vs SPY: {spy?.CAGR ?? '—'}</span>
        </div>
        <div className="metric-benchmark">Delta: <Delta v={cagrDelta} /></div>
      </div>
      <div className="metric-card cursor-help" title="Max Drawdown: The peak-to-trough maximum drop in portfolio value. Benchmark comparison displays risk reduction relative to SPY.">
        <span className="metric-label">Max Drawdown <span className="opacity-50 text-[9px]">ⓘ</span></span>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="metric-value">{strat?.['Max Drawdown'] ?? '—'}</span>
          <span className="text-[11px] text-text-strong font-mono font-semibold">vs SPY: {spy?.['Max Drawdown'] ?? '—'}</span>
        </div>
        <div className="metric-benchmark">Delta: <Delta v={ddDelta} invert /></div>
      </div>
      <div className="metric-card cursor-help" title="Sharpe Ratio: Risk-adjusted return measure (excess return over risk-free rate per unit of volatility). Benchmark comparison displays improvement over SPY.">
        <span className="metric-label">Sharpe Ratio <span className="opacity-50 text-[9px]">ⓘ</span></span>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="metric-value">{strat?.Sharpe ?? '—'}</span>
          <span className="text-[11px] text-text-strong font-mono font-semibold">vs SPY: {spy?.Sharpe ?? '—'}</span>
        </div>
        <div className="metric-benchmark">Delta: <Delta v={sharpeDelta} suffix="x" /></div>
      </div>
      <div className="metric-card cursor-help" title="Sortino Ratio: Risk-adjusted return measure focusing only on downside volatility. Benchmark comparison displays outperformance relative to SPY.">
        <span className="metric-label">Sortino Ratio <span className="opacity-50 text-[9px]">ⓘ</span></span>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="metric-value">{strat?.Sortino ?? '—'}</span>
          <span className="text-[11px] text-text-strong font-mono font-semibold">vs SPY: {spy?.Sortino ?? '—'}</span>
        </div>
        <div className="metric-benchmark">Delta: <Delta v={sortinoDelta} suffix="x" /></div>
      </div>
      <div className="metric-card cursor-help" title="Profit Factor: The ratio of gross profits to gross losses. A value greater than 1.0 indicates a profitable strategy.">
        <span className="metric-label">Profit Factor <span className="opacity-50 text-[9px]">ⓘ</span></span>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="metric-value">{strat?.profit_factor || strat?.['Profit Factor'] || '—'}</span>
          <span className="text-[11px] text-text-strong font-mono font-semibold">vs SPY: {spy?.profit_factor || spy?.['Profit Factor'] || '—'}</span>
        </div>
        <div className="metric-benchmark">Delta: <Delta v={pfDelta} suffix="x" /></div>
>>>>>>> Stashed changes
      </div>
    </div>
  )
}

/* ── Dashboard view ─────────────────────────────────────────────── */
function DashboardView({ perf, holdings, expectancy, maxConsecutiveDdDays, strat, spy }) {
  const activeHoldings = (holdings?.holdings ?? []).filter(h => Number(h.weight) > 0)
  const sortedTopHoldings = [...activeHoldings].sort((a, b) => (b.weight || 0) - (a.weight || 0)).slice(0, 8)

  return (
    <div className="dashboard-view">
      <LivePortfolio strat={strat} spy={spy} />
      <div className="dashboard-layout">
        {/* Left: Chart + Sector + Strategic Insights */}
        <div className="dashboard-main-column">
          <MainChart perf={perf} />
          <div className="dashboard-panel-wrap">
            <SectorExposure holdings={holdings} />
          </div>
          <StrategicDiagnostics
            strat={strat}
            spy={spy}
            holdings={holdings}
            expectancy={expectancy}
            maxConsecutiveDdDays={maxConsecutiveDdDays}
          />
        </div>

        <div className="dashboard-side-column">
          <div className="side-card">
            <h3>Portfolio Status</h3>
            <div className="status-list">
              <span><strong>{activeHoldings.length}</strong> active assets</span>
              <span><strong>{strat?.CAGR ?? '—'}</strong> CAGR</span>
              <span><strong>{strat?.['Max Drawdown'] ?? '—'}</strong> Max Drawdown</span>
              <span><strong>SPY</strong> benchmark</span>
            </div>
          </div>

          <div className="side-card">
            <h3>Active tickers</h3>
            <div className="ticker-cloud">
              {activeHoldings.slice(0, 15).map(h => (
                <span key={h.ticker}>
                  {h.ticker}
                </span>
              ))}
            </div>
          </div>

          {sortedTopHoldings.length > 0 && (
            <div className="side-card holdings-card">
              <h3>Top holdings</h3>
              {sortedTopHoldings.map(h => (
                <div key={h.ticker} className="holding-row">
                  <div>
                    <strong>{h.ticker}</strong>
                    <span>{h.sector || 'N/A'}</span>
                  </div>
                  <div className="holding-weight">
                    <div>
                      <span 
                        style={{ width: `${Math.round(h.weight * 260)}px` }} 
                        className="bg-border-3 h-full block" 
                      />
                    </div>
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
