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
    bench_equities = (1 + spy_returns).cumprod() * initial_capital

    results = {
        'Strategy_Return': strategy_daily_returns,
        'Strategy_Equity': strategy_equity,
    }
    
    if isinstance(spy_returns, pd.DataFrame):
        for col in spy_returns.columns:
            results[f'{col}_Return'] = spy_returns[col]
            results[f'{col}_Equity'] = bench_equities[col]
    else:
        name = spy_returns.name if spy_returns.name else 'SPY'
        results[f'{name}_Return'] = spy_returns
        results[f'{name}_Equity'] = bench_equities
        
    return pd.DataFrame(results).astype(float)