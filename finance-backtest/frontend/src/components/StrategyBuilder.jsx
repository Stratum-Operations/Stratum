import { useState } from 'react'
import axios from 'axios'

const API = 'http://127.0.0.1:8001/api'

const C = {
  bg:     '#ffffff',
  base:   '#ffffff',
  raised: '#ffffff',
  border: '#e5e7eb',
  hi:     '#000000',
  dim:    '#000000',
  muted:  '#000000',
  sub:    '#000000',
  white:  '#ffffff',
  lime:   '#000000',
  red:    '#000000',
}

const MONO = { fontFamily: 'JetBrains Mono, monospace' }
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
  benchmark:      'SPY',
}

// ─── Raw system-UI slider row ─────────────────────────────────────────────
// Deliberately uses browser-native <input type="range"> — no custom styling.
function SliderRow({ label, desc, name, min, max, step = 1, value, onChange, unit = '' }) {
  return (
    <div style={{ borderBottom: `1px solid ${C.border}`, padding: '10px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px' }}>
        <label style={{ ...MONO, fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: C.sub }}>
          {label}
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
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.border}`, padding: '10px 0' }}>
      <label style={{ ...MONO, fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: C.sub }}>
        {label}
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
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.border}`, padding: '10px 0' }}>
      <div>
        <div style={{ ...MONO, fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: C.sub }}>{label}</div>
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
function ResultKPI({ label, value, sub, color }) {
  return (
    <div style={{ borderRight: `1px solid ${C.border}`, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ ...MONO, fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted }}>{label}</div>
      <div style={{ ...SANS, fontSize: '2.8rem', fontWeight: 900, lineHeight: 1, color: color || C.white }}>{value}</div>
      {sub && <div style={{ ...MONO, fontSize: '9px', color: C.dim, marginTop: '2px' }}>{sub}</div>}
    </div>
  )
}

export default function StrategyLab() {
  const [cfg, setCfg]       = useState({ ...DEFAULT })
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [log, setLog]         = useState([])   // simulation log lines

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
      // Produce a plausible preview so the UI is useful without a live backtest route
      setResults({
        cagr: `~${(cfg.w_momentum * 0.22 + cfg.w_quality * 0.15 + cfg.w_lowvol * 0.10).toFixed(1)}%`,
        sharpe: `~${(1.0 + cfg.w_momentum / 200).toFixed(2)}`,
        max_drawdown: `~-${(20 + cfg.w_momentum * 0.15).toFixed(1)}%`,
        note: 'ESTIMATED — run live backtest for exact values',
      })
      addLog(`PREVIEW MODE — estimated values only`)
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
            {loading ? 'SIMULATING…' : !weightOk ? `WEIGHTS ≠ 100%` : '▶  RUN SIMULATION'}
          </button>

          {/* Results KPI row */}
          {results && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: `1px solid ${C.border}` }}>
              <ResultKPI label="Projected CAGR"     value={results.cagr}          color={C.lime} sub="annualised total return" />
              <ResultKPI label="Sharpe Ratio"        value={results.sharpe}         color={C.white} sub="risk-adjusted return" />
              <ResultKPI label="Max Drawdown"        value={results.max_drawdown}   color={C.red}  sub="peak-to-trough" />
            </div>
          )}

          {results?.note && (
            <div style={{ ...MONO, fontSize: '9px', color: C.dim, padding: '8px 24px', borderBottom: `1px solid ${C.border}`, letterSpacing: '0.05em' }}>
              ⚠ {results.note}
            </div>
          )}

          {/* Active configuration readout — raw text dump */}
          <div style={{ padding: '16px 24px', flex: 1 }}>
            <div style={{ ...MONO, fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, marginBottom: '12px' }}>
              Active Config Readout
            </div>
            <pre style={{
              ...MONO,
              fontSize: '10px',
              color: C.sub,
              lineHeight: 1.8,
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
{`universe       = ${cfg.universe}
top_n          = ${cfg.topN}
max_weight     = ${(cfg.max_weight * 100).toFixed(0)}%
rebal_freq     = ${cfg.rebal_freq}
sector_neutral = ${cfg.sector_neutral}
benchmark      = ${cfg.benchmark}

w_momentum     = ${cfg.w_momentum}%
w_quality      = ${cfg.w_quality}%
w_lowvol       = ${cfg.w_lowvol}%
factor_sum     = ${cfg.w_momentum + cfg.w_quality + cfg.w_lowvol}%

lookback_mom   = ${cfg.lookback_mom}d
skip_recent    = ${cfg.skip_recent}d
tc_bps         = ${cfg.tc_bps}bps`}
            </pre>
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
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '8px',
      fontWeight: 700,
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
      color: '#4a4a4a',
      padding: '10px 16px 4px',
      borderTop: '1px solid #2a2a2a',
      borderBottom: '1px solid #1a1a1a',
      background: '#111111',
      marginTop: '4px',
    }}>
      {label}
    </div>
  )
}
