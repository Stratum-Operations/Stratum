import pandas as pd
import numpy as np
import scipy.sparse as sp
import cvxpy as cp

try:
    from optimizer import optimize_portfolio
except ImportError:
    from src.optimizer import optimize_portfolio


def calc_zscore(df, groupby_cols, col_name, ascending=True):
    """Calculates cross-sectional Z-scores grouped by the specified columns.
    
    Handles cases with zero or NaN standard deviation by returning 0.0.
    """
    mean = df.groupby(groupby_cols)[col_name].transform('mean')
    std = df.groupby(groupby_cols)[col_name].transform('std')
    
    # Safe standard deviation to prevent division by zero or NaN
    std_safe = std.copy()
    std_safe[(std_safe == 0.0) | std_safe.isna()] = 1.0
    
    z = (df[col_name] - mean) / std_safe
    z = z.fillna(0.0)
    
    if not ascending:
        z = -z
        
    return z


def generate_target_weights(momentum_scores, top_n=15):
    rebalance_dates = momentum_scores.groupby(pd.Grouper(freq='ME')).apply(lambda x: x.index[-1] if not x.empty else None).dropna()
    monthly_scores = momentum_scores.loc[rebalance_dates]
    
    # Stack to get (date, ticker) MultiIndex Series
    stacked = monthly_scores.stack()
    if stacked.empty:
        return pd.DataFrame(0.0, index=rebalance_dates, columns=momentum_scores.columns)
        
    # Rank cross-sectionally on each date
    ranks = stacked.groupby(level=0).rank(ascending=False, method='first')
    is_top = ranks <= top_n
    
    # Count how many are actually selected per date
    actual_n = is_top.groupby(level=0).transform('sum')
    
    # Calculate weights
    weights = np.where(is_top & (actual_n > 0), 1.0 / actual_n, 0.0)
    
    # Construct Series, unstack and reindex to original columns
    target_weights = pd.Series(weights, index=stacked.index).unstack(fill_value=0.0)
    return target_weights.reindex(index=rebalance_dates, columns=momentum_scores.columns, fill_value=0.0)


def generate_target_weights_v2(m6, m12, top_n=15):
    rebalance_dates = m6.groupby(pd.Grouper(freq='ME')).apply(lambda x: x.index[-1] if not x.empty else None).dropna()
    
    # Stack to get (date, ticker) Series
    s6 = m6.loc[rebalance_dates].stack()
    s12 = m12.loc[rebalance_dates].stack()
    
    # Align and drop NaNs to get only common tickers
    df = pd.DataFrame({'m6': s6, 'm12': s12}).dropna()
    if df.empty:
        return pd.DataFrame(0.0, index=rebalance_dates, columns=m6.columns), pd.DataFrame()
        
    # Reset index and rename columns robustly
    df = df.reset_index()
    df.columns.values[0] = 'date'
    df.columns.values[1] = 'ticker'
    
    # Z-scores
    df['z6'] = calc_zscore(df, 'date', 'm6', ascending=True)
    df['z12'] = calc_zscore(df, 'date', 'm12', ascending=True)
    
    # Composite Score
    df['composite'] = 0.70 * df['z6'] + 0.30 * df['z12']
    
    # Top N selection
    df['final_rank'] = df.groupby('date')['composite'].rank(ascending=False, method='first')
    df['is_top'] = df['final_rank'] <= top_n
    
    df['final_rank_min'] = df.groupby('date')['composite'].rank(ascending=False, method='min')
    
    # Count how many are selected per date
    actual_n = df.groupby('date')['is_top'].transform('sum')
    
    # Target weights
    df['weight'] = np.where(df['is_top'] & (actual_n > 0), 1.0 / actual_n, 0.0)
    
    # Pivot to get target weights DataFrame
    target_weights = df.pivot(index='date', columns='ticker', values='weight').fillna(0.0)
    target_weights = target_weights.reindex(index=rebalance_dates, columns=m6.columns, fill_value=0.0)
    
    # Filter for logged data
    log_df = df[df['is_top']].copy()
    if not log_df.empty:
        log_df['date_str'] = log_df['date'].dt.strftime('%Y-%m-%d')
        log_data_df = pd.DataFrame({
            'date': log_df['date_str'],
            'ticker': log_df['ticker'],
            'momentum_6m': log_df['m6'].round(4),
            'momentum_12m': log_df['m12'].round(4),
            'rank_6m': log_df['z6'].round(4),
            'rank_12m': log_df['z12'].round(4),
            'composite_score': log_df['composite'].round(4),
            'final_rank': log_df['final_rank_min'].astype(int),
            'weight': log_df['weight'].round(4)
        })
    else:
        log_data_df = pd.DataFrame()
        
    return target_weights, log_data_df


