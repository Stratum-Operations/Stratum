# Phineus Design System & Wireframe

*Compiled from UI research across Bloomberg Terminal, Linear, Vercel, Stripe, Mercury Bank,
Koyfin, Raycast, Arc Browser, and 30+ published design system breakdowns.*

---

## PART 1 — AUDIT: WHAT'S WRONG RIGHT NOW

### Critical Issues (vibe-coded tells)

| Issue | Location | Evidence |
|---|---|---|
| Body gradient `linear-gradient(180deg, #f8fafc 0%, var(--bg) 42%...)` | App.css:69 | Purely decorative, zero function |
| 3 competing typefaces in one view | App.css | IBM Plex Sans + Inter + JetBrains Mono + Roboto Mono |
| `backdrop-filter: blur(18px)` on top bar | App.css:103 | Glassmorphism for decoration only |
| `box-shadow: 0 12px 32px rgba(...)` on audit-hero | App.css:256 | 32px spread is decoration, not elevation |
| Arbitrary sidebar width `248px` | App.css:113 | Not on 8pt grid (should be 240 or 256) |
| Asymmetric padding `padding: 12px 14px 4px` | App.css sidebar | Off-scale, non-rhythmic |
| `min-width: 148px` on KPI cells | App.css:147 | Arbitrary, causes overflow on small screens |
| Top bar KPI `letter-spacing: 0.02em` on values | App.css:165 | Values should be tabular-nums, not spaced |
| KPI strip below top bar duplicates top bar KPIs | KpiHeader | Same data shown twice simultaneously |
| Screener loading: plain monospace text in center | AlphaScreener | No skeleton, just text floating in void |
| `text-shadow: none !important` on every element | App.css:64 | Global important override = specificity hack |
| Sidebar section label font-size `10px` | App.css | Below minimum readable size (12px) |
| Dark mode: `--bg: #080a0f` (near-pure black navy) | App.css | Should be dark gray, not near-black |
| Green `#0f9f6e` in light vs dark incompatibility | App.css | Not luminance-adjusted for each theme |
| Rounded pill status badge `border-radius: 999px` | Top bar | Pill shape on a brutalist terminal feels off |
| 4 different icon colors in dashboard KPI cards | Dashboard | Blue, green, teal, blue — no semantic rule |

### Typography Audit

**Current fonts in use:** IBM Plex Sans (body), Inter (values/headings), JetBrains Mono (labels/data), Roboto Mono (status bar) — **four families.**

**Rule violations:**
- `font-size: 9px` on `.sidebar-section-label` — below 12px minimum
- `font-size: 10px` on `.top-bar-status` — below minimum
- `letter-spacing: 0.22em` on screener title — excessive
- Mixed `font-weight: 700` and `font-weight: 800` with no clear system
- `font-size: 17px` for KPI values — off the type scale (should be 16 or 18)

### Spacing Audit

**Arbitrary values found (not on 4pt or 8pt grid):**
- `padding: 0 20px` (fine, 20 = 5×4) but mixed with `padding: 12px 14px 4px`
- `gap: 10px` — not on grid
- `min-width: 148px` — not on grid
- `height: 38px` top search — fine (4.5 × 8, close enough)
- `gap: 2px` in sidebar — fine for icon gaps

---

## PART 2 — DESIGN SYSTEM FOUNDATION

### Philosophy

**Phineus is a professional portfolio evaluation terminal, not a consumer app.**
The design should feel like a tool that belongs alongside Bloomberg and Koyfin —
authoritative, data-dense, restrained. Every pixel earns its place.
No decoration. No gradients. No glow.

Core principle: **System over style.** Every color, weight, and spacing value
comes from the token system. Nothing is arbitrary.

---

### 2.1 Color Tokens

#### Light Theme (`:root`)

```css
/* Backgrounds — 4 elevation levels, warm-neutral, never pure white */
--bg:          #f1f3f7;   /* Page background — slightly cool gray */
--surface:     #ffffff;   /* Primary surface: cards, panels */
--surface-2:   #f7f8fa;   /* Secondary surface: nested elements */
--surface-3:   #eef0f4;   /* Tertiary: hover backgrounds, chips */

/* Borders — 3 levels, never harsh */
--border:      #e4e8ef;   /* Default dividers */
--border-2:    #cdd3de;   /* Stronger emphasis */
--border-3:    #a0aab8;   /* Focused / active elements */

/* Text — 4 levels, strict hierarchy */
--text-strong: #0d1117;   /* Primary: headings, key values */
--text:        #2d3748;   /* Body: labels, descriptions */
--text-2:      #64748b;   /* Secondary: meta, sub-labels */
--text-3:      #94a3b8;   /* Muted: placeholders, disabled */

/* Semantic — status colors, never decorative */
--green:       #16a34a;   /* Profit, up, positive, success */
--green-dim:   #dcfce7;   /* Green backgrounds */
--red:         #dc2626;   /* Loss, down, negative, error */
--red-dim:     #fee2e2;   /* Red backgrounds */
--amber:       #d97706;   /* Warning, neutral alert */
--amber-dim:   #fef3c7;   /* Amber backgrounds */
--blue:        #2563eb;   /* Info, links, primary accent */
--blue-dim:    #dbeafe;   /* Blue backgrounds */

/* Single accent — interactive elements only */
--accent:      #2563eb;   /* CTAs, active states, focus rings */

/* Chart colors — accessible 5-hue palette */
--chart-1:     #2563eb;   /* Primary series */
--chart-2:     #64748b;   /* Comparison/benchmark */
--chart-3:     #16a34a;   /* Secondary positive */
--chart-4:     #d97706;   /* Tertiary / highlight */
--chart-5:     #7c3aed;   /* Quaternary */

/* Semantic aliases for backward compatibility */
--teal:        var(--green);
--white:       #ffffff;
--ink:         var(--text-strong);
--accent-green: var(--green);
--accent-red:   var(--red);
```

