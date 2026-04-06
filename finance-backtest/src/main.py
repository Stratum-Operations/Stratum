import pandas as pd
import os
from data_loader import download_price_data, fetch_fundamentals
from factors import calculate_momentum, calculate_volatility_3m
from strategy import generate_target_weights_v6
from portfolio import simulate_portfolio
from metrics import calculate_metrics, calculate_factor_attribution
from robustness import bootstrap_cagr, run_parameter_perturbation

INITIAL_CAPITAL = 10000
TOP_N = 15

def extract_period(p, w, start_date, end_date):
    p_slice = p.loc[start_date:end_date].copy()
    w_slice = w.loc[start_date:end_date].copy()
    if not p_slice.empty:
        p_slice['Strategy_Equity'] = (1 + p_slice['Strategy_Return']).cumprod() * INITIAL_CAPITAL
        for col in p_slice.columns:
            if col.endswith('_Return') and col != 'Strategy_Return':
                prefix = col.split('_Return')[0]
                p_slice[f'{prefix}_Equity'] = (1 + p_slice[col]).cumprod() * INITIAL_CAPITAL
    return p_slice, w_slice

def run_universe(universe_name):
    prices, ret = download_price_data(universe_name)
    if prices.empty: return None

    benchmark_tickers = ['SPY', 'QQQ', 'MTUM', 'QUAL']
    bench_cols = [b for b in benchmark_tickers if b in ret.columns]
    bench_ret = ret[bench_cols] if bench_cols else pd.Series(0.0, index=ret.index, name='SPY')
    
    s_prices = prices.drop(columns=[c for c in bench_cols if c in prices.columns])
    s_ret = ret.drop(columns=[c for c in bench_cols if c in ret.columns])

    m6 = calculate_momentum(s_prices, 6)
    m12 = calculate_momentum(s_prices, 12)
    v3 = calculate_volatility_3m(s_ret)
    fun = fetch_fundamentals(universe_name)

    w6, log6 = generate_target_weights_v6(m6, m12, v3, fun, None, s_prices, TOP_N)
    
    if universe_name == 'SP500':
        log6.to_csv("outputs/rebalance_log_v7.csv", index=False)
        ledger_path = os.path.join("data", "live_paper_ledger.csv")
        latest_date = log6['date'].max()
        df_latest = log6[log6['date'] == latest_date]
        if os.path.exists(ledger_path):
            df_latest.to_csv(ledger_path, mode='a', header=False, index=False)
        else:
            df_latest.to_csv(ledger_path, index=False)
    else:
        log6.to_csv(f"outputs/rebalance_log_v7_{universe_name.lower()}.csv", index=False)

    p6 = simulate_portfolio(s_ret, w6, bench_ret, INITIAL_CAPITAL, friction=0.0020)
    p6_full, w6_full = extract_period(p6, w6, '2014-01-01', '2024-01-01')
    r6_full = calculate_metrics(p6_full, w6_full)
    
    if universe_name == 'SP500':
        import numpy as np
        r6_full.to_csv("outputs/metrics.csv")
        df_export = p6_full.copy()
        for col in df_export.columns:
            if col.endswith('_Equity'):
                running_max = df_export[col].cummax()
                prefix = col.split('_Equity')[0]
                df_export[f'{prefix}_Drawdown'] = ((df_export[col] / running_max) - 1).fillna(0)
            if col.endswith('_Return'):
                prefix = col.split('_Return')[0]
                rolling_ret = df_export[col].rolling(window=252).mean() * 252
                rolling_vol = df_export[col].rolling(window=252).std() * np.sqrt(252)
                df_export[f'{prefix}_Rolling_Sharpe'] = (rolling_ret / rolling_vol).fillna(0)
                
        df_export.to_csv("outputs/performance.csv")
        
    attr_df = calculate_factor_attribution(log6, s_ret.loc['2014-01-01':])
    
    returns_series = p6_full
    expected, lb, ub = bootstrap_cagr(returns_series)
    
    return {
        'metrics': r6_full['Strategy'],
        'benchmarks': {b: r6_full[b] for b in bench_cols if b in r6_full.columns},
        'attribution': attr_df,
        'bootstrap': (expected, lb, ub),
        's_prices': s_prices,
        's_ret': s_ret,
        'spy_ret': bench_ret,
        'fun': fun
    }

def main():
    universes = ['SP500', 'NASDAQ100', 'RUSSELL1000']
    results = {}
    
    print("\nExecuting Pipeline V7 Database Extraction & Simulation...")
    for u in universes:
        res = run_universe(u)
        if res is not None:
            results[u] = res

    if 'SP500' in results:
        df_comp = pd.DataFrame({u: results[u]['metrics'] for u in results})
        df_comp.index.name = 'Metric'
        df_comp.reset_index(inplace=True)

        print("\n" + "="*85)
        print("      V7 PORTFOLIO METRICS COMPARISON (Full Period: 2014-2024)")
        print("="*85)
        print(df_comp.to_string(index=False))
        print("="*85)

        print("\n" + "="*85)
        print("      BENCHMARK SUITE COMPARISON (S&P 500 Universe Data)")
        print("="*85)
        bench_df = pd.DataFrame(results['SP500']['benchmarks'])
        bench_df.insert(0, 'Metric', bench_df.index)
        print(bench_df.to_string(index=False))
        print("="*85)

        print("\n" + "="*85)
        print("      FACTOR ATTRIBUTION (Pearson Correlation: Rank vs 1M Fwd Return)")
        print("="*85)
        print(results['SP500']['attribution'].to_string())
        print("="*85)
        
        expected, lb, ub = results['SP500']['bootstrap']
        print("\n" + "="*85)
        print("      MONTE CARLO ROBUSTNESS (10,000 Bootstrap Resamples)")
        print("="*85)
        print(f"      Expected CAGR: {expected*100:.2f}%  |  95% CI: [{lb*100:.2f}% , {ub*100:.2f}%]")
        print("="*85)

        print("\n" + "="*85)
        print("      PARAMETER PERTURBATION MATRIX (S&P 500)")
        print("="*85)
        pt_df = run_parameter_perturbation(
            results['SP500']['s_prices'], results['SP500']['s_ret'],
            results['SP500']['spy_ret'], results['SP500']['fun'], None
        )
        print(pt_df.to_string(index=False))
        print("="*85 + "\n")

if __name__ == "__main__":
    main()