def generate_target_weights_v3(m6, m12, v3, top_n=15):
    rebalance_dates = m6.groupby(pd.Grouper(freq='ME')).apply(lambda x: x.index[-1] if not x.empty else None).dropna()
    
    # Stack to get (date, ticker) Series
    s6 = m6.loc[rebalance_dates].stack()
    s12 = m12.loc[rebalance_dates].stack()
    sv3 = v3.loc[rebalance_dates].stack()
    
    # Align and drop NaNs to get only common tickers
    df = pd.DataFrame({'m6': s6, 'm12': s12, 'vol': sv3}).dropna()
    if df.empty:
        return pd.DataFrame(0.0, index=rebalance_dates, columns=m6.columns), pd.DataFrame()
        
    df = df.reset_index()
    df.columns.values[0] = 'date'
    df.columns.values[1] = 'ticker'
    
    # Z-scores
    df['z6'] = calc_zscore(df, 'date', 'm6', ascending=True)
    df['z12'] = calc_zscore(df, 'date', 'm12', ascending=True)
    df['zv3'] = calc_zscore(df, 'date', 'vol', ascending=False)
    
    # Composite Score
    df['composite'] = 0.50 * df['z6'] + 0.30 * df['z12'] + 0.20 * df['zv3']
    
    # Top N selection
    df['final_rank'] = df.groupby('date')['composite'].rank(ascending=False, method='first')
    df['is_top'] = df['final_rank'] <= top_n
    
    df['final_rank_min'] = df.groupby('date')['composite'].rank(ascending=False, method='min')
    
    # Count how many are selected per date
    actual_n = df.groupby('date')['is_top'].transform('sum')
    
    # Target weights
    df['weight'] = np.where(df['is_top'] & (actual_n > 0), 1.0 / actual_n, 0.0)
    
    # Pivot to get target weights DataFrame
    target_weights = df.pivot(index='date', columns='ticker', values='weight').fillna(0.0)
    target_weights = target_weights.reindex(index=rebalance_dates, columns=m6.columns, fill_value=0.0)
    
    # Log data
    log_df = df[df['is_top']].copy()
    if not log_df.empty:
        log_df['date_str'] = log_df['date'].dt.strftime('%Y-%m-%d')
        log_data_df = pd.DataFrame({
            'date': log_df['date_str'],
            'ticker': log_df['ticker'],
            'momentum_6m': log_df['m6'].round(4),
            'momentum_12m': log_df['m12'].round(4),
            'volatility': log_df['vol'].round(4),
            'rank_6m': log_df['z6'].round(4),
            'rank_12m': log_df['z12'].round(4),
            'rank_low_vol': log_df['zv3'].round(4),
            'composite_score': log_df['composite'].round(4),
            'final_rank': log_df['final_rank_min'].astype(int),
            'weight': log_df['weight'].round(4)
        })
    else:
        log_data_df = pd.DataFrame()
        
    return target_weights, log_data_df


