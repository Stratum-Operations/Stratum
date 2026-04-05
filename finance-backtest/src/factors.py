import pandas as pd
import numpy as np


def momentum(prices, lookback=252, skip=21):
    return prices.shift(skip) / prices.shift(lookback) - 1


def mean_reversion(prices, lookback=21):
    return -(prices / prices.shift(lookback) - 1)


def volatility(prices, lookback=63):
    returns = prices.pct_change()
    return returns.rolling(lookback).std() * np.sqrt(252)


def rank_signal(factor):
    return factor.rank(axis=1, pct=True)
