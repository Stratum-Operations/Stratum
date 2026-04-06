export function getHeatmapColor(val) {
  if (val >= 0.9) return '#006400' // Dark Green (Top Decile)
  if (val >= 0.7) return '#00a000' // Light Green
  if (val >= 0.4) return '#2a2a2a' // Neutral Gray (Median)
  if (val >= 0.2) return '#a00000' // Light Red
  return '#640000' // Dark Red (Bottom Decile)
}

function HeatmapCell({ label, value, delta }) {
  const bgColor = getHeatmapColor(value)
  const isUp = delta > 0
  const isDown = delta < 0
  
  return (
    <div className="heatmap-cell" style={{ backgroundColor: bgColor }}>
      <div className="cell-label">{label}</div>
      <div className="cell-value">{(value * 100).toFixed(0)}</div>
      <div className={`cell-delta ${isUp ? 'up' : isDown ? 'down' : ''}`}>
        {isUp ? '▲' : isDown ? '▼' : ''}
      </div>
    </div>
  )
}

export default function FactorHeatmap({ h, deltas }) {
  return (
    <div className="factor-heatmap">
      <HeatmapCell label="6M" value={h.r6} delta={deltas?.r6 || 0} />
      <HeatmapCell label="12M" value={h.r12} delta={deltas?.r12 || 0} />
      <HeatmapCell label="VOL" value={h.rv} delta={deltas?.rv || 0} />
      <HeatmapCell label="QLY" value={h.rq} delta={deltas?.rq || 0} />
    </div>
  )
}
