export function getHeatmapColor(val) {
  if (val >= 0.9) return '#166534' // Dark Green (Top Decile)
  if (val >= 0.7) return '#22c55e' // Light Green
  if (val >= 0.4) return '#374151' // Neutral Gray (Median)
  if (val >= 0.2) return '#ef4444' // Light Red
  return '#991b1b' // Dark Red (Bottom Decile)
}

function HeatmapCell({ label, value, delta }) {
  const bgColor = getHeatmapColor(value)
  const isUp = delta > 0
  const isDown = delta < 0
  
  return (
    <div 
      className="flex flex-col items-center justify-center w-12 h-11 text-white text-center rounded shadow-sm select-none"
      style={{ backgroundColor: bgColor }}
    >
      <div className="text-[9px] font-bold opacity-75 uppercase font-mono tracking-wider">{label}</div>
      <div className="text-[11px] font-extrabold font-mono leading-none my-0.5">{(value * 100).toFixed(0)}</div>
      <div 
        className={`text-[8px] leading-none ${isUp ? 'text-green-300' : isDown ? 'text-red-300' : 'text-gray-400'}`}
      >
        {isUp ? '▲' : isDown ? '▼' : ''}
      </div>
    </div>
  )
}

export default function FactorHeatmap({ h, deltas }) {
  if (!h) return null
  return (
    <div className="flex items-center gap-1.5">
      <HeatmapCell label="6M" value={h.r6} delta={deltas?.r6 || 0} />
      <HeatmapCell label="12M" value={h.r12} delta={deltas?.r12 || 0} />
      <HeatmapCell label="VOL" value={h.rv} delta={deltas?.rv || 0} />
      <HeatmapCell label="QLY" value={h.rq} delta={deltas?.rq || 0} />
    </div>
  )
}
