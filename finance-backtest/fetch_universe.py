import os
import time
import pandas as pd
import yfinance as yf

START_DATE = "2013-01-01"
END_DATE = "2024-01-01"
OUTPUT_DIR = "data/prices"

def get_universe_tickers(universe_name):
    tickers = []
    if universe_name == 'SP500':
        try:
            df = pd.read_html('https://en.wikipedia.org/wiki/List_of_S%26P_500_companies')[0]
            tickers = df['Symbol'].str.replace('.', '-').tolist()
        except Exception:
            pass
    elif universe_name == 'NASDAQ100':
        try:
            dfs = pd.read_html('https://en.wikipedia.org/wiki/Nasdaq-100')
            for df in dfs:
                if 'Ticker' in df.columns:
                    tickers = df['Ticker'].str.replace('.', '-').tolist()
                    break
        except Exception:
            pass
    
    if not tickers:
        try:
            df = pd.read_csv("data/tickers.csv")
            tickers = df['ticker'].tolist()
        except:
            pass
        
    for b in ['SPY', 'QQQ', 'MTUM', 'QUAL']:
        if b not in tickers:
            tickers.append(b)
        
    return list(dict.fromkeys(tickers))

def fetch_universe(universe_name):
    tickers = get_universe_tickers(universe_name)
    chunk_size = 50
    all_prices = []
    all_fundamentals = []

    for i in range(0, len(tickers), chunk_size):
        chunk = tickers[i:i+chunk_size]
        
        try:
            chunk_data = yf.download(chunk, start=START_DATE, end=END_DATE, auto_adjust=True, progress=False)
            if isinstance(chunk_data.columns, pd.MultiIndex):
                adj_close = chunk_data['Close']
            else:
                adj_close = pd.DataFrame(chunk_data['Close'])
                adj_close.columns = chunk
            all_prices.append(adj_close)
        except Exception:
            pass

        for t in chunk:
            if t == 'SPY': continue
            try:
                info = yf.Ticker(t).info
                if not info: continue
                roe = info.get('returnOnEquity', 0)
                de = info.get('debtToEquity', 0)
                rev = info.get('totalRevenue', 0)
                fcf = info.get('freeCashflow', 0)
                
                fcf_margin = 0
                if rev is not None and fcf is not None and rev > 0:
                    fcf_margin = fcf / rev
                    
                all_fundamentals.append({
                    'ticker': t,
                    'roe': roe if pd.notna(roe) else 0,
                    'debt_equity': de if pd.notna(de) else 0,
                    'fcf_margin': fcf_margin
                })
            except Exception:
                continue
                
        time.sleep(3)
        
    if all_prices:
        prices_df = pd.concat(all_prices, axis=1)
        prices_df = prices_df.loc[:, ~prices_df.columns.duplicated()]
        prices_df = prices_df.apply(pd.to_numeric, errors='coerce').sort_index().ffill()
        prices_df.to_parquet(os.path.join(OUTPUT_DIR, f"{universe_name.lower()}_prices.parquet"))

    if all_fundamentals:
        fun_df = pd.DataFrame(all_fundamentals).set_index('ticker')
        fun_df = fun_df[~fun_df.index.duplicated()]
        fun_df = fun_df.apply(pd.to_numeric, errors='coerce').fillna(0)
        fun_df.to_parquet(os.path.join(OUTPUT_DIR, f"{universe_name.lower()}_fundamentals.parquet"))

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    for u in ['SP500', 'NASDAQ100', 'RUSSELL1000']:
        fetch_universe(u)

if __name__ == "__main__":
    main()
