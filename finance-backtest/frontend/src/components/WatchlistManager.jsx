import { useState, useEffect, useMemo } from 'react'
import { Bookmark, Plus, X, Tag } from 'lucide-react'

export default function WatchlistManager({ topTickers }) {
  const [watchlist, setWatchlist] = useState([])
  const [ticker, setTicker]       = useState('')
  const [notes, setNotes]         = useState('')

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('phineus_watchlist') || '[]')
    setWatchlist(saved)
  }, [])

  const addTicker = () => {
    if (!ticker) return
    const newItem = { ticker: ticker.toUpperCase(), notes, tags: ['Discretionary'], isOverride: false, id: Date.now() }
    const updated = [...watchlist, newItem]
    setWatchlist(updated)
    localStorage.setItem('phineus_watchlist', JSON.stringify(updated))
    setTicker(''); setNotes('')
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
    return Math.round((watchlist.filter(w => topTickers.includes(w.ticker)).length / watchlist.length) * 100)
  }, [watchlist, topTickers])

  const inputStyle = {
    background: '#141414',
    border: '1px solid #2e2e2e',
    color: '#d0d0d0',
    padding: '8px 12px',
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '11px',
    outline: 'none',
    width: '100%',
  }

  return (
    <div style={{ background: '#070707', display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header */}
      <div className="chart-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Bookmark size={14} color="#888888" />
          <span className="chart-title">Research Watchlist Matrix</span>
        </div>
        <div style={{ fontSize: '11px', color: '#888888', fontFamily: 'JetBrains Mono, monospace' }}>
          Alignment: <strong style={{ color: alignment > 50 ? '#22c55e' : '#d0d0d0' }}>{alignment}%</strong>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 0 }}>

        {/* Add form */}
        <div style={{ background: '#0e0e0e', borderRight: '1px solid #1c1c1c', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{ fontSize: '9px', color: '#888888', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={12} /> Add Asset
          </span>
          <input
            placeholder="TICKER (e.g. NVDA)"
            value={ticker}
            onChange={e => setTicker(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTicker()}
            style={inputStyle}
          />
          <textarea
            placeholder="Investment thesis..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
          />
          <button
            onClick={addTicker}
            style={{ background: '#ffffff', color: '#000000', border: 'none', padding: '10px', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}
          >
            Save to Matrix
          </button>
        </div>

        {/* Watchlist grid */}
        <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px', alignContent: 'start' }}>
          {watchlist.map(item => (
            <div key={item.id} style={{ background: '#0e0e0e', padding: '16px', border: '1px solid #1c1c1c', position: 'relative', borderLeft: item.isOverride ? '3px solid #ef4444' : '3px solid #2e2e2e' }}>
              <button
                onClick={() => removeTicker(item.id)}
                style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', color: '#4a4a4a', cursor: 'pointer', padding: 0 }}
              >
                <X size={14} />
              </button>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff', fontFamily: 'JetBrains Mono, monospace', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                {item.ticker}
                {item.isOverride && (
                  <span style={{ fontSize: '8px', background: '#7f1d1d', color: '#ef4444', padding: '2px 6px', border: '1px solid #ef4444', fontWeight: 700, letterSpacing: '0.1em' }}>
                    OVERRIDE
                  </span>
                )}
                {topTickers.includes(item.ticker) && (
                  <span style={{ fontSize: '8px', background: '#166534', color: '#22c55e', padding: '2px 6px', border: '1px solid #22c55e', fontWeight: 700, letterSpacing: '0.1em' }}>
                    SELECTED
                  </span>
                )}
              </div>
              <p style={{ fontSize: '11px', color: '#888888', margin: '0 0 12px', lineHeight: 1.6 }}>
                {item.notes || 'No thesis metadata captured.'}
              </p>
              <div
                onClick={() => toggleOverride(item.id)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '9px', color: item.isOverride ? '#ef4444' : '#4a4a4a', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em', textTransform: 'uppercase' }}
              >
                <Tag size={11} /> {item.isOverride ? 'Manual Override Active' : 'Quantitative Flag'}
              </div>
            </div>
          ))}

          {watchlist.length === 0 && (
            <div style={{ gridColumn: '1 / -1', height: '180px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#3d3d3d', background: '#0e0e0e', border: '1px dashed #1c1c1c', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              No custom research signals in current matrix
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
