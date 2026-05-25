import { useEffect, useState, useMemo } from 'react'
import axios from 'axios'
import {
  LayoutDashboard, BarChart2,
  SlidersHorizontal, ClipboardList,
  ClipboardCheck, Bot, Search, Settings, Upload,
} from 'lucide-react'
import './App.css'
import AiAnalystDrawer from './components/AiAnalystDrawer'

import LivePortfolio  from './components/LivePortfolio'
import AlphaScreener  from './components/AlphaScreener'
import BacktestLab    from './components/BacktestLab'
import TradeBlotter   from './components/TradeBlotter'
import EvaluatorAudit from './components/EvaluatorAudit'
import { mockPerf, mockMetrics, mockHoldings } from './data/mockFallbackData'
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler'
import { SuggestiveSearch } from '@/components/ui/suggestive-search'
import StockDetail from './components/StockDetail'
import SettingsTab from './components/SettingsTab'
import PortfolioImportModal from './components/PortfolioImportModal'

const API_BASE = '/api'

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
  const [selectedHolding, setSelectedHolding] = useState(null)
  const [username, setUsername]   = useState(() => localStorage.getItem('stratum-username') || 'Joshua')
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().substring(0, 10))
  const [isRefreshingHoldings, setIsRefreshingHoldings] = useState(false)

  const handleDateChange = async (dateStr) => {
    setSelectedDate(dateStr)
    const isManual = data.holdings?.data_quality_manifest !== undefined
    const posList = data.holdings?.positions
    
    if (isManual && posList?.length) {
      setIsRefreshingHoldings(true)
      try {
        const payload = {
          positions: posList.map(p => ({
            ticker: p.ticker,
            shares: p.shares,
            cost_basis: p.cost_basis
          }))
        }
        const response = await axios.post(`/api/portfolio/manual?date=${dateStr}`, payload)
        setData(prev => ({
          ...prev,
          holdings: response.data
        }))
      } catch (err) {
        console.error("Failed to reload manual portfolio for date:", err)
      } finally {
        setIsRefreshingHoldings(false)
      }
    }
  }

  useEffect(() => {
    localStorage.setItem('stratum-username', username)
  }, [username])

  const searchItems = useMemo(() => {
    const active = data.holdings?.holdings || []
    const fallbacks = mockHoldings?.holdings || []
    const combined = [...active, ...fallbacks]
    const seen = new Set()
    return combined.filter(h => {
      if (!h?.ticker || seen.has(h.ticker)) return false
      seen.add(h.ticker)
      return true
    })
  }, [data.holdings])

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
      if (e.key === 'Escape') {
        setSelectedHolding(null)
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
          <SuggestiveSearch
            suggestions={[
              "Search AAPL, MSFT, NVDA...",
              "Search AVGO, PDD, INTC...",
              "Search tickers..."
            ]}
            searchItems={searchItems}
            onSelect={(holding) => setSelectedHolding(holding)}
            className="top-search"
          />
          <button
            className="font-mono text-[10px] uppercase tracking-wider border border-border px-3 py-1.5 bg-surface-2 hover:bg-surface transition-colors cursor-pointer flex items-center gap-1.5 h-[30px]"
            style={{ borderRadius: 'var(--radius, 0.625rem)' }}
            onClick={() => setImportModalOpen(true)}
            title="Import Brokerage CSV"
          >
            <Upload size={13} />
            <span>Import CSV</span>
          </button>
          <button
            className={`top-icon-button transition-colors duration-150 ${
              chatOpen ? 'active text-green border-green' : ''
            }`}
            onClick={() => setChatOpen(!chatOpen)}
            title="AI Analyst Copilot (⌘K)"
          >
            <Bot size={15} />
          </button>
          <AnimatedThemeToggler theme={theme} onThemeChange={setTheme} />
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
            <div 
              className={`sidebar-item flex items-center gap-2 cursor-pointer ${view === 'settings' ? 'active' : ''}`}
              onClick={() => setView('settings')}
              title="Settings"
            >
              <Settings size={14} className="sidebar-icon" />
              <span>Settings</span>
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
            {view === 'command'  && (
              <LivePortfolio 
                holdings={data.holdings} 
                perf={data.perf} 
                strat={strat} 
                spy={spy} 
                selectedDate={selectedDate}
                onDateChange={handleDateChange}
                loading={isRefreshingHoldings}
              />
            )}
            {view === 'screener' && <AlphaScreener />}
            {view === 'backtest' && <BacktestLab perf={data.perf} />}
            {view === 'blotter'  && <TradeBlotter holdings={data.holdings?.holdings} />}
            {view === 'audit'    && <EvaluatorAudit />}
            {view === 'settings' && (
              <SettingsTab 
                username={username} 
                setUsername={setUsername} 
                setView={setView}
                setData={setData}
              />
            )}
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

      {/* Stock Detail Modal */}
      {selectedHolding && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedHolding(null)}
        >
          <div 
            className="relative w-full max-w-5xl max-h-[85vh] overflow-y-auto bg-surface border border-border p-6 shadow-2xl"
            style={{ borderRadius: "var(--radius, 0.625rem)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="absolute top-4 right-4 font-mono text-[10px] uppercase tracking-wider border border-border px-2.5 py-1 bg-surface-2 hover:bg-surface cursor-pointer text-text-strong transition-colors"
              style={{ borderRadius: "var(--radius, 0.625rem)" }}
              onClick={() => setSelectedHolding(null)}
            >
              Close [ESC]
            </button>
            <StockDetail holding={selectedHolding} />
          </div>
        </div>
      )}

      {/* Portfolio CSV Ingestion Modal */}
      <PortfolioImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImportSuccess={(manualHoldingsData) => {
          setData(prev => ({
            ...prev,
            holdings: manualHoldingsData
          }));
        }}
      />
    </div>
  )
}
