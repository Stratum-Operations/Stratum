import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { mockEvaluatorAudit } from '../data/mockFallbackData'
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CircleDot,
  ClipboardCheck,
  Gauge,
  LineChart,
  ListChecks,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'

const API_BASE = 'http://127.0.0.1:8001/api'

const severityVariant = {
  high: 'red',
  medium: 'amber',
  low: 'green',
}

function formatMetric(value, suffix = '') {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-'
  return `${value}${suffix}`
}

function MetricTile({ label, value, sub, icon: Icon, tone = 'blue' }) {
  return (
    <Card className={`audit-metric-tile audit-tone-${tone}`}>
      <CardContent className="audit-metric-content">
        <div className="audit-metric-icon"><Icon size={18} /></div>
        <span>{label}</span>
        <strong>{value}</strong>
        {sub && <em>{sub}</em>}
      </CardContent>
    </Card>
  )
}

function GapCard({ gap }) {
  const severity = gap.severity || 'medium'
  return (
    <Card className="audit-gap-card">
      <CardHeader className="audit-gap-header">
        <div>
          <CardTitle>{gap.area}</CardTitle>
          <CardDescription>{gap.why}</CardDescription>
        </div>
        <Badge variant={severityVariant[severity] || 'muted'}>{severity}</Badge>
      </CardHeader>
      <CardContent className="audit-gap-content">
        <div className="audit-chip-row">
          {(gap.missing || []).map(item => (
            <Badge key={item} variant="muted">{item}</Badge>
          ))}
        </div>
        <div className="audit-procedure">
          <ClipboardCheck size={16} />
          <span>{gap.procedure}</span>
        </div>
      </CardContent>
    </Card>
  )
}

