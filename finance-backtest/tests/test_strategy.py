import os
import sys
import numpy as np
import pandas as pd
import pytest

# Add src and the project directory to sys.path to guarantee resolution
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))

try:
    from src.strategy import (
        generate_target_weights,
        generate_target_weights_v2,
        generate_target_weights_v3,
        generate_target_weights_v4,
        generate_target_weights_v5,
        generate_target_weights_v6
    )
except ImportError:
    # Statically hidden dynamic runtime import to prevent IDE type checker warnings
    strategy = __import__('strategy')
    generate_target_weights = strategy.generate_target_weights
    generate_target_weights_v2 = strategy.generate_target_weights_v2
    generate_target_weights_v3 = strategy.generate_target_weights_v3
    generate_target_weights_v4 = strategy.generate_target_weights_v4
    generate_target_weights_v5 = strategy.generate_target_weights_v5
    generate_target_weights_v6 = strategy.generate_target_weights_v6

@pytest.fixture
def mock_portfolio_data():
    """Generates synthetic portfolio data for target weight testing."""
    np.random.seed(42)
    tickers = [f"T{i}" for i in range(1, 21)]  # 20 tickers
    dates = pd.date_range(start="2020-01-01", periods=120, freq="D")  # 120 daily periods
    
    # Prices
    price_data = {}
    for t in tickers:
        # Random walk starting around 100
        price_data[t] = 100.0 * np.cumprod(1.0 + np.random.normal(0.0005, 0.01, size=len(dates)))
    prices = pd.DataFrame(price_data, index=dates)
    
    # Benchmarks (SPY)
    spy_prices = pd.Series(100.0 * np.cumprod(1.0 + np.random.normal(0.0004, 0.008, size=len(dates))), index=dates)
    
    # Momentum and Volatility DataFrames
    m6 = pd.DataFrame(np.random.uniform(-0.2, 0.5, size=(len(dates), len(tickers))), index=dates, columns=tickers)
    m12 = pd.DataFrame(np.random.uniform(-0.1, 0.6, size=(len(dates), len(tickers))), index=dates, columns=tickers)
    v3 = pd.DataFrame(np.random.uniform(0.1, 0.4, size=(len(dates), len(tickers))), index=dates, columns=tickers)
    
    # Ticker metadata
    sectors = ['Tech', 'Fin', 'Health', 'Energy']
    tick_df = pd.DataFrame({
        'ticker': tickers,
        'sector': [sectors[i % len(sectors)] for i in range(len(tickers))]
    })
    
    # Fundamentals
    fun = pd.DataFrame({
        'roe': np.random.uniform(0.05, 0.35, size=len(tickers)),
        'debt_equity': np.random.uniform(0.1, 2.5, size=len(tickers)),
        'fcf_margin': np.random.uniform(0.05, 0.25, size=len(tickers))
    }, index=tickers)
    
    return {
        'tickers': tickers,
        'prices': prices,
        'spy_prices': spy_prices,
        'm6': m6,
        'm12': m12,
        'v3': v3,
        'tick_df': tick_df,
        'fun': fun
    }

def test_generate_target_weights_v1(mock_portfolio_data):
    """Verifies standard v1 target weights sum exactly to 1.0 (or 0.0)."""
    m6 = mock_portfolio_data['m6']
    weights = generate_target_weights(m6, top_n=15)
    
    assert isinstance(weights, pd.DataFrame)
    assert not weights.empty
    
    # Verify that each row's sum is either 1.0 or 0.0
    for idx, row in weights.iterrows():
        row_sum = row.sum()
        assert np.isclose(row_sum, 1.0) or np.isclose(row_sum, 0.0)

def test_generate_target_weights_v2(mock_portfolio_data):
    """Verifies v2 target weights and logs sum properties."""
    m6 = mock_portfolio_data['m6']
    m12 = mock_portfolio_data['m12']
    
    weights, log_df = generate_target_weights_v2(m6, m12, top_n=15)
    
    assert isinstance(weights, pd.DataFrame)
    for idx, row in weights.iterrows():
        row_sum = row.sum()
        assert np.isclose(row_sum, 1.0) or np.isclose(row_sum, 0.0)
        
    if not log_df.empty:
        # Check that log columns match original expectations
        expected_cols = {'date', 'ticker', 'momentum_6m', 'momentum_12m', 'rank_6m', 'rank_12m', 'composite_score', 'final_rank', 'weight'}
        assert expected_cols.issubset(log_df.columns)

def test_generate_target_weights_v3(mock_portfolio_data):
    """Verifies v3 target weights and logs sum properties."""
    m6 = mock_portfolio_data['m6']
    m12 = mock_portfolio_data['m12']
    v3 = mock_portfolio_data['v3']
    
    weights, log_df = generate_target_weights_v3(m6, m12, v3, top_n=15)
    
    assert isinstance(weights, pd.DataFrame)
    for idx, row in weights.iterrows():
        row_sum = row.sum()
        assert np.isclose(row_sum, 1.0) or np.isclose(row_sum, 0.0)

