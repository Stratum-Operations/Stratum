export default function LivePortfolio({ holdings }) {
  if (!holdings || !holdings.holdings) return null
  
  const sorted = [...holdings.holdings].sort((a,b) => b.weight - a.weight)

  return (
    <div className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="chart-header">
        <span className="chart-title">Live Top 15 Holdings</span>
        <span style={{color: 'var(--text-muted)', fontSize: '0.85rem'}}>Date: {holdings.date}</span>
      </div>
      
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Sector</th>
              <th>Alloc</th>
              <th>12M Mom</th>
              <th>ROE</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(h => (
              <tr key={h.ticker}>
                <td>{h.ticker}</td>
                <td style={{color: 'var(--text-muted)'}}>{h.sector}</td>
                <td>{(h.weight * 100).toFixed(1)}%</td>
                <td style={{color: h.m12 > 0 ? 'var(--accent-green)' : 'var(--accent-red)'}}>{(h.m12 * 100).toFixed(1)}%</td>
                <td>{(h.roe * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
