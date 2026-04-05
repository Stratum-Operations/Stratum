import pandas as pd
import numpy as np


def generate_target_weights(momentum_scores, top_n=15):
    monthly_scores = momentum_scores.resample('ME').last()
    target_weights = pd.DataFrame(index=monthly_scores.index, columns=monthly_scores.columns)

    for date, row in monthly_scores.iterrows():
        valid_scores = row.dropna()
        top_stocks = valid_scores.nlargest(top_n)
        if not top_stocks.empty:
            weight = 1.0 / len(top_stocks)
            target_weights.loc[date, top_stocks.index] = weight

    return target_weights.fillna(0)