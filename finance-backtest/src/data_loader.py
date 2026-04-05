import pandas as pd
import yfinance as yf
from pathlib import Path

TICKERS_PATH = Path(__file__).resolve().parent.parent / "data" / "tickers.csv"

def load_tickers(filepath=TICKERS_PATH):
    df = pd.read_csv(filepath)
    tickers = df['ticker'].tolist()
    if 'SPY' not in tickers:
        tickers.append('SPY')
    return tickers

def download_price_data(tickers, start_date, end_date):
    print(f"Downloading data for {len(tickers)} tickers...")
    data = yf.download(tickers, start=start_date, end=end_date, auto_adjust=True)
    
    # yfinance returns a MultiIndex if multiple tickers are requested.
    # Level 0: Price Type ('Close', 'Open', etc.), Level 1: Ticker
    # With auto_adjust=True, 'Close' is the adjusted close price.
    if isinstance(data.columns, pd.MultiIndex):
        adj_close = data['Close']
    else:
        adj_close = data
        
    # Ensure all data is numeric
    adj_close = adj_close.apply(pd.to_numeric, errors='coerce')
    adj_close = adj_close.sort_index().ffill()
    daily_returns = adj_close.pct_change()
    return adj_close, daily_returns