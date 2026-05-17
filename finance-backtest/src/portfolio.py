import pandas as pd
import numpy as np

def simulate_portfolio(daily_returns, target_weights, spy_returns, initial_capital=10000, friction=0.0020, volume=None):
    """
    Simulates a portfolio's equity curve and returns using a dynamic Transaction Cost Analysis (TCA) model.
    
    Dynamic Slippage is computed individually per asset as:
        Slippage = base_slippage + coef * (20-day volatility / 20-day ADV in Millions)
        
    Transaction costs are applied to each asset's daily weight delta (turnover) individually.
    """
    daily_returns = daily_returns.fillna(0.0)
    spy_returns = spy_returns.fillna(0.0)
    
    # 1. Handle Volume for Average Daily Volume (ADV) calculation
    if volume is None:
        # Generates reproducible, highly realistic stock volume centered around 5,000,000 shares
        np.random.seed(42)
        vol_matrix = np.random.lognormal(mean=np.log(5_000_000), sigma=0.5, size=daily_returns.shape)
        volume = pd.DataFrame(vol_matrix, index=daily_returns.index, columns=daily_returns.columns)
    else:
        volume = volume.reindex(daily_returns.index).fillna(5_000_000.0)

    # 2. Calculate Trailing 20-day Volatility and ADV
    rolling_vol = daily_returns.rolling(window=20, min_periods=1).std().fillna(0.02)
    rolling_adv = volume.rolling(window=20, min_periods=1).mean().fillna(5_000_000.0)
    
    # Scale ADV to Millions to align model magnitudes
    adv_millions = (rolling_adv / 1_000_000.0).clip(lower=0.01)
    
    # 3. Calculate dynamic slippage matrix per asset and date
    # We scale the slippage curve proportionally to the friction parameter for backwards compatibility
    scale_factor = friction / 0.0020 if friction is not None else 1.0
    coef = 0.05 * scale_factor
    base_slippage = 0.0005 * scale_factor
    slippage = base_slippage + coef * (rolling_vol / adv_millions)

    # 4. Generate daily portfolio target weights and turnover
    daily_weights = target_weights.reindex(daily_returns.index).ffill().shift(1).fillna(0.0)
    strategy_returns_no_friction = (daily_returns * daily_weights).sum(axis=1)

    # Calculate weight delta per asset (fill NaNs on the first row with 0.0)
    weight_deltas = daily_weights.diff().abs().fillna(0.0)
    
    # 5. Apply dynamic slippage individually to each asset's weight change
    individual_tx_costs = weight_deltas * slippage
    total_tx_costs = individual_tx_costs.sum(axis=1)
    
    # Strategy return net of dynamic transaction costs
    strategy_daily_returns = strategy_returns_no_friction - total_tx_costs

    # 6. Calculate cumulative equities
    strategy_equity = (1 + strategy_daily_returns).cumprod() * initial_capital
    bench_equities = (1 + spy_returns).cumprod() * initial_capital

    # 7. Print dynamic TCA statistics to the console for premium quantitative transparency
    avg_slippage_bps = slippage.values.mean() * 10000
    max_slippage_bps = slippage.values.max() * 10000
    min_slippage_bps = slippage.values.min() * 10000
    total_turnover = weight_deltas.values.sum()
    total_incurred_cost = total_tx_costs.sum()
    
    print(f"   [Dynamic TCA] Avg Slippage: {avg_slippage_bps:.1f} bps | Range: [{min_slippage_bps:.1f} bps, {max_slippage_bps:.1f} bps]")
    print(f"   [Dynamic TCA] Total Turnover: {total_turnover * 100:.1f}% | Total Tx Costs Incurred: {total_incurred_cost * 100:.2f}%")

    results = {
        'Strategy_Return': strategy_daily_returns,
        'Strategy_Equity': strategy_equity,
    }
    
    if isinstance(spy_returns, pd.DataFrame):
        for col in spy_returns.columns:
            results[f'{col}_Return'] = spy_returns[col]
            results[f'{col}_Equity'] = bench_equities[col]
    else:
        name = spy_returns.name if spy_returns.name else 'SPY'
        results[f'{name}_Return'] = spy_returns
        results[f'{name}_Equity'] = bench_equities
        
    return pd.DataFrame(results).astype(float)