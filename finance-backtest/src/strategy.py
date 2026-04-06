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


def generate_target_weights_v6(m6, m12, v3, fun, tick_df, prices, top_n=15):
    rebalance_dates = m6.groupby(pd.Grouper(freq='ME')).apply(lambda x: x.index[-1] if not x.empty else None).dropna()
    target_weights = pd.DataFrame(index=rebalance_dates, columns=m6.columns).fillna(0.0)
    log_data = []

    sma100 = prices.rolling(window=100).mean()
    std63 = prices.pct_change().rolling(window=63).std()

    for date in rebalance_dates:
        s6 = m6.loc[date].dropna()
        s12 = m12.loc[date].dropna()
        sv3 = v3.loc[date].dropna()
        common = s6.index.intersection(s12.index).intersection(sv3.index).intersection(fun.index)
        if common.empty: continue

        df = pd.DataFrame({
            'm6': s6[common], 'm12': s12[common], 'vol': sv3[common],
            'roe': fun.loc[common, 'roe'], 'de': fun.loc[common, 'debt_equity'], 'fcf': fun.loc[common, 'fcf_margin']
        })

        df['r6'] = df['m6'].rank(pct=True)
        df['r12'] = df['m12'].rank(pct=True)
        df['rv'] = df['vol'].rank(pct=True, ascending=False)
        df['rq'] = (df['roe'].rank(pct=True) + df['de'].rank(pct=True, ascending=False) + df['fcf'].rank(pct=True)) / 3.0
        df['score'] = (0.40 * df['r6']) + (0.25 * df['r12']) + (0.20 * df['rv']) + (0.15 * df['rq'])
        
        top15 = df.nlargest(top_n, 'score').index.tolist()
        
        passing = []
        for t in top15:
            try:
                curr_price = float(prices.loc[date, t])
                curr_sma = float(sma100.loc[date, t])
                if pd.notna(curr_price) and pd.notna(curr_sma) and curr_price >= curr_sma:
                    passing.append(t)
            except (KeyError, TypeError):
                continue
                
        if passing:
            inv_vols = {}
            for t in passing:
                try:
                    vol = float(std63.loc[date, t])
                    if pd.notna(vol) and vol > 0:
                        inv_vols[t] = 1.0 / vol
                except (KeyError, TypeError):
                    pass
            
            if not inv_vols:
                continue
                
            total_inv_vol = sum(inv_vols.values())
            raw_weights = {t: v / total_inv_vol for t, v in inv_vols.items()}
            
            capped_weights = {}
            to_distribute = 1.0
            
            while raw_weights:
                raw_sum = sum(raw_weights.values())
                if raw_sum == 0: break
                
                exceeding = {t: w for t, w in raw_weights.items() if (w / raw_sum) * to_distribute > 0.10}
                if not exceeding:
                    for t, w in raw_weights.items():
                        capped_weights[t] = min(0.10, (w / raw_sum) * to_distribute)
                    break
                
                for t in exceeding:
                    capped_weights[t] = 0.10
                    to_distribute -= 0.10
                    del raw_weights[t]
                    
            for t, w in capped_weights.items():
                target_weights.loc[date, t] = w
                log_data.append({
                    'date': date.strftime('%Y-%m-%d'), 'ticker': t,
                    'm6': round(df.loc[t, 'm6'], 4), 'm12': round(df.loc[t, 'm12'], 4), 'vol': round(df.loc[t, 'vol'], 4),
                    'roe': round(df.loc[t, 'roe'], 4), 'de': round(df.loc[t, 'de'], 4), 'fcf': round(df.loc[t, 'fcf'], 4),
                    'r6': round(df.loc[t, 'r6'], 4), 'r12': round(df.loc[t, 'r12'], 4), 'rv': round(df.loc[t, 'rv'], 4),
                    'rq': round(df.loc[t, 'rq'], 4), 'score': round(df.loc[t, 'score'], 4), 'weight': round(w, 4)
                })

    return target_weights, pd.DataFrame(log_data)


def generate_target_weights_v5(m6, m12, v3, fun, tick_df, spy_prices, top_pct=0.20):
    rebalance_dates = m6.groupby(pd.Grouper(freq='ME')).apply(lambda x: x.index[-1] if not x.empty else None).dropna()
    target_weights = pd.DataFrame(index=rebalance_dates, columns=m6.columns).fillna(0.0)
    log_data = []

    spy_sma = spy_prices.rolling(window=200).mean()

    for date in rebalance_dates:
        s6 = m6.loc[date].dropna()
        s12 = m12.loc[date].dropna()
        sv3 = v3.loc[date].dropna()
        common = s6.index.intersection(s12.index).intersection(sv3.index).intersection(fun.index)
        if common.empty: continue

        try:
            current_spy = float(spy_prices.loc[date])
            current_sma = float(spy_sma.loc[date])
        except (KeyError, TypeError):
            continue

        if current_spy < current_sma:
            for t in target_weights.columns:
                target_weights.loc[date, t] = 0.0
            log_data.append({
                'date': date.strftime('%Y-%m-%d'), 'ticker': 'CASH', 'sector': 'CASH',
                'm6': 0.0, 'm12': 0.0, 'vol': 0.0,
                'roe': 0.0, 'de': 0.0, 'fcf': 0.0,
                'r6': 0.0, 'r12': 0.0, 'rv': 0.0,
                'rq': 0.0, 'score': 0.0, 'weight': 1.0
            })
            continue

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