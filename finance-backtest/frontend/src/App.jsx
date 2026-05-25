import { useEffect, useState } from 'react'
import axios from 'axios'
import {
  LayoutDashboard, BarChart2,
  SlidersHorizontal, ClipboardList,
  ClipboardCheck, Moon, Sun, Sparkles, Search,
} from 'lucide-react'
import './App.css'
import AiAnalystDrawer from './components/AiAnalystDrawer'

import LivePortfolio  from './components/LivePortfolio'
import AlphaScreener  from './components/AlphaScreener'
import BacktestLab    from './components/BacktestLab'
import TradeBlotter   from './components/TradeBlotter'
import EvaluatorAudit from './components/EvaluatorAudit'
import { mockPerf, mockMetrics, mockHoldings } from './data/mockFallbackData'

const API_BASE = 'http://127.0.0.1:8001/api'

const NAV = [
  { id: 'command',  label: 'Command Center',   icon: LayoutDashboard  },
  { id: 'screener', label: 'Alpha Screener',    icon: SlidersHorizontal },
  { id: 'backtest', label: 'Backtest Lab',       icon: BarChart2         },
  { id: 'blotter',  label: 'Execution Blotter', icon: ClipboardList     },
  { id: 'audit',    label: 'Evaluator Audit',   icon: ClipboardCheck    },
]

export default function App() {
  const [data, setData]           = useState({ perf: null, metrics: null, holdings: null })
  const [loading, setLoading]     = useState(true)
  const [view, setView]           = useState('command')
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [theme, setTheme]         = useState(() => localStorage.getItem('stratum-theme') || 'light')
  const [chatOpen, setChatOpen]   = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('stratum-theme', theme)
  }, [theme])

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

  useEffect(() => {
    const handleToggleChat = (e) => setChatOpen(e.detail?.open ?? true)
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

  const strat = data.metrics?.find(m => m.Metric === 'Strategy')
  const spy   = data.metrics?.find(m => m.Metric === 'SPY')

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <span className="loading-label">Loading portfolio</span>
      </div>
    )
  }

  const rebalanceDate = data.holdings?.date

  return (
    <div className="app-shell">

      {/* ── Top Bar ──────────────────────────────────────────────── */}
      <header className="top-bar">
        <div className="top-bar-logo">
          <div className="top-bar-logo-pip" />
          <span>Stratum</span>
        </div>
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
          <div className="flex flex-col gap-0.5 p-[12px_8px]">
            {NAV.map(item => {
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

          {/* Sidebar footer */}
          <div className="sidebar-bottom flex flex-col gap-2">
            <span className="text-[10px] text-text-3 font-mono tracking-wider font-semibold">
              STRATUM V1.2.0
            </span>
            {rebalanceDate && (
              <span className="text-[10px] text-text-3 font-mono tracking-wider">
                [REBALANCE: {rebalanceDate}]
              </span>
            )}
            <span className={`text-[10px] font-mono tracking-wider font-semibold ${isDemoMode ? 'text-amber' : 'text-green'}`}>
              {isDemoMode ? '[SYS: DEMO]' : '[SYS: ONLINE]'}
            </span>
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
            {view === 'command'  && <LivePortfolio holdings={data.holdings} perf={data.perf} strat={strat} spy={spy} />}
            {view === 'screener' && <AlphaScreener />}
            {view === 'backtest' && <BacktestLab perf={data.perf} />}
            {view === 'blotter'  && <TradeBlotter holdings={data.holdings?.holdings} />}
            {view === 'audit'    && <EvaluatorAudit />}
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
