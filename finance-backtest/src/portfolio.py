import pandas as pd
import numpy as np


def simulate_portfolio(daily_returns, target_weights, spy_returns, initial_capital=10000):
    daily_weights = target_weights.reindex(daily_returns.index).ffill().shift(1)

    strategy_daily_returns = (daily_returns * daily_weights).sum(axis=1)

    strategy_equity = (1 + strategy_daily_returns).cumprod() * initial_capital
    spy_equity = (1 + spy_returns).cumprod() * initial_capital

    performance_data = pd.DataFrame({
        'Strategy_Return': strategy_daily_returns,
        'Strategy_Equity': strategy_equity.fillna(initial_capital),
        'SPY_Return': spy_returns,
        'SPY_Equity': spy_equity.fillna(initial_capital)
    })

    return performance_data