#### Dark Theme (`[data-theme="dark"]`)

```css
/* Backgrounds — Mercury Bank / Raycast inspired, NOT pure black */
--bg:          #0d0f14;   /* Page — deep navy-gray, never #000 */
--surface:     #141720;   /* Primary surface: cards, panels */
--surface-2:   #1c2030;   /* Secondary: nested, hover */
--surface-3:   #242840;   /* Tertiary: highlights */

/* Borders */
--border:      #1e2433;   /* Default */
--border-2:    #2a3349;   /* Stronger */
--border-3:    #3d4f6b;   /* Focus / active */

/* Text — off-white, never pure white */
--text-strong: #e8edf5;   /* Headlines — slightly warm off-white */
--text:        #b8c2d8;   /* Body */
--text-2:      #6b7c99;   /* Secondary */
--text-3:      #424f68;   /* Muted */

/* Semantic — luminance-adjusted for dark backgrounds */
--green:       #22c55e;   /* More saturated — pops on dark */
--green-dim:   rgba(34, 197, 94, 0.10);
--red:         #ef4444;
--red-dim:     rgba(239, 68, 68, 0.10);
--amber:       #f59e0b;
--amber-dim:   rgba(245, 158, 11, 0.10);
--blue:        #60a5fa;
--blue-dim:    rgba(96, 165, 250, 0.10);
--accent:      #60a5fa;

/* Chart colors — desaturated for dark mode legibility */
--chart-1:     #60a5fa;
--chart-2:     #64748b;
--chart-3:     #22c55e;
--chart-4:     #f59e0b;
--chart-5:     #a78bfa;

--teal:        var(--green);
--white:       #e8edf5;
--ink:         var(--text-strong);
--accent-green: var(--green);
--accent-red:   var(--red);
```

**Rules:**
1. `--green` / `--red` are **status only** — never used as brand colors
2. `--accent` is **interactive only** — buttons, links, focus rings, active nav
3. Chart colors **always** pair with labels or patterns — never color-only encoding
4. Every color decision must justify itself functionally

---

### 2.2 Typography

**Two families only:**
- **Inter** — UI labels, headings, body text (free, screen-optimized, open apertures)
- **Geist Mono** (fallback: JetBrains Mono) — numeric data, code, ticker symbols

**Drop:** IBM Plex Sans, Roboto Mono — reduce to two families.

#### Type Scale (modular, 8pt-aligned)

| Token | Size | Weight | Use |
|---|---|---|---|
| `--type-2xs` | 11px | 500 | Micro-labels, badges, table sub-rows |
| `--type-xs` | 12px | 500 | Sidebar labels, caption text |
| `--type-sm` | 13px | 400/500 | Body default, table rows |
| `--type-base` | 14px | 400 | Primary body |
| `--type-md` | 16px | 600 | Sub-headings, card titles |
| `--type-lg` | 20px | 700 | Section headings, KPI values |
| `--type-xl` | 24px | 700 | Page headings |
| `--type-2xl` | 32px | 800 | Hero numbers, primary metrics |
| `--type-3xl` | 48px | 800 | Full-page hero (Evaluate Holdings) |

**Weight scale — three stops only:**
- `400` — body, table cells
- `600` — labels, sub-headings, buttons
- `700` — section headings, metric values

**Rules:**
- Numbers in tables: `font-variant-numeric: tabular-nums` always
- Monospace for: all numeric values in charts/tables, ticker symbols, date strings
- Line-height: `1.5` light, `1.625` dark (spacious for extended dark-mode reading)
- No `letter-spacing` on values — only on uppercase category labels (`0.08em` max)
- Minimum rendered size: **12px** — nothing smaller reaches a user

---

### 2.3 Spacing Scale (8pt base, 4pt half-steps)

```
4px   — xs   (icon gap, chip padding)
8px   — sm   (tight item gap, inline padding)
12px  — md   (row padding, label margin)
16px  — lg   (card padding, section item gap)
20px  — xl-  (generous card padding — primary)
24px  — xl   (between-section gap, page padding)
32px  — 2xl  (major section separation)
40px  — 3xl  (page-level vertical rhythm)
48px  — 4xl  (hero sections)
64px  — 5xl  (empty state vertical centering)
```

**Applied constants:**
- Sidebar width: `240px` (on grid)
- Top bar height: `56px` (on grid, was 64px)
- Content max-width: none (full-bleed dashboard)
- Card padding: `16px` or `20px`
- Table row height: `40px` data-dense, `44px` standard
- Section gap: `24px`
- Page internal padding: `24px`

---

### 2.4 Border & Radius