def generate_target_weights_v4(m6, m12, v3, fun, tick_df, top_pct=0.20):
    rebalance_dates = m6.groupby(pd.Grouper(freq='ME')).apply(lambda x: x.index[-1] if not x.empty else None).dropna()
    
    s6 = m6.loc[rebalance_dates].stack()
    s12 = m12.loc[rebalance_dates].stack()
    sv3 = v3.loc[rebalance_dates].stack()
    
    df = pd.DataFrame({'m6': s6, 'm12': s12, 'vol': sv3}).dropna()
    if df.empty or fun.empty or tick_df.empty:
        return pd.DataFrame(0.0, index=rebalance_dates, columns=m6.columns), pd.DataFrame()
        
    df = df.reset_index()
    df.columns.values[0] = 'date'
    df.columns.values[1] = 'ticker'
    
    # Align fun and tick_df
    df = df.merge(fun, left_on='ticker', right_index=True, how='inner')
    df = df.merge(tick_df[['ticker', 'sector']], on='ticker', how='inner')
    
    if df.empty:
        return pd.DataFrame(0.0, index=rebalance_dates, columns=m6.columns), pd.DataFrame()
        
    # Group by both date and sector
    groupby_cols = ['date', 'sector']
    
    # Z-scores
    df['z6'] = calc_zscore(df, groupby_cols, 'm6', ascending=True)
    df['z12'] = calc_zscore(df, groupby_cols, 'm12', ascending=True)
    df['zv'] = calc_zscore(df, groupby_cols, 'vol', ascending=False)
    
    zq_roe = calc_zscore(df, groupby_cols, 'roe', ascending=True)
    zq_de = calc_zscore(df, groupby_cols, 'debt_equity', ascending=False)
    zq_fcf = calc_zscore(df, groupby_cols, 'fcf_margin', ascending=True)
    
    df['rq'] = (zq_roe + zq_de + zq_fcf) / 3.0
    df['rq_rank'] = calc_zscore(df, groupby_cols, 'rq', ascending=True)
    
    df['score'] = (0.40 * df['z6']) + (0.25 * df['z12']) + (0.20 * df['zv']) + (0.15 * df['rq_rank'])
    
    # Count of tickers in each (date, sector) group
    group_sizes = df.groupby(groupby_cols)['ticker'].transform('count')
    df['n_to_select'] = (group_sizes * top_pct).astype(int).clip(lower=1)
    
    # Rank within sector
    df['rank_in_sector'] = df.groupby(groupby_cols)['score'].rank(ascending=False, method='first')
    df['is_selected'] = df['rank_in_sector'] <= df['n_to_select']
    
    # Total selected across all sectors per date
    actual_selected_n = df.groupby('date')['is_selected'].transform('sum')
    
    # Weights
    df['weight'] = np.where(df['is_selected'] & (actual_selected_n > 0), 1.0 / actual_selected_n, 0.0)
    
    # Pivot to get target weights
    target_weights = df.pivot(index='date', columns='ticker', values='weight').fillna(0.0)
    target_weights = target_weights.reindex(index=rebalance_dates, columns=m6.columns, fill_value=0.0)
    
    # Filter logged data
    log_df = df[df['is_selected']].copy()
    if not log_df.empty:
        log_df['date_str'] = log_df['date'].dt.strftime('%Y-%m-%d')
        log_data_df = pd.DataFrame({
            'date': log_df['date_str'],
            'ticker': log_df['ticker'],
            'sector': log_df['sector'],
            'm6': log_df['m6'].round(4),
            'm12': log_df['m12'].round(4),
            'vol': log_df['vol'].round(4),
            'roe': log_df['roe'].round(4),
            'de': log_df['debt_equity'].round(4),
            'fcf': log_df['fcf_margin'].round(4),
            'r6': log_df['z6'].round(4),
            'r12': log_df['z12'].round(4),
            'rv': log_df['zv'].round(4),
            'rq': log_df['rq_rank'].round(4),
            'score': log_df['score'].round(4),
            'weight': log_df['weight'].round(4)
        })
    else:
        log_data_df = pd.DataFrame()
        
    return target_weights, log_data_df


