import pandas as pd
import numpy as np
import os
from pathlib import Path

# Resolve absolute path to the outputs directory relative to this file
OUTPUTS_DIR = Path(__file__).resolve().parent.parent / "outputs"


def calculate_metrics(performance_data, risk_free_rate=0.0):
    df = performance_data.apply(pd.to_numeric, errors='coerce').astype(float)
    
    trading_days = len(df)
    years = trading_days / 252.0 if trading_days > 0 else 1
    metrics = {}

    for column in ['Strategy', 'SPY']:
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
            'Annualized Volatility': f"{annualized_volatility * 100:.2f}%",
            'Sharpe Ratio': f"{sharpe_ratio:.2f}",
            'Max Drawdown': f"{max_drawdown * 100:.2f}%"
        }

    return pd.DataFrame(metrics)


def save_evidence(performance_data, target_weights, momentum_scores, metrics_df, output_dir=OUTPUTS_DIR):
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. Save Metrics
    metrics_df.to_csv(os.path.join(output_dir, "metrics.csv"))
    
    # 2. Save Performance
    performance_data.to_csv(os.path.join(output_dir, "performance.csv"))

    # 3. Save Rebalance Log
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
                'momentum_6m': round(float(score), 4),
                'weight': round(float(weights[ticker]), 4)
            })

    if log_records:
        pd.DataFrame(log_records).to_csv(os.path.join(output_dir, "rebalance_log.csv"), index=False)
    else:
        pd.DataFrame(columns=['date','ticker','momentum_6m','weight']).to_csv(os.path.join(output_dir, "rebalance_log.csv"), index=False)