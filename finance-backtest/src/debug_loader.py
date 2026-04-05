from data_loader import load_tickers, download_price_data
import pandas as pd

try:
    tickers = load_tickers()
    print(f"Tickers loaded: {len(tickers)}")
    prices, returns = download_price_data(tickers[:5], "2023-01-01", "2023-02-01")
    print("\nPrices Schema:")
    print(prices.info())
    print("\nPrices Head:")
    print(prices.head())
except Exception as e:
    print(f"Error: {e}")
