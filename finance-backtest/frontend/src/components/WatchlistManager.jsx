import { useState, useEffect, useMemo } from 'react'
import { Bookmark, Plus, X, Tag } from 'lucide-react'

export default function WatchlistManager({ topTickers }) {
  const [watchlist, setWatchlist] = useState([])
  const [ticker, setTicker]       = useState('')
  const [notes, setNotes]         = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingText, setEditingText] = useState('')

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

  const startEditing = (item) => {
    setEditingId(item.id)
    setEditingText(item.notes || '')
  }

  const saveEditing = (id) => {
    const updated = watchlist.map(item => item.id === id ? { ...item, notes: editingText } : item)
    setWatchlist(updated)
    localStorage.setItem('phineus_watchlist', JSON.stringify(updated))
    setEditingId(null)
  }

  const alignment = useMemo(() => {
    if (!topTickers || watchlist.length === 0) return 0
    return Math.round((watchlist.filter(w => topTickers.includes(w.ticker)).length / watchlist.length) * 100)
  }, [watchlist, topTickers])

  const inputStyle = {
    background: 'var(--surface-2)',
    border: '1px solid var(--border-2)',
    color: 'var(--text)',
    padding: '8px 12px',
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '11px',
    outline: 'none',
    width: '100%',
  }

  return (
    <div className="bg-bg flex flex-col gap-0 border border-border rounded-none overflow-hidden">
      {/* Header */}
      <div className="chart-header">
        <div className="flex items-center gap-2.5">
          <Bookmark size={14} className="text-text-2" />
          <span className="chart-title">Research Watchlist Matrix</span>
        </div>
        <div className="font-mono text-[11px] text-text-2">
          Alignment: <strong style={{ color: alignment > 50 ? 'var(--green)' : 'var(--text)' }}>{alignment}%</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-0">

        {/* Add form */}
        <div className="bg-surface border-r border-border p-5 flex flex-col gap-3">
          <span className="text-[9px] text-text-2 font-bold tracking-widest uppercase font-mono flex items-center gap-1.5">
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
            placeholder="Investment thesis (optional)..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
          />
          <button
            onClick={addTicker}
            className="bg-text-strong text-bg hover:opacity-90 border-none p-2.5 font-mono text-[10px] font-bold tracking-widest uppercase cursor-pointer transition-all duration-200"
          >
            Save to Matrix
          </button>
        </div>

        {/* Watchlist grid */}
        <div className="bg-surface-2 p-5 grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3 align-content-start">
          {watchlist.map(item => (
            <div key={item.id} style={{ background: 'var(--surface)', padding: '16px', border: '1px solid var(--border)', position: 'relative', borderLeft: item.isOverride ? '3px solid var(--red)' : '3px solid var(--border-3)' }}>
              <button
                onClick={() => removeTicker(item.id)}
                className="absolute top-2.5 right-2.5 bg-transparent border-none text-text-3 hover:text-text cursor-pointer p-0"
              >
                <X size={14} />
              </button>
              <div className="text-[14px] font-extrabold text-text-strong font-mono flex items-center gap-2 mb-2">
                {item.ticker}
                {item.isOverride && (
                  <span className="text-[8px] bg-red-dim text-red border border-red px-1.5 py-0.5 font-bold tracking-wider rounded-none">
                    OVERRIDE
                  </span>
                )}
                {topTickers.includes(item.ticker) && (
                  <span className="text-[8px] bg-green-dim text-green border border-green px-1.5 py-0.5 font-bold tracking-wider rounded-none">
                    SELECTED
                  </span>
                )}
              </div>

              {editingId === item.id ? (
                <div className="flex flex-col gap-2 mt-2 mb-3">
                  <textarea
                    value={editingText}
                    onChange={e => setEditingText(e.target.value)}
                    className="w-full text-[11px] font-mono p-1.5 bg-surface-2 border border-border text-text outline-none resize-y min-h-[60px]"
                    placeholder="Enter investment thesis (optional)..."
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setEditingId(null)}
                      className="bg-transparent border border-border text-text hover:text-text-strong px-2 py-1 text-[9px] font-mono cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveEditing(item.id)}
                      className="bg-green text-bg font-bold px-2 py-1 text-[9px] font-mono cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <p 
                  className="text-[11px] text-text-2 margin-0 mb-3 leading-relaxed cursor-pointer hover:text-text group flex justify-between items-start gap-2"
                  onClick={() => startEditing(item)}
                  title="Click to edit thesis"
                >
                  <span className="flex-1">{item.notes || 'No thesis metadata captured.'}</span>
                  <span className="text-[9px] text-text-3 font-semibold font-mono opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    EDIT
                  </span>
                </p>
              )}

              <div
                onClick={() => toggleOverride(item.id)}
                className="cursor-pointer flex items-center gap-1.5 text-[9px] font-mono tracking-wider uppercase"
                style={{ color: item.isOverride ? 'var(--red)' : 'var(--text-3)' }}
              >
                <Tag size={11} /> {item.isOverride ? 'Manual Override Active' : 'Quantitative Flag'}
              </div>
            </div>
          ))}

          {watchlist.length === 0 && (
            <div className="col-span-full h-[180px] flex justify-center items-center text-text-2 bg-surface border border-dashed border-border font-mono text-[10px] tracking-wider uppercase">
              No custom research signals in current matrix
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
