import os
import yfinance as yf
import pandas as pd
from data_pipeline.metadata_service import get_universe_tickers

OUTPUT_DIR = "data/prices"

def fetch_prices(universe_name, start="2013-01-01"):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    tickers = get_universe_tickers(universe_name)
    chunk_size = 50
    all_prices = []

    for i in range(0, len(tickers), chunk_size):
        chunk = tickers[i:i+chunk_size]
        try:
            chunk_data = yf.download(chunk, start=start, auto_adjust=True, progress=False)
            if isinstance(chunk_data.columns, pd.MultiIndex):
                adj_close = chunk_data["Close"]
            else:
                adj_close = pd.DataFrame(chunk_data["Close"])
                adj_close.columns = chunk
            all_prices.append(adj_close)
        except Exception:
            pass
            
    if all_prices:
        prices_df = pd.concat(all_prices, axis=1)
        prices_df = prices_df.loc[:, ~prices_df.columns.duplicated()]
        prices_df = prices_df.apply(pd.to_numeric, errors="coerce").sort_index().ffill()
        prices_df.to_parquet(os.path.join(OUTPUT_DIR, f"{universe_name.lower()}_prices.parquet"))
        return prices_df
        
    return pd.DataFrame()
