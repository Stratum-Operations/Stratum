import { useState, useMemo } from 'react'
import axios from 'axios'

const API = 'http://127.0.0.1:8001/api'

const C = {
  bg:     'var(--bg)',
  base:   'var(--surface)',
  raised: 'var(--surface-2)',
  border: 'var(--border)',
  hi:     'var(--text-strong)',
  dim:    'var(--text-2)',
  muted:  'var(--text-3)',
  sub:    'var(--text)',
  white:  'var(--text)',
  lime:   'var(--green)',
  red:    'var(--red)',
}

const MONO = { fontFamily: 'Geist Mono, monospace' }
const SANS = { fontFamily: 'Space Grotesk, sans-serif' }

// ─── Defaults ────────────────────────────────────────────────────────────
const DEFAULT = {
  universe:       'SP500',
  topN:           15,
  lookback_mom:   252,
  skip_recent:    21,
  rebal_freq:     'Monthly',
  sector_neutral: true,
  w_momentum:     40,
  w_quality:      30,
  w_lowvol:       30,
  max_weight:     0.10,
  tc_bps:         20,
  comm_flat:      1.0,
  tax_drag:       1.0,
  benchmark:      'SPY',
}

const PARAM_EXPLANATIONS = {
  topN: "Controls portfolio concentration. Lower values focus capital on top alpha picks (higher potential return, higher specific risk), while higher values increase diversification.",
  max_weight: "Maximum allocation allowed per stock. Restricts the QP optimizer from over-concentrating in single names, limiting single-stock drawdown risk.",
  w_momentum: "Weight assigned to momentum scoring (6M + 12M Z-scores). High momentum captures strong persistent trends but can suffer during sharp market reversals.",
  w_quality: "Weight assigned to quality metrics (high ROE, low Debt/Equity, high FCF margin). Focuses capital on financially stable, cash-flow generative firms.",
  w_lowvol: "Weight assigned to low volatility (inverse Z-scores of 252-day realized volatility). Tends to favor utility/defensive stocks, lowering overall portfolio beta.",
  lookback_mom: "The historical window length in trading days (252 days = 1 year) used to calculate price momentum. Longer lookbacks capture secular trends; shorter capture tactical shifts.",
  skip_recent: "Excludes the most recent trading days from the momentum calculation to filter out short-term mean reversion and technical reversal effects.",
  tc_bps: "Slippage and transaction costs in basis points (1 bp = 0.01%) applied to portfolio rebalance turnover, reducing simulated backtest returns to model real execution friction.",
  comm_flat: "Flat commission cost per trade in dollars. Multiplied by turnover to simulate how broker execution fees drain portfolio performance.",
  tax_drag: "Annual tax drag percentage (e.g. 1.0%). Models capital gains tax drag, especially significant for high-turnover weekly or monthly rebalanced portfolios.",
  universe: "The investment universe of stocks available for selection and ranking by the optimizer.",
  benchmark: "The passive index against which active strategy returns, alpha, tracking error, and information ratio are benchmarked.",
  rebal_freq: "How frequently the optimizer re-evaluates the signal ranks and re-allocates portfolio weights (affects turnover and trading costs).",
  sector_neutral: "When active, constrains the optimizer to maintain equal sector exposures to eliminate sector bets and isolate pure stock-selection alpha."
}

const METRIC_EXPLANATIONS = {
  "Projected CAGR": "Compound Annual Growth Rate: The simulated geometric mean rate of return that the strategy generates per year over the backtest period.",
  "Sharpe Ratio": "A measure of risk-adjusted return, calculated as simulated excess return over risk-free rate divided by standard deviation of returns.",
  "Sortino Ratio": "A variation of the Sharpe ratio that differentiates harmful volatility from total volatility by using the strategy's downside deviation.",
  "Profit Factor": "The ratio of gross profits to gross losses. A value greater than 1.0 indicates that the strategy's gains exceeded its losses.",
  "Max Drawdown": "The maximum peak-to-trough drop in portfolio value, representing the largest simulated peak loss experienced by the strategy."
}

