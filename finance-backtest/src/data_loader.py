import pandas as pd
import yfinance as yf
from pathlib import Path

TICKERS_PATH = Path(__file__).resolve().parent.parent / "data" / "tickers.csv"

def load_tickers(filepath=TICKERS_PATH):
    df = pd.read_csv(filepath)
    if 'SPY' not in df['ticker'].tolist():
        return df['ticker'].tolist() + ['SPY']
    return df['ticker'].tolist()


def download_price_data(tickers, start_date, end_date):
    data = yf.download(tickers, start=start_date, end=end_date, auto_adjust=True)
    adj_close = data['Close'] if isinstance(data.columns, pd.MultiIndex) else data
    adj_close = adj_close.apply(pd.to_numeric, errors='coerce').sort_index().ffill()
    return adj_close, adj_close.pct_change()


def fetch_fundamentals(tickers):
    results = []
    for t in tickers:
        if t == 'SPY': continue
        info = yf.Ticker(t).info
        results.append({
            'ticker': t,
            'roe': info.get('returnOnEquity', 0),
            'debt_equity': info.get('debtToEquity', 0),
            'fcf_margin': (info.get('freeCashflow', 0) / info.get('totalRevenue', 1)) if info.get('totalRevenue', 1) > 0 else 0
        })
    return pd.DataFrame(results).set_index('ticker')