export default function EvaluatorAudit() {
  const [audit, setAudit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isSimulated, setIsSimulated] = useState(false)
  const [tab, setTab] = useState('gaps')

  useEffect(() => {
    let live = true
    const load = async () => {
      try {
        const res = await axios.get(`${API_BASE}/portfolio/evaluator_audit`)
        if (live) setAudit(res.data)
      } catch (err) {
        console.warn('API unreachable, loading mock evaluator audit data', err)
        if (live) {
          if (mockEvaluatorAudit) {
            setAudit(mockEvaluatorAudit)
            setIsSimulated(true)
          } else {
            setError('Failed to fetch evaluator audit data and mock data is unavailable.')
          }
        }
      } finally {
        if (live) setLoading(false)
      }
    }
    load()
    return () => { live = false }
  }, [])

  const strategy = audit?.computed?.strategy || {}
  const topGaps = useMemo(() => audit?.gaps?.slice(0, 3) || [], [audit])

  if (loading) {
    return (
      <Card className="audit-loading-card">
        <CardContent className="audit-loading-content">
          <div className="spinner" />
          <span>Researching evaluator coverage...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="audit-loading-card">
        <CardContent className="audit-error-content">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <section className="audit-shell">
      {isSimulated && (
        <div style={{
          padding: '10px 16px',
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          color: 'var(--text-2)',
          fontSize: '11px',
          fontFamily: 'JetBrains Mono, monospace',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderRadius: '0px',
        }}>
          <CircleDot size={13} className="animate-pulse" style={{ color: 'var(--blue)' }} />
          <span>SANDBOX MODE — Running local evaluator audit simulation.</span>
        </div>
      )}
      <div className="audit-hero">
        <div className="audit-hero-copy">
          <Badge variant="solid">Portfolio evaluator research</Badge>
          <h1>{audit.summary?.headline || 'Evaluator audit'}</h1>
          <p>
            A live review of what the allocator measures well, what it misses, and where the product workflow should become more evidence-driven.
          </p>
        </div>
        <div className="audit-score-panel">
          <span>Evaluator score</span>
          <strong>{audit.score}</strong>
          <em>Based on computed metrics, missing appraisal coverage, and current workflow reliability.</em>
        </div>
      </div>

      <div className="audit-metric-grid">
        <MetricTile label="CAGR" value={formatMetric(strategy.cagr, '%')} sub="strategy" icon={LineChart} tone="green" />
        <MetricTile label="Sharpe" value={formatMetric(strategy.sharpe)} sub="risk adjusted" icon={Gauge} tone="blue" />
        <MetricTile label="Max drawdown" value={formatMetric(strategy.max_drawdown, '%')} sub={`${formatMetric(strategy.drawdown_duration_days)} day max duration`} icon={ShieldAlert} tone="red" />
        <MetricTile label="Missing metrics" value={audit.summary?.missing_metric_count ?? '-'} sub="advanced evaluator fields" icon={ListChecks} tone="amber" />
      </div>

      <Card className="audit-hub-card">
        <CardHeader className="audit-hub-header">
          <div>
            <CardTitle>Evaluator command center</CardTitle>
            <CardDescription>Access system status, prioritized implementation steps, and usability recommendations to enhance quantitative modeling precision.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setTab('roadmap')}>View roadmap</Button>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="audit-tabs flex gap-2 p-1.5 bg-surface-2 border border-border rounded-none w-full md:w-auto mb-6">
              {[
                ['gaps', 'Gaps'],
                ['procedures', 'Procedures'],
                ['ux', 'UX'],
                ['research', 'Basis'],
              ].map(([value, label]) => (
                <TabsTrigger 
                  key={value} 
                  value={value} 
                  currentValue={tab} 
                  onValueChange={setTab}
                  className="flex-1 md:flex-initial px-6 py-2.5 min-h-10 text-[11px] font-extrabold uppercase tracking-wider transition-all duration-150 rounded-none"
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="gaps" currentValue={tab}>
              <div className="audit-gap-grid">
                {(audit.gaps || []).map(gap => <GapCard key={gap.area} gap={gap} />)}
              </div>
            </TabsContent>

            <TabsContent value="procedures" currentValue={tab}>
              <div className="audit-roadmap-list">
                {(audit.implementation_order || []).map((item, index) => (
                  <div key={item} className="audit-roadmap-row">
                    <span>{index + 1}</span>
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="ux" currentValue={tab}>
              <div className="audit-ux-grid">
                {(audit.ux_recommendations || []).map(item => (
                  <Card key={item.title} className="audit-ux-card">
                    <CardHeader>
                      <div className="audit-ux-icon"><Sparkles size={17} /></div>
                      <CardTitle>{item.title}</CardTitle>
                      <CardDescription>{item.component}</CardDescription>
                    </CardHeader>
                    <CardContent><p>{item.impact}</p></CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="research" currentValue={tab}>
              <div className="audit-research-list">
                {(audit.research_basis || []).map(item => (
                  <div key={item} className="audit-research-row">
                    <CheckCircle2 size={17} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="roadmap" currentValue={tab}>
              <div className="audit-roadmap-list">
                {(audit.implementation_order || []).map((item, index) => (
                  <div key={item} className="audit-roadmap-row">
                    <span>{index + 1}</span>
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="audit-bottom-grid">
        <Card>
          <CardHeader>
            <CardTitle>Current strengths</CardTitle>
            <CardDescription>What the app already has in place.</CardDescription>
          </CardHeader>
          <CardContent className="audit-strength-list">
            {[
              'Monthly rebalance pipeline with factor scoring',
              'Long-only optimizer with covariance-aware risk penalty',
              'Transaction cost model with dynamic slippage',
              'Bootstrap, parameter perturbation, and walk-forward modules',
              'Manual portfolio intake with concentration and sector risk checks',
            ].map(item => (
              <div key={item}><CircleDot size={14} /><span>{item}</span></div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fastest fixes</CardTitle>
            <CardDescription>Highest trust gain for the least product churn.</CardDescription>
          </CardHeader>
          <CardContent className="audit-strength-list">
            {topGaps.map(gap => (
              <div key={gap.area}><BarChart3 size={14} /><span>{gap.area}</span></div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
