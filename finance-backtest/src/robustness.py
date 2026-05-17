import numpy as np
import pandas as pd
import os
from factors import calculate_momentum, calculate_volatility_3m
from strategy import generate_target_weights_v6
from portfolio import simulate_portfolio

def bootstrap_cagr(performance_data, iterations=10000):
    strat_ret = performance_data['Strategy_Return'].copy()
    if strat_ret.empty: return 0, 0, 0

    monthly_returns = strat_ret.resample('ME').apply(lambda x: (1 + x).prod() - 1).dropna()
    n_months = len(monthly_returns)
    cagrs = []
    
    for _ in range(iterations):
        sample = np.random.choice(monthly_returns, size=n_months, replace=True)
        cagrs.append((np.prod(1 + sample)) ** (12 / n_months) - 1)
        
    cagrs.sort()
    lower_bound = cagrs[int(0.025 * iterations)]
    upper_bound = cagrs[int(0.975 * iterations)]
    expected = np.mean(cagrs)
    
    return expected, lower_bound, upper_bound

def run_parameter_perturbation(s_prices, s_ret, spy_ret, fun, tick_df, initial_capital=10000):
    results = []
    v3 = calculate_volatility_3m(s_ret)
    
    for lookback in [5, 6, 7]:
        m1 = calculate_momentum(s_prices, lookback)
        m12 = calculate_momentum(s_prices, 12)
        for size in [10, 15, 20]:
            w, _ = generate_target_weights_v6(m1, m12, v3, fun, tick_df, s_prices, top_n=size)
            p = simulate_portfolio(s_ret, w, spy_ret, initial_capital, friction=0.0020)
            
            p_slice = p.loc['2014-01-01':'2024-01-01']
            if p_slice.empty: continue
            
            strat_equity = p_slice['Strategy_Equity']
            years = len(strat_equity) / 252.0 if len(strat_equity) > 0 else 1
            if len(strat_equity) > 0 and strat_equity.iloc[0] != 0:
                cagr = (strat_equity.iloc[-1] / strat_equity.iloc[0]) ** (1 / years) - 1
            else:
                cagr = 0
                
            results.append({
                'Momentum Window': f"{lookback} Months",
                'Portfolio Size': size,
                'CAGR': f"{cagr * 100:.2f}%"
            })
            
    return pd.DataFrame(results)

def calculate_period_metrics(p_series, initial_capital=10000):
    """Calculates quantitative performance metrics from a returns series DataFrame."""
    strat_equity = p_series['Strategy_Equity']
    strat_ret = p_series['Strategy_Return']
    
    total_return = (strat_equity.iloc[-1] / initial_capital) - 1
    years = len(strat_equity) / 252.0
    cagr = (strat_equity.iloc[-1] / initial_capital) ** (1.0 / years) - 1 if years > 0 else 0.0
    
    std = strat_ret.std()
    sharpe = np.sqrt(252) * (strat_ret.mean() / std) if std > 0 else 0.0
    
    running_max = strat_equity.cummax()
    drawdown = (strat_equity / running_max) - 1
    max_dd = drawdown.min()
    
    return {
        'Total Return': total_return,
        'CAGR': cagr,
        'Sharpe': sharpe,
        'Max Drawdown': max_dd
    }

