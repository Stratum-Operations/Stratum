import pandas as pd
from factors import rank_signal


def long_short(signal, top_pct=0.2, bottom_pct=0.2):
    ranked = rank_signal(signal)
    weights = pd.DataFrame(0.0, index=signal.index, columns=signal.columns)
    weights[ranked >= (1 - top_pct)] = 1.0
    weights[ranked <= bottom_pct] = -1.0
    row_gross = weights.abs().sum(axis=1)
    weights = weights.div(row_gross, axis=0).fillna(0.0)
    return weights


def long_only(signal, top_n=20):
    ranked = signal.rank(axis=1, ascending=False)
    weights = pd.DataFrame(0.0, index=signal.index, columns=signal.columns)
    weights[ranked <= top_n] = 1.0
    row_sum = weights.sum(axis=1)
    weights = weights.div(row_sum, axis=0).fillna(0.0)
    return weights