def generate_target_weights_v6(m6, m12, v3, fun, tick_df, prices, top_n=15, weights_dict=None):
    rebalance_dates = m6.groupby(pd.Grouper(freq='ME')).apply(lambda x: x.index[-1] if not x.empty else None).dropna()
    
    # Stack signals
    s6 = m6.loc[rebalance_dates].stack()
    s12 = m12.loc[rebalance_dates].stack()
    sv3 = v3.loc[rebalance_dates].stack()
    
    # Align and drop NaNs
    df = pd.DataFrame({'m6': s6, 'm12': s12, 'vol': sv3}).dropna()
    if df.empty or fun.empty:
        return pd.DataFrame(0.0, index=rebalance_dates, columns=m6.columns), pd.DataFrame()
        
    df = df.reset_index()
    df.columns.values[0] = 'date'
    df.columns.values[1] = 'ticker'
    df = df.merge(fun, left_on='ticker', right_index=True, how='inner')
    
    if df.empty:
        return pd.DataFrame(0.0, index=rebalance_dates, columns=m6.columns), pd.DataFrame()
        
    groupby_cols = 'date'
    
    # Z-scores
    df['z6'] = calc_zscore(df, groupby_cols, 'm6', ascending=True)
    df['z12'] = calc_zscore(df, groupby_cols, 'm12', ascending=True)
    df['zv'] = calc_zscore(df, groupby_cols, 'vol', ascending=False)
    
    rq_roe = calc_zscore(df, groupby_cols, 'roe', ascending=True)
    rq_de = calc_zscore(df, groupby_cols, 'debt_equity', ascending=False)
    rq_fcf = calc_zscore(df, groupby_cols, 'fcf_margin', ascending=True)
    
    df['rq'] = (rq_roe + rq_de + rq_fcf) / 3.0
    
    w_m6 = weights_dict.get('w_m6', 0.40) if weights_dict else 0.40
    w_m12 = weights_dict.get('w_m12', 0.25) if weights_dict else 0.25
    w_vol = weights_dict.get('w_vol', 0.20) if weights_dict else 0.20
    w_qual = weights_dict.get('w_qual', 0.15) if weights_dict else 0.15
    df['score'] = (w_m6 * df['z6']) + (w_m12 * df['z12']) + (w_vol * df['zv']) + (w_qual * df['rq'])
    
    # Top 15 selection based on score
    df['rank_score'] = df.groupby('date')['score'].rank(ascending=False, method='first')
    df['is_top'] = df['rank_score'] <= top_n
    
    df = df[df['is_top']].copy()
    if df.empty:
        return pd.DataFrame(0.0, index=rebalance_dates, columns=m6.columns), pd.DataFrame()
        
    # Align prices and sma100
    sma100 = prices.rolling(window=100).mean()
    prices_stacked = prices.stack().rename('curr_price')
    sma100_stacked = sma100.stack().rename('curr_sma')
    
    prices_reset = prices_stacked.reset_index()
    prices_reset.columns.values[0] = 'date'
    prices_reset.columns.values[1] = 'ticker'
    prices_reset = prices_reset.rename(columns={prices_reset.columns.values[2]: 'curr_price'})
    
    sma100_reset = sma100_stacked.reset_index()
    sma100_reset.columns.values[0] = 'date'
    sma100_reset.columns.values[1] = 'ticker'
    sma100_reset = sma100_reset.rename(columns={sma100_reset.columns.values[2]: 'curr_sma'})
    
    df = df.merge(prices_reset, on=['date', 'ticker'], how='left')
    df = df.merge(sma100_reset, on=['date', 'ticker'], how='left')
    
    # Trend filter
    df['passing'] = (df['curr_price'] >= df['curr_sma']) & df['curr_price'].notna() & df['curr_sma'].notna()
    df = df[df['passing']].copy()
    
    if df.empty:
        return pd.DataFrame(0.0, index=rebalance_dates, columns=m6.columns), pd.DataFrame()
        
    # Order by date and ticker
    df = df.sort_values(by=['date', 'ticker']).reset_index(drop=True)
    
    # Portfolio Optimization via sparse joint QP
    date_groups = df.groupby('date')
    group_sizes = date_groups.size()
    T_active = len(group_sizes)
    M = len(df)
    
    returns = prices.pct_change()
    
    blocks = []
    for date, group in date_groups:
        tickers = group['ticker'].tolist()
        asset_returns = returns.loc[:date, tickers].tail(63)
        cov = asset_returns.cov().fillna(0.0)
        # Regularize to guarantee positive definiteness
        cov_val = cov.values + 1e-6 * np.eye(len(tickers))
        blocks.append(cov_val)
        
    Sigma_sparse = sp.block_diag(blocks, format='csr')
    
    w = cp.Variable(M)
    alpha_vals = df['score'].values
    
    expected_return = w @ alpha_vals
    risk = cp.quad_form(w, Sigma_sparse)
    objective = cp.Maximize(expected_return - 0.5 * 1.0 * risk)
    
    row_indices = []
    col_indices = []
    data = []
    current_col = 0
    b = []
    
    for t, (date, size) in enumerate(group_sizes.items()):
        row_indices.extend([t] * size)
        col_indices.extend(range(current_col, current_col + size))
        data.extend([1.0] * size)
        current_col += size
        b.append(min(1.0, size * 0.10))
        
    A = sp.csr_matrix((data, (row_indices, col_indices)), shape=(T_active, M))
    
    constraints = [
        w >= 0,
        w <= 0.10,
        A @ w == np.array(b)
    ]
    
    prob = cp.Problem(objective, constraints)
    try:
        prob.solve(solver=cp.OSQP, verbose=False)
    except Exception:
        try:
            prob.solve(verbose=False)
        except Exception:
            pass
            
    if prob.status in [cp.OPTIMAL, cp.OPTIMAL_INACCURATE] and w.value is not None:
        opt_weights = w.value
        opt_weights[opt_weights < 1e-5] = 0.0
        
        # Scale to match target sum exactly
        df['weight'] = opt_weights
        grp_sum = df.groupby('date')['weight'].transform('sum')
        target_b = df['date'].map(pd.Series(b, index=group_sizes.index))
        df['weight'] = np.where(grp_sum > 0, (df['weight'] / grp_sum) * target_b, 0.0)
    else:
        print(f"Warning: Joint portfolio optimization failed with status {prob.status}. Falling back to equal weighting.")
        df['weight'] = df['date'].map(pd.Series(b, index=group_sizes.index)) / df['date'].map(group_sizes)
        
    # Pivot to target weights DataFrame
    target_weights = df.pivot(index='date', columns='ticker', values='weight').fillna(0.0)
    target_weights = target_weights.reindex(index=rebalance_dates, columns=m6.columns, fill_value=0.0)
    
    # Log data
    df['date_str'] = df['date'].dt.strftime('%Y-%m-%d')
    log_data_df = pd.DataFrame({
        'date': df['date_str'],
        'ticker': df['ticker'],
        'm6': df['m6'].round(4),
        'm12': df['m12'].round(4),
        'vol': df['vol'].round(4),
        'roe': df['roe'].round(4),
        'de': df['debt_equity'].round(4),
        'fcf': df['fcf_margin'].round(4),
        'r6': df['z6'].round(4),
        'r12': df['z12'].round(4),
        'rv': df['zv'].round(4),
        'rq': df['rq'].round(4),
        'score': df['score'].round(4),
        'weight': df['weight'].round(4)
    })
    
    return target_weights, log_data_df


