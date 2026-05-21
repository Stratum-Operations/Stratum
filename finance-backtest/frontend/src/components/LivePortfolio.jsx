import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { ChevronDown, ChevronUp, Layers, Scale, LayoutGrid, ShieldCheck, TrendingUp } from 'lucide-react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { mockHoldings } from '../data/mockFallbackData'

export default function LivePortfolio({ strat, spy }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [showLogs, setShowLogs] = useState(false)

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const res = await axios.get('http://127.0.0.1:8001/api/holdings')
        setData(res.data)
      } catch (err) {
        console.warn('API unreachable, loading mock live portfolio data', err)
        setData({
          holdings: mockHoldings.holdings,
          total_value: 1000000.0,
          date: mockHoldings.date
        })
      }
      setLoading(false)
    }
    fetchPortfolio()
  }, [])

  const summary = useMemo(() => {
    const holdings = data?.holdings ?? []
    const active = holdings.filter(w => Number(w.weight) > 0)
    const topWeight = active[0]?.weight ? active[0].weight * 100 : 0
    const sectors = new Set(active.map(w => w.sector).filter(s => s && s !== '—' && s !== 'Unknown'))
    const avgScore = active.length
      ? active.reduce((sum, w) => sum + Number(w.score || 0), 0) / active.length
      : 0
    const totalValue = data?.total_value ?? 0

    return {
      activeCount: active.length,
      topWeight,
      sectorCount: sectors.size,
      avgScore,
      totalValue,
    }
  }, [data])

  const sectorData = useMemo(() => {
    const holdings = data?.holdings ?? []
    const active = holdings.filter(w => Number(w.weight) > 0)
    const sectors = {}
    
    active.forEach(w => {
      const sec = w.sector || 'Unknown'
      if (!sectors[sec]) sectors[sec] = 0
      sectors[sec] += Number(w.weight)
    })
    
    return Object.entries(sectors)
      .map(([name, weight]) => ({ name, weight }))
      .sort((a, b) => b.weight - a.weight)
  }, [data])

  if (loading) return (
    <div className="flex flex-col gap-4 p-5 min-h-[400px]">
      {/* Hero Card Skeleton */}
      <div className="h-28 bg-surface-2 border border-border-2 flex flex-col justify-center p-6 gap-3 animate-pulse">
        <div className="w-60 h-5 bg-border-3" />
        <div className="w-36 h-3 bg-border-2" />
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div 
            key={i} 
            className="h-20 bg-surface-2 border border-border-2 p-4 flex flex-col justify-between animate-pulse"
          >
            <div className="w-20 h-2 bg-border-3" />
            <div className="w-16 h-4 bg-border-2" />
          </div>
        ))}
      </div>

      {/* Allocation Log Skeleton */}
      <div className="h-60 bg-surface-2 border border-border-2 p-5 flex flex-col gap-4 animate-pulse">
        <div className="w-32 h-3 bg-border-3" />
        {[1, 2, 3].map(i => (
          <div key={i} className="flex justify-between items-center">
            <div className="flex gap-3 items-center">
              <div className="w-10 h-3 bg-border-3" />
              <div className="w-20 h-2.5 bg-border-2" />
            </div>
            <div className="w-32 h-1.5 bg-border-3" />
          </div>
        ))}
      </div>
    </div>
  )

  if (error) return (
    <Card className="p-5 mb-4 text-red font-bold text-[13px]">
      {error}
    </Card>
  )

  const insightCards = [
    {
      label: 'Portfolio Value',
      value: summary.totalValue ? `$${summary.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00',
      icon: TrendingUp,
      tone: 'green',
    },
    {
      label: 'Holdings',
      value: summary.activeCount || '—',
      icon: Layers,
      tone: 'blue',
    },
    {
      label: 'Largest Pos',
      value: summary.topWeight ? `${summary.topWeight.toFixed(1)}%` : '—',
      icon: Scale,
      tone: summary.topWeight > 10 ? 'amber' : 'green',
    },
    {
      label: 'Sectors',
      value: summary.sectorCount || '—',
      icon: LayoutGrid,
      tone: 'teal',
    },
    {
      label: 'Score',
      value: Number.isFinite(summary.avgScore) ? summary.avgScore.toFixed(2) : '—',
      icon: ShieldCheck,
      tone: 'blue',
    },
  ]

  const cagr = parseFloat(strat?.CAGR) || 0
  const spyCagr = parseFloat(spy?.CAGR) || 0
  const isOnTrack = cagr >= spyCagr

  return (
    <section className="portfolio-overview flex flex-col gap-4">
      <Card 
        className={`portfolio-hero rounded-none border border-border-2 p-6 border-l-4 ${isOnTrack ? 'border-l-green bg-surface-2' : 'border-l-amber bg-surface-2'}`}
      >
        <CardContent className="portfolio-hero-content p-0 flex justify-between items-center">
          <div className="flex flex-col gap-[6px]">
            <div className="flex items-center">
              <span className={`text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-none font-mono ${isOnTrack ? 'bg-green/10 text-green' : 'bg-amber/10 text-amber'}`}>
                {isOnTrack ? 'ON TRACK' : 'LAGGING BENCHMARK'}
              </span>
            </div>
            <h1 className="text-[18px] font-extrabold text-text-strong m-0 tracking-tight leading-snug">
              {isOnTrack 
                ? "Your capital is doing exactly what it's supposed to be doing right now." 
                : "Your capital allocation is currently underperforming the market index."
              }
            </h1>
            <p className="m-0 text-[12px] text-text-2 leading-relaxed">
              {isOnTrack 
                ? `Active factor loading generates a +${cagr.toFixed(2)}% simulated CAGR, outperforming the benchmark S&P 500 (+${spyCagr.toFixed(2)}% CAGR) with managed downside risk.`
                : `Active portfolio CAGR (+${cagr.toFixed(2)}%) lags behind S&P 500 (+${spyCagr.toFixed(2)}%). Consider reviewing sector and size factor weights.`
              }
            </p>
          </div>
          <div className="portfolio-hero-actions">
            <Button size="md" onClick={() => setShowLogs(true)}>Review allocations</Button>
          </div>
        </CardContent>
      </Card>

      <div className="portfolio-summary-grid">
        {insightCards.map(item => {
          const Icon = item.icon
          return (
            <Card key={item.label} className={`summary-card ${item.tone}`}>
              <CardContent className="summary-card-content">
                <div className="summary-card-top">
                  <span>{item.label}</span>
                  <Icon size={18} />
                </div>
                <strong>{item.value}</strong>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Sector Allocation Exposure Visualizer */}
      {sectorData.length > 0 && (
        <Card className="p-5 bg-surface border border-border-2">
          <div className="flex justify-between items-center mb-4">
            <div className="text-[11px] font-extrabold font-mono text-white tracking-wider uppercase">
              ✦ Sector Diversification Exposure
            </div>
            <div className="text-[10px] text-text-3 font-mono">
              {sectorData.length} active sectors
            </div>
          </div>
          
          {/* Horizontal Stacked Bar */}
          <div className="h-6 w-full flex overflow-hidden mb-5 border border-border-2">
            {sectorData.map((s, idx) => {
              const colors = ['#22c55e', '#3b82f6', '#a855f7', '#06b6d4', '#f59e0b', '#ec4899', '#10b981', '#6366f1']
              const color = colors[idx % colors.length]
              return (
                <div 
                  key={s.name}
                  style={{
                    width: `${s.weight * 100}%`,
                    background: color,
                  }}
                  className="h-full transition-all duration-300 ease-in-out"
                  title={`${s.name}: ${(s.weight * 100).toFixed(1)}%`}
                />
              )
            })}
          </div>

          {/* Legend Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
            {sectorData.map((s, idx) => {
              const colors = ['#22c55e', '#3b82f6', '#a855f7', '#06b6d4', '#f59e0b', '#ec4899', '#10b981', '#6366f1']
              const color = colors[idx % colors.length]
              return (
                <div key={s.name} className="flex items-center gap-2 min-w-0">
                  <span 
                    style={{ background: color }} 
                    className="w-2 h-2 flex-shrink-0" 
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-bold text-white overflow-hidden text-overflow-ellipsis white-space-nowrap font-sans">
                      {s.name}
                    </span>
                    <span className="text-[9px] text-text-3 font-mono">
                      {(s.weight * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      <Card className="allocation-log-card">
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="allocation-log-toggle"
        >
          <span>Allocations</span>
          {showLogs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showLogs && data?.holdings && (
          <div className="allocation-log-list">
            {data.holdings.filter(w => Number(w.weight) > 0).map(w => (
              <div key={w.ticker} className="allocation-row">
                <div>
                  <strong>{w.ticker}</strong>
                  <span>{w.sector}</span>
                </div>
                <div className="allocation-row-weight">
                  <div><span style={{ width: `${Math.max(w.weight * 420, 4)}px` }} /></div>
                  <strong>{(w.weight * 100).toFixed(2)}%</strong>
                  {w.score && <em>{Number(w.score).toFixed(2)}</em>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </section>
  )
}
