import pandas as pd
import numpy as np
from pathlib import Path

OUTPUTS_DIR = Path(__file__).resolve().parents[1] / "outputs"


def compute_returns(prices):
    return prices.pct_change().fillna(0.0)


def backtest(weights, prices, rebalance_freq="M", transaction_cost=0.001):
    daily_returns = compute_returns(prices)
    rebalance_dates = weights.resample(rebalance_freq).last().index

    portfolio_returns = pd.Series(0.0, index=prices.index)
    prev_weights = pd.Series(0.0, index=prices.columns)
    log_rows = []

    for date in daily_returns.index:
        if date in rebalance_dates:
            target = weights.loc[date] if date in weights.index else prev_weights
            turnover = (target - prev_weights).abs().sum()
            cost = turnover * transaction_cost
            prev_weights = target
            log_rows.append({"date": date, "turnover": turnover, "cost": cost})
        else:
            target = prev_weights

        daily_ret = (target * daily_returns.loc[date]).sum()
        portfolio_returns[date] = daily_ret

    rebalance_log = pd.DataFrame(log_rows).set_index("date")
    return portfolio_returns, rebalance_log


def save_rebalance_log(log):
    log.to_csv(OUTPUTS_DIR / "rebalance_log.csv")


def save_performance(returns):
    cum = (1 + returns).cumprod()
    df = pd.DataFrame({"daily_return": returns, "cumulative": cum})
    df.to_csv(OUTPUTS_DIR / "performance.csv")