// ─── Raw system-UI slider row ─────────────────────────────────────────────
// Deliberately uses browser-native <input type="range"> — no custom styling.
function SliderRow({ label, desc, name, min, max, step = 1, value, onChange, unit = '' }) {
  const explanation = PARAM_EXPLANATIONS[name] || '';
  return (
    <div style={{ borderBottom: `1px solid ${C.border}`, padding: '10px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px' }}>
        <label 
          title={explanation}
          style={{ ...MONO, fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: C.sub, cursor: 'help' }}
        >
          {label} <span style={{ opacity: 0.5, fontSize: '9px', marginLeft: '3px' }}>ⓘ</span>
        </label>
        {/* Number input — raw, no decoration */}
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(name, parseFloat(e.target.value) || 0)}
          style={{
            ...MONO,
            background: 'transparent',
            border: 'none',
            borderBottom: `1px solid ${C.dim}`,
            color: C.white,
            fontSize: '13px',
            fontWeight: 700,
            width: '60px',
            textAlign: 'right',
            outline: 'none',
          }}
        />
      </div>
      {/* Native browser range slider — zero custom styling */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(name, parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: C.lime, cursor: 'pointer' }}
      />
      {desc && (
        <div style={{ ...MONO, fontSize: '8px', color: C.dim, marginTop: '2px', letterSpacing: '0.04em' }}>{desc}</div>
      )}
    </div>
  )
}

// ─── Native select row ────────────────────────────────────────────────────
function SelectRow({ label, name, value, options, onChange }) {
  const explanation = PARAM_EXPLANATIONS[name] || '';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.border}`, padding: '10px 0' }}>
      <label 
        title={explanation}
        style={{ ...MONO, fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: C.sub, cursor: 'help' }}
      >
        {label} <span style={{ opacity: 0.5, fontSize: '9px', marginLeft: '3px' }}>ⓘ</span>
      </label>
      {/* Unstyled native select */}
      <select
        value={value}
        onChange={e => onChange(name, e.target.value)}
        style={{
          ...MONO,
          background: C.raised,
          border: `1px solid ${C.dim}`,
          color: C.white,
          fontSize: '11px',
          padding: '3px 6px',
          outline: 'none',
          cursor: 'pointer',
        }}
      >
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  )
}

// ─── Checkbox row ─────────────────────────────────────────────────────────
function CheckRow({ label, desc, name, value, onChange }) {
  const explanation = PARAM_EXPLANATIONS[name] || '';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.border}`, padding: '10px 0' }}>
      <div>
        <div 
          title={explanation}
          style={{ ...MONO, fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: C.sub, cursor: 'help' }}
        >
          {label} <span style={{ opacity: 0.5, fontSize: '9px', marginLeft: '3px' }}>ⓘ</span>
        </div>
        {desc && <div style={{ ...MONO, fontSize: '8px', color: C.dim, marginTop: '2px' }}>{desc}</div>}
      </div>
      {/* Native checkbox — untouched */}
      <input
        type="checkbox"
        checked={value}
        onChange={e => onChange(name, e.target.checked)}
        style={{ width: '16px', height: '16px', accentColor: C.lime, cursor: 'pointer' }}
      />
    </div>
  )
}

// ─── Weight total validation ──────────────────────────────────────────────
function WeightSum({ mom, qual, vol }) {
  const sum = mom + qual + vol
  const ok  = sum === 100
  return (
    <div style={{ ...MONO, fontSize: '9px', padding: '6px 0', color: ok ? C.lime : C.red, letterSpacing: '0.08em', borderBottom: `1px solid ${C.border}` }}>
      FACTOR SUM: {sum}% {ok ? '✓' : `— MUST EQUAL 100 (off by ${sum - 100}%)`}
    </div>
  )
}

// ─── Result KPI cell ─────────────────────────────────────────────────────
function ResultKPI({ label, value, benchVal, benchName, sub, color }) {
  const explanation = METRIC_EXPLANATIONS[label] || '';
  return (
    <div 
      title={explanation}
      style={{ borderRight: `1px solid ${C.border}`, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'help' }}
    >
      <div style={{ ...MONO, fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted }}>
        {label} <span style={{ opacity: 0.5, fontSize: '8px', marginLeft: '2.5px' }}>ⓘ</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ ...SANS, fontSize: '2.8rem', fontWeight: 900, lineHeight: 1, color: color || C.white }}>{value}</div>
        {benchVal && (
          <div style={{ ...MONO, fontSize: '10px', color: C.dim }}>
            vs {benchName}: {benchVal}
          </div>
        )}
      </div>
      {sub && <div style={{ ...MONO, fontSize: '9px', color: C.dim, marginTop: '2px' }}>{sub}</div>}
    </div>
  )
}

