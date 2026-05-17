import { useState, useEffect, useMemo } from 'react'
import { Bookmark, Plus, X, Tag, FileText, LayoutList } from 'lucide-react'

export default function WatchlistManager({ topTickers }) {
  const [watchlist, setWatchlist] = useState([])
  const [ticker, setTicker] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('phineus_watchlist') || '[]')
    setWatchlist(saved)
  }, [])

  const addTicker = () => {
    if (!ticker) return
    const newItem = {
      ticker: ticker.toUpperCase(),
      notes: notes,
      tags: ['Discretionary'],
      isOverride: false,
      id: Date.now()
    }
    const updated = [...watchlist, newItem]
    setWatchlist(updated)
    localStorage.setItem('phineus_watchlist', JSON.stringify(updated))
    setTicker('')
    setNotes('')
  }

  const removeTicker = (id) => {
    const updated = watchlist.filter(item => item.id !== id)
    setWatchlist(updated)
    localStorage.setItem('phineus_watchlist', JSON.stringify(updated))
  }

  const toggleOverride = (id) => {
    const updated = watchlist.map(item => item.id === id ? { ...item, isOverride: !item.isOverride } : item)
    setWatchlist(updated)
    localStorage.setItem('phineus_watchlist', JSON.stringify(updated))
  }

  const alignment = useMemo(() => {
    if (!topTickers || watchlist.length === 0) return 0
    const matches = watchlist.filter(w => topTickers.includes(w.ticker)).length
    return Math.round((matches / watchlist.length) * 100)
  }, [watchlist, topTickers])

  return (
    <div className="glass-panel" style={{ marginTop: '24px' }}>
      <div className="chart-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Bookmark size={20} color="var(--accent-cyan)" />
          <span className="chart-title">Direct Research Watchlist</span>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Alignment Score: <strong style={{ color: alignment > 50 ? 'var(--accent-green)' : 'var(--accent-cyan)' }}>{alignment}%</strong>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px', marginTop: '24px' }}>
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
          <span className="metric-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Plus size={14} /> Add Asset Context
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input 
              className="toggle-btn" 
              placeholder="Ticker (e.g. NVDA)" 
              value={ticker} 
              onChange={e => setTicker(e.target.value)} 
              style={{ width: '100%', textAlign: 'left', padding: '10px' }}
            />
            <textarea 
              className="toggle-btn" 
              placeholder="Investment Thesis..." 
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
              style={{ width: '100%', minHeight: '100px', textAlign: 'left', padding: '10px', fontSize: '0.8rem' }}
            />
            <button className="toggle-btn active" onClick={addTicker} style={{ width: '100%', justifyContent: 'center' }}>Save to Matrix</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {watchlist.map(item => (
            <div key={item.id} className="watchlist-card" style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', position: 'relative' }}>
              <button 
                onClick={() => removeTicker(item.id)} 
                style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={14} />
              </button>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                {item.ticker}
                {item.isOverride && <span style={{ fontSize: '0.65rem', background: 'var(--accent-red)', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>OVERRIDE</span>}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '12px 0', lineHeight: 1.5 }}>{item.notes || 'No thesis metadata captured.'}</p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <div onClick={() => toggleOverride(item.id)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: item.isOverride ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                  <Tag size={12} /> {item.isOverride ? 'Manual Control' : 'Quantitative Flag'}
                </div>
              </div>
            </div>
          ))}
          {watchlist.length === 0 && (
            <div style={{ gridColumn: '1 / -1', height: '200px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.1)', border: '1px dashed var(--glass-border)', borderRadius: 'var(--radius-sm)' }}>
              No custom research signals tracked in current matrix.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
