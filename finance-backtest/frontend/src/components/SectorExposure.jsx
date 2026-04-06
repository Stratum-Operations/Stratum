import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['#00e5ff', '#9d4edd', '#00ff88', '#ff3366', '#fca311', '#4361ee', '#f72585', '#4cc9f0']

export default function SectorExposure({ holdings }) {
  const data = useMemo(() => {
    if (!holdings?.holdings) return []
    
    const agg = {}
    holdings.holdings.forEach(h => {
      const sec = h.sector || 'Unknown'
      agg[sec] = (agg[sec] || 0) + h.weight
    })
    
    return Object.entries(agg).map(([name, value]) => ({ name, value }))
      .sort((a,b) => b.value - a.value)
  }, [holdings])

  return (
    <div className="glass-panel" style={{ height: '360px', display: 'flex', flexDirection: 'column' }}>
      <span className="chart-title" style={{marginBottom: '16px'}}>Sector Exposure</span>
      <div style={{ flex: 1, width: '100%' }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(val) => `${(val * 100).toFixed(1)}%`}
              contentStyle={{backgroundColor: '#0a0e17', border: '1px solid rgba(255,255,255,0.1)'}} 
            />
            <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{fontSize: '0.8rem', color: '#8a9fc2'}}/>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
