import { useState, useMemo } from 'react'
import { FileText, Download, Printer, PieChart, TrendingUp, Table as TableIcon } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function ReportingEngine({ metrics, perf, holdings }) {
  const [isPrinting, setIsPrinting] = useState(false)

  const downloadCSV = () => {
    if (!holdings) return
    const headers = ['ticker', 'sector', 'weight', 'score']
    const csvContent = [
      headers.join(','),
      ...holdings.map(h => headers.map(header => h[header]).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'phineus_monthly_report.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const printReport = () => {
    setIsPrinting(true)
    setTimeout(() => {
      window.print()
      setIsPrinting(false)
    }, 500)
  }

  return (
    <div className="glass-panel" style={{ marginTop: '24px' }}>
      <div className="chart-header no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FileText size={20} color="var(--accent-cyan)" />
          <span className="chart-title">Strategy Reporting Engine</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="toggle-btn" onClick={downloadCSV}><Download size={14} /> Export CSV</button>
          <button className="toggle-btn active" onClick={printReport}><Printer size={14} /> Generate Tear Sheet</button>
        </div>
      </div>

      <div className="tear-sheet" style={{ background: '#0a0e17', padding: '40px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', marginTop: '24px' }}>
        <div style={{ borderBottom: '2px solid var(--accent-cyan)', paddingBottom: '20px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
           <div>
              <h1 style={{ margin: 0, fontSize: '2.4rem', color: '#fff', fontWeight: 800 }}>PHINEUS OS</h1>
              <span style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '2px' }}>Monthly Quant Strategy Report</span>
           </div>
           <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>April 2026</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Confidential: Internal Strategy Engine Version 7</div>
           </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '40px' }}>
           {metrics?.map(m => (
             <div key={m.Metric || m[0]} style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '8px', borderLeft: '4px solid var(--accent-cyan)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{m.Metric || m[0]}</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>{m.Strategy || m[1]}</div>
             </div>
           ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '40px' }}>
           <div>
              <span className="metric-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}><TrendingUp size={14} /> Backtest Cumulative Return</span>
              <div style={{ height: '250px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px' }}>
                <ResponsiveContainer>
                  <LineChart data={perf?.dates.map((d, i) => ({ date: d, equity: perf.data.Strategy_Equity[i] }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="date" stroke="#8a9fc2" tick={{fontSize: 8}} />
                    <Line type="monotone" dataKey="equity" stroke="var(--accent-cyan)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
           </div>
           <div>
              <span className="metric-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}><TableIcon size={14} /> Active Rebalance Table</span>
              <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Ticker</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Sector</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>Weight</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>Q-Score</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings?.slice(0, 10).map(h => (
                    <tr key={h.ticker} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '8px', fontWeight: 700 }}>{h.ticker}</td>
                      <td style={{ padding: '8px' }}>{h.sector}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{(h.weight * 100).toFixed(2)}%</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: 'var(--accent-cyan)' }}>{h.score?.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        </div>

        <div style={{ background: 'rgba(0, 229, 255, 0.05)', padding: '20px', borderRadius: '8px', border: '1px solid rgba(0, 229, 255, 0.1)', fontSize: '0.75rem', lineHeight: 1.6, color: 'var(--text-muted)' }}>
           <strong style={{ color: 'var(--accent-cyan)', display: 'block', marginBottom: '4px' }}>Strategic Disclaimer</strong>
           Internal proprietary reporting for algorithmic research. Past performance is not indicative of future results. Rebalance assumes VWAP execution with fixed commissions and slippage modeling.
        </div>
      </div>
    </div>
  )
}
