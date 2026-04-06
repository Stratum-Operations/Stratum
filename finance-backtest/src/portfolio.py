import pandas as pd
import numpy as np


def simulate_portfolio(daily_returns, target_weights, spy_returns, initial_capital=10000, friction=0.0020):
    daily_returns = daily_returns.fillna(0.0)
    spy_returns = spy_returns.fillna(0.0)
    
    daily_weights = target_weights.reindex(daily_returns.index).ffill().shift(1).fillna(0.0)
    strategy_daily_returns = (daily_returns * daily_weights).sum(axis=1)

    turnover = daily_weights.diff().abs().sum(axis=1)
    strategy_daily_returns = strategy_daily_returns - (turnover * friction)

    strategy_equity = (1 + strategy_daily_returns).cumprod() * initial_capital
    spy_equity = (1 + spy_returns).cumprod() * initial_capital

    return pd.DataFrame({
        'Strategy_Return': strategy_daily_returns,
        'Strategy_Equity': strategy_equity,
        'SPY_Return': spy_returns,
        'SPY_Equity': spy_equity
    }).astype(float)