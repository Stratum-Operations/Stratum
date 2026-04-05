import pandas as pd
import numpy as np
from pathlib import Path

OUTPUTS_DIR = Path(__file__).resolve().parents[1] / "outputs"
TRADING_DAYS = 252


def total_return(returns):
    return (1 + returns).prod() - 1


def cagr(returns):
    n_years = len(returns) / TRADING_DAYS
    return (1 + total_return(returns)) ** (1 / n_years) - 1


def annualised_volatility(returns):
    return returns.std() * np.sqrt(TRADING_DAYS)


def sharpe_ratio(returns, risk_free=0.0):
    excess = returns - risk_free / TRADING_DAYS
    return excess.mean() / excess.std() * np.sqrt(TRADING_DAYS)


def max_drawdown(returns):
    cum = (1 + returns).cumprod()
    rolling_max = cum.cummax()
    drawdown = (cum - rolling_max) / rolling_max
    return drawdown.min()


def calmar_ratio(returns):
    mdd = abs(max_drawdown(returns))
    return cagr(returns) / mdd if mdd != 0 else np.nan


def sortino_ratio(returns, risk_free=0.0):
    excess = returns - risk_free / TRADING_DAYS
    downside = excess[excess < 0].std() * np.sqrt(TRADING_DAYS)
    return excess.mean() * TRADING_DAYS / downside if downside != 0 else np.nan


def compute_all(returns):
    return {
        "total_return": total_return(returns),
        "cagr": cagr(returns),
        "annualised_volatility": annualised_volatility(returns),
        "sharpe_ratio": sharpe_ratio(returns),
        "max_drawdown": max_drawdown(returns),
        "calmar_ratio": calmar_ratio(returns),
        "sortino_ratio": sortino_ratio(returns),
    }


def save_metrics(returns):
    m = compute_all(returns)
    df = pd.DataFrame([m])
    df.to_csv(OUTPUTS_DIR / "metrics.csv", index=False)
    return df