def run_walk_forward_optimization(s_prices, s_ret, spy_ret, fun, tick_df=None, initial_capital=10000, in_sample_months=36, oos_months=6):
    """Executes a chronological Walk-Forward Optimization (WFO) over the backtest period.
    
    - Trailing In-Sample (IS) window size: in_sample_months.
    - Out-of-Sample (OOS) window size: oos_months.
    - Chronological step: oos_months.
    """
    print("\n" + "="*85)
    print("      WALK-FORWARD OPTIMIZATION (WFO) SIMULATION")
    print("="*85)
    
    # 1. Define factor weights search grid (w_momentum, w_quality, w_low_vol)
    candidates = []
    for wm in np.linspace(0.0, 1.0, 6):
        for wq in np.linspace(0.0, 1.0 - wm, 6):
            wlv = 1.0 - wm - wq
            if wlv >= -1e-5:
                candidates.append((wm, wq, max(0.0, wlv)))
                
    # Pre-calculate rolling factors on full series
    m6 = calculate_momentum(s_prices, 6)
    m12 = calculate_momentum(s_prices, 12)
    v3 = calculate_volatility_3m(s_ret)
    
    def calc_sharpe(ret_series):
        std = ret_series.std()
        if ret_series.empty or std == 0 or pd.isna(std):
            return -999.0
        return np.sqrt(252) * (ret_series.mean() / std)
        
    start_date = s_ret.index.min()
    max_date = s_ret.index.max()
    
    current_oos_start = start_date + pd.DateOffset(months=in_sample_months)
    
    wfo_weights_list = []
    wfo_records = []
    
    while current_oos_start + pd.DateOffset(months=oos_months) <= max_date + pd.Timedelta(days=5):
        current_oos_end = current_oos_start + pd.DateOffset(months=oos_months) - pd.Timedelta(days=1)
        
        # In-Sample Window
        current_is_start = current_oos_start - pd.DateOffset(months=in_sample_months)
        current_is_end = current_oos_start - pd.Timedelta(days=1)
        
        # Slice In-Sample data
        is_prices = s_prices.loc[current_is_start:current_is_end]
        is_ret = s_ret.loc[current_is_start:current_is_end]
        is_m6 = m6.loc[current_is_start:current_is_end]
        is_m12 = m12.loc[current_is_start:current_is_end]
        is_v3 = v3.loc[current_is_start:current_is_end]
        is_spy = spy_ret.loc[current_is_start:current_is_end]
        
        best_sharpe = -999.0
        best_candidate = None
        best_weights_dict = None
        
        for wm, wq, wlv in candidates:
            # Distribute momentum weight based on original relative ratio
            w_dict = {
                'w_m6': wm * (0.40 / 0.65),
                'w_m12': wm * (0.25 / 0.65),
                'w_vol': wlv,
                'w_qual': wq
            }
            
            is_w, _ = generate_target_weights_v6(
                is_m6, is_m12, is_v3, fun, None, is_prices, top_n=15, weights_dict=w_dict
            )
            
            if is_w.empty:
                continue
                
            is_p = simulate_portfolio(is_ret, is_w, is_spy, initial_capital, friction=0.0020)
            sharpe = calc_sharpe(is_p['Strategy_Return'])
            
            if sharpe > best_sharpe:
                best_sharpe = sharpe
                best_candidate = (wm, wq, wlv)
                best_weights_dict = w_dict
                
        if best_weights_dict is None:
            best_weights_dict = {'w_m6': 0.40, 'w_m12': 0.25, 'w_vol': 0.20, 'w_qual': 0.15}
            best_candidate = (0.65, 0.15, 0.20)
            
        print(f"IS Window [{current_is_start.strftime('%Y-%m-%d')} to {current_is_end.strftime('%Y-%m-%d')}]: "
              f"Optimal weights = Momentum: {best_candidate[0]:.2f}, Quality: {best_candidate[1]:.2f}, LowVol: {best_candidate[2]:.2f} "
              f"(IS Sharpe: {best_sharpe:.2f})")
              
        # Execute weights on Out-of-Sample window
        # Slice OOS inputs (including IS history for rolling calculations)
        oos_prices = s_prices.loc[current_is_start:current_oos_end]
        oos_ret = s_ret.loc[current_is_start:current_oos_end]
        oos_m6 = m6.loc[current_is_start:current_oos_end]
        oos_m12 = m12.loc[current_is_start:current_oos_end]
        oos_v3 = v3.loc[current_is_start:current_oos_end]
        
        total_w, _ = generate_target_weights_v6(
            oos_m6, oos_m12, oos_v3, fun, None, oos_prices, top_n=15, weights_dict=best_weights_dict
        )
        
        # Slice only the weights that fall inside the OOS period
        oos_w = total_w.loc[current_oos_start:current_oos_end]
        wfo_weights_list.append(oos_w)
        
        wfo_records.append({
            'OOS_Start': current_oos_start.strftime('%Y-%m-%d'),
            'OOS_End': current_oos_end.strftime('%Y-%m-%d'),
            'w_momentum': best_candidate[0],
            'w_quality': best_candidate[1],
            'w_low_vol': best_candidate[2],
            'is_sharpe': best_sharpe
        })
        
        current_oos_start = current_oos_start + pd.DateOffset(months=oos_months)
        
    if not wfo_weights_list:
        print("Error: No Walk-Forward windows were simulated.")
        return pd.DataFrame()
        
    # Stitch OOS weights and run continuous portfolio simulation
    wfo_weights = pd.concat(wfo_weights_list).sort_index()
    wfo_start = wfo_weights.index.min()
    wfo_end = wfo_weights.index.max()
    
    wfo_spy = spy_ret.loc[wfo_start:wfo_end]
    wfo_prices = s_prices.loc[wfo_start:wfo_end]
    wfo_ret = s_ret.loc[wfo_start:wfo_end]
    
    # Simulate dynamic WFO portfolio
    p_wfo = simulate_portfolio(wfo_ret, wfo_weights, wfo_spy, initial_capital, friction=0.0020)
    p_wfo['Strategy_Equity'] = (1 + p_wfo['Strategy_Return']).cumprod() * initial_capital
    
    # Simulate static portfolio over the exact same period for benchmark comparison
    static_w, _ = generate_target_weights_v6(
        m6.loc[wfo_start:wfo_end], m12.loc[wfo_start:wfo_end], v3.loc[wfo_start:wfo_end],
        fun, None, wfo_prices, top_n=15, weights_dict=None
    )
    p_static = simulate_portfolio(wfo_ret, static_w, wfo_spy, initial_capital, friction=0.0020)
    p_static['Strategy_Equity'] = (1 + p_static['Strategy_Return']).cumprod() * initial_capital
    
    # Calculate period metrics
    wfo_metrics = calculate_period_metrics(p_wfo, initial_capital)
    static_metrics = calculate_period_metrics(p_static, initial_capital)
    
    # Compare WFO to Static
    summary_results = []
    for metric_name in wfo_metrics.keys():
        wfo_val = wfo_metrics[metric_name]
        static_val = static_metrics[metric_name]
        degradation = static_val - wfo_val
        
        # Formatting
        if 'Sharpe' in metric_name:
            wfo_str = f"{wfo_val:.2f}"
            static_str = f"{static_val:.2f}"
            deg_str = f"{degradation:.2f}"
        else:
            wfo_str = f"{wfo_val * 100:.2f}%"
            static_str = f"{static_val * 100:.2f}%"
            deg_str = f"{degradation * 100:.2f}%"
            
        summary_results.append({
            'Metric': metric_name,
            'Static Backtest': static_str,
            'Walk-Forward (WFO)': wfo_str,
            'Degradation': deg_str
        })
        
    df_summary = pd.DataFrame(summary_results)
    
    print("\n" + "="*85)
    print("      WFO VS STATIC BACKTEST PERFORMANCE COMPARISON")
    print("="*85)
    print(df_summary.to_string(index=False))
    print("="*85)
    
    # Export WFO and Static equity curves to CSV
    export_df = pd.DataFrame({
        'WFO_Equity': p_wfo['Strategy_Equity'],
        'Static_Equity': p_static['Strategy_Equity'],
        'SPY_Equity': (1 + p_wfo['SPY_Return']).cumprod() * initial_capital
    })
    
    os.makedirs('outputs', exist_ok=True)
    export_df.to_csv('outputs/wfo_performance.csv')
    print("Exported WFO equity curve to outputs/wfo_performance.csv\n")
    
    return df_summary
