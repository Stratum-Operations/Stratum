import pandas as pd
import numpy as np


def calculate_momentum_6m(prices_df):
    return prices_df.pct_change(periods=126)


def calculate_momentum_12m(prices_df):
    return prices_df.pct_change(periods=252)


def calculate_volatility_3m(returns_df):
    return returns_df.rolling(window=63).std()