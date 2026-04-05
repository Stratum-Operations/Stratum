import yfinance as yf
import pandas as pd
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
PRICES_DIR = DATA_DIR / "prices"


def download_prices(tickers, start, end):
    data = yf.download(tickers, start=start, end=end, auto_adjust=True)["Close"]
    return data


def load_tickers(filepath=None):
    path = filepath or DATA_DIR / "tickers.csv"
    df = pd.read_csv(path)
    return df["ticker"].dropna().tolist()


def save_prices(df, filename="prices.csv"):
    PRICES_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(PRICES_DIR / filename)


def load_prices(filename="prices.csv"):
    return pd.read_csv(PRICES_DIR / filename, index_col=0, parse_dates=True)
