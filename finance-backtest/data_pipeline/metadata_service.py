import pandas as pd
import os

def get_universe_tickers(universe_name):
    tickers = []
    if universe_name == "SP500":
        try:
            df = pd.read_html("https://en.wikipedia.org/wiki/List_of_S%26P_500_companies")[0]
            tickers = df["Symbol"].str.replace(".", "-").tolist()
        except Exception:
            pass
    elif universe_name == "NASDAQ100":
        try:
            dfs = pd.read_html("https://en.wikipedia.org/wiki/Nasdaq-100")
            for df in dfs:
                if "Ticker" in df.columns:
                    tickers = df["Ticker"].str.replace(".", "-").tolist()
                    break
        except Exception:
            pass
    
    if not tickers:
        try:
            df = pd.read_csv("data/tickers.csv")
            tickers = df["ticker"].tolist()
        except:
            pass
            
    benchmarks = ["SPY", "QQQ", "MTUM", "QUAL"]
    for b in benchmarks:
        if b not in tickers:
            tickers.append(b)
            
    return list(dict.fromkeys(tickers))

def get_sector_mapping():
    try:
        df = pd.read_csv("data/tickers.csv")
        return df.set_index("ticker")["sector"].to_dict()
    except:
        return {}
