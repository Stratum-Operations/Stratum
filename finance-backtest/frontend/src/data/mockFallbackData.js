// Mock fallback data for Phineus OS when the backend API server is unreachable.

const TICKERS = [
  { ticker: 'AAPL', sector: 'Technology', weight: 0.10, score: 0.94 },
  { ticker: 'MSFT', sector: 'Technology', weight: 0.10, score: 0.88 },
  { ticker: 'NVDA', sector: 'Technology', weight: 0.10, score: 0.98 },
  { ticker: 'GOOGL', sector: 'Communication Services', weight: 0.08, score: 0.78 },
  { ticker: 'META', sector: 'Communication Services', weight: 0.08, score: 0.85 },
  { ticker: 'TSLA', sector: 'Consumer Discretionary', weight: 0.06, score: 0.72 },
  { ticker: 'AVGO', sector: 'Technology', weight: 0.06, score: 0.82 },
  { ticker: 'COST', sector: 'Consumer Staples', weight: 0.06, score: 0.75 },
  { ticker: 'AMD', sector: 'Technology', weight: 0.05, score: 0.80 },
  { ticker: 'BKNG', sector: 'Consumer Discretionary', weight: 0.05, score: 0.74 },
  { ticker: 'ISRG', sector: 'Healthcare', weight: 0.04, score: 0.70 },
  { ticker: 'MELI', sector: 'Consumer Discretionary', weight: 0.04, score: 0.81 },
  { ticker: 'AMGN', sector: 'Healthcare', weight: 0.03, score: 0.68 },
  { ticker: 'INTC', sector: 'Technology', weight: 0.03, score: 0.65 },
  { ticker: 'MU', sector: 'Technology', weight: 0.02, score: 0.69 }
];

export const mockHoldings = {
  date: '2023-12-29',
  holdings: TICKERS
};

export const mockMetrics = [
  {
    Metric: 'Strategy',
    CAGR: '18.42%',
    Sharpe: '1.48',
    'Max Drawdown': '-14.18%',
    Volatility: '12.50%',
    Sortino: '2.10',
    Calmar: '1.30',
    'Annualized Turnover': '85.20%',
    'Avg Active Names': '15.00'
  },
  {
    Metric: 'SPY',
    CAGR: '12.05%',
    Sharpe: '0.98',
    'Max Drawdown': '-23.85%',
    Volatility: '14.20%',
    Sortino: '1.32',
    Calmar: '0.51',
    'Annualized Turnover': '0.00%',
    'Avg Active Names': '500.00'
  },
  {
    Metric: 'QQQ',
    CAGR: '15.12%',
    Sharpe: '1.15',
    'Max Drawdown': '-28.10%',
    Volatility: '17.80%',
    Sortino: '1.60',
    Calmar: '0.54',
    'Annualized Turnover': '0.00%',
    'Avg Active Names': '100.00'
  }
];

// Generate 100 days of daily performance data
const generatePerfData = () => {
  const data = [];
  let stratEquity = 10000;
  let spyEquity = 10000;
  let qqqEquity = 10000;
  
  const baseDate = new Date(2023, 7, 1); // Aug 1, 2023
  for (let i = 0; i < 100; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    // Only include weekdays
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    
    // Seeded random walk
    const sSeed = Math.sin(i * 0.15) * 0.01 + 0.0006;
    const spySeed = Math.sin(i * 0.12) * 0.009 + 0.0003;
    const qqqSeed = Math.sin(i * 0.18) * 0.014 + 0.0004;
    
    const r_s = sSeed + (Math.random() * 0.01 - 0.005);
    const r_spy = spySeed + (Math.random() * 0.014 - 0.007);
    const r_qqq = qqqSeed + (Math.random() * 0.018 - 0.009);
    
    stratEquity *= (1 + r_s);
    spyEquity *= (1 + r_spy);
    qqqEquity *= (1 + r_qqq);
    
    data.push({
      date: d.toISOString().split('T')[0],
      Strategy_Return: r_s,
      Strategy_Equity: stratEquity,
      SPY_Return: r_spy,
      SPY_Equity: spyEquity,
      QQQ_Return: r_qqq,
      QQQ_Equity: qqqEquity
    });
  }
  
  // Calculate drawdowns
  let stratMax = 0;
  let spyMax = 0;
  data.forEach(row => {
    if (row.Strategy_Equity > stratMax) stratMax = row.Strategy_Equity;
    if (row.SPY_Equity > spyMax) spyMax = row.SPY_Equity;
    row.Strategy_Drawdown = (row.Strategy_Equity / stratMax) - 1;
    row.SPY_Drawdown = (row.SPY_Equity / spyMax) - 1;
    row.Strategy_Rolling_Sharpe = 1.3 + Math.sin(stratEquity * 0.01) * 0.2;
    row.SPY_Rolling_Sharpe = 0.8 + Math.cos(spyEquity * 0.01) * 0.15;
  });
  
  return data;
};

export const mockPerf = generatePerfData();