def generate_target_weights_v5(m6, m12, v3, fun, tick_df, spy_prices, top_pct=0.20):
    rebalance_dates = m6.groupby(pd.Grouper(freq='ME')).apply(lambda x: x.index[-1] if not x.empty else None).dropna()
    
    spy_sma = spy_prices.rolling(window=200).mean()
    
    # Pre-calculate SPY market trend exposure for all dates using continuous sigmoid scaling
    exposure = pd.Series(1.0, index=rebalance_dates)
    for date in rebalance_dates:
        try:
            curr_spy = float(spy_prices.loc[date])
            curr_sma = float(spy_sma.loc[date])
            if pd.notna(curr_spy) and pd.notna(curr_sma) and curr_sma > 0:
                dist = (curr_spy - curr_sma) / curr_sma
                exposure.loc[date] = 1.0 / (1.0 + np.exp(-100.0 * dist))
            else:
                exposure.loc[date] = 0.0
        except (KeyError, TypeError):
            exposure.loc[date] = 0.0
            
    # Target Weights Initialization
    target_weights = pd.DataFrame(0.0, index=rebalance_dates, columns=m6.columns)
    log_data_list = []
    
    # Stack strategy inputs
    s6 = m6.loc[rebalance_dates].stack()
    s12 = m12.loc[rebalance_dates].stack()
    sv3 = v3.loc[rebalance_dates].stack()
    
    df = pd.DataFrame({'m6': s6, 'm12': s12, 'vol': sv3}).dropna()
    if not df.empty and not fun.empty and not tick_df.empty:
        df = df.reset_index()
        df.columns.values[0] = 'date'
        df.columns.values[1] = 'ticker'
        df = df.merge(fun, left_on='ticker', right_index=True, how='inner')
        df = df.merge(tick_df[['ticker', 'sector']], on='ticker', how='inner')
        
        if not df.empty:
            groupby_cols = ['date', 'sector']
            
            # Z-scores
            df['z6'] = calc_zscore(df, groupby_cols, 'm6', ascending=True)
            df['z12'] = calc_zscore(df, groupby_cols, 'm12', ascending=True)
            df['zv'] = calc_zscore(df, groupby_cols, 'vol', ascending=False)
            
            rq_roe = calc_zscore(df, groupby_cols, 'roe', ascending=True)
            rq_de = calc_zscore(df, groupby_cols, 'debt_equity', ascending=False)
            rq_fcf = calc_zscore(df, groupby_cols, 'fcf_margin', ascending=True)
            
            df['rq'] = (rq_roe + rq_de + rq_fcf) / 3.0
            df['rq_rank'] = calc_zscore(df, groupby_cols, 'rq', ascending=True)
            
            df['score'] = (0.40 * df['z6']) + (0.25 * df['z12']) + (0.20 * df['zv']) + (0.15 * df['rq_rank'])
            
            group_sizes = df.groupby(groupby_cols)['ticker'].transform('count')
            df['n_to_select'] = (group_sizes * top_pct).astype(int).clip(lower=1)
            
            df['rank_in_sector'] = df.groupby(groupby_cols)['score'].rank(ascending=False, method='first')
            df['is_selected'] = df['rank_in_sector'] <= df['n_to_select']
            
            actual_selected_n = df.groupby('date')['is_selected'].transform('sum')
            
            # Weights (scaled by exposure)
            df['exposure'] = df['date'].map(exposure)
            df['weight'] = np.where(df['is_selected'] & (actual_selected_n > 0), df['exposure'] / actual_selected_n, 0.0)
            
            # Pivot and update target_weights
            strat_weights = df.pivot(index='date', columns='ticker', values='weight').fillna(0.0)
            strat_weights = strat_weights.reindex(index=rebalance_dates, columns=m6.columns, fill_value=0.0)
            target_weights.loc[rebalance_dates] = strat_weights.loc[rebalance_dates]
            
            # Filter logged data for strategy dates
            log_df = df[df['is_selected']].copy()
            if not log_df.empty:
                log_df['date_str'] = log_df['date'].dt.strftime('%Y-%m-%d')
                strat_logs = pd.DataFrame({
                    'date': log_df['date_str'],
                    'ticker': log_df['ticker'],
                    'sector': log_df['sector'],
                    'm6': log_df['m6'].round(4),
                    'm12': log_df['m12'].round(4),
                    'vol': log_df['vol'].round(4),
                    'roe': log_df['roe'].round(4),
                    'de': log_df['debt_equity'].round(4),
                    'fcf': log_df['fcf_margin'].round(4),
                    'r6': log_df['z6'].round(4),
                    'r12': log_df['z12'].round(4),
                    'rv': log_df['zv'].round(4),
                    'rq': log_df['rq_rank'].round(4),
                    'score': log_df['score'].round(4),
                    'weight': log_df['weight'].round(4)
                })
                log_data_list.append(strat_logs)
                
    # Calculate cash weight dynamically: cash = 1.0 - sum(equity weights) on each date
    equity_sums = target_weights.sum(axis=1)
    cash_weights = 1.0 - equity_sums
    cash_logs = pd.DataFrame({
        'date': pd.DatetimeIndex(rebalance_dates).strftime('%Y-%m-%d'),
        'ticker': 'CASH',
        'sector': 'CASH',
        'm6': 0.0,
        'm12': 0.0,
        'vol': 0.0,
        'roe': 0.0,
        'de': 0.0,
        'fcf': 0.0,
        'r6': 0.0,
        'r12': 0.0,
        'rv': 0.0,
        'rq': 0.0,
        'score': 0.0,
        'weight': cash_weights.round(4).values
    })
    # Keep only cash rows where weight > 0
    cash_logs = cash_logs[cash_logs['weight'] > 0.0].copy()
    if not cash_logs.empty:
        log_data_list.append(cash_logs)
        
    # Combine logs and sort by date & ticker
    if log_data_list:
        log_data_df = pd.concat(log_data_list, axis=0).sort_values(by=['date', 'ticker']).reset_index(drop=True)
    else:
        log_data_df = pd.DataFrame()
        
    return target_weights, log_data_df