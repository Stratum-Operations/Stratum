function getFactorDesc(val) {
  if (val >= 0.8) return "strong"
  if (val >= 0.6) return "above-average"
  if (val >= 0.4) return "average"
  return "below-average"
}

export function generateNarrative(h, rank) {
  const p6 = (h.r6 * 100).toFixed(0)
  const p12 = (h.r12 * 100).toFixed(0)
  const pv = (h.rv * 100).toFixed(0)
  const pq = (h.rq * 100).toFixed(0)
  
  return `${h.ticker} ranked #${rank} this month due to ${getFactorDesc(h.r6)} 6M momentum (${p6}th percentile), ${getFactorDesc(h.r12)} 12M momentum (${p12}th percentile), ${getFactorDesc(h.rv)} volatility (${pv}th percentile), and ${getFactorDesc(h.rq)} quality (${pq}th percentile).`
}

export default function ExplainabilityTooltip({ h, rank }) {
  const narrative = generateNarrative(h, rank)
  
  return (
    <div className="narrative-box">
      <div className="narrative-header">
        <span className="narrative-sparkle">✦</span> Heuristic Factor Attribution
      </div>
      <div className="narrative-body">{narrative}</div>
    </div>
  )
}