// Mock screener data
export const mockScreener = {
  date: '2023-12-29',
  total: 50,
  screener: TICKERS.map((t, index) => {
    const m6 = t.score - 0.2 + (Math.random() * 0.1);
    const m12 = t.score - 0.1 + (Math.random() * 0.15);
    const vol = 0.1 + (Math.random() * 0.15);
    const roe = 0.12 + (Math.random() * 0.18);
    const de = 0.2 + (Math.random() * 1.5);
    const fcf = 0.05 + (Math.random() * 0.15);
    
    return {
      rank: index + 1,
      ticker: t.ticker,
      sector: t.sector,
      m6,
      m12,
      vol,
      roe,
      de,
      fcf,
      r6: (m6 - 0.15) * 4,
      r12: (m12 - 0.20) * 3,
      rv: (0.25 - vol) * 5,
      rq: (roe - 0.15) * 3 + (1.0 - de) * 0.2,
      score: t.score,
      weight: t.weight,
      selected: t.weight > 0
    };
  })
};

// Add remaining universe tickers to screener so it looks full (total 50 tickers)
const OTHER_TICKERS = [
  'AMZN', 'GOOG', 'ADBE', 'CSCO', 'NFLX', 'QCOM', 'TXN', 'HON', 'SBUX', 'MDLZ',
  'GILD', 'BKNG', 'ADI', 'VRTX', 'REGN', 'PANW', 'SNPS', 'ASML', 'CDNS', 'PYPL',
  'KLAC', 'ADSK', 'MAR', 'FTNT', 'CSX', 'MCHP', 'MNST', 'ORLY', 'ADP', 'CTAS',
  'PDD', 'PEP', 'AVGO', 'COST', 'LRCX'
];
OTHER_TICKERS.forEach((ticker, idx) => {
  if (!mockScreener.screener.find(s => s.ticker === ticker)) {
    const score = 0.65 - (idx * 0.01) - (Math.random() * 0.05);
    const m6 = score - 0.3;
    const m12 = score - 0.2;
    const vol = 0.15 + (Math.random() * 0.2);
    const roe = 0.08 + (Math.random() * 0.12);
    const de = 0.5 + (Math.random() * 2.0);
    const fcf = 0.02 + (Math.random() * 0.1);
    
    mockScreener.screener.push({
      rank: mockScreener.screener.length + 1,
      ticker,
      sector: idx % 4 === 0 ? 'Technology' : idx % 4 === 1 ? 'Consumer Discretionary' : idx % 4 === 2 ? 'Healthcare' : 'Industrials',
      m6, m12, vol, roe, de, fcf,
      r6: (m6 - 0.15) * 4,
      r12: (m12 - 0.20) * 3,
      rv: (0.25 - vol) * 5,
      rq: (roe - 0.15) * 3,
      score,
      weight: 0.0,
      selected: false
    });
  }
});
mockScreener.total = mockScreener.screener.length;

// Mock Evaluator Audit data
export const mockEvaluatorAudit = {
  score: 76,
  summary: {
    headline: "Evaluator Framework Review",
    missing_metric_count: 3
  },
  computed: {
    strategy: {
      cagr: 18.42,
      sharpe: 1.48,
      max_drawdown: -14.18,
      drawdown_duration_days: 110
    }
  },
  gaps: [
    {
      area: "Sector Drift Constraints",
      why: "Evaluator does not measure sector deviation from equal-weight index dynamically.",
      severity: "medium",
      missing: ["Sector Beta", "Sector Drift Variance"],
      procedure: "Audit sector weights every rebalance cycle against S&P 500 benchmarks."
    },
    {
      area: "Tail Risk Modeling",
      why: "No assessment of skewness, kurtosis, or CVaR (Conditional Value at Risk) in portfolio returns.",
      severity: "medium",
      missing: ["Historical CVaR 95%", "Return Skewness"],
      procedure: "Integrate non-normal return distributions during risk evaluations."
    },
    {
      area: "Liquidity ADV Capacity",
      why: "Does not audit trading volume capacity limits for large AUM portfolios.",
      severity: "low",
      missing: ["ADV Days to Liquidate"],
      procedure: "Model execution slippage limits relative to average daily volumes."
    }
  ],
  implementation_order: [
    "Add tail risk models (Skewness, Kurtosis, 95% CVaR)",
    "Implement daily sector drift monitoring metrics",
    "Model ADV days to liquidate constraints"
  ],
  ux_recommendations: [
    {
      title: "Interactive Slippage Matrix",
      component: "Trade Desk",
      impact: "Allow users to simulate slippage scenarios dynamically before rebalancing."
    },
    {
      title: "Factor Z-score Heatmap",
      component: "Screener",
      impact: "Visualize portfolio-weighted factor exposures vs benchmarks."
    }
  ],
  research_basis: [
    "Black-Litterman model optimization guidelines",
    "Fama-French 5-Factor risk attribution frameworks",
    "Institutional Volatility and Slippage limits studies"
  ]
};

// Mock Alpaca positions
export const mockAlpacaPositions = {
  positions: TICKERS.slice(0, 10).map(t => {
    const qty = Math.floor(100 + Math.random() * 200);
    const avg_entry_price = 100 + Math.random() * 150;
    const current_price = avg_entry_price * (1 + (Math.random() * 0.16 - 0.05));
    return {
      symbol: t.ticker,
      qty,
      avg_entry_price,
      current_price,
      sector: t.sector,
      market_value: qty * current_price
    };
  })
};
