import pandas as pd
import os
from data_loader import load_tickers, download_price_data
from factors import calculate_momentum_6m
from strategy import generate_target_weights
from portfolio import simulate_portfolio
from metrics import calculate_metrics, save_evidence
from plots import plot_equity_curve, plot_drawdowns, plot_rolling_returns

# Config
START_DATE = "2016-01-01"
END_DATE = "2024-01-01"
TOP_N = 15
INITIAL_CAPITAL = 10000

def main():
    print("\n" + "="*40)
    print("      VERSION 1 MOMENTUM BACKTEST")
    print("="*40)

    # 1. Load Tickers
    print("\n[PHASE 1] Loading Tickers...")
    tickers = load_tickers()
    print(f"Loaded {len(tickers)} tickers (including SPY benchmark)")

    # 2. Download Data
    print("\n[PHASE 2] Downloading Price Data...")
    prices, daily_returns = download_price_data(tickers, START_DATE, END_DATE)
    
    if prices.empty:
        print("\n[!] ERROR: No price data downloaded. Check your connection or ticker symbols.")
        return
    
    spy_returns = daily_returns['SPY']
    stock_prices = prices.drop(columns=['SPY'])
    stock_returns = daily_returns.drop(columns=['SPY'])

    # 3. Compute Factor
    print("\n[PHASE 3] Computing 6-Month Momentum Factor...")
    momentum_scores = calculate_momentum_6m(stock_prices)

    # 4. Generate Strategy Weights
    print("\n[PHASE 4] Generating Strategy Weights...")
    weights = generate_target_weights(momentum_scores, top_n=TOP_N)

    # 5. Simulate Portfolio
    print("\n[PHASE 5] Simulating Portfolio Performance...")
    performance = simulate_portfolio(stock_returns, weights, spy_returns, INITIAL_CAPITAL)
    
    print("\n--- Performance DataFrame Info ---")
    print(performance.info())
    print(performance.head())

    # 6. Calculate Metrics
    print("\n[PHASE 6] Calculating Performance Metrics...")
    results = calculate_metrics(performance)
    print("\n--- Summary Statistics ---")
    print(results)

    # 7. Save Evidence
    print("\n[PHASE 7] Saving Evidence (CSVs)...")
    save_evidence(performance, weights, momentum_scores, results)

    # 8. Generate Charts
    print("\n[PHASE 8] Generating Charts...")
    plot_equity_curve(performance)
    plot_drawdowns(performance)
    plot_rolling_returns(performance)

    print("\n" + "="*40)
    print("      BACKTEST COMPLETE")
    print("="*40 + "\n")

if __name__ == "__main__":
    main()