**All sharp — no softness in a financial terminal:**
```
--radius-none: 0px   — tables, section borders, main panels
--radius-sm:   4px   — inputs, select menus, small chips
--radius-md:   6px   — buttons, tooltips
--radius-full: 9999px — status dot only
```

**Drop:** `8px`, `10px`, `12px` radius on cards — too soft, too consumer.

---

### 2.5 Shadow

**Elevation through border, not shadow:**
- Default surfaces: `border: 1px solid var(--border)` only — no shadow
- Elevated overlays (modals, dropdowns): `box-shadow: 0 4px 16px rgba(0,0,0,0.12)` only
- No decorative shadows on cards, panels, or the top bar

**Drop:** `box-shadow: 0 12px 32px ...` — that spread is decoration.

---

### 2.6 Motion

```
--duration-instant: 80ms   — hover color transitions
--duration-fast:    150ms  — state changes (active, focus)
--duration-normal:  200ms  — panel open/close, tab switch
--ease: cubic-bezier(0.16, 1, 0.3, 1)  — ease-out-expo feel
```

- **No animation on chart renders** — charts are data, not UI
- **No bounce/spring** — financial tools feel deliberate
- Sidebar collapse: `150ms` width transition
- Row expand: `150ms` height reveal

---

### 2.7 Interaction States (every element, six states)

For every interactive element — buttons, nav items, table rows, inputs:

| State | Visual |
|---|---|
| Default | Base styles |
| Hover | `background: var(--surface-2)`, `80ms` |
| Focus | `outline: 2px solid var(--accent)`, `outline-offset: 2px` |
| Active | `background: var(--surface-3)` |
| Disabled | `opacity: 0.4`, `cursor: not-allowed` |
| Loading | Skeleton pulse or spinner in element |

---

## PART 3 — WIREFRAMES BY TAB

Each wireframe uses ASCII box notation. Key:
- `[  ]` = clickable button
- `< >` = dropdown/select
- `═══` = divider
- `░░░` = chart area placeholder
- `···` = table rows
- `▶` = expand toggle
- `●` = active state

---

