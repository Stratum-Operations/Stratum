import pandas as pd
import numpy as np

def calculate_momentum_6m(prices_df, lookback_days=126):
    print(f"Calculating {lookback_days}-day momentum factor...")
    
    momentum_scores = prices_df.pct_change(periods=lookback_days)
    
    return momentum_scores

if __name__ == "__main__":

    dates = pd.date_range(start="2023-01-01", periods=130, freq="B")
    dummy_prices = pd.DataFrame({
        'AAPL': np.linspace(100, 150, 130),
        'MSFT': np.linspace(200, 180, 130)
    }, index=dates)
    
    mom_6m = calculate_momentum_6m(dummy_prices)
    
    print("\nFirst 5 days (should be NaN because there is no 126-day history yet):")
    print(mom_6m.head())
    
    print("\nDay 127 (first day with valid 126-day lookback):")
    print(mom_6m.iloc[126:128])