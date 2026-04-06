import pandas as pd
import os
from pathlib import Path

PRICES_DIR = Path(__file__).resolve().parent.parent / "data" / "prices"

def download_price_data(universe):
    price_file = os.path.join(PRICES_DIR, f"{universe.lower()}_prices.parquet")
    if os.path.exists(price_file):
        adj_close = pd.read_parquet(price_file)
        return adj_close, adj_close.pct_change()
    return pd.DataFrame(), pd.DataFrame()

def fetch_fundamentals(universe):
    fun_file = os.path.join(PRICES_DIR, f"{universe.lower()}_fundamentals.parquet")
    if os.path.exists(fun_file):
        return pd.read_parquet(fun_file)
    return pd.DataFrame()