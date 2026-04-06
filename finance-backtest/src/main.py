import pandas as pd
import os
from data_loader import load_tickers, download_price_data, fetch_fundamentals
from factors import calculate_momentum_6m, calculate_momentum_12m, calculate_volatility_3m
from strategy import generate_target_weights, generate_target_weights_v2, generate_target_weights_v3, generate_target_weights_v4
from portfolio import simulate_portfolio
from metrics import calculate_metrics, save_evidence

START_DATE, END_DATE, TOP_N, INITIAL_CAPITAL = "2016-01-01", "2024-01-01", 15, 10000

def main():
    tickers = load_tickers()
    prices, ret = download_price_data(tickers, START_DATE, END_DATE)
    if prices.empty: return
    
    spy_ret, s_prices, s_ret = ret['SPY'], prices.drop(columns=['SPY']), ret.drop(columns=['SPY'])
    m6, m12, v3 = calculate_momentum_6m(s_prices), calculate_momentum_12m(s_prices), calculate_volatility_3m(s_ret)
    
    fun = fetch_fundamentals(tickers)
    tdf = pd.read_csv("data/tickers.csv")

    w1 = generate_target_weights(m6, TOP_N)
    p1 = simulate_portfolio(s_ret, w1, spy_ret, INITIAL_CAPITAL, friction=0.0)
    r1 = calculate_metrics(p1, w1)

    w2, _ = generate_target_weights_v2(m6, m12, TOP_N)
    p2 = simulate_portfolio(s_ret, w2, spy_ret, INITIAL_CAPITAL, friction=0.0)
    r2 = calculate_metrics(p2, w2)

    w3, _ = generate_target_weights_v3(m6, m12, v3, TOP_N)
    p3 = simulate_portfolio(s_ret, w3, spy_ret, INITIAL_CAPITAL, friction=0.0)
    r3 = calculate_metrics(p3, w3)

    w4, log4 = generate_target_weights_v4(m6, m12, v3, fun, tdf)
    p4 = simulate_portfolio(s_ret, w4, spy_ret, INITIAL_CAPITAL, friction=0.0020)
    r4 = calculate_metrics(p4, w4)

    log4.to_csv("outputs/rebalance_log_v4.csv", index=False)

    df_comp = pd.DataFrame({
        'Metric': r1.index,
        'V1': r1['Strategy'].values,
        'V2': r2['Strategy'].values,
        'V3': r3['Strategy'].values,
        'V4 (Friction)': r4['Strategy'].values,
        'SPY': r1['SPY'].values
    })

    print("\n" + "="*85)
    print("      STRATEGY COMPARISON: V1-V4 (V4 includes Sector-Neutral + Quality + Friction)")
    print("="*85)
    print(df_comp.to_string(index=False))
    print("="*85 + "\n")

if __name__ == "__main__":
    main()



