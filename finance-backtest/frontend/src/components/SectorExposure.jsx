import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['#e8e8e8', '#b0b0b0', '#808080', '#606060', '#404040', '#c8c8c8', '#989898', '#707070']

export default function SectorExposure({ holdings }) {
  const data = useMemo(() => {
    if (!holdings?.holdings) return []
    const agg = {}
    holdings.holdings.forEach(h => {
      const sec = h.sector || 'Unknown'
      agg[sec] = (agg[sec] || 0) + h.weight
    })
    return Object.entries(agg).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [holdings])

  return (
    <div style={{ height: '320px', display: 'flex', flexDirection: 'column', background: 'var(--surface)', padding: '16px 20px' }}>
      <span style={{
        fontSize: '10px', fontWeight: 800, letterSpacing: '0.2em',
        textTransform: 'uppercase', color: 'var(--text)', marginBottom: '12px',
        fontFamily: 'JetBrains Mono, monospace', display: 'block',
      }}>
        Sector Exposure
      </span>
      <div style={{ flex: 1, width: '100%' }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              innerRadius={55}
              outerRadius={95}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={val => `${(val * 100).toFixed(1)}%`}
              contentStyle={{
                background: '#141414',
                border: '1px solid #2e2e2e',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '11px',
                color: '#d0d0d0',
              }}
            />
            <Legend
              layout="vertical"
              verticalAlign="middle"
              align="right"
              wrapperStyle={{ fontSize: '10px', color: '#888888', fontFamily: 'JetBrains Mono, monospace' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
