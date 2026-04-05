# finance-backtest

A Python quantitative backtesting framework for factor-based equity strategies.

## Project Structure

```
finance-backtest/
├── data/
│   ├── prices/          # Cached price CSVs
│   └── tickers.csv      # Universe of tickers
├── notebooks/
│   └── exploration.ipynb
├── src/
│   ├── data_loader.py   # Download & cache price data
│   ├── factors.py       # Signal / factor computation
│   ├── strategy.py      # Portfolio selection logic
│   ├── portfolio.py     # Backtest simulation engine
│   ├── metrics.py       # Risk & performance metrics
│   ├── plots.py         # Chart generation
│   └── main.py          # Pipeline entry point
├── outputs/
│   ├── performance.csv
│   ├── rebalance_log.csv
│   ├── metrics.csv
│   ├── charts/
│   └── report.md
├── requirements.txt
└── README.md
```

## Quick Start

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Add tickers

Edit `data/tickers.csv` — add one ticker symbol per row under the `ticker` column:

```csv
ticker,sector,market_cap
AAPL,Technology,Large
MSFT,Technology,Large
...
```

### 3. Run the backtest

```bash
cd src
python main.py
```

Outputs are written to `outputs/`.

## Modules

| Module | Purpose |
|---|---|
| `data_loader.py` | Download prices via `yfinance`, caching locally |
| `factors.py` | Momentum, mean-reversion, volatility signals |
| `strategy.py` | Long-only and long/short weight generation |
| `portfolio.py` | Daily P&L simulation with transaction costs |
| `metrics.py` | Sharpe, Sortino, CAGR, Max Drawdown, Calmar |
| `plots.py` | Dark-mode equity curve, drawdown, heatmap |

## Dependencies

- [pandas](https://pandas.pydata.org/)
- [numpy](https://numpy.org/)
- [matplotlib](https://matplotlib.org/)
- [yfinance](https://github.com/ranaroussi/yfinance)
