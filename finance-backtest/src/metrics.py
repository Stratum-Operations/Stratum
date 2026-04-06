import pandas as pd
import numpy as np
import os
from pathlib import Path

OUTPUTS_DIR = Path(__file__).resolve().parent.parent / "outputs"

def calculate_metrics(performance_data, target_weights=None, risk_free_rate=0.0):
    df = performance_data.apply(pd.to_numeric, errors='coerce').astype(float)
    trading_days = len(df)
    years = trading_days / 252.0 if trading_days > 0 else 1
    metrics = {}

    columns_to_process = ['Strategy']
    for col in df.columns:
        if col.endswith('_Return') and col != 'Strategy_Return':
            columns_to_process.append(col.split('_Return')[0])

    for column in columns_to_process:
        col_return = f'{column}_Return'
        col_equity = f'{column}_Equity'
        initial_val = df[col_equity].iloc[0] if not df.empty else 0
        final_val = df[col_equity].iloc[-1] if not df.empty else 0
        total_return = (final_val / initial_val - 1) if initial_val != 0 else 0
        cagr = (final_val / initial_val) ** (1 / years) - 1 if initial_val != 0 and years > 0 else 0
        annualized_volatility = df[col_return].std() * np.sqrt(252) if not df.empty else 0
        annualized_return = df[col_return].mean() * 252 if not df.empty else 0
        sharpe_ratio = (annualized_return - risk_free_rate) / annualized_volatility if annualized_volatility != 0 else 0
        running_max = df[col_equity].cummax()
        max_drawdown = ((df[col_equity] / running_max) - 1).min() if not df.empty else 0

        metrics[column] = {
            'Total Return': f"{total_return * 100:.2f}%",
            'CAGR': f"{cagr * 100:.2f}%",
            'Volatility': f"{annualized_volatility * 100:.2f}%",
            'Sharpe': f"{sharpe_ratio:.2f}",
            'Max Drawdown': f"{max_drawdown * 100:.2f}%"
        }

    if target_weights is not None:
        rebalance_w = target_weights[target_weights.sum(axis=1) > 0]
        if not rebalance_w.empty:
            turnover = rebalance_w.diff().abs().sum(axis=1).iloc[1:]
            avg_turnover = turnover.mean() if not turnover.empty else 0
            ann_turnover = avg_turnover * 12
            
            names_prev = [set(row[row > 0].index) for _, row in rebalance_w.iterrows()]
            changes = [len(names_prev[i] - names_prev[i-1]) for i in range(1, len(names_prev))]
            avg_changes = np.mean(changes) if changes else 0
            
            metrics['Strategy'].update({
                'Avg Turnover': f"{avg_turnover * 100:.1f}%",
                'Annulized Turnover': f"{ann_turnover * 100:.1f}%",
                'Names Changed': f"{avg_changes:.1f}"
            })
            for column in columns_to_process:
                if column != 'Strategy':
                    metrics[column].update({'Avg Turnover': '-', 'Annulized Turnover': '-', 'Names Changed': '-'})

    return pd.DataFrame(metrics)


def save_evidence(performance_data, target_weights, momentum_scores, metrics_df, output_dir=OUTPUTS_DIR):
    os.makedirs(output_dir, exist_ok=True)
    metrics_df.to_csv(os.path.join(output_dir, "metrics.csv"))
    performance_data.to_csv(os.path.join(output_dir, "performance.csv"))
    rebalance_dates = target_weights.index[target_weights.sum(axis=1) > 0]
    log_records = []
    for date in rebalance_dates:
        weights = target_weights.loc[date]
        selected_tickers = weights[weights > 0].index
        for ticker in selected_tickers:
            score = momentum_scores.loc[date, ticker] if ticker in momentum_scores.columns else 0
            log_records.append({
                'date': date.strftime('%Y-%m-%d'),
                'ticker': ticker,
                'momentum': round(float(score), 4),
                'weight': round(float(weights[ticker]), 4)
            })
    pd.DataFrame(log_records).to_csv(os.path.join(output_dir, "rebalance_log.csv"), index=False)


from scipy.stats import pearsonr

def calculate_factor_attribution(log_data, s_ret):
    if log_data.empty: return pd.DataFrame()
    
    rebalance_dates = sorted(list(log_data['date'].unique()))
    results = []
    
    for i in range(len(rebalance_dates) - 1):
        curr_date = rebalance_dates[i]
        next_date = rebalance_dates[i+1]
        
        subset = log_data[log_data['date'] == curr_date]
        tickers = subset['ticker'].tolist()
        
        fwd_returns = []
        for t in tickers:
            try:
                ret = (s_ret.loc[curr_date:next_date, t] + 1).prod() - 1
                fwd_returns.append((t, ret))
            except:
                fwd_returns.append((t, np.nan))
                
        fwd_df = pd.DataFrame(fwd_returns, columns=['ticker', 'fwd_ret']).set_index('ticker')
        merged = subset.set_index('ticker').join(fwd_df).dropna(subset=['fwd_ret', 'r6', 'r12', 'rv', 'rq'])
        
        for factor in ['r6', 'r12', 'rv', 'rq']:
            if len(merged) > 1:
                corr, _ = pearsonr(merged[factor], merged['fwd_ret'])
                if not np.isnan(corr):
                    results.append({'date': curr_date, 'factor': factor, 'corr': corr})
                
    if not results: return pd.DataFrame()
    res_df = pd.DataFrame(results)
    return res_df.groupby('factor')['corr'].mean().to_frame(name='Avg Pearson Correlation')