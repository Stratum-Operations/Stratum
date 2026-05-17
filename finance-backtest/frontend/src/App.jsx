import { useEffect, useState } from 'react'
import axios from 'axios'
import './App.css'

import Header              from './components/Header'
import MainChart           from './components/MainChart'
import LivePortfolio       from './components/LivePortfolio'
import SectorExposure      from './components/SectorExposure'
import AlphaScreener        from './components/AlphaScreener'
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

const API_BASE = 'http://127.0.0.1:8001/api'

function App() {
  const [data, setData]                       = useState({ perf: null, metrics: null, holdings: null })
  const [loading, setLoading]                 = useState(true)
  const [selectedHolding, setSelectedHolding] = useState(null)
  const [activeTab, setActiveTab]             = useState('overview') // 'overview' | 'signals' | 'execution'

  // Persistent inner sub-tab state transitions
  const [ccSubTab, setCcSubTab]               = useState('dashboard') // 'dashboard' | 'analytics' | 'reporting'
  const [signalsSubTab, setSignalsSubTab]     = useState('screener') // 'screener' | 'watchlist' | 'builder' | 'robustness'
  const [executionSubTab, setExecutionSubTab] = useState('tracker') // 'tracker' | 'rebalance' | 'blotter'

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
        setLoading(false)
      } catch (e) {
        console.error(e)
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#ffffff', flexDirection: 'column', gap: '24px',
      }}>
        <div className="spinner" />
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '10px',
          letterSpacing: '0.2em',
          color: '#000000',
          textTransform: 'uppercase',
          fontWeight: 700,
        }}>
          Loading Phineus OS...
        </span>
      </div>
    )
  }

  return (
    <div className="dashboard-layout">

      {/* ── Stark Minimalist Top Navigation ─────────────────────── */}
      <header className="top-nav">
        <div className="top-nav-logo">
          <div className="top-nav-logo-dot" />
          <span>Phineus OS</span>
        </div>

        <div className="top-nav-tabs">
          <div 
            className={`top-nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Command Center
          </div>
          <div 
            className={`top-nav-tab ${activeTab === 'signals' ? 'active' : ''}`}
            onClick={() => setActiveTab('signals')}
          >
            Signals
          </div>
          <div 
            className={`top-nav-tab ${activeTab === 'execution' ? 'active' : ''}`}
            onClick={() => setActiveTab('execution')}
          >
            Execution
          </div>
        </div>

        <div style={{
          fontSize: '9px',
          fontFamily: 'JetBrains Mono, monospace',
          color: '#000000',
          letterSpacing: '0.08em',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <div style={{ width: '6px', height: '6px', background: '#000000', borderRadius: '0' }} />
          SYSTEM LIVE · API:8001
        </div>
      </header>

      {/* ── Sub Navigation Controls ────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="sub-nav-bar">
          <button className={`sub-nav-btn ${ccSubTab === 'dashboard' ? 'active' : ''}`} onClick={() => setCcSubTab('dashboard')}>
            Dashboard Overview
          </button>
          <button className={`sub-nav-btn ${ccSubTab === 'analytics' ? 'active' : ''}`} onClick={() => setCcSubTab('analytics')}>
            Analytics & Benchmarks
          </button>
          <button className={`sub-nav-btn ${ccSubTab === 'reporting' ? 'active' : ''}`} onClick={() => setCcSubTab('reporting')}>
            Reporting Engine
          </button>
        </div>
      )}

      {activeTab === 'signals' && (
        <div className="sub-nav-bar">
          <button className={`sub-nav-btn ${signalsSubTab === 'screener' ? 'active' : ''}`} onClick={() => setSignalsSubTab('screener')}>
            Alpha Screener
          </button>
          <button className={`sub-nav-btn ${signalsSubTab === 'watchlist' ? 'active' : ''}`} onClick={() => setSignalsSubTab('watchlist')}>
            Watchlist Manager
          </button>
          <button className={`sub-nav-btn ${signalsSubTab === 'builder' ? 'active' : ''}`} onClick={() => setSignalsSubTab('builder')}>
            Strategy Builder
          </button>
          <button className={`sub-nav-btn ${signalsSubTab === 'robustness' ? 'active' : ''}`} onClick={() => setSignalsSubTab('robustness')}>
            Robustness Lab
          </button>
        </div>
      )}

      {activeTab === 'execution' && (
        <div className="sub-nav-bar">
          <button className={`sub-nav-btn ${executionSubTab === 'tracker' ? 'active' : ''}`} onClick={() => setExecutionSubTab('tracker')}>
            Live Tracker
          </button>
          <button className={`sub-nav-btn ${executionSubTab === 'rebalance' ? 'active' : ''}`} onClick={() => setExecutionSubTab('rebalance')}>
            Rebalance Journal
          </button>
          <button className={`sub-nav-btn ${executionSubTab === 'blotter' ? 'active' : ''}`} onClick={() => setExecutionSubTab('blotter')}>
            Trade Blotter
          </button>
        </div>
      )}

      {/* ── Main Content Area ────────────────────────────────── */}
      <main className="main-content">

        {/* KPI Header — always visible */}
        <Header metrics={data.metrics} perf={data.perf} />

        {/* ── Command Center Views ──────────────────────────── */}
        {activeTab === 'overview' && ccSubTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', flex: 1, paddingBottom: '40px' }}>
            <LivePortfolio />
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '40px', padding: '0 40px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                <MainChart perf={data.perf} />
                <div style={{ borderTop: '1px solid #e5e7eb' }}>
                  <SectorExposure holdings={data.holdings} />
                </div>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', padding: '40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <span style={{ fontSize: '10px', color: '#000000', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  System Overview
                </span>
                <p style={{ fontSize: '12px', color: '#000000', lineHeight: '2' }}>
                  Phineus OS core quant trading engine is active. Target portfolio QP allocations are continuously re-optimized relative to sector bounds and S&P 500 drift metrics.
                </p>
                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Active Optimizer Tickers
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                    {data.holdings?.holdings?.slice(0, 10).map(h => (
                      <span key={h.ticker} style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', background: '#f3f4f6', padding: '4px 8px', fontWeight: 600 }}>
                        {h.ticker}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'overview' && ccSubTab === 'analytics' && (
          <div style={{ padding: '0 0 40px 0', display: 'flex', flexDirection: 'column', gap: '40px' }}>
            <PortfolioAnalytics perf={data.perf} holdings={data.holdings} />
            <BenchmarkSuite     perf={data.perf} holdings={data.holdings} />
          </div>
        )}

        {activeTab === 'overview' && ccSubTab === 'reporting' && (
          <ReportingEngine
            metrics={data.metrics}
            perf={data.perf}
            holdings={data.holdings?.holdings}
          />
        )}

        {/* ── Signals Views ─────────────────────────────────── */}
        {activeTab === 'signals' && signalsSubTab === 'screener' && (
          <AlphaScreener />
        )}

        {activeTab === 'signals' && signalsSubTab === 'watchlist' && (
          <WatchlistManager topTickers={data.holdings?.holdings?.map(h => h.ticker) ?? []} />
        )}

        {activeTab === 'signals' && signalsSubTab === 'builder' && (
          <StrategyBuilder />
        )}

        {activeTab === 'signals' && signalsSubTab === 'robustness' && (
          <RobustnessLab perf={data.perf} />
        )}

        {/* ── Execution Views ───────────────────────────────── */}
        {activeTab === 'execution' && executionSubTab === 'tracker' && (
          <LivePortfolioTracker holdings={data.holdings?.holdings} perf={data.perf} />
        )}

        {activeTab === 'execution' && executionSubTab === 'rebalance' && (
          <RebalanceJournal holdings={data.holdings} />
        )}

        {activeTab === 'execution' && executionSubTab === 'blotter' && (
          <TradeBlotter holdings={data.holdings?.holdings} />
        )}

      </main>
    </div>
  )
}

export default App;
