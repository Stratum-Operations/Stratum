import { useEffect, useState } from 'react'
import axios from 'axios'
import Header from './components/Header'
import MainChart from './components/MainChart'
import LivePortfolio from './components/LivePortfolio'
import SectorExposure from './components/SectorExposure'
import LiveScreener from './components/LiveScreener'
import StockDetail from './components/StockDetail'
import BacktestLab from './components/BacktestLab'
import RebalanceJournal from './components/RebalanceJournal'
import PortfolioAnalytics from './components/PortfolioAnalytics'
import BenchmarkSuite from './components/BenchmarkSuite'
import LivePortfolioTracker from './components/LivePortfolioTracker'
import StrategyBuilder from './components/StrategyBuilder'
import RobustnessLab from './components/RobustnessLab'
import TradeBlotter from './components/TradeBlotter'
import WatchlistManager from './components/WatchlistManager'
import ReportingEngine from './components/ReportingEngine'
import { LayoutDashboard, Table, History, BarChart2, FlaskConical, Zap, Activity, ShieldCheck, ShoppingCart, ClipboardList, FileText } from 'lucide-react'

const API_BASE = 'http://127.0.0.1:8000/api'

const TABS = [
  { id: 'overview', name: 'Overview', icon: LayoutDashboard },
  { id: 'screener', name: 'Screener', icon: Table },
  { id: 'watchlist', name: 'Watchlist', icon: ClipboardList },
  { id: 'builder', name: 'Strategy Builder', icon: FlaskConical },
  { id: 'live', name: 'Live Tracker', icon: Activity },
  { id: 'rebalance', name: 'Rebalance', icon: History },
  { id: 'blotter', name: 'Trade Blotter', icon: ShoppingCart },
  { id: 'analytics', name: 'Analytics', icon: BarChart2 },
  { id: 'robustness', name: 'Robustness Lab', icon: ShieldCheck },
  { id: 'reporting', name: 'Reporting', icon: FileText },
]

function App() {
  const [data, setData] = useState({ perf: null, metrics: null, holdings: null })
  const [loading, setLoading] = useState(true)
  const [selectedHolding, setSelectedHolding] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pRes, mRes, hRes] = await Promise.all([
          axios.get(`${API_BASE}/performance`),
          axios.get(`${API_BASE}/metrics`),
          axios.get(`${API_BASE}/holdings`)
        ])
        
        const perfData = pRes.data.dates.map((date, i) => {
          const row = { date }
          for (const key in pRes.data.data) {
            row[key] = pRes.data.data[key][i]
          }
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
    return <div className="flex-center"><div className="spinner"></div></div>
  }

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="brand">
          <Zap size={24} fill="var(--accent-cyan)" />
          <span>PHINEUS OS</span>
        </div>
        
        <nav className="nav-list">
          {TABS.map(tab => (
            <div 
              key={tab.id}
              className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon size={20} />
              <span>{tab.name}</span>
            </div>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <Header metrics={data.metrics} perf={data.perf} />
        
        {activeTab === 'overview' && (
          <div className="main-grid">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <MainChart perf={data.perf} />
              <SectorExposure holdings={data.holdings} />
            </div>
            <LivePortfolio holdings={data.holdings} />
          </div>
        )}

        {activeTab === 'screener' && (
          <>
            <LiveScreener holdings={data.holdings} onSelect={setSelectedHolding} />
            <StockDetail holding={selectedHolding} />
          </>
        )}

        {activeTab === 'watchlist' && (
          <WatchlistManager topTickers={data.holdings.holdings.map(h => h.ticker)} />
        )}

        {activeTab === 'builder' && (
          <StrategyBuilder />
        )}

        {activeTab === 'live' && (
          <LivePortfolioTracker holdings={data.holdings.holdings} perf={data.perf} />
        )}

        {activeTab === 'rebalance' && (
          <RebalanceJournal holdings={data.holdings} />
        )}

        {activeTab === 'blotter' && (
          <TradeBlotter holdings={data.holdings.holdings} />
        )}

        {activeTab === 'analytics' && (
          <>
            <PortfolioAnalytics perf={data.perf} holdings={data.holdings} />
            <BenchmarkSuite perf={data.perf} holdings={data.holdings} />
          </>
        )}

        {activeTab === 'robustness' && (
          <RobustnessLab perf={data.perf} />
        )}

        {activeTab === 'reporting' && (
          <ReportingEngine metrics={data.metrics} perf={data.perf} holdings={data.holdings.holdings} />
        )}

        {activeTab === 'lab' && (
          <BacktestLab perf={data.perf} metrics={data.metrics} />
        )}
      </main>
    </div>
  )
}

export default App
