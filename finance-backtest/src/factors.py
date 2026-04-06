import pandas as pd
import numpy as np


def calculate_momentum(prices, window_months):
    window_days = window_months * 21
    return prices.pct_change(periods=window_days)


def calculate_volatility_3m(returns):
    return returns.rolling(window=63).std()