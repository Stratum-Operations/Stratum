import { useState, useRef, useEffect, useMemo } from 'react'
import axios from 'axios'
import { X, Send, Sparkles, AlertCircle, Briefcase, TrendingUp, PieChart, ShieldCheck } from 'lucide-react'

const API_BASE = 'http://127.0.0.1:8001/api'

const DEFAULT_CHIPS = [
  "What is my biggest portfolio risk?",
  "How well diversified is my asset mix?",
  "Am I overexposed to any sector?",
  "Suggest a risk mitigation tactic",
]

const SCREENER_CHIPS = [
  "Explain the ranking algorithm",
  "Which alpha indicators are driving this universe?",
  "Is there high concentration in the top assets?",
]

const BACKTEST_CHIPS = [
  "How does slippage affect my alpha?",
  "What is the impact of commission fees?",
  "Compare my Sharpe and Sortino ratios",
]

export default function AiAnalystDrawer({ isOpen, onClose, portfolioContext = {}, mode = 'drawer' }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  const currentView = portfolioContext.currentView || 'dashboard'

  // Decide suggestion chips based on active view
  const chips = useMemo(() => {
    if (currentView === 'screener') return SCREENER_CHIPS
    if (currentView === 'backtest' || currentView === 'robustness') return BACKTEST_CHIPS
    return DEFAULT_CHIPS
  }, [currentView])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  async function sendMessage(text) {
    const query = (text ?? input).trim()
    if (!query || loading) return

    const newMessages = [...messages, { role: 'user', content: query }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const response = await axios.post(`${API_BASE}/portfolio/analyst`, {
        messages: newMessages,
        context: {
          current_view: currentView,
          holdings: portfolioContext.holdings || [],
          metrics: portfolioContext.metrics || {},
          strategy_kpis: portfolioContext.strategyKPIs || {},
          benchmark_kpis: portfolioContext.benchmarkKPIs || {},
          performance_history_len: portfolioContext.performanceHistory?.length || 0,
        }
      })
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.response }])
    } catch (err) {
      setError(err.response?.data?.detail || 'Analyst connection lost. Check backend API keys.')
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  // ─── IMMERSIVE MODE ────────────────────────────────────────────────────────
  if (mode === 'immersive') {
    return (
      <div className="grid grid-cols-[1fr_340px] h-[calc(100vh-120px)] border border-border-2 bg-surface overflow-hidden font-sans rounded-none">
        {/* Left Column: Chat Workspace */}
        <div className="flex flex-col h-full border-r border-border-2">
          
          {/* Header */}
          <div className="px-5 py-4 bg-bg border-b border-border-2 flex items-center gap-2">
            <Sparkles size={16} className="text-green" />
            <span className="text-[11px] font-extrabold font-mono text-white tracking-widest uppercase">
              ✦ IMMERSIVE AI COPILOT WORKSTATION
            </span>
          </div>

          {/* Conversation list */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
            {messages.length === 0 ? (
              <div className="m-auto max-w-[520px] text-center py-10 px-5">
                <div className="inline-block p-4 bg-surface-3 border border-border-2 mb-5">
                  <Sparkles size={32} className="text-text-2" />
                </div>
                <h2 className="text-[18px] font-black text-white mb-2 tracking-tight">
                  Quant Portfolio Intelligence
                </h2>
                <p className="text-[12px] text-text-3 leading-relaxed mb-6">
                  The active backtest results, holdings weights, sector parameters, and metrics are hydrated directly into the copilot LLM workspace. Ask questions to optimize your strategy.
                </p>
                
                <div className="text-left">
                  <div className="text-[9px] font-black text-text-3 font-mono uppercase tracking-widest mb-3">
                    Suggested Questions
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {chips.map(chip => (
                      <button
                        key={chip}
                        onClick={() => sendMessage(chip)}
                        className="text-left p-3 bg-surface-3 border border-border-2 text-text-2 font-mono text-[10px] cursor-pointer leading-normal transition-all duration-150 hover:border-text-3 hover:text-white hover:bg-surface-2 rounded-none"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isUser = msg.role === 'user'
                return (
                  <div key={i} className={`p-4 ${isUser ? 'bg-surface-2 border-l-2 border-border-3' : 'bg-surface-3 border-l-2 border-green'}`}>
                    <div className={`text-[9px] font-black font-mono tracking-wider uppercase mb-2 ${isUser ? 'text-text-3' : 'text-green'}`}>
                      {isUser ? 'User Prompt' : 'Quant Copilot'}
                    </div>
                    <div className={`text-[12px] font-mono leading-relaxed white-space-pre-wrap ${isUser ? 'text-text-2' : 'text-text'}`}>
                      {msg.content}
                    </div>
                  </div>
                )
              })
            )}

            {loading && (
              <div className="p-4 bg-surface-3 border-l-2 border-green animate-pulse">
                <div className="text-[9px] font-black font-mono text-green tracking-wider uppercase mb-2">
                  Quant Copilot
                </div>
                <div className="text-[12px] font-mono text-text-3">
                  Synthesizing portfolio metrics and correlation matrices...
                </div>
              </div>
            )}
          </div>

          {/* Action Input Area */}
          <div className="p-5 bg-bg border-t border-border-2">
            {error && (
              <div className="p-3 bg-[#1a0a0a] border border-[#3a1010] text-red text-[11px] font-mono mb-3 flex items-start gap-2">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Ask Copilot about risk parameters, covariance alignment, or optimization tips..."
                disabled={loading}
                className="flex-1 px-4 py-3 bg-surface border border-border-2 text-text text-[12px] font-mono outline-none rounded-none focus:border-border-3"
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="px-6 bg-white text-bg border-none text-[11px] font-black font-mono uppercase cursor-pointer flex items-center justify-center rounded-none disabled:opacity-40 disabled:cursor-not-allowed hover:bg-text"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Quant Context Monitor */}
        <div className="flex flex-col h-full overflow-y-auto bg-surface-2 p-6 border-l border-border-2">
          <div className="text-[10px] font-black font-mono text-white tracking-widest uppercase mb-5">
            ✦ HYDRATED CTX LOG
          </div>

          <div className="flex flex-col gap-3 mb-6">
            <div className="bg-surface-3 border border-border-2 p-3 rounded-none">
              <div className="text-[9px] font-mono text-text-3 uppercase mb-1 tracking-wider">Ctx Source View</div>
              <div className="text-[12px] font-bold text-white font-mono">{currentView.toUpperCase()}</div>
            </div>

            <div className="bg-surface-3 border border-border-2 p-3 rounded-none">
              <div className="text-[9px] font-mono text-text-3 uppercase mb-1 tracking-wider">Active Positions</div>
              <div className="text-[16px] font-bold text-white font-mono">
                {portfolioContext.holdings?.length ?? 0} Assets
              </div>
            </div>

            {portfolioContext.strategyKPIs?.CAGR && (
              <div className="bg-surface-3 border border-border-2 p-3 rounded-none">
                <div className="text-[9px] font-mono text-text-3 uppercase mb-1 tracking-wider">Backtest CAGR</div>
                <div className="text-[16px] font-bold text-green font-mono">
                  {portfolioContext.strategyKPIs.CAGR}
                </div>
              </div>
            )}
          </div>

          <div className="text-[9px] font-black font-mono text-text-3 tracking-wider uppercase mb-3.5">
            Active Allocations (Top 12)
          </div>
          <div className="flex flex-col gap-1.5">
            {(portfolioContext.holdings || []).slice(0, 12).map(h => (
              <div key={h.ticker} className="flex justify-between p-2 bg-surface-3 border border-border-2 text-[10px] font-mono rounded-none">
                <span className="font-bold text-white">{h.ticker}</span>
                <span className="text-text-2">
                  {h.weight != null ? `${(h.weight * 100).toFixed(1)}%` : '—'}
                </span>
              </div>
            ))}
            {(portfolioContext.holdings || []).length > 12 && (
              <div className="text-[10px] text-text-3 font-mono text-center mt-2">
                + {(portfolioContext.holdings || []).length - 12} more assets
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ─── COLLAPSIBLE FULL-HEIGHT SIDE-DRAWER MODE ──────────────────────────────
  return (
    <div 
      className={`fixed top-0 right-0 bottom-0 w-[450px] border-l border-border-2 bg-surface shadow-2xl flex flex-col z-[999] transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
      style={{ height: '100vh' }}
    >
      {/* Header */}
      <div className="px-5 py-4.5 bg-bg border-b border-border-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-green" />
          <span className="text-[10px] font-extrabold font-mono text-white tracking-widest uppercase">
            AI Copilot Analyst
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[9px] text-text-3 font-mono">
            <span className="width-[6px] height-[6px] bg-green inline-block animate-pulse" />
            <span>Active context</span>
          </div>
          <button 
            onClick={onClose}
            className="background-none border-none text-text-3 cursor-pointer p-1 flex items-center justify-center"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Main Conversation Scrollable Box */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 scroll-smooth"
      >
        {messages.length === 0 && (
          <div className="m-auto py-5 flex flex-col items-center text-center">
            <div className="p-3 bg-surface-3 border border-border-2 mb-4">
              <Sparkles size={22} className="text-text-2" />
            </div>
            <h4 className="text-[13px] font-bold text-white mb-1.5 font-sans">
              Ask anything about your workspace
            </h4>
            <p className="text-[10px] text-text-3 max-w-[240px] leading-relaxed mb-5 font-sans">
              Analyzing active {portfolioContext.holdings?.length || 0} holdings and current {currentView} context.
            </p>

            <div className="w-full text-left">
              <div className="text-[8px] font-extrabold text-text-3 tracking-wider mb-2 font-mono uppercase">
                Suggested Questions
              </div>
              <div className="flex flex-col gap-2">
                {chips.map(chip => (
                  <button
                    key={chip}
                    onClick={() => sendMessage(chip)}
                    className="w-full text-left p-3 text-[10px] text-text-2 bg-surface-3 border border-border-2 cursor-pointer font-mono leading-normal hover:border-text-3 hover:text-white rounded-none"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.length > 0 && messages.map((msg, i) => {
          const isUser = msg.role === 'user'
          return (
            <div 
              key={i} 
              className={`p-3 ${isUser ? 'bg-surface-2 border-l border-border-3' : 'bg-surface-3 border-l border-green'}`}
            >
              <div className={`text-[8px] font-extrabold font-mono tracking-wider uppercase mb-1.5 ${isUser ? 'text-text-3' : 'text-green'}`}>
                {isUser ? 'User Prompt' : 'Analyst Copilot'}
              </div>
              <div className={`text-[11px] leading-relaxed font-mono white-space-pre-wrap ${isUser ? 'text-text-2' : 'text-text'}`}>
                {msg.content}
              </div>
            </div>
          )
        })}

        {loading && (
          <div className="p-3 bg-surface-3 border-l border-green animate-pulse">
            <div className="text-[8px] font-extrabold font-mono text-green tracking-wider uppercase mb-1.5">
              Analyst Copilot
            </div>
            <div className="text-[11px] font-mono text-text-3">
              Synthesizing active context...
            </div>
          </div>
        )}
      </div>

      {/* Input Action Bar */}
      <div className="p-4 bg-bg border-t border-border-2 flex-shrink-0">
        {error && (
          <div className="p-2.5 bg-[#1a0a0a] border border-[#3a1010] text-red text-[10px] mb-2.5 font-mono flex items-start gap-1.5">
            <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Ask AI Copilot..."
            disabled={loading}
            className="flex-1 px-3 py-2.5 bg-surface border border-border-2 text-text text-[11px] font-mono outline-none rounded-none focus:border-border-3"
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="px-3 bg-white text-bg border-none text-[10px] font-bold font-mono uppercase cursor-pointer flex items-center justify-center rounded-none disabled:opacity-40 disabled:cursor-not-allowed hover:bg-text"
          >
            <Send size={11} />
          </button>
        </div>
      </div>
    </div>
  )
}
