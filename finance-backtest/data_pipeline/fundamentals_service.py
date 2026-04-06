import os
import yfinance as yf
import pandas as pd
import time
from data_pipeline.metadata_service import get_universe_tickers

OUTPUT_DIR = "data/prices"

def fetch_fundamentals(universe_name):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    tickers = get_universe_tickers(universe_name)
    chunk_size = 50
    all_fundamentals = []

    for i in range(0, len(tickers), chunk_size):
        chunk = tickers[i:i+chunk_size]
        for t in chunk:
            if t == "SPY": continue
            try:
                info = yf.Ticker(t).info
                if not info: continue
                roe = info.get("returnOnEquity", 0)
                de = info.get("debtToEquity", 0)
                rev = info.get("totalRevenue", 0)
                fcf = info.get("freeCashflow", 0)
                pe = info.get("forwardPE", 0)
                pb = info.get("priceToBook", 0)
                
                fcf_margin = 0
                if rev is not None and fcf is not None and rev > 0:
                    fcf_margin = fcf / rev
                    
                all_fundamentals.append({
                    "ticker": t,
                    "roe": roe if pd.notna(roe) else 0,
                    "debt_equity": de if pd.notna(de) else 0,
                    "fcf_margin": fcf_margin,
                    "pe": pe if pd.notna(pe) else 0,
                    "pb": pb if pd.notna(pb) else 0
                })
            except Exception:
                continue
        time.sleep(3)
        
    if all_fundamentals:
        fun_df = pd.DataFrame(all_fundamentals).set_index("ticker")
        fun_df = fun_df[~fun_df.index.duplicated()]
        fun_df = fun_df.apply(pd.to_numeric, errors="coerce").fillna(0)
        fun_df.to_parquet(os.path.join(OUTPUT_DIR, f"{universe_name.lower()}_fundamentals.parquet"))
        return fun_df
        
    return pd.DataFrame()
