import numpy as np
import pandas as pd
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
