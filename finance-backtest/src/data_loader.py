import pandas as pd
import yfinance as yf
import os

def load_tickers(filepath="../data/tickers.csv"):
    df = pd.read_csv(filepath)
    tickers = df['ticker'].tolist()
    if 'SPY' not in tickers:
        tickers.append('SPY')
    return tickers

def download_price_data(tickers, start_date, end_date):
 
    print(f"Downloading data for {len(tickers)} tickers...")
    
    data = yf.download(tickers, start=start_date, end=end_date)
    

    adj_close = data['Adj Close']
    
    adj_close = adj_close.sort_index()
    adj_close = adj_close.ffill() 
    
    daily_returns = adj_close.pct_change()
    
    return adj_close, daily_returns

if __name__ == "__main__":
    START_DATE = "2016-01-01"
    END_DATE = "2026-01-01"
    
    tickers_list = load_tickers()
    prices_df, returns_df = download_price_data(tickers_list, START_DATE, END_DATE)
    
    print("\nPrice Data Head:")
    print(prices_df.head())