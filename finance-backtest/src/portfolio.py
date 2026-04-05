import pandas as pd
import numpy as np


def simulate_portfolio(daily_returns, target_weights, spy_returns, initial_capital=10000):
    # Ensure all returns are numeric and NaN-free for compounding
    daily_returns = daily_returns.fillna(0.0)
    spy_returns = spy_returns.fillna(0.0)
    
    # Align weights to daily timeline and shift by one day to avoid look-ahead bias
    daily_weights = target_weights.reindex(daily_returns.index).ffill().shift(1).fillna(0.0)

    # Strategy returns is dot product of weights and daily returns
    strategy_daily_returns = (daily_returns * daily_weights).sum(axis=1)

    # Cumulative compounding returns (1 + r1) * (1 + r2)...
    strategy_equity = (1 + strategy_daily_returns).cumprod() * initial_capital
    spy_equity = (1 + spy_returns).cumprod() * initial_capital

    # Explicitly cast to float to prevent any hidden Object types from breaking ufuncs later
    return pd.DataFrame({
        'Strategy_Return': strategy_daily_returns,
        'Strategy_Equity': strategy_equity,
        'SPY_Return': spy_returns,
        'SPY_Equity': spy_equity
    }).astype(float)