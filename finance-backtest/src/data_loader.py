import pandas as pd
import yfinance as yf


def load_tickers(filepath="../data/tickers.csv"):
    df = pd.read_csv(filepath)
    tickers = df['ticker'].tolist()
    if 'SPY' not in tickers:
        tickers.append('SPY')
    return tickers


def download_price_data(tickers, start_date, end_date):
    data = yf.download(tickers, start=start_date, end=end_date)
    adj_close = data['Adj Close'].sort_index().ffill()
    daily_returns = adj_close.pct_change()
    return adj_close, daily_returns