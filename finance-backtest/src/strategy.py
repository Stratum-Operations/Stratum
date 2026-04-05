import pandas as pd
import numpy as np


def generate_target_weights(momentum_scores, top_n=15):
    # Select the last actual trading day of each month
    # This avoids KeyError when looking up scores for calendar month-ends
    rebalance_dates = momentum_scores.groupby(pd.Grouper(freq='ME')).apply(lambda x: x.index[-1] if not x.empty else None).dropna()
    
    monthly_scores = momentum_scores.loc[rebalance_dates]
    target_weights = pd.DataFrame(index=monthly_scores.index, columns=monthly_scores.columns)

    for date, row in monthly_scores.iterrows():
        valid_scores = row.dropna()
        top_stocks = valid_scores.nlargest(top_n)
        if not top_stocks.empty:
            weight = 1.0 / len(top_stocks)
            target_weights.loc[date, top_stocks.index] = weight

    return target_weights.fillna(0)