export default function StrategyLab() {
  const [cfg, setCfg]       = useState({ ...DEFAULT })
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [log, setLog]         = useState([])   // simulation log lines

  const benchStats = useMemo(() => {
    if (cfg.benchmark === 'QQQ') {
      return { cagr: '17.50%', sharpe: '1.30', max_drawdown: '-22.30%' }
    } else if (cfg.benchmark === 'IWB') {
      return { cagr: '12.10%', sharpe: '1.05', max_drawdown: '-19.20%' }
    } else { // SPY
      return { cagr: '13.12%', sharpe: '1.10', max_drawdown: '-18.11%' }
    }
  }, [cfg.benchmark])

  const set = (k, v) => setCfg(prev => ({ ...prev, [k]: v }))

  const addLog = (line) => setLog(prev => [`[${new Date().toLocaleTimeString()}] ${line}`, ...prev.slice(0, 19)])

  const runSim = async () => {
    const sum = cfg.w_momentum + cfg.w_quality + cfg.w_lowvol
    if (sum !== 100) { addLog(`ERROR: Factor weights sum to ${sum}, must be 100`); return }
    setLoading(true); setResults(null)
    addLog(`RUN STARTED — universe=${cfg.universe} topN=${cfg.topN} freq=${cfg.rebal_freq}`)
    try {
      const res = await axios.post(`${API}/backtest`, cfg)
      setResults(res.data)
      addLog(`DONE — CAGR=${res.data.cagr} Sharpe=${res.data.sharpe} DD=${res.data.max_drawdown}`)
    } catch (e) {
      addLog(`ENDPOINT NOT AVAILABLE (${e.message}) — showing preview only`)
      // Calculate realistic friction drag on the preview simulation
      const freqMult = cfg.rebal_freq === 'Weekly' ? 2.5 : cfg.rebal_freq === 'Monthly' ? 1.0 : 0.4
      const tcDrag = (cfg.tc_bps / 100) * 0.15 * freqMult
      const commDrag = (cfg.comm_flat * 0.05 * freqMult)
      const taxDrag = cfg.tax_drag // e.g. 1.0% drag is direct subtraction
      const totalDrag = tcDrag + commDrag + taxDrag

      const baseCagr = cfg.w_momentum * 0.22 + cfg.w_quality * 0.15 + cfg.w_lowvol * 0.10
      const finalCagr = Math.max(0, baseCagr * 100 - totalDrag)
      const baseSharpe = 1.0 + cfg.w_momentum / 200
      const finalSharpe = Math.max(0, baseSharpe * (1.0 - totalDrag / 15.0))
      const finalSortino = Math.max(0.1, finalSharpe * 1.4)
      const finalPf = Math.max(0.5, 1.25 + finalCagr / 100.0 - totalDrag / 15.0)
      const baseDd = 20 + cfg.w_momentum * 0.15
      const finalDd = baseDd * (1.0 + totalDrag / 20.0)

      setResults({
        cagr: `${finalCagr.toFixed(2)}%`,
        sharpe: `${finalSharpe.toFixed(2)}`,
        sortino: `${finalSortino.toFixed(2)}`,
        profit_factor: `${finalPf.toFixed(2)}`,
        max_drawdown: `-${finalDd.toFixed(2)}%`,
        note: `PREVIEW (Friction Applied: ${totalDrag.toFixed(2)}% total annual drag)`,
      })
      addLog(`PREVIEW MODE — estimated values with friction model only`)
    }
    setLoading(false)
  }

  const savePreset = () => {
    const name = prompt('Preset name:')
    if (!name) return
    const stored = JSON.parse(localStorage.getItem('strategy_presets') || '{}')
    stored[name] = cfg
    localStorage.setItem('strategy_presets', JSON.stringify(stored))
    addLog(`PRESET SAVED: "${name}"`)
  }

  const loadPreset = () => {
    const stored = JSON.parse(localStorage.getItem('strategy_presets') || '{}')
    const keys = Object.keys(stored)
    if (!keys.length) { addLog('NO PRESETS SAVED'); return }
    const name = prompt(`Load preset:\n${keys.join(', ')}`)
    if (stored[name]) { setCfg({ ...DEFAULT, ...stored[name] }); addLog(`PRESET LOADED: "${name}"`) }
    else addLog(`PRESET NOT FOUND: "${name}"`)
  }

  const resetCfg = () => { setCfg({ ...DEFAULT }); setResults(null); addLog('CONFIG RESET TO DEFAULTS') }

  const weightOk = cfg.w_momentum + cfg.w_quality + cfg.w_lowvol === 100

  return (
    <div style={{ background: C.bg, color: C.white, minHeight: '100%', fontSize: '12px' }}>

      {/* ══ HEADER BAND ══════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: `2px solid ${C.hi}`, background: C.base, ...MONO }}>
        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
          Strategy Lab — Parameter Workbench
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[['RESET', resetCfg], ['SAVE', savePreset], ['LOAD', loadPreset]].map(([l, fn]) => (
            <button key={l} onClick={fn}
              style={{ background: 'none', border: `1px solid ${C.border}`, color: C.muted, padding: '3px 12px', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', ...MONO }}
            >{l}</button>
          ))}
        </div>
      </div>

      {/* ══ BODY — DELIBERATELY ASYMMETRIC ═══════════════════════════════ */}
      {/* Sidebar is wider than typical. Results panel is tall. Log is off-center. */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr 260px' }}>

        {/* ─── LEFT: PARAMETER SIDEBAR ─────────────────────────────────── */}
        <div style={{ borderRight: `1px solid ${C.border}`, padding: '0 0 40px 0', overflowY: 'auto', maxHeight: 'calc(100vh - 300px)' }}>

          {/* Section: Universe */}
          <SectionHead label="01 — Universe & Scope" />
          <div style={{ padding: '0 16px' }}>
            <SelectRow label="Target Universe" name="universe" value={cfg.universe} onChange={set}
              options={[{ v: 'SP500', l: 'S&P 500' }, { v: 'NASDAQ100', l: 'Nasdaq 100' }, { v: 'RUSSELL1000', l: 'Russell 1000' }]}
            />
            <SliderRow label="Top-N Holdings" desc="Portfolio concentration (stocks held)" name="topN" min={5} max={50} value={cfg.topN} onChange={set} />
            <SliderRow label="Max Position %" desc="Single-stock weight ceiling (QP constraint)" name="max_weight" min={0.02} max={0.25} step={0.01} value={cfg.max_weight} onChange={set} unit="x" />
            <SelectRow label="Benchmark" name="benchmark" value={cfg.benchmark} onChange={set}
              options={[{ v: 'SPY', l: 'SPY (S&P 500)' }, { v: 'QQQ', l: 'QQQ (Nasdaq)' }, { v: 'IWB', l: 'IWB (Russell 1000)' }]}
            />
          </div>

          {/* Section: Factor Weights */}
          <SectionHead label="02 — Factor Weights" />
          <div style={{ padding: '0 16px' }}>
            <WeightSum mom={cfg.w_momentum} qual={cfg.w_quality} vol={cfg.w_lowvol} />
            <SliderRow label="Momentum %" desc="6M + 12M price momentum Z-score" name="w_momentum" min={0} max={100} value={cfg.w_momentum} onChange={set} />
            <SliderRow label="Quality %" desc="ROE · D/E · FCF margin composite Z-score" name="w_quality" min={0} max={100} value={cfg.w_quality} onChange={set} />
            <SliderRow label="Low-Vol %" desc="Inverse realised volatility Z-score" name="w_lowvol" min={0} max={100} value={cfg.w_lowvol} onChange={set} />
          </div>

          {/* Section: Momentum params */}
          <SectionHead label="03 — Momentum Signal" />
          <div style={{ padding: '0 16px' }}>
            <SliderRow label="Lookback (days)" desc="Formation window for price momentum" name="lookback_mom" min={60} max={504} step={21} value={cfg.lookback_mom} onChange={set} />
            <SliderRow label="Skip Recent (days)" desc="Reversal skip at end of window" name="skip_recent" min={0} max={63} step={5} value={cfg.skip_recent} onChange={set} />
          </div>

          {/* Section: Execution */}
          <SectionHead label="04 — Execution & Friction" />
          <div style={{ padding: '0 16px' }}>
            <SelectRow label="Rebalance Freq" name="rebal_freq" value={cfg.rebal_freq} onChange={set}
              options={[{ v: 'Weekly', l: 'Weekly' }, { v: 'Monthly', l: 'Monthly' }, { v: 'Quarterly', l: 'Quarterly' }]}
            />
            <SliderRow label="TC Cost (bps)" desc="Round-trip transaction cost estimate" name="tc_bps" min={0} max={100} value={cfg.tc_bps} onChange={set} />
            <SliderRow label="Flat Comm ($)" desc="Flat broker commission fee per trade" name="comm_flat" min={0} max={10} step={0.5} value={cfg.comm_flat} onChange={set} unit="$" />
            <SliderRow label="Tax Drag (%)" desc="Annualized tax drag assumption" name="tax_drag" min={0} max={5} step={0.1} value={cfg.tax_drag} onChange={set} unit="%" />
            <CheckRow label="Sector Neutral" desc="Enforce equal sector weights in optimizer" name="sector_neutral" value={cfg.sector_neutral} onChange={set} />
          </div>
        </div>

        {/* ─── CENTRE: RESULTS + RUN BUTTON ────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', borderRight: `1px solid ${C.border}` }}>

          {/* Big RUN button — full-width, stark */}
          <button
            onClick={runSim}
            disabled={loading || !weightOk}
            style={{
              ...SANS,
              display: 'block',
              width: '100%',
              background:    loading      ? C.raised
                           : !weightOk   ? C.raised
                           : C.lime,
              color:         loading || !weightOk ? C.dim : '#000000',
              fontSize:      loading ? '18px' : '28px',
              fontWeight:    900,
              letterSpacing: '-0.01em',
              textTransform: 'uppercase',
              border:        'none',
              padding:       '28px 32px',
              cursor:        loading || !weightOk ? 'not-allowed' : 'pointer',
              borderBottom:  `2px solid ${C.border}`,
              textAlign:     'left',    // asymmetric: label is left-aligned
            }}
          >
            {loading ? 'SIMULATING…' : !weightOk ? `FACTOR WEIGHTS MUST EQUAL 100%` : 'RUN STRATEGY SIMULATION'}
          </button>

          {/* Results KPI row */}
          {results && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', borderBottom: `1px solid ${C.border}` }}>
              <ResultKPI label="Projected CAGR"     value={results.cagr}          benchVal={benchStats.cagr}          benchName={cfg.benchmark} color={C.lime}  sub="annualised total return" />
              <ResultKPI label="Sharpe Ratio"        value={results.sharpe}        benchVal={benchStats.sharpe}        benchName={cfg.benchmark} color={C.white} sub="risk-adjusted return" />
              <ResultKPI label="Sortino Ratio"       value={results.sortino || (parseFloat(results.sharpe) * 1.4).toFixed(2)} benchVal={cfg.benchmark === 'QQQ' ? '1.60' : cfg.benchmark === 'IWB' ? '1.10' : '1.32'} benchName={cfg.benchmark} color={C.white} sub="downside risk adjusted" />
              <ResultKPI label="Profit Factor"       value={results.profit_factor || (1.25 + parseFloat(results.cagr) / 100).toFixed(2)} benchVal={cfg.benchmark === 'QQQ' ? '1.35' : cfg.benchmark === 'IWB' ? '1.15' : '1.25'} benchName={cfg.benchmark} color={C.white} sub="gross gains / gross losses" />
              <ResultKPI label="Max Drawdown"        value={results.max_drawdown}  benchVal={benchStats.max_drawdown}  benchName={cfg.benchmark} color={C.red}   sub="peak-to-trough" />
            </div>
          )}

          {results?.note && (
            <div style={{ ...MONO, fontSize: '9px', color: C.dim, padding: '8px 24px', borderBottom: `1px solid ${C.border}`, letterSpacing: '0.05em' }}>
              ⚠ {results.note}
            </div>
          )}

          <div style={{ padding: '16px 24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: C.muted, fontSize: '11px', textAlign: 'center' }}>
            <div>Configure parameters in the left panel and click RUN to execute the strategy simulation.</div>
          </div>
        </div>

        {/* ─── RIGHT: SIMULATION LOG ───────────────────────────────────── */}
        {/* Intentionally off-centre at 260px — experimental asymmetry */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}`, background: C.raised, ...MONO, fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted }}>
            Simulation Log
          </div>
          <div style={{ flex: 1, padding: '8px 12px', overflowY: 'auto', maxHeight: 'calc(100vh - 320px)' }}>
            {log.length === 0 ? (
              <div style={{ ...MONO, fontSize: '9px', color: C.dim, marginTop: '8px' }}>— no events —</div>
            ) : log.map((line, i) => (
              <div key={i} style={{ ...MONO, fontSize: '9px', color: i === 0 ? C.sub : C.dim, lineHeight: 1.8, borderBottom: `1px solid #1a1a1a`, padding: '3px 0', letterSpacing: '0.02em' }}>
                {line}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Section label ────────────────────────────────────────────────────────
function SectionHead({ label }) {
  return (
    <div style={{
      fontFamily: 'Geist Mono, monospace',
      fontSize: '8px',
      fontWeight: 700,
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
      color: 'var(--text-3)',
      padding: '10px 16px 4px',
      borderTop: '1px solid var(--border)',
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface-2)',
      marginTop: '4px',
    }}>
      {label}
    </div>
  )
}
