import pandas as pd
import numpy as np


def calculate_momentum_6m(prices_df, lookback_days=126):
    return prices_df.pct_change(periods=lookback_days)