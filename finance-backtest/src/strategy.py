import pandas as pd
import numpy as np


def generate_target_weights(momentum_scores, top_n=15):
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


def generate_target_weights_v2(m6, m12, top_n=15):
    rebalance_dates = m6.groupby(pd.Grouper(freq='ME')).apply(lambda x: x.index[-1] if not x.empty else None).dropna()
    target_weights = pd.DataFrame(index=rebalance_dates, columns=m6.columns).fillna(0.0)
    log_data = []

    for date in rebalance_dates:
        s6 = m6.loc[date].dropna()
        s12 = m12.loc[date].dropna()
        common_tickers = s6.index.intersection(s12.index)
        if common_tickers.empty:
            continue
        r6 = s6[common_tickers].rank(pct=True)
        r12 = s12[common_tickers].rank(pct=True)
        composite = (0.70 * r6) + (0.30 * r12)
        top_entries = composite.nlargest(top_n)
        if not top_entries.empty:
            final_ranks = composite.rank(ascending=False, method='min')
            weight = 1.0 / len(top_entries)
            for ticker, score in top_entries.items():
                target_weights.loc[date, ticker] = weight
                log_data.append({
                    'date': date.strftime('%Y-%m-%d'),
                    'ticker': ticker,
                    'momentum_6m': round(s6[ticker], 4),
                    'momentum_12m': round(s12[ticker], 4),
                    'rank_6m': round(r6[ticker], 4),
                    'rank_12m': round(r12[ticker], 4),
                    'composite_score': round(score, 4),
                    'final_rank': int(final_ranks[ticker]),
                    'weight': round(weight, 4)
                })

    return target_weights, pd.DataFrame(log_data)


def generate_target_weights_v3(m6, m12, v3, top_n=15):
    rebalance_dates = m6.groupby(pd.Grouper(freq='ME')).apply(lambda x: x.index[-1] if not x.empty else None).dropna()
    target_weights = pd.DataFrame(index=rebalance_dates, columns=m6.columns).fillna(0.0)
    log_data = []

    for date in rebalance_dates:
        s6 = m6.loc[date].dropna()
        s12 = m12.loc[date].dropna()
        sv3 = v3.loc[date].dropna()
        common = s6.index.intersection(s12.index).intersection(sv3.index)
        if common.empty:
            continue
        r6 = s6[common].rank(pct=True)
        r12 = s12[common].rank(pct=True)
        rv3 = sv3[common].rank(pct=True, ascending=False)
        composite = (0.50 * r6) + (0.30 * r12) + (0.20 * rv3)
        top_entries = composite.nlargest(top_n)
        if not top_entries.empty:
            final_ranks = composite.rank(ascending=False, method='min')
            weight = 1.0 / len(top_entries)
            for ticker, score in top_entries.items():
                target_weights.loc[date, ticker] = weight
                log_data.append({
                    'date': date.strftime('%Y-%m-%d'),
                    'ticker': ticker,
                    'momentum_6m': round(s6[ticker], 4),
                    'momentum_12m': round(s12[ticker], 4),
                    'volatility': round(sv3[ticker], 4),
                    'rank_6m': round(r6[ticker], 4),
                    'rank_12m': round(r12[ticker], 4),
                    'rank_low_vol': round(rv3[ticker], 4),
                    'composite_score': round(score, 4),
                    'final_rank': int(final_ranks[ticker]),
                    'weight': round(weight, 4)
                })

    return target_weights, pd.DataFrame(log_data)


def generate_target_weights_v4(m6, m12, v3, fun, tick_df, top_pct=0.20):
    rebalance_dates = m6.groupby(pd.Grouper(freq='ME')).apply(lambda x: x.index[-1] if not x.empty else None).dropna()
    target_weights = pd.DataFrame(index=rebalance_dates, columns=m6.columns).fillna(0.0)
    log_data = []

    for date in rebalance_dates:
        s6 = m6.loc[date].dropna()
        s12 = m12.loc[date].dropna()
        sv3 = v3.loc[date].dropna()
        common = s6.index.intersection(s12.index).intersection(sv3.index).intersection(fun.index)
        if common.empty: continue

        df = pd.DataFrame({
            'm6': s6[common], 'm12': s12[common], 'vol': sv3[common],
            'roe': fun.loc[common, 'roe'], 'de': fun.loc[common, 'debt_equity'], 'fcf': fun.loc[common, 'fcf_margin'],
            'sector': tick_df.set_index('ticker').loc[common, 'sector']
        })

        df['r6'] = df.groupby('sector')['m6'].rank(pct=True)
        df['r12'] = df.groupby('sector')['m12'].rank(pct=True)
        df['rv'] = df.groupby('sector')['vol'].rank(pct=True, ascending=False)
        
        rq_roe = df.groupby('sector')['roe'].rank(pct=True)
        rq_de = df.groupby('sector')['de'].rank(pct=True, ascending=False)
        rq_fcf = df.groupby('sector')['fcf'].rank(pct=True)
        df['rq'] = (rq_roe + rq_de + rq_fcf) / 3.0
        df['rq_rank'] = df.groupby('sector')['rq'].rank(pct=True)

        df['score'] = (0.40 * df['r6']) + (0.25 * df['r12']) + (0.20 * df['rv']) + (0.15 * df['rq_rank'])
        
        selected = []
        for sector, group in df.groupby('sector'):
            n = max(1, int(len(group) * top_pct))
            top = group.nlargest(n, 'score')
            selected.extend(top.index.tolist())
        
        if selected:
            w = 1.0 / len(selected)
            target_weights.loc[date, selected] = w
            for t in selected:
                log_data.append({
                    'date': date.strftime('%Y-%m-%d'), 'ticker': t, 'sector': df.loc[t, 'sector'],
                    'm6': round(df.loc[t, 'm6'], 4), 'm12': round(df.loc[t, 'm12'], 4), 'vol': round(df.loc[t, 'vol'], 4),
                    'roe': round(df.loc[t, 'roe'], 4), 'de': round(df.loc[t, 'de'], 4), 'fcf': round(df.loc[t, 'fcf'], 4),
                    'r6': round(df.loc[t, 'r6'], 4), 'r12': round(df.loc[t, 'r12'], 4), 'rv': round(df.loc[t, 'rv'], 4),
                    'rq': round(df.loc[t, 'rq_rank'], 4), 'score': round(df.loc[t, 'score'], 4), 'weight': round(w, 4)
                })

    return target_weights, pd.DataFrame(log_data)