def test_generate_target_weights_v4(mock_portfolio_data):
    """Verifies sector-neutral v4 target weights sum exactly to 1.0 (or 0.0)."""
    m6 = mock_portfolio_data['m6']
    m12 = mock_portfolio_data['m12']
    v3 = mock_portfolio_data['v3']
    fun = mock_portfolio_data['fun']
    tick_df = mock_portfolio_data['tick_df']
    
    weights, log_df = generate_target_weights_v4(m6, m12, v3, fun, tick_df, top_pct=0.20)
    
    assert isinstance(weights, pd.DataFrame)
    for idx, row in weights.iterrows():
        row_sum = row.sum()
        assert np.isclose(row_sum, 1.0) or np.isclose(row_sum, 0.0)

def test_generate_target_weights_v5_continuous(mock_portfolio_data):
    """Verifies v5 continuous sigmoid exposure and dynamic cash sum properties."""
    m6 = mock_portfolio_data['m6']
    m12 = mock_portfolio_data['m12']
    v3 = mock_portfolio_data['v3']
    fun = mock_portfolio_data['fun']
    tick_df = mock_portfolio_data['tick_df']
    spy_prices = mock_portfolio_data['spy_prices']
    
    weights, log_df = generate_target_weights_v5(m6, m12, v3, fun, tick_df, spy_prices, top_pct=0.20)
    
    assert isinstance(weights, pd.DataFrame)
    
    # In continuous v5, equity weights sum to exposure E, and cash gets 1 - E.
    # Total portfolio weight must sum exactly to 1.0 on all dates.
    for date, row in weights.iterrows():
        equity_sum = row.sum()
        
        # Extract cash weight for this date from logs
        date_str = date.strftime('%Y-%m-%d')
        cash_row = log_df[(log_df['date'] == date_str) & (log_df['ticker'] == 'CASH')]
        cash_weight = cash_row['weight'].values[0] if not cash_row.empty else 0.0
        
        total_portfolio_sum = equity_sum + cash_weight
        assert np.isclose(total_portfolio_sum, 1.0), f"Total portfolio sum on {date_str} is {total_portfolio_sum} (Expected: 1.0)"
        assert equity_sum >= 0.0 and equity_sum <= 1.0001
        assert cash_weight >= 0.0 and cash_weight <= 1.0001

def test_generate_target_weights_v6_qp(mock_portfolio_data):
    """Verifies that CVXPY QP v6 solver convergence, bounds, and dynamic sum limits hold."""
    m6 = mock_portfolio_data['m6']
    m12 = mock_portfolio_data['m12']
    v3 = mock_portfolio_data['v3']
    fun = mock_portfolio_data['fun']
    tick_df = mock_portfolio_data['tick_df']
    prices = mock_portfolio_data['prices']
    
    # Run optimization
    weights, log_df = generate_target_weights_v6(m6, m12, v3, fun, tick_df, prices, top_n=15)
    
    assert isinstance(weights, pd.DataFrame)
    
    # Verify that:
    # 1. No individual weight exceeds 10% (0.10).
    # 2. Weights are non-negative.
    # 3. Sum equals min(1.0, K_t * 0.10) where K_t is the number of passing assets.
    for date, row in weights.iterrows():
        max_w = row.max()
        min_w = row.min()
        row_sum = row.sum()
        
        assert max_w <= 0.10001, f"Max position cap violated: {max_w}"
        assert min_w >= -1e-7, f"Negative weight found: {min_w}"
        
        # Verify sum matches passing count scaling
        date_str = date.strftime('%Y-%m-%d')
        active_assets = log_df[log_df['date'] == date_str]
        K_t = len(active_assets)
        expected_sum = min(1.0, K_t * 0.10)
        
        assert np.isclose(row_sum, expected_sum, atol=1e-4), f"Sum on {date_str} is {row_sum} (Expected: {expected_sum})"

