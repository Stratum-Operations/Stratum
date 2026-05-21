import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { ChevronDown, ChevronUp, Layers, Scale, LayoutGrid, ShieldCheck } from 'lucide-react'
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
        const res = await axios.get('http://127.0.0.1:8001/api/portfolio/current_weights')
        setData(res.data)
      } catch (err) {
        console.warn('API unreachable, loading mock live portfolio data', err)
        setData({
          weights: mockHoldings.holdings,
          date: mockHoldings.date
        })
      }
      setLoading(false)
    }
    fetchPortfolio()
  }, [])


  const summary = useMemo(() => {
    const weights = data?.weights ?? []
    const active = weights.filter(w => Number(w.weight) > 0)
    const topWeight = active[0]?.weight ? active[0].weight * 100 : 0
    const sectors = new Set(active.map(w => w.sector).filter(Boolean))
    const avgScore = active.length
      ? active.reduce((sum, w) => sum + Number(w.score || 0), 0) / active.length
      : 0

    return {
      activeCount: active.length,
      topWeight,
      sectorCount: sectors.size,
      avgScore,
    }
  }, [data])

  if (loading) return (
    <Card style={{ padding: '28px', display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
      <div className="spinner" />
      <span style={{ fontSize: '13px', color: 'var(--text-2)', fontWeight: 600 }}>
        Loading portfolio allocation...
      </span>
    </Card>
  )

  if (error) return (
    <Card style={{ padding: '20px', marginBottom: '16px', color: 'var(--red)', fontSize: '13px', fontWeight: 700 }}>
      {error}
    </Card>
  )

  const insightCards = [
    {
      label: 'Holdings',
      value: summary.activeCount || '—',
      icon: Layers,
      tone: 'blue',
    },
    {
      label: 'Largest',
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
    <section className="portfolio-overview">
      <Card 
        className="portfolio-hero" 
        style={{ 
          borderLeft: isOnTrack ? '4px solid var(--green)' : '4px solid var(--amber)',
          background: isOnTrack ? 'rgba(16, 185, 129, 0.02)' : 'rgba(245, 158, 11, 0.02)',
          padding: '24px'
        }}
      >
        <CardContent className="portfolio-hero-content" style={{ padding: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ 
                fontSize: '9px', 
                fontWeight: 900, 
                letterSpacing: '0.12em', 
                textTransform: 'uppercase', 
                padding: '3px 8px', 
                borderRadius: '4px',
                background: isOnTrack ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                color: isOnTrack ? 'var(--green)' : 'var(--amber)',
                fontFamily: 'JetBrains Mono, monospace'
              }}>
                {isOnTrack ? 'ON TRACK' : 'LAGGING BENCHMARK'}
              </span>
            </div>
            <h1 style={{ fontSize: '18px', fontWeight: 850, color: 'var(--text-strong)', margin: '4px 0 0', letterSpacing: '-0.015em' }}>
              {isOnTrack 
                ? "Your capital is doing exactly what it's supposed to be doing right now." 
                : "Your capital allocation is currently underperforming the market index."
              }
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-2)', lineHeight: '1.5' }}>
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

      <Card className="allocation-log-card">
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="allocation-log-toggle"
        >
          <span>Allocations</span>
          {showLogs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showLogs && data?.weights && (
          <div className="allocation-log-list">
            {data.weights.filter(w => Number(w.weight) > 0).map(w => (
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
