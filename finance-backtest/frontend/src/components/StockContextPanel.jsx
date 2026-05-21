import { useMemo } from 'react'
import { Calendar, Newspaper, TrendingUp, AlertTriangle, ExternalLink } from 'lucide-react'

function seededRand(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return (Math.abs(hash) % 1000) / 1000
}

export default function StockContextPanel({ ticker }) {
  const data = useMemo(() => {
    if (!ticker) return null
    const rand = seededRand(ticker)
    
    const earningsDays = Math.floor(rand * 90)
    const isUpcoming = earningsDays <= 7
    
    return {
      earningsDate: `May ${15 + Math.floor(rand * 10)}, 2026`,
      earningsIn: earningsDays,
      isUpcoming,
      dividend: (rand * 2.5 + 0.5).toFixed(2) + "%",
      exDiv: `Apr ${10 + Math.floor(rand * 5)}, 2026`,
      hi52: (450 * (1 + rand * 0.2)).toFixed(2),
      lo52: (450 * (1 - rand * 0.4)).toFixed(2),
      news: [
        { id: 1, title: `${ticker} to Accelerate AI Cloud Infrastructure Spend`, type: 'Headline' },
        { id: 2, title: `Goldman Sachs Reiterates Buy Rating on ${ticker}`, type: 'Analyst' },
        { id: 3, title: `${ticker} Announces $10B Share Repurchase Program`, type: 'Headline' }
      ]
    }
  }, [ticker])

  if (!data) return null

  return (
    <div className="stock-context-panel flex flex-col gap-5">
      
      {data.isUpcoming && (
        <div className="bg-[rgba(255,171,0,0.1)] border border-[rgba(255,171,0,0.15)] p-3 rounded-[var(--radius-sm)] flex gap-2.5">
           <AlertTriangle size={16} color="#ffab00" className="mt-0.5 flex-shrink-0" />
           <div>
              <span className="text-[#ffab00] font-bold text-[11px] tracking-wider">MACRO EVENT ALERT</span>
              <p className="margin-0 mt-1 text-[11px] text-text-2 leading-snug">
                Earnings call in <strong className="font-semibold text-text">{data.earningsIn} days</strong>. Binary volatility event detected.
              </p>
           </div>
        </div>
      )}

      {/* Corporate Events Card */}
      <div className="bg-surface-2 border border-border p-4 rounded-[var(--radius-sm)]">
         <span className="text-[11px] text-text-2 font-semibold flex items-center gap-2 tracking-wider uppercase">
           <Calendar size={14} className="text-text-3" /> Corporate Events
         </span>
         <div className="flex flex-col gap-3 mt-4">
            <div className="flex justify-between items-center text-xs">
               <span className="opacity-70 text-text">Next Earnings</span>
               <span className="font-semibold text-text-strong">{data.earningsDate}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
               <span className="opacity-70 text-text">Dividend Yield</span>
               <span className="font-semibold text-green">{data.dividend}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
               <span className="opacity-70 text-text">Ex-Div Date</span>
               <span className="font-semibold text-text-strong">{data.exDiv}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
               <span className="opacity-70 text-text">52W Range</span>
               <span className="font-semibold text-text-strong">${data.lo52} - ${data.hi52}</span>
            </div>
         </div>
      </div>

      {/* Intelligence Feed Card */}
      <div className="bg-surface-2 border border-border p-4 rounded-[var(--radius-sm)]">
         <span className="text-[11px] text-text-2 font-semibold flex items-center gap-2 tracking-wider uppercase">
           <Newspaper size={14} className="text-text-3" /> Intelligence Feed
         </span>
         <div className="flex flex-col gap-3.5 mt-4">
            {data.news.map(n => (
              <div key={n.id} className="border-b border-border pb-3 last:border-b-0 last:pb-0">
                 <div className="flex justify-between items-center mb-1">
                    <span className={`text-[10px] uppercase font-bold tracking-wider ${n.type === 'Analyst' ? 'text-teal' : 'text-blue'}`}>{n.type}</span>
                    <ExternalLink size={11} className="text-text-3" />
                 </div>
                 <p className="margin-0 text-[12px] text-text-strong leading-relaxed font-medium">{n.title}</p>
              </div>
            ))}
         </div>
      </div>

    </div>
  )
}