def test_run_walk_forward_optimization(mock_portfolio_data):
    """Verifies that Walk-Forward Optimization runs successfully, stitches weights, and outputs comparison metrics."""
    try:
        from src.robustness import run_walk_forward_optimization
    except ImportError:
        robustness = __import__('robustness')
        run_walk_forward_optimization = robustness.run_walk_forward_optimization
        
    s_prices = mock_portfolio_data['prices']
    s_ret = s_prices.pct_change().fillna(0.0)
    spy_prices = mock_portfolio_data['spy_prices']
    spy_ret = spy_prices.pct_change().fillna(0.0)
    fun = mock_portfolio_data['fun']
    
    # Run WFO with custom shorter windows for mock data
    df_summary = run_walk_forward_optimization(
        s_prices, s_ret, spy_ret, fun, tick_df=None, initial_capital=10000,
        in_sample_months=2, oos_months=1
    )
    
    assert isinstance(df_summary, pd.DataFrame)
    assert not df_summary.empty
    
    # Check column names
    expected_cols = {'Metric', 'Static Backtest', 'Walk-Forward (WFO)', 'Degradation'}
    assert expected_cols.issubset(df_summary.columns)
    
    # Check output file existence
    assert os.path.exists('outputs/wfo_performance.csv')
    
    # Read the output and verify columns
    export_df = pd.read_csv('outputs/wfo_performance.csv')
    assert 'WFO_Equity' in export_df.columns
    assert 'Static_Equity' in export_df.columns
    assert 'SPY_Equity' in export_df.columns

def test_dynamic_tca_portfolio_simulation(mock_portfolio_data):
    """Verifies that simulate_portfolio executes successfully using the dynamic TCA model."""
    try:
        from src.portfolio import simulate_portfolio
    except ImportError:
        portfolio = __import__('portfolio')
        simulate_portfolio = portfolio.simulate_portfolio
        
    s_prices = mock_portfolio_data['prices']
    s_ret = s_prices.pct_change().fillna(0.0)
    spy_prices = mock_portfolio_data['spy_prices']
    spy_ret = spy_prices.pct_change().fillna(0.0)
    
    from src.strategy import generate_target_weights_v6
    m6 = mock_portfolio_data['prices'].pct_change().fillna(0.0)
    v3 = m6.copy()
    fun = mock_portfolio_data['fun']
    w6, _ = generate_target_weights_v6(m6, m6, v3, fun, None, s_prices, top_n=15)
    
    # Run with default synthetic volume
    results = simulate_portfolio(s_ret, w6, spy_ret, initial_capital=10000, friction=0.0020, volume=None)
    
    assert isinstance(results, pd.DataFrame)
    assert 'Strategy_Return' in results.columns
    assert 'Strategy_Equity' in results.columns
    
    # Run with explicit custom volume
    custom_vol = pd.DataFrame(10_000_000, index=s_ret.index, columns=s_ret.columns)
    results_custom = simulate_portfolio(s_ret, w6, spy_ret, initial_capital=10000, friction=0.0020, volume=custom_vol)
    
    assert isinstance(results_custom, pd.DataFrame)
    assert not results_custom.empty

def test_generate_trade_orders_alpaca():
    """Verifies that generate_trade_orders calculates correct shares, uses math.floor, and creates standard Alpaca JSON."""
    import json
    try:
        from src.execution import generate_trade_orders
    except ImportError:
        execution = __import__('execution')
        generate_trade_orders = execution.generate_trade_orders
        
    target_weights = pd.Series({
        'AAPL': 0.40,
        'MSFT': 0.35,
        'TSLA': 0.25
    })
    closing_prices = pd.Series({
        'AAPL': 150.0,
        'MSFT': 300.0,
        'TSLA': 800.0
    })
    
    # AAPL: 100,000 * 0.40 / 150.0 = 266.66 -> floor: 266 shares
    # MSFT: 100,000 * 0.35 / 300.0 = 116.66 -> floor: 116 shares
    # TSLA: 100,000 * 0.25 / 800.0 = 31.25 -> floor: 31 shares
    
    # Case 1: Empty holdings
    json_payload = generate_trade_orders(target_weights, 100000.0, closing_prices, current_positions=None)
    orders = json.loads(json_payload)
    
    assert isinstance(orders, list)
    assert len(orders) == 3
    
    order_dict = {o['symbol']: o for o in orders}
    assert order_dict['AAPL']['side'] == 'buy'
    assert order_dict['AAPL']['qty'] == 266
    
    assert order_dict['MSFT']['side'] == 'buy'
    assert order_dict['MSFT']['qty'] == 116
    
    assert order_dict['TSLA']['side'] == 'buy'
    assert order_dict['TSLA']['qty'] == 31
    
    # Case 2: Transition delta buy/sell
    current_positions = pd.Series({
        'AAPL': 270,  # Hold 270, target is 266 -> SELL 4
        'MSFT': 110,  # Hold 110, target is 116 -> BUY 6
        'TSLA': 31    # Hold 31, target is 31 -> NO TRADE
    })
    
    json_payload_transition = generate_trade_orders(target_weights, 100000.0, closing_prices, current_positions)
    orders_transition = json.loads(json_payload_transition)
    
    assert len(orders_transition) == 2
    transition_dict = {o['symbol']: o for o in orders_transition}
    
    assert transition_dict['AAPL']['side'] == 'sell'
    assert transition_dict['AAPL']['qty'] == 4
    
    assert transition_dict['MSFT']['side'] == 'buy'
    assert transition_dict['MSFT']['qty'] == 6
