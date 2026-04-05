import pandas as pd
import numpy as np
import os


def calculate_metrics(performance_data, risk_free_rate=0.0):
    trading_days = len(performance_data)
    years = trading_days / 252.0
    metrics = {}

    for column in ['Strategy', 'SPY']:
        col_return = f'{column}_Return'
        col_equity = f'{column}_Equity'

        initial_val = performance_data[col_equity].iloc[0]
        final_val = performance_data[col_equity].iloc[-1]
        total_return = (final_val / initial_val) - 1
        cagr = (final_val / initial_val) ** (1 / years) - 1
        annualized_volatility = performance_data[col_return].std() * np.sqrt(252)
        annualized_return = performance_data[col_return].mean() * 252
        sharpe_ratio = (annualized_return - risk_free_rate) / annualized_volatility
        running_max = performance_data[col_equity].cummax()
        max_drawdown = ((performance_data[col_equity] / running_max) - 1).min()

        metrics[column] = {
            'Total Return': f"{total_return * 100:.2f}%",
            'CAGR': f"{cagr * 100:.2f}%",
            'Annualized Volatility': f"{annualized_volatility * 100:.2f}%",
            'Sharpe Ratio': f"{sharpe_ratio:.2f}",
            'Max Drawdown': f"{max_drawdown * 100:.2f}%"
        }

    return pd.DataFrame(metrics)


def save_evidence(performance_data, target_weights, momentum_scores, output_dir="../outputs/"):
    os.makedirs(output_dir, exist_ok=True)
    performance_data.to_csv(os.path.join(output_dir, "performance.csv"))

    rebalance_dates = target_weights.index[target_weights.sum(axis=1) > 0]
    log_records = []

    for date in rebalance_dates:
        weights = target_weights.loc[date]
        selected_tickers = weights[weights > 0].index
        for ticker in selected_tickers:
            log_records.append({
                'date': date.strftime('%Y-%m-%d'),
                'ticker': ticker,
                'momentum_6m': round(momentum_scores.loc[date, ticker], 4),
                'weight': round(weights[ticker], 4)
            })

    pd.DataFrame(log_records).to_csv(os.path.join(output_dir, "rebalance_log.csv"), index=False)