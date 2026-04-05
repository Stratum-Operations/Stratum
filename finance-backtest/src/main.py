import pandas as pd
from pathlib import Path

from data_loader import load_tickers, download_prices, save_prices, load_prices
from factors import momentum
from strategy import long_only
from portfolio import backtest, save_rebalance_log, save_performance
from metrics import compute_all, save_metrics
from plots import plot_cumulative_returns, plot_drawdown, plot_monthly_returns_heatmap

START_DATE = "2018-01-01"
END_DATE = "2024-12-31"
TOP_N = 20
REBALANCE_FREQ = "M"
TRANSACTION_COST = 0.001


def main():
    print("=== Finance Backtest ===")

    tickers = load_tickers()
    print(f"Loaded {len(tickers)} tickers.")

    prices_file = Path(__file__).resolve().parents[1] / "data" / "prices" / "prices.csv"
    if prices_file.exists():
        print("Loading cached prices...")
        prices = load_prices()
    else:
        print("Downloading prices from Yahoo Finance...")
        prices = download_prices(tickers, START_DATE, END_DATE)
        save_prices(prices)

    print("Computing momentum signal...")
    signal = momentum(prices)

    print("Generating portfolio weights...")
    weights = long_only(signal, top_n=TOP_N)

    print("Running backtest...")
    port_returns, rebalance_log = backtest(
        weights, prices,
        rebalance_freq=REBALANCE_FREQ,
        transaction_cost=TRANSACTION_COST,
    )

    save_performance(port_returns)
    save_rebalance_log(rebalance_log)
    save_metrics(port_returns)

    m = compute_all(port_returns)
    print("\n── Performance Summary ─────────────────────")
    for k, v in m.items():
        print(f"  {k:<25s}: {v:.4f}")

    print("\nGenerating charts...")
    plot_cumulative_returns(port_returns)
    plot_drawdown(port_returns)
    plot_monthly_returns_heatmap(port_returns)
    print("Done! Outputs saved to outputs/")


if __name__ == "__main__":
    main()