### TAB 1 — EVALUATE HOLDINGS (Entry point / Onboarding)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR           │ MAIN CONTENT                                         │
│ ● Evaluate Hold.  │                                                      │
│                   │  Import your portfolio                               │
│                   │  Connect a broker or paste holdings to get started   │
│                   │                                                      │
│                   │  ┌─────────────────────────┐  ┌────────────────────┐│
│                   │  │  ↑  Drop CSV file        │  │  PREVIEW           ││
│                   │  │                          │  │  ─────────────────  ││
│                   │  │  Drag & drop or browse   │  │  AWAITING DATA      ││
│                   │  │  ticker,shares,cost_basis│  │                     ││
│                   │  └─────────────────────────┘  │  (Empty state:      ││
│                   │                               │   illustration +    ││
│                   │  OR                           │   "Add a CSV or     ││
│                   │                               │    paste holdings   ││
│                   │  ┌─────────────────────────┐  │    to preview")     ││
│                   │  │ AAPL, 100, 155.00        │  │                     ││
│                   │  │ MSFT, 50, 280.00         │  │                     ││
│                   │  │ _                        │  │                     ││
│                   │  └─────────────────────────┘  │                     ││
│                   │                               └────────────────────┘│
│                   │  ─────────────────────────────────────────────────── │
│                   │  Manual entry                                        │
│                   │  ┌────┬────────────┬─────────┬────────────────┐     │
│                   │  │  # │ TICKER     │ SHARES  │ AVG COST       │     │
│                   │  ├────┼────────────┼─────────┼────────────────┤     │
│                   │  │  1 │ e.g. AAPL  │ e.g 100 │ e.g. 150       │     │
│                   │  │  2 │            │         │                │     │
│                   │  └────┴────────────┴─────────┴────────────────┘     │
│                   │  [ + Add row ]                  [ Analyze portfolio ]│
└─────────────────────────────────────────────────────────────────────────┘

Design notes:
- Full-bleed two-column layout: import left, preview right
- Preview panel shows skeleton then live table as data is entered
- "Analyze portfolio" CTA uses --accent, primary button style
- Drop zone uses dashed border, NOT rounded rect with blob shadow
- Empty state: single centered illustration + short copy + no CTA
  (CTA is the drop zone itself)
```

---

### TAB 2 — DASHBOARD (Command Center)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ TOP BAR (56px)                                                           │
│ ● Phineus  │ CAGR +18.4%  │ DD -14.2%  │ Sharpe 1.35  │  [Search] [🌙] │
│            │ vs SPY +6.4% │            │              │                 │
└─────────────────────────────────────────────────────────────────────────┘
┌──────────┬──────────────────────────────────────────────────────────────┐
│ SIDEBAR  │ CONTENT AREA                                                 │
│ 240px    │                                                              │
│          │  ┌── Portfolio Health ───────────────────────────────────┐  │
│ Analysis │  │  Status: ON TRACK ·  15 holdings · Score 0.79        │  │
│  Eval.   │  └───────────────────────────────────────────────────────┘  │
│ ● Dash.  │                                                              │
│  Analyt. │  ┌────────────────────────────────┐ ┌────────────────────┐  │
│  Audit   │  │  GROWTH                        │ │ PORTFOLIO STATUS   │  │
│  Report. │  │  [EQUITY] [DRAWDOWN] [SHARPE]  │ │                    │  │
│          │  │  ─────────────────────────────  │ │ 15 holdings        │  │
│ Research │  │  [☐ 20-day SMA] [✎ Trendline] │ │ 18.42% CAGR        │  │
│  Screen. │  │                                │ │ -14.18% Max DD     │  │
│  Watch.  │  │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░  │ │ SPY benchmark      │  │
│          │  │  $12k                          │ │                    │  │
│ Strategy │  │  $9k                           │ ├────────────────────┤  │
│  Build   │  │  $6k              ─────────── │ │ ACTIVE TICKERS     │  │
│  Stress  │  │                   ··· ··· ·· │ │ AAPL MSFT NVDA     │  │
│          │  │  [6M][1Y][3Y][5Y][ALL]        │ │ GOOGL META AMZN    │  │
│ Trade    │  └────────────────────────────────┘ │ + 9 more           │  │
│  Live    │                                     └────────────────────┘  │
│  Rebal.  │  ┌────────────────────────────────────────────────────────┐  │
│  Orders  │  │  SECTOR EXPOSURE                                       │  │
│          │  │  ░░░░░░░░░ (horizontal bar chart — portfolio vs bench) │  │
│          │  └────────────────────────────────────────────────────────┘  │
│          │                                                              │
│ [Eval.↗] │  ┌──────────────────────┐  ┌──────────────────────────────┐ │
└──────────┘  │ TOP HOLDINGS         │  │ ALLOCATION BREAKDOWN         │ │
              │ NVDA  █████  10.0%  │  │ ░░ (donut chart — sectors)  │ │
              │ META  ████   8.2%   │  │                              │ │
              │ LLY   ███    7.1%   │  └──────────────────────────────┘ │
              └──────────────────────┘                                   │

Design notes:
- Remove standalone KpiHeader strip — data lives in top bar only
- Sandbox demo banner: slim 36px strip, amber color (not red), dismissible
- Chart timeframe buttons [6M][1Y][3Y][5Y][ALL] are underline tabs
- Growth chart: teal line for strategy, gray dashed for SPY — 2 series max
- No hover cards on chart — only tooltip on hover
- Sidebar "Evaluate holdings" shortcut at bottom, subtle
- Portfolio Status: flat key-value pairs, no card nesting
```

---

### TAB 3 — ADVANCED ANALYTICS

```
┌──────────────────────────────────────────────────────────────────────┐
│  [Factor & Risk Exposure] [Advanced Ratios]     Benchmark: <SPY ▾>  │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  ACTIVE RETURN (vs SPY)   ROLLING ALPHA         DRAWDOWN DELTA       │
│  +4.20%                   2.10%                 3.50% Better         │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  ┌─────────────────────────────────────────┐  ┌────────────────────┐│
│  │ ROLLING ALPHA & DRAWDOWN GAP            │  │ FACTOR BASELINE    ││
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  │ ░░ (radar chart)  ││
│  │ ─ Alpha  ··· DrawdownGap               │  │                    ││
│  └─────────────────────────────────────────┘  └────────────────────┘│
│                                                                      │
│  ┌─────────────────────────────────────────┐  ┌────────────┐  ┌────┐│
│  │ SECTOR EXPOSURE GAP                     │  │ TOP CONTRIB│  │DETR││
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  │ NVDA +1.2% │  │TSLA││
│  │ █ Portfolio  ▒ Benchmark               │  │ META +0.8% │  │AAPL││
│  └─────────────────────────────────────────┘  └────────────┘  └────┘│
│                                                                      │
│  ─ Advanced Ratios tab ──────────────────────────────────────────── │
│  │ Sharpe  Sortino  Info Ratio  Calmar  Omega  Profit Factor  etc.  │
│  │ ┌────────────────────────────────────────────────────────────┐   │
│  │ │ METRIC         STRATEGY    SPY        DELTA               │   │
│  │ │ Sharpe         1.35        0.92       +0.43               │   │
│  │ │ Sortino        1.62        1.01       +0.61               │   │
│  │ │ ...            ...         ...        ...                 │   │
│  │ └────────────────────────────────────────────────────────────┘   │

Design notes:
- Three flat KPI stat rows at top — no cards, just bordered row cells
- Tab underline navigation (no pill tabs)
- Benchmark selector aligned right in tab bar
- Contributors/Detractors: two columns, left-accent border (green/red)
  — 3px left border only, no full card rounding
- Advanced Ratios tab: comparison table, Strategy vs Benchmark vs Delta
```

---

### TAB 4 — EVALUATOR AUDIT

```
┌──────────────────────────────────────────────────────────────────────┐
│  EVALUATOR AUDIT                                                     │
│  Systematic strategy validation against 12 institutional criteria    │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  OVERALL SCORE        GAPS FOUND   CRITICAL   WARNINGS              │
│  87 / 100             4 gaps       1 critical  2 warnings            │
│  ████████████░░                                                      │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  [Gaps] [Metrics] [Raw Data]                                         │
│                                                                      │
│  ─ Gaps tab ──────────────────────────────────────────────────────  │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ ● CRITICAL   Survivorship Bias                                  │ │
│  │   Your backtest may include delisted stocks. This can inflate   │ │
│  │   returns by 1-3% annually.                                     │ │
│  │   Suggested fix: Apply a delisted securities filter...          │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │ ⚠ WARNING    Transaction Cost Assumption                        │ │
│  │   ...                                                           │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │ ✓ PASSED     Out-of-Sample Validation                           │ │
│  │   ...                                                           │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ─ Metrics tab ───────────────────────────────────────────────────  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Sharpe 1.35  │  │ Sortino 1.62 │  │ Max DD -14%  │              │
│  │              │  │              │  │              │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │

Design notes:
- Score displayed as progress bar + number, not a gauge/donut
- Gap cards use left-border severity indicator: red=critical, amber=warning, green=pass
- No box shadows on audit cards — border only
- Tabs are underline style (not pills)
- Metric tiles: flat, 1px border, no shadow, value + label only
```

---

### TAB 5 — REPORTING

```
┌──────────────────────────────────────────────────────────────────────┐
│  REPORTING ENGINE               [ Download PDF ]  [ Export CSV ]    │
│  MAY 2026                                                            │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │  PHINEUS OS  ·  Strategy Performance Report  ·  May 2026    │   │
│  │                                                              │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │   │
│  │  │ CAGR    │  │ Sharpe  │  │ Max DD  │  │ Sortino │        │   │
│  │  │ +18.42% │  │ 1.35    │  │ -14.18% │  │ 1.62    │        │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │   │
│  │                                                              │   │
│  │  GROWTH CHART                                                │   │
│  │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │   │
│  │                                                              │   │
│  │  TOP 15 HOLDINGS                                             │   │
│  │  NVDA · Technology · 10.0%                                   │   │
│  │  META · Technology · 8.2%                                    │   │
│  │  ...                                                         │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  (Print-preview panel — styled exactly as PDF output)               │

Design notes:
- Full page is the report preview — WYSIWYG
- Action buttons top-right: Download PDF, Export CSV
- Report panel has its own internal padding (not card-in-card)
- Print styles applied: white bg, black text, no dark mode
```

---

### TAB 6 — ALPHA SCREENER

```
┌──────────────────────────────────────────────────────────────────────┐
│  ALPHA SCREENER  ·  2023-12-29  ·  500 ASSETS                       │
│  [SCREENER TABLE] [CORRELATION MATRIX]     SECTOR: <ALL ▾>  SEARCH  │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  ┌─┬──────┬──────────────────────┬────────┬─────────┬──────┬──────┐ │
│  │▶│ #    │ TICKER · SECTOR      │ MOM 6M │ MOM 12M │ ROE  │SCORE │ │
│  ├─┼──────┼──────────────────────┼────────┼─────────┼──────┼──────┤ │
│  │▶│  1   │ NVDA  Technology     │ +68.2% │ +142.1% │ 89.2%│+2.31 │ │  ← top-15 row: green left border
│  │▶│  2   │ META  Technology     │ +52.1% │  +98.3% │ 27.1%│+1.87 │ │
│  │▶│  3   │ LLY   Healthcare     │ +38.4% │  +72.1% │ 44.2%│+1.62 │ │
│  ├─┴──────┴──────────────────────┴────────┴─────────┴──────┴──────┤ │
│  │  ▼ FACTOR DETAIL (expanded row)                                 │ │
│  │  RVOL: 42.1%  D/E: 0.42x  FCF MGN: 18.2%  Z·MOM6: +2.1       │ │
│  │  Z·MOM12: +1.8  Z·VOL: -0.3  Z·QUAL: +1.4                      │ │
│  ├─┬──────┬──────────────────────┬────────┬─────────┬──────┬──────┤ │
│  │▶│  4   │ MSFT  Technology     │ +24.1% │  +45.2% │ 38.1%│+1.41 │ │
│  │···                                                               │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  STATUS: SORT: SCORE DESC  ·  FILTER: ALL  ·  500/500               │
│                                                                      │
│  ┌── STOCK INTEL PANEL (right, 300px, shown on row click) ─────────┐ │
│  │ NVDA                                        ✕                   │ │
│  │ ─────────────────────────────────────────── │ │
│  │ CORPORATE EVENTS                            │ │
│  │ Earnings: May 22, 2026                      │ │
│  │ Dividend: 0.8%    Ex-Div: Apr 12            │ │
│  │ 52W Range: $420.10 - $795.20                │ │
│  │ ─────────────────────────────────────────── │ │
│  │ INTELLIGENCE                                │ │
│  │ HEADLINE  NVDA to Accelerate AI Infra...    │ │
│  │ ANALYST   Goldman Sachs Reiterates Buy...   │ │
│  └──────────────────────────────────────────── ┘ │

Design notes:
- 8 visible columns (rank, ticker+sector merged, mom6, mom12, roe, score, alloc%, expand)
- Ticker + Sector in one cell — ticker bold mono, sector small gray below
- Row expand (▶) reveals Factor Detail as sub-row inline — no modal
- Top-15 rows: 2px green left border, slightly elevated surface
- Stock Intel slides in from right — no modal overlay
- Tab buttons: "SCREENER TABLE" | "CORRELATION MATRIX" — underline style
- Status bar at bottom: always visible, 1 row
- Skeleton loading state: 12 rows of pulsing gray bars
- Empty state (no results): centered icon + "No matches for your filter" + [Clear filters]
```

---

### TAB 7 — WATCHLIST

```
┌──────────────────────────────────────────────────────────────────────┐
│  WATCHLIST                       Alignment with strategy: 67%        │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  Add ticker                                                          │
│  ┌─────────────┐  ┌─────────────────────────────┐  [ Add ]         │
│  │ e.g. AAPL   │  │ Notes (optional)             │                  │
│  └─────────────┘  └─────────────────────────────┘                  │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ ● AAPL   Discretionary  In top 15 ✓       [edit] [remove]  │   │  ← green badge "In Strategy"
│  │   "Watch for earnings dip to add"                           │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │ ○ TSLA   Discretionary  Not in top 15     [edit] [remove]  │   │  ← gray, not in strategy
│  │   "Monitoring for volatility compression"                   │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │ ○ AMZN   Override       Override active ⚑  [edit] [remove] │   │  ← amber badge "Override"
│  └──────────────────────────────────────────────────────────────┘   │

Design notes:
- Alignment metric at top right (%) — clear, single number
- Add form: inline row, not a modal
- Each watchlist item: ticker + tag badge + strategy alignment indicator + notes
- Badges: "In Strategy" (green), "Override" (amber), neither (gray text)
- Edit note inline — no modal, expand in place
- Sorted by: strategy alignment first, then alphabetical
```

---

### TAB 8 — BUILD STRATEGY

```
┌──────────────────────────────────────────────────────────────────────┐
│  STRATEGY BUILDER                    [ Run Backtest ]                │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  ┌── PARAMETERS (left 340px) ─────────┐  ┌── LIVE PREVIEW ────────┐ │
│  │                                    │  │                         │ │
│  │  Universe     < S&P 500 ▾ >        │  │  PROJECTED METRICS      │ │
│  │  ──────────────────────────────    │  │  CAGR      +18.4%       │ │
│  │  Top N        15   ──●──────       │  │  Sharpe    1.35         │ │
│  │               10 ← slider → 50    │  │  Max DD    -14.2%       │ │
│  │  ──────────────────────────────    │  │  Turnover  38%          │ │
│  │  Rebalance    < Monthly ▾ >        │  │                         │ │
│  │  ──────────────────────────────    │  │  ─────────────────────  │ │
│  │  Trans. Cost  5 bps ──●────        │  │  EQUITY CURVE           │ │
│  │  ──────────────────────────────    │  │  ░░░░░░░░░░░░░░░░░░░░░  │ │
│  │  Benchmark    < SPY ▾ >            │  │                         │ │
│  │  ──────────────────────────────    │  │  ─────────────────────  │ │
│  │  ☐ Sector Neutral                 │  │  vs VERSIONS            │ │
│  │  ──────────────────────────────    │  │  [V1][V3][●V7]          │ │
│  │                                    │  │  ┌─────────────────┐   │ │
│  │  EXPLANATION                       │  │  │ V   CAGR Sharpe │   │ │
│  │  Top N: Lower values focus         │  │  │ V1  14.2% 1.15  │   │ │
│  │  capital on top alpha picks...     │  │  │ V7  18.4% 1.35  │   │ │
│  └────────────────────────────────────┘  └─────────────────────────┘ │

Design notes:
- Two-column: params left (fixed 340px), preview right (flex)
- Sliders: native browser range input, no custom styling
- Explanation text appears below each param — small, muted, concise
- Version comparison table: toggle V1-V7, highlights selected
- "Run Backtest" primary CTA — top right, always visible
- Live preview updates as sliders change (debounced 300ms)
```

---

### TAB 9 — STRESS TEST (Robustness Lab)

```
┌──────────────────────────────────────────────────────────────────────┐
│  STRESS TEST                                                         │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  ┌── CONFIG (left 240px) ───────────┐  ┌── IN-SAMPLE vs OOS ──────┐ │
│  │                                  │  │                           │ │
│  │  SENSITIVITY PARAMETERS          │  │  ░░░░░░░░░░░░░░░░░░░░░░  │ │
│  │  Portfolio Size  < 15 Assets ▾ > │  │  IS region  │ OOS region │ │
│  │  Rebal. Freq     < Monthly ▾ >   │  │                           │ │
│  │  ☑ Sector Neutral               │  │  ┌───────────┐ ┌─────────┐│ │
│  │                                  │  │  │ IN-SAMPLE │ │ OOS     ││ │
│  │  ─────────────────────────────   │  │  │ Sharpe    │ │ Sharpe  ││ │
│  │                                  │  │  │ 1.35      │ │ 1.22    ││ │
│  │  SENSITIVITY OUTLOOK             │  │  │ Win: 62%  │ │ Win: 58%││ │
│  │  Strategy shows high stability   │  │  └───────────┘ └─────────┘│ │
│  │  when expanding from 10-20       │  └───────────────────────────┘ │
│  │  assets.                         │                                │
│  └──────────────────────────────────┘                                │
│                                                                      │
│  PARAMETER SENSITIVITY MATRIX                                        │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐ │
│  │ Top N    │ Freq     │ CAGR     │ Sharpe   │ Max DD   │ Turnover │ │
│  ├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┤ │
│  │ 10 Assets│ Monthly  │ 14.2%    │ 1.15     │ -16.5%   │ 42%      │ │  ← full opacity = selected
│  │ 15 Assets│ Monthly  │ 12.8%    │ 1.25     │ -14.2%   │ 38%      │ │  ← active: full opacity
│  │ 20 Assets│ Monthly  │ 11.5%    │ 1.18     │ -12.8%   │ 35%      │ │  ← dim = not selected size
│  └──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘ │

Design notes:
- Sensitivity matrix: rows matching current portfolio size = full opacity
  Non-matching rows = opacity 0.35 (not 0.4, which is disabled threshold)
- IS/OOS chart: ReferenceArea shading, not colored lines
- Config panel: no card — flat section with top border dividers
- Summary stats: two flat boxes, not rounded cards
```

---

### TAB 10 — LIVE POSITIONS

```
┌──────────────────────────────────────────────────────────────────────┐
│  LIVE POSITIONS            Last updated: 14:32:01 ET    ● Live       │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  PORTFOLIO VALUE   DAY P&L      TOTAL P&L    SCORE DRIFT            │
│  $1,842,310        +$4,220      +$182,310    -2.1%                  │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  ┌── POSITION LEDGER ───────────────────────────────────────────┐   │
│  │  NVDA   Entry: $420.10  Current: $795.20  P&L: +89.3%  ●    │   │  ← green left border
│  │         Weight: 10.0%   Score: 0.91 (-0.02 drift)           │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │  TSLA   Entry: $248.10  Current: $186.30  P&L: -24.9%  ●    │   │  ← red left border
│  │         Weight: 4.2%    Score: 0.45 (-0.18 drift)           │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │  ...                                                         │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌── EQUITY CHART ──────────────────────────────────────────────┐   │
│  │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │   │
│  │  Strategy ─────  Benchmark ·····                             │   │
│  └──────────────────────────────────────────────────────────────┘   │

Design notes:
- Summary KPIs: flat row with vertical dividers — no cards
- Ledger items: 2px left border (green = profitable, red = loss)
- Each item shows: ticker, entry/current, P&L %, weight, score + drift
- Score drift shown with arrow and delta: "0.91 ↓ -0.02" in amber if significant
- Chart below ledger: smaller (200px height), overview only
- Live indicator: green dot with CSS pulse animation (already in codebase)
```

---

### TAB 11 — REBALANCE

```
┌──────────────────────────────────────────────────────────────────────┐
│  REBALANCE JOURNAL                  [← Prev Period] [→ Next Period] │
│  Dec 29, 2023 → Jan 31, 2024                                        │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  CHANGES THIS PERIOD   Turnover: 32%   Added: 3   Removed: 2       │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  ┌── ADDED ──────────────────────────┐  ┌── REMOVED ───────────────┐ │
│  │ + NVDA  added due to explosive    │  │ - TSLA  removed: lagging │ │
│  │         6M momentum               │  │         12M rank trend   │ │
│  │ + META  screened in via FCF mgn   │  │ - PG    ejected: ROE     │ │
│  │         expansion                 │  │         deteriorated     │ │
│  │ + LLY   cleared volatility limits │  └──────────────────────────┘ │
│  └───────────────────────────────────┘                                │
│                                                                      │
│  ┌── FULL HOLDINGS TABLE ─────────────────────────────────────────┐  │
│  │  TICKER  │ WEIGHT  │ STATUS    │ SIGNAL SCORE                  │  │
│  │  NVDA    │ 10.0%   │ HELD      │ +2.31                         │  │
│  │  META    │  8.2%   │ ADDED ↑   │ +1.87                         │  │
│  │  TSLA    │  0.0%   │ REMOVED ↓ │ +0.42                         │  │
│  └───────────────────────────────────────────────────────────────────┘ │

Design notes:
- Period navigation: prev/next buttons top right (not dropdown)
- Summary metrics: flat key-value row
- Added/Removed as two-column layout with reason text
- Status column: "HELD" (gray), "ADDED ↑" (green), "REMOVED ↓" (red)
- No cards — flat table layout throughout
```

---

### TAB 12 — ORDERS (Trade Blotter)

```
┌──────────────────────────────────────────────────────────────────────┐
│  ORDERS                   AUM: $100,000     [Execute All Orders]     │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  REBALANCE ORDERS — Dec 29, 2023                                    │
│                                                                      │
│  ┌───────┬─────────┬─────────┬─────────┬────────┬────────┬────────┐  │
│  │TICKER │ CURRENT │ TARGET  │ DELTA   │ QTY    │ PRICE  │ SIDE   │  │
│  ├───────┼─────────┼─────────┼─────────┼────────┼────────┼────────┤  │
│  │ NVDA  │  0.0%   │ 10.0%   │ +10.0%  │ +12    │$795.20 │ BUY   │  │  ← green BUY
│  │ META  │  0.0%   │  8.2%   │  +8.2%  │  +8    │$508.30 │ BUY   │  │
│  │ TSLA  │  4.2%   │  0.0%   │  -4.2%  │  -7    │$186.30 │ SELL  │  │  ← red SELL
│  └───────┴─────────┴─────────┴─────────┴────────┴────────┴────────┘  │
│                                                                      │
│  SUMMARY                                                             │
│  Buy orders: 8    Sell orders: 3    Estimated cost: $48,210         │
│  ─────────────────────────────────────────────────────────────────── │
│  [ Execute All Orders ]   ← prominent CTA, amber color (caution)    │

Design notes:
- BUY text: green, SELL text: red — only text color signals, plus column value
- AUM input: inline editable number field in the top bar
- Execute All Orders: amber accent (caution — this is a real action)
- Summary row: flat key-value, no card wrapper
- Table: sortable, hoverable rows
- If Alpaca not connected: show "Connect broker to execute" empty state
```

---

## PART 4 — GLOBAL LAYOUT SPECIFICATION

### Shell Structure

```
┌─────────────────────────────────────────────────────────┐
│ TOP BAR (56px, border-bottom only, no shadow/blur)       │
│ Logo 240px │ KPI strip (flex) │ [Search] [Theme] [Live] │
├───────────┬─────────────────────────────────────────────┤
│ SIDEBAR   │ MAIN PANE (flex: 1, overflow-y: auto)        │
│ 240px     │                                             │
│ fixed     │  [CONTENT AREA — 24px padding all sides]    │
│ left      │                                             │
│           │                                             │
│ [footer]  │                                             │
└───────────┴─────────────────────────────────────────────┘
```

### Top Bar (revised)

- Height: `56px` (was 64px — too tall)
- Background: `var(--surface)` — **no blur, no glassmorphism**
- Border: `border-bottom: 1px solid var(--border)` only
- Logo zone: `240px`, border-right
- KPI strip: 5 KPIs max visible (CAGR, Max DD, Sharpe, Sortino, Profit Factor)
  Each KPI: label on top (12px, text-3), value below (16px mono, text-strong)
- Actions zone: search pill + theme toggle icon + live badge
- Remove: KpiHeader component below top bar (redundant)

### Sidebar (revised)

- Width: `240px` fixed
- Background: `var(--surface)` light / `var(--bg)` dark
- Section label: 11px, weight 600, `var(--text-3)`, uppercase, `letter-spacing: 0.06em`
- Nav item: 13px, weight 500, height `36px`, `px-3`, `border-radius: 4px`
- Active: `background: var(--surface-2)` light / `var(--surface)` dark + `color: var(--text-strong)` + `font-weight: 600`
- Hover: `background: var(--surface-2)` — `80ms` transition
- Icons: `16px`, `color: var(--text-2)`, active = `var(--text-strong)`
- Section spacing: `24px` between groups
- Footer: pinned bottom, "Evaluate holdings →" text link only

### Sandbox Demo Banner (revised)

- Height: `36px` (was full-width block with large padding)
- Color: amber (`--amber` + `--amber-dim`) — not red (red = error, not info)
- Position: below top bar, above content — dismissible with ✕

---

## PART 5 — COMPONENT LIBRARY ADDITIONS

### Components to build with shadcn/ui + 21.dev

1. **Skeleton** — pulsing gray bars for loading states (replaces "LOADING..." text)
2. **Badge** — pill labels: "In Strategy", "Override", severity levels
3. **Tooltip** — metric explanations on hover (replaces long explanation text)
4. **DataTable** — sortable/filterable table with sticky headers (shadcn Table)
5. **Tabs** — underline-style tab navigation (replace custom button tabs)
6. **Progress** — horizontal bar for audit score, allocation weights
7. **Separator** — consistent section dividers (replace random border tricks)
8. **Select** — consistent dropdown styling across all views
9. **Input** — consistent text input (ticker search, notes, AUM field)
10. **Command** — command palette for global ticker search

---

## PART 6 — WHAT TO BUILD, IN ORDER

### Phase 1: Token & Typography Reset (1 session)
- Consolidate to Inter + Geist Mono only
- New color token set (light + dark, as above)
- New spacing scale applied to App.css
- Remove body gradient, top-bar blur, decoration shadows
- Increase sidebar section label to 12px min

### Phase 2: Shell Refactor (1 session)
- Top bar: 56px, no blur, remove KpiHeader strip duplication
- Sidebar: 240px, new nav item styles, correct hover/active states
- Sandbox banner: amber, 36px, dismissible

### Phase 3: Component Replacements (2 sessions)
- Replace all inline `style={{}}` objects with CSS classes + tokens
- Implement shadcn/ui Skeleton for all loading states
- Implement shadcn/ui Tabs for all tab bars
- Implement shadcn/ui Badge for status labels
- Add Tooltip to KPI values (on hover shows explanation)

### Phase 4: Per-Tab Polish (2-3 sessions)
- Dashboard: remove redundant KPI strip, add timeframe selector
- Screener: finalize skeleton loading, fix correlation matrix surface colors
- Analytics: flat KPI row (no cards), left-accent contributor boxes
- Audit: left-border severity pattern, progress bar score
- Strategy Builder: clean slider layout with explanation text
- Stress Test: flat config panel, better IS/OOS visual separation

### Phase 5: Interaction States (1 session)
- All table rows: hover state
- All buttons: hover + focus + disabled
- Sidebar items: hover + active + focus
- Inputs: focus border color, error state
- Add `font-variant-numeric: tabular-nums` to all numeric cells
