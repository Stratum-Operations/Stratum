import { useEffect, useState } from 'react'
import axios from 'axios'
import Header from './components/Header'
import MainChart from './components/MainChart'
import LivePortfolio from './components/LivePortfolio'
import SectorExposure from './components/SectorExposure'

const API_BASE = 'http://127.0.0.1:8000/api'

function App() {
  const [data, setData] = useState({ perf: null, metrics: null, holdings: null })
  const [loading, setLoading] = useState(true)

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
      <Header metrics={data.metrics} perf={data.perf} />
      <div className="main-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <MainChart perf={data.perf} />
          <SectorExposure holdings={data.holdings} />
        </div>
        <LivePortfolio holdings={data.holdings} />
      </div>
    </div>
  )
}

